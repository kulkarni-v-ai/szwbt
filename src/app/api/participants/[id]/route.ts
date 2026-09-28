import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

export const GET = withAuth(
  async (req: NextRequest, context: UserContext, routeProps: any) => {
    try {
      const participantId = routeProps?.params?.id;

      if (!participantId) {
        return NextResponse.json({ success: false, error: "Participant ID required." }, { status: 400 });
      }

      // RESOURCE-LEVEL OWNERSHIP CHECK
      const isSuperOrStaff =
        context.roles.includes("SUPER_ADMIN") ||
        context.roles.includes("REGISTRATION_STAFF") ||
        context.roles.includes("TOURNAMENT_ADMIN") ||
        context.roles.includes("ACCOMMODATION_STAFF") ||
        context.roles.includes("TRANSPORT_STAFF") ||
        context.roles.includes("ORGANIZER");

      if (!isSuperOrStaff) {
        // If Participant, can ONLY view own record
        if (context.roles.includes("PARTICIPANT")) {
          const isOwn =
            context.user.participantId === participantId || context.user.id === participantId;
          if (!isOwn) {
            return NextResponse.json(
              {
                success: false,
                error: "403 Forbidden: Athletes cannot view other participants' private records.",
              },
              { status: 403 }
            );
          }
        }
      }

      const participant = await prisma.participant.findFirst({
        where: {
          OR: [{ id: participantId }, { playerId: participantId }],
        },
        include: {
          bedAllocations: { include: { bed: { include: { room: true } } } },
          teamMemberships: { include: { team: true } },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // Team manager check
      if (context.roles.includes("TEAM_MANAGER") && !isSuperOrStaff) {
        const belongsToTeam = participant.teamMemberships.some(
          (tm) => tm.teamId === context.user.teamId
        );
        if (!belongsToTeam) {
          return NextResponse.json(
            {
              success: false,
              error: "403 Forbidden: Team Manager cannot access athletes from another institution.",
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        participant,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.PARTICIPANT_READ],
  }
);
