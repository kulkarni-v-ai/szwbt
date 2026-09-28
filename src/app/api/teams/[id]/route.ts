import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

export const GET = withAuth(
  async (req: NextRequest, context: UserContext, routeProps: any) => {
    try {
      const teamId = routeProps?.params?.id;

      if (!teamId) {
        return NextResponse.json({ success: false, error: "Team ID is required." }, { status: 400 });
      }

      // RESOURCE-LEVEL OWNERSHIP CHECK
      const isSuperOrStaff =
        context.roles.includes("SUPER_ADMIN") ||
        context.roles.includes("REGISTRATION_STAFF") ||
        context.roles.includes("TOURNAMENT_ADMIN") ||
        context.roles.includes("ORGANIZER");

      if (!isSuperOrStaff) {
        // If Team Manager, can ONLY access own team
        if (context.roles.includes("TEAM_MANAGER")) {
          const isOwnTeam = context.user.teamId === teamId;
          if (!isOwnTeam) {
            return NextResponse.json(
              {
                success: false,
                error: "403 Forbidden: Team Manager cannot access another institution's private team data.",
              },
              { status: 403 }
            );
          }
        }
      }

      const team = await prisma.team.findFirst({
        where: {
          OR: [{ id: teamId }, { teamCode: teamId }],
        },
        include: {
          members: { include: { participant: true } },
          bedAllocations: { include: { bed: { include: { room: true } } } },
        },
      });

      if (!team) {
        return NextResponse.json({ success: false, error: "Team not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        team,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.TEAM_READ],
  }
);
