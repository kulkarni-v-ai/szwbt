import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { getScoringConfigForCategory } from "@/lib/scoring/rules";

/**
 * GET /api/official/matches/[id]
 * Fetches single match telemetry, readiness checklist, scoring config, and event timeline.
 * Strictly verifies that the authenticated official is assigned to this match.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          day: true,
          events: { orderBy: { timestamp: "asc" } },
        },
      });

      if (!match) {
        return NextResponse.json(
          { success: false, error: "Match not found." },
          { status: 404 }
        );
      }

      // RESOURCE-LEVEL AUTHORIZATION:
      // Verify match assignment unless Super/Tournament Admin
      const isSuper =
        context.roles.includes(ROLES.SUPER_ADMIN) ||
        context.roles.includes(ROLES.TOURNAMENT_ADMIN);

      const isAssigned =
        match.assignedOfficialId &&
        (match.assignedOfficialId === context.user.id ||
          match.assignedOfficialId === context.user.officialId ||
          match.assignedOfficialId === context.user.email);

      if (!isSuper && !isAssigned) {
        return NextResponse.json(
          {
            success: false,
            error: `403 Forbidden: You are not assigned to officiate match ${match.matchNumber}. Access denied.`,
          },
          { status: 403 }
        );
      }

      // Fetch court details
      let court = null;
      if (match.court && match.court !== "TBA") {
        court = await prisma.court.findFirst({
          where: { courtNumber: { equals: match.court, mode: "insensitive" } },
        });
      }

      // Scoring configuration
      const scoringConfig = getScoringConfigForCategory(match.category);

      // Compute database-driven readiness checklist
      const courtAssigned = Boolean(match.court && match.court !== "TBA" && match.court !== "Unassigned");
      const participantsConfigured = Boolean(
        match.playerA && match.playerA.trim() !== "" && match.playerB && match.playerB.trim() !== ""
      );
      const officialAssigned = Boolean(match.assignedOfficialId);
      const scoringConfigured = Boolean(scoringConfig);
      const readyToStart =
        courtAssigned &&
        participantsConfigured &&
        officialAssigned &&
        scoringConfigured &&
        match.status !== "COMPLETED";

      const readiness = {
        matchAssigned: true,
        courtAssigned,
        courtName: match.court,
        participantsConfigured,
        officialAssigned,
        scoringConfigured,
        readyToStart,
        issues: [
          !courtAssigned ? "Court is not assigned (TBA)" : null,
          !participantsConfigured ? "Participating players/teams are missing" : null,
          !officialAssigned ? "Match official is not assigned" : null,
        ].filter(Boolean),
      };

      return NextResponse.json({
        success: true,
        data: {
          match,
          court,
          events: match.events,
          scoringConfig,
          readiness,
          serverTime: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[GET /api/official/matches/[id]] Error:", error);
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
