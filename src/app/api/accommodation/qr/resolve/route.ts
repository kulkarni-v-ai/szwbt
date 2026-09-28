import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { resolveQrOperation } from "@/lib/qr/service";

/**
 * POST /api/accommodation/qr/resolve
 * Resolves an opaque Team or Participant QR token into authorized accommodation status.
 * Enforces data privacy: returns only accommodation & food package context.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { qrToken } = body;

      if (!qrToken || typeof qrToken !== "string" || !qrToken.trim()) {
        return NextResponse.json(
          { success: false, error: "QR token is required." },
          { status: 400 }
        );
      }

      const result = await resolveQrOperation(qrToken, "ACCOMMODATION", context);

      if (!result.valid) {
        const statusCode = result.code === "ACCESS_DENIED" ? 403 : 404;
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            code: result.code,
          },
          { status: statusCode }
        );
      }

      // If resolved as Participant, wrap in team structure for backward compatibility
      if (result.qrType === "PARTICIPANT") {
        const p = result.data;
        return NextResponse.json({
          success: true,
          resolvedType: "PARTICIPANT",
          participant: p,
          team: {
            id: p.teamId,
            teamCode: p.teamCode,
            name: `${p.name} (${p.teamName})`,
            institution: p.institution,
            state: p.state,
            managerName: null,
            managerPhone: null,
            captainName: p.name,
            accommodationStatus: p.isAllocated ? "FULLY_ALLOCATED" : "NOT_STARTED",
            totalMembers: 1,
            allocatedCount: p.isAllocated ? 1 : 0,
            unallocatedCount: p.isAllocated ? 0 : 1,
            members: [
              {
                id: p.participantId,
                name: p.name,
                playerId: p.playerId,
                role: "PLAYER",
                gender: p.gender,
                eligibleHostelId: p.eligibleHostelId,
                eligibleHostelName: p.eligibleHostelName,
                isAllocated: p.isAllocated,
                allocation: p.allocation,
                foodAssignments: p.foodAssignments,
              },
            ],
          },
        });
      }

      // Team resolution
      const t = result.data;
      const totalMembers = t.members.length;
      const allocatedCount = t.members.filter((m: any) => m.isAllocated).length;
      const unallocatedCount = totalMembers - allocatedCount;
      let accommodationStatus: "NOT_STARTED" | "PARTIALLY_ALLOCATED" | "FULLY_ALLOCATED" = "NOT_STARTED";
      if (allocatedCount === totalMembers && totalMembers > 0) {
        accommodationStatus = "FULLY_ALLOCATED";
      } else if (allocatedCount > 0) {
        accommodationStatus = "PARTIALLY_ALLOCATED";
      }

      return NextResponse.json({
        success: true,
        resolvedType: "TEAM",
        team: {
          ...t,
          accommodationStatus,
          totalMembers,
          allocatedCount,
          unallocatedCount,
        },
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_QR_RESOLVE_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
