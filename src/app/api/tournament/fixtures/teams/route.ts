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

    // Fetch all fixture positions & bracket slot assignments to find assignments
    const positions = await prisma.fixturePosition.findMany({
      where: { teamId: { not: null } },
      select: { id: true, pool: true, side: true, teamId: true, isFixed: true },
    });

    let slotAssignments: any[] = [];
    try {
      if ((prisma as any).bracketSlotAssignment?.findMany) {
        slotAssignments = await (prisma as any).bracketSlotAssignment.findMany({
          where: { teamId: { not: null } },
          select: { id: true, pool: true, slot: true, teamId: true, teamNumber: true },
        });
      } else {
        slotAssignments = await (prisma as any).$queryRawUnsafe(
          `SELECT "id", "pool", "slot", "teamId", "teamNumber" FROM "bracket_slot_assignments" WHERE "teamId" IS NOT NULL`
        );
      }
    } catch {
      slotAssignments = [];
    }

    const assignmentMap = new Map(positions.map((p) => [p.teamId!, p]));
    const slotMap = new Map(slotAssignments.map((s) => [s.teamId!, s]));

    let enriched = teams.map((t) => {
      const assignedPos = assignmentMap.get(t.id);
      const assignedSlot = slotMap.get(t.id);
      const numMatch = t.teamCode.match(/(\d+)/);
      const teamNumber = numMatch ? parseInt(numMatch[1], 10) : null;

      const isAssigned = !!assignedPos || !!assignedSlot;

      return {
        id: t.id,
        teamCode: t.teamCode,
        teamNumber,
        name: t.name,
        institution: t.institution,
        state: t.state,
        status: t.status,
        managerName: t.managerName,
        managerPhone: t.managerPhone,
        captainName: t.captainName,
        captainPhone: t.captainPhone,
        isAssigned,
        assignedPositionId: assignedPos?.id || null,
        assignedPool: assignedSlot?.pool || assignedPos?.pool || null,
        assignedSlot: assignedSlot?.slot || null,
        isFixed: assignedPos?.isFixed || false,
        category: "Institution Teams (Women)",
        eligibility: "ELIGIBLE",
      };
    });

    const numberParam = searchParams.get("number");
    if (numberParam) {
      const targetNum = parseInt(numberParam, 10);
      if (!isNaN(targetNum)) {
        enriched = enriched.filter((t) => t.teamNumber === targetNum);
      }
    } else if (query) {
      const numQuery = parseInt(query, 10);
      enriched = enriched.filter((t) => {
        if (!isNaN(numQuery) && t.teamNumber === numQuery) return true;
        return (
          t.teamCode.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.institution.toLowerCase().includes(query) ||
          t.state.toLowerCase().includes(query)
        );
      });

      // Sort exact team number to top
      if (!isNaN(numQuery)) {
        enriched.sort((a, b) => (a.teamNumber === numQuery ? -1 : b.teamNumber === numQuery ? 1 : 0));
      }
    }

    if (availableOnly) {
      enriched = enriched.filter((t) => !t.isAssigned);
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
