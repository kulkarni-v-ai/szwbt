import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";

/**
 * GET /api/official/matches
 * Fetches only matches assigned to the authenticated match official.
 * Strict resource-level isolation enforced server-side.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const isSuper =
        context.roles.includes(ROLES.SUPER_ADMIN) ||
        context.roles.includes(ROLES.TOURNAMENT_ADMIN);

      const isOfficial = context.roles.includes(ROLES.MATCH_OFFICIAL);

      if (!isSuper && !isOfficial) {
        return NextResponse.json(
          {
            success: false,
            error: "403 Forbidden: You do not hold MATCH_OFFICIAL operational clearance.",
          },
          { status: 403 }
        );
      }

      // Resolve official identifiers
      const officialIdentifiers = [
        context.user.id,
        context.user.officialId,
        context.user.email,
      ].filter(Boolean) as string[];

      // Query database for assigned matches
      const matches = await prisma.match.findMany({
        where: isSuper
          ? undefined
          : {
              assignedOfficialId: { in: officialIdentifiers },
            },
        include: {
          day: { select: { id: true, date: true, dayNumber: true, stage: true } },
          events: { orderBy: { timestamp: "desc" }, take: 5 },
        },
        orderBy: [{ dayId: "asc" }, { time: "asc" }],
      });

      // Fetch all courts for status enrichment
      const courts = await prisma.court.findMany();
      const courtMap = new Map(courts.map((c) => [c.courtNumber.toLowerCase(), c]));

      // Enrich matches with court status
      const enrichedMatches = matches.map((m) => {
        const c = courtMap.get(m.court.toLowerCase());
        return {
          ...m,
          courtStatus: c?.status || "UNKNOWN",
        };
      });

      // Classify into Current, Upcoming, Completed
      const currentMatch =
        enrichedMatches.find((m) => m.status === "LIVE" || m.status === "PAUSED") ||
        enrichedMatches.find((m) => m.status === "UPCOMING" || m.status === "READY") ||
        null;

      const upcomingMatches = enrichedMatches.filter(
        (m) =>
          (m.status === "UPCOMING" || m.status === "READY") &&
          (!currentMatch || m.id !== currentMatch.id)
      );

      const completedMatches = enrichedMatches.filter((m) => m.status === "COMPLETED");

      return NextResponse.json({
        success: true,
        data: {
          currentMatch,
          upcomingMatches,
          completedMatches,
          totalAssigned: matches.length,
          official: {
            id: context.user.id,
            name: context.user.name,
            email: context.user.email,
            officialId: context.user.officialId || "OFFICIAL",
            badge: context.user.badge || "Court Umpire",
          },
          serverTime: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[GET /api/official/matches] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.SCORING_READ],
  }
);
