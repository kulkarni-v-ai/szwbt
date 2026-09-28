import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyTournamentAdminClearance } from "@/lib/tournament/auth";
import {
  initFixtureGraph,
  getDrawState,
  assignFixedTeam,
  startDraw,
  assignTeamToCurrentDraw,
  correctAssignment,
  lockFixture,
  publishFixture,
  validateFixtureGraph,
  ensureTournamentTeams,
} from "@/lib/tournament/fixtureService";

/**
 * GET /api/tournament/fixtures
 * Public read-only endpoint returning complete fixture graph, positions, matches, and state.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const poolFilter = searchParams.get("pool"); // "A", "B", "C", "D", "CHAMPIONSHIP"
    const roundFilter = searchParams.get("round");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase();

    // 1. Get Draw State & Metadata
    const drawState = await getDrawState();

    // 2. Query Positions
    let positions = await prisma.fixturePosition.findMany({
      orderBy: { globalSequence: "asc" },
    });

    if (poolFilter && ["A", "B", "C", "D"].includes(poolFilter.toUpperCase())) {
      positions = positions.filter((p) => p.pool === poolFilter.toUpperCase());
    }

    // 3. Query Matches
    const matchWhere: any = {
      publicMatchNumber: { not: null },
    };

    if (poolFilter) {
      matchWhere.pool = poolFilter.toUpperCase();
    }
    if (roundFilter) {
      matchWhere.roundStage = roundFilter.toUpperCase();
    }
    if (statusFilter) {
      matchWhere.status = statusFilter.toUpperCase();
    }

    let matches = await prisma.match.findMany({
      where: matchWhere,
      include: {
        day: { select: { id: true, date: true, dayNumber: true, stage: true } },
        events: { orderBy: { timestamp: "desc" }, take: 5 },
      },
      orderBy: [{ roundOrder: "asc" }, { publicMatchNumber: "asc" }],
    });

    if (search) {
      matches = matches.filter(
        (m) =>
          m.publicMatchNumber?.toLowerCase().includes(search) ||
          m.playerA.toLowerCase().includes(search) ||
          m.playerB.toLowerCase().includes(search) ||
          m.institutionA.toLowerCase().includes(search) ||
          m.institutionB.toLowerCase().includes(search) ||
          m.roundName?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        config: drawState.config,
        currentDrawNumber: drawState.currentDrawNumber,
        currentPosition: drawState.currentPosition,
        nextPosition: drawState.nextPosition,
        totalAssigned: drawState.totalAssigned,
        totalRemaining: drawState.totalRemaining,
        fixedTeamsCount: drawState.fixedTeamsCount,
        isComplete: drawState.isComplete,
        isLocked: drawState.isLocked,
        isPublished: drawState.isPublished,
        poolStats: drawState.poolStats,
        positions,
        matches,
        history: drawState.history,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/tournament/fixtures] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve tournament fixtures.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournament/fixtures
 * Administrative actions: START_DRAW, ASSIGN_DRAW, ASSIGN_FIXED, CORRECTION, LOCK, PUBLISH, INIT, PROVISION_TEAMS.
 * Protected by RBAC.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return auth.response;
    }
    const context = auth.context;
    const authCheck = verifyTournamentAdminClearance(context);

    if (!authCheck.authorized || !context) {
      return (
        authCheck.errorResponse ||
        NextResponse.json({ success: false, error: "401 Unauthorized" }, { status: 401 })
      );
    }

    if (!authCheck.canConfigure) {
      return NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance. TOURNAMENT_ADMIN or SUPER_ADMIN required.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;
    const actorEmail = context.user.email;

    switch (action) {
      case "INIT": {
        const result = await initFixtureGraph();
        return NextResponse.json({ success: true, message: "Fixture graph initialized.", data: result });
      }

      case "PROVISION_TEAMS": {
        const result = await ensureTournamentTeams(100);
        return NextResponse.json({ success: true, message: "100 tournament teams ensured.", data: result });
      }

      case "START_DRAW": {
        const result = await startDraw(actorEmail);
        return NextResponse.json({ success: true, message: "Championship draw started.", data: result });
      }

      case "ASSIGN_FIXED": {
        const { teamId, pool, positionId, fixedReason } = body;
        if (!teamId || !pool || !positionId) {
          return NextResponse.json(
            { success: false, error: "teamId, pool, and positionId are required." },
            { status: 400 }
          );
        }
        const result = await assignFixedTeam({
          teamId,
          pool,
          positionId,
          fixedReason,
          actorEmail,
        });
        return NextResponse.json({ success: true, message: "Fixed team assigned.", data: result });
      }

      case "ASSIGN_DRAW": {
        const { teamId, expectedPositionId } = body;
        if (!teamId) {
          return NextResponse.json({ success: false, error: "teamId is required for draw assignment." }, { status: 400 });
        }
        const result = await assignTeamToCurrentDraw({
          teamId,
          expectedPositionId,
          actorEmail,
        });
        return NextResponse.json({
          success: true,
          message: "Team successfully assigned to fixture.",
          data: result,
        });
      }

      case "CORRECTION": {
        const { positionId, newTeamId, reason } = body;
        if (!positionId || !newTeamId || !reason) {
          return NextResponse.json(
            { success: false, error: "positionId, newTeamId, and audit reason are required for correction." },
            { status: 400 }
          );
        }
        const result = await correctAssignment({
          positionId,
          newTeamId,
          reason,
          actorEmail,
        });
        return NextResponse.json({ success: true, message: "Assignment corrected.", data: result });
      }

      case "LOCK": {
        const result = await lockFixture(actorEmail);
        return NextResponse.json({ success: true, message: "Fixture locked.", data: result });
      }

      case "PUBLISH": {
        const result = await publishFixture(actorEmail);
        return NextResponse.json({ success: true, message: "Fixture published.", data: result });
      }

      case "VALIDATE": {
        const report = await validateFixtureGraph();
        return NextResponse.json({ success: true, data: report });
      }

      default:
        return NextResponse.json({ success: false, error: `Unrecognized action "${action}".` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[POST /api/tournament/fixtures] Error:", error);
    const status = error.message?.includes("DRAW STATE CHANGED")
      ? 409
      : error.message?.includes("DUPLICATE ASSIGNMENT")
      ? 409
      : error.message?.includes("Forbidden")
      ? 403
      : error.message?.includes("Unauthorized")
      ? 401
      : 400;

    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute fixture action." },
      { status }
    );
  }
}
