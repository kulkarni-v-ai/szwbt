import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tournament/fixtures/teams
 * Queries tournament teams for the draw selector, showing assignment status and eligibility.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const availableOnly = searchParams.get("available") === "true";

    // Fetch all teams
    const teams = await prisma.team.findMany({
      orderBy: { teamCode: "asc" },
    });

    // Fetch all fixture positions to find assignments
    const positions = await prisma.fixturePosition.findMany({
      where: { teamId: { not: null } },
      select: { id: true, pool: true, side: true, teamId: true, isFixed: true },
    });

    const assignmentMap = new Map(positions.map((p) => [p.teamId!, p]));

    let enriched = teams.map((t) => {
      const assignedPos = assignmentMap.get(t.id);
      return {
        id: t.id,
        teamCode: t.teamCode,
        name: t.name,
        institution: t.institution,
        state: t.state,
        status: t.status,
        managerName: t.managerName,
        managerPhone: t.managerPhone,
        captainName: t.captainName,
        captainPhone: t.captainPhone,
        isAssigned: !!assignedPos,
        assignedPositionId: assignedPos?.id || null,
        assignedPool: assignedPos?.pool || null,
        isFixed: assignedPos?.isFixed || false,
        category: "Institution Teams (Women)",
        eligibility: "ELIGIBLE",
      };
    });

    if (availableOnly) {
      enriched = enriched.filter((t) => !t.isAssigned);
    }

    if (query) {
      enriched = enriched.filter(
        (t) =>
          t.teamCode.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.institution.toLowerCase().includes(query) ||
          t.state.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      totalCount: teams.length,
      availableCount: enriched.filter((t) => !t.isAssigned).length,
      teams: enriched,
    });
  } catch (error: any) {
    console.error("[GET /api/tournament/fixtures/teams] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search teams", details: error.message },
      { status: 500 }
    );
  }
}
