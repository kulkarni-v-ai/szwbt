import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/accommodation/teams/search
 * Server-side search for teams with their accommodation allocation progress.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = (searchParams.get("q") || "").trim();

      if (!query || query.length < 2) {
        return NextResponse.json({ success: true, count: 0, teams: [] });
      }

      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { teamCode: { contains: query, mode: "insensitive" } },
            { institution: { contains: query, mode: "insensitive" } },
            { managerName: { contains: query, mode: "insensitive" } },
            { captainName: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          members: {
            include: {
              participant: {
                include: {
                  bedAllocations: {
                    where: { status: "ACTIVE" },
                  },
                },
              },
            },
          },
        },
        take: 20,
        orderBy: { name: "asc" },
      });

      const formattedTeams = teams.map((t) => {
        const totalMembers = t.members.length;
        const allocatedMembers = t.members.filter(
          (m) => m.participant.bedAllocations.length > 0
        ).length;
        const unallocatedMembers = totalMembers - allocatedMembers;

        let status: "NOT_STARTED" | "PARTIALLY_ALLOCATED" | "FULLY_ALLOCATED" = "NOT_STARTED";
        if (allocatedMembers === totalMembers && totalMembers > 0) {
          status = "FULLY_ALLOCATED";
        } else if (allocatedMembers > 0) {
          status = "PARTIALLY_ALLOCATED";
        }

        return {
          id: t.id,
          teamCode: t.teamCode,
          name: t.name,
          institution: t.institution,
          state: t.state,
          managerName: t.managerName,
          captainName: t.captainName,
          teamQrToken: t.teamQrToken,
          totalMembers,
          allocatedMembers,
          unallocatedMembers,
          status,
        };
      });

      return NextResponse.json({
        success: true,
        count: formattedTeams.length,
        teams: formattedTeams,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_TEAM_SEARCH_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
