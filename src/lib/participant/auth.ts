import { NextRequest, NextResponse } from "next/server";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { prisma } from "@/lib/prisma";

export interface ParticipantAuthResult {
  participantId: string | null;
  participant: any | null;
  errorResponse?: NextResponse;
}

/**
 * Authoritatively resolves the authenticated participant from session context.
 * Strictly verifies resource ownership:
 * - Participants can NEVER view another participant's records.
 * - Any manipulated participantId query param or body field is rejected with 403 Forbidden.
 * - Super Admins retain clearance for inspection.
 */
export async function resolveAuthenticatedParticipant(
  req: NextRequest,
  context: UserContext
): Promise<ParticipantAuthResult> {
  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const isParticipant = context.roles.includes(ROLES.PARTICIPANT);

  if (!isSuperAdmin && !isParticipant) {
    return {
      participantId: null,
      participant: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Only authenticated participants or tournament administrators can access the athlete portal.",
        },
        { status: 403 }
      ),
    };
  }

  // Derive authoritative participant ID from backend session
  let targetId: string | null = null;

  if (isSuperAdmin) {
    const requestedId =
      req.nextUrl.searchParams.get("participantId") ||
      req.nextUrl.searchParams.get("id");
    if (requestedId) {
      targetId = requestedId;
    } else {
      // Default to first active participant
      const defaultP = await prisma.participant.findFirst();
      targetId = defaultP ? defaultP.id : null;
    }
  } else {
    // Authenticated Participant role
    const ownParticipantId = context.user.participantId;
    const requestedId =
      req.nextUrl.searchParams.get("participantId") ||
      req.nextUrl.searchParams.get("id");

    // STRICT RESOURCE ISOLATION CHECK
    if (requestedId && ownParticipantId && requestedId !== ownParticipantId && requestedId !== context.user.id) {
      return {
        participantId: null,
        participant: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "403 Forbidden: Athletes cannot view or inspect other participants' private records.",
          },
          { status: 403 }
        ),
      };
    }

    targetId = ownParticipantId || context.user.id;
  }

  if (!targetId) {
    return {
      participantId: null,
      participant: null,
    };
  }

  // Find participant record matching ID, playerId, or user email
  const participant = await prisma.participant.findFirst({
    where: {
      OR: [
        { id: targetId },
        { playerId: targetId },
        { email: context.user.email },
      ],
    },
    include: {
      teamMemberships: {
        include: {
          team: true,
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          status: true,
          updatedAt: true,
          capturedBy: true,
          // CRITICAL: filePath and compiledPdfPath are strictly excluded for privacy!
        },
      },
      bedAllocations: {
        where: { status: "ACTIVE" },
        include: {
          bed: {
            include: {
              room: {
                include: {
                  hostel: true,
                  floor: true,
                },
              },
            },
          },
        },
      },
      transportBookings: {
        include: {
          trip: {
            include: {
              route: {
                include: { stops: { orderBy: { orderIndex: "asc" } } },
              },
              vehicle: true,
              driver: true,
            },
          },
        },
      },
      paymentLedgers: {
        where: {
          category: { in: ["REGISTRATION", "ACCOMMODATION", "MATCH"] },
        },
      },
    },
  });

  return {
    participantId: participant ? participant.id : targetId,
    participant,
  };
}
