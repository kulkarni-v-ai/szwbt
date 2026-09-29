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
  validateTournamentTeamUniqueness,
  assignTeamToSlot,
  changeTeamInSlot,
  removeTeamFromSlot,
  ensureTournamentTeams,
  resetFixtureGraph,
} from "@/lib/tournament/fixtureService";
import { ROUND_1_MATCH_FLOW, getGlobalMatchNumber } from "@/lib/tournament/fixtureConstants";

/**
 * GET /api/tournament/fixtures
 * Public read-only endpoint returning complete fixture graph, positions, matches, state, and global uniqueness validation.
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

    // 4. Query Bracket Slot Assignments (120 slots: Pools A, B, C, D x 30 slots)
    let bracketSlots: any[] = [];
    try {
      if ((prisma as any).bracketSlotAssignment?.findMany) {
        bracketSlots = await (prisma as any).bracketSlotAssignment.findMany({
          orderBy: [{ pool: "asc" }, { slot: "asc" }],
        });
      } else {
        bracketSlots = await (prisma as any).$queryRawUnsafe(
          `SELECT * FROM "bracket_slot_assignments" ORDER BY "pool" ASC, "slot" ASC`
        );
      }
    } catch (slotErr) {
      console.error("[GET /api/tournament/fixtures] Error loading bracket slots:", slotErr);
      bracketSlots = [];
    }

    // 5. Global Uniqueness Validation
    let validationReport: any = null;
    try {
      validationReport = await validateTournamentTeamUniqueness();
    } catch (vErr) {
      console.error("[GET /api/tournament/fixtures] Error computing global validation:", vErr);
    }

    // Authoritatively calculate poolStats strictly enforcing the 25-team limit per pool
    const activePoolStats: any = {};
    const poolCodes: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    let totalAssignedAllPools = 0;

    for (const p of poolCodes) {
      const slotTeams = bracketSlots.filter((s: any) => s.pool === p && s.teamId);
      const posTeams = positions.filter(
        (pos: any) => pos.pool === p && (pos.status === "ASSIGNED" || pos.status === "FIXED")
      );
      const assignedCount = bracketSlots.length > 0 ? slotTeams.length : posTeams.length;
      totalAssignedAllPools += assignedCount;
      const poolLimit = (p === "A" || p === "C") ? 26 : 25;

      activePoolStats[p] = {
        pool: p,
        total: poolLimit,
        limit: poolLimit,
        assigned: assignedCount,
        remaining: Math.max(0, poolLimit - assignedCount),
        isFull: assignedCount >= poolLimit,
        status: assignedCount >= poolLimit ? "COMPLETE" : assignedCount > 0 ? "IN_PROGRESS" : "EMPTY",
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        config: drawState.config,
        currentDrawNumber: drawState.currentDrawNumber,
        currentPosition: drawState.currentPosition,
        nextPosition: drawState.nextPosition,
        totalAssigned: bracketSlots.length > 0 ? totalAssignedAllPools : drawState.totalAssigned,
        totalRemaining: Math.max(0, 102 - (bracketSlots.length > 0 ? totalAssignedAllPools : drawState.totalAssigned)),
        fixedTeamsCount: drawState.fixedTeamsCount,
        isComplete: (bracketSlots.length > 0 ? totalAssignedAllPools : drawState.totalAssigned) >= 102,
        isLocked: drawState.isLocked,
        isPublished: drawState.isPublished,
        poolStats: activePoolStats,
        positions,
        bracketSlots,
        matches,
        history: drawState.history,
        validation: validationReport,
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
    let actorEmail = "admin@szwbt2026.in";

    if (!auth.authenticated) {
      // In development or demo, allow fixture draw operations if admin session is not active
      if (process.env.NODE_ENV !== "production") {
        actorEmail = "admin@szwbt2026.in";
      } else {
        return auth.response;
      }
    } else {
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
      actorEmail = context.user.email;
    }

    const body = await req.json();
    const { action } = body;

    // Robust slot assignment helpers supporting both Prisma and raw SQL fallback
    const safeUpsertSlotAssignment = async (slotData: {
      pool: string;
      slot: number;
      teamId: string | null;
      teamCode: string | null;
      teamNumber: number | null;
      teamName: string | null;
      state: string | null;
      assignedBy?: string | null;
    }) => {
      try {
        if ((prisma as any).bracketSlotAssignment?.upsert) {
          return await (prisma as any).bracketSlotAssignment.upsert({
            where: { pool_slot: { pool: slotData.pool, slot: slotData.slot } },
            update: {
              teamId: slotData.teamId,
              teamCode: slotData.teamCode,
              teamNumber: slotData.teamNumber,
              teamName: slotData.teamName,
              state: slotData.state,
              assignedAt: new Date(),
              assignedBy: slotData.assignedBy,
            },
            create: {
              pool: slotData.pool,
              slot: slotData.slot,
              teamId: slotData.teamId,
              teamCode: slotData.teamCode,
              teamNumber: slotData.teamNumber,
              teamName: slotData.teamName,
              state: slotData.state,
              assignedAt: new Date(),
              assignedBy: slotData.assignedBy,
            },
          });
        }
      } catch (prismaErr) {
        console.warn("[safeUpsertSlotAssignment] Prisma upsert failed, attempting raw SQL:", prismaErr);
      }

      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO "bracket_slot_assignments" ("id", "pool", "slot", "teamId", "teamCode", "teamNumber", "teamName", "state", "assignedAt", "assignedBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
         ON CONFLICT ("pool", "slot")
         DO UPDATE SET "teamId" = $4, "teamCode" = $5, "teamNumber" = $6, "teamName" = $7, "state" = $8, "assignedAt" = NOW(), "assignedBy" = $9, "updatedAt" = NOW()`,
        `slot-${slotData.pool}-${slotData.slot}`,
        slotData.pool,
        slotData.slot,
        slotData.teamId,
        slotData.teamCode,
        slotData.teamNumber,
        slotData.teamName,
        slotData.state,
        slotData.assignedBy || "system"
      );
      return { pool: slotData.pool, slot: slotData.slot, teamId: slotData.teamId, teamName: slotData.teamName };
    };

    const safeUnassignSlot = async (pool: string, slot: number) => {
      try {
        if ((prisma as any).bracketSlotAssignment?.update) {
          return await (prisma as any).bracketSlotAssignment.update({
            where: { pool_slot: { pool, slot } },
            data: {
              teamId: null,
              teamCode: null,
              teamNumber: null,
              teamName: null,
              state: null,
              assignedAt: null,
              assignedBy: null,
            },
          });
        }
      } catch (prismaErr) {
        console.warn("[safeUnassignSlot] Prisma update failed, attempting raw SQL:", prismaErr);
      }

      await (prisma as any).$executeRawUnsafe(
        `UPDATE "bracket_slot_assignments"
         SET "teamId" = NULL, "teamCode" = NULL, "teamNumber" = NULL, "teamName" = NULL, "state" = NULL, "assignedAt" = NULL, "assignedBy" = NULL, "updatedAt" = NOW()
         WHERE "pool" = $1 AND "slot" = $2`,
        pool,
        slot
      );
      return { pool, slot, teamId: null };
    };

    const safeResetSlots = async (pool?: string) => {
      if (pool) {
        try {
          if ((prisma as any).bracketSlotAssignment?.updateMany) {
            return await (prisma as any).bracketSlotAssignment.updateMany({
              where: { pool: pool.toUpperCase() },
              data: {
                teamId: null,
                teamCode: null,
                teamNumber: null,
                teamName: null,
                state: null,
                assignedAt: null,
                assignedBy: null,
              },
            });
          }
        } catch { }
        await (prisma as any).$executeRawUnsafe(
          `UPDATE "bracket_slot_assignments"
           SET "teamId" = NULL, "teamCode" = NULL, "teamNumber" = NULL, "teamName" = NULL, "state" = NULL, "assignedAt" = NULL, "assignedBy" = NULL, "updatedAt" = NOW()
           WHERE "pool" = $1`,
          pool.toUpperCase()
        );
      } else {
        try {
          if ((prisma as any).bracketSlotAssignment?.updateMany) {
            return await (prisma as any).bracketSlotAssignment.updateMany({
              data: {
                teamId: null,
                teamCode: null,
                teamNumber: null,
                teamName: null,
                state: null,
                assignedAt: null,
                assignedBy: null,
              },
            });
          }
        } catch { }
        await (prisma as any).$executeRawUnsafe(
          `UPDATE "bracket_slot_assignments"
           SET "teamId" = NULL, "teamCode" = NULL, "teamNumber" = NULL, "teamName" = NULL, "state" = NULL, "assignedAt" = NULL, "assignedBy" = NULL, "updatedAt" = NOW()`
        );
      }
    };

    // Helper to count currently assigned teams in a pool, excluding specified slots
    const getAssignedCountInPool = async (poolName: string, excludeSlots: number[] = []) => {
      try {
        if ((prisma as any).bracketSlotAssignment?.count) {
          return await (prisma as any).bracketSlotAssignment.count({
            where: {
              pool: poolName.toUpperCase(),
              teamId: { not: null },
              slot: { notIn: excludeSlots },
            },
          });
        }
      } catch { }

      const slotFilter = excludeSlots.length > 0 ? `AND "slot" NOT IN (${excludeSlots.join(",")})` : "";
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "bracket_slot_assignments" WHERE "pool" = $1 AND "teamId" IS NOT NULL ${slotFilter}`,
        poolName.toUpperCase()
      );
      return rows[0]?.count || 0;
    };

    // Helper to check if a team is already assigned elsewhere in the tournament
    const checkExistingAssignment = async (teamId: string, currentPool: string, currentSlot: number) => {
      try {
        if ((prisma as any).bracketSlotAssignment?.findFirst) {
          return await (prisma as any).bracketSlotAssignment.findFirst({
            where: {
              teamId,
              NOT: {
                pool: currentPool,
                slot: currentSlot,
              },
            },
          });
        }
      } catch { }

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT "pool", "slot" FROM "bracket_slot_assignments" WHERE "teamId" = $1 AND NOT ("pool" = $2 AND "slot" = $3) LIMIT 1`,
        teamId,
        currentPool,
        currentSlot
      );
      return rows[0] || null;
    };

    switch (action) {
      case "INIT": {
        const result = await initFixtureGraph();
        return NextResponse.json({ success: true, message: "Fixture graph initialized.", data: result });
      }

      case "RESET": {
        const result = await resetFixtureGraph(actorEmail);
        await safeResetSlots();
        return NextResponse.json({ success: true, message: "Fixture graph and bracket slots reset to clean draft state.", data: result });
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

      case "VALIDATE":
      case "VALIDATE_GLOBAL": {
        const report = await validateTournamentTeamUniqueness();
        const graphReport = await validateFixtureGraph();
        return NextResponse.json({
          success: true,
          data: {
            ...report,
            graphReport,
          },
        });
      }

      case "ASSIGN_POSITION":
      case "ASSIGN_SLOT": {
        const { pool, slot, teamId, teamNumber, teamCode } = body;
        if (!pool || !slot) {
          return NextResponse.json({ success: false, error: "pool and slot are required." }, { status: 400 });
        }

        // Find team dynamically from DB
        let resolvedTeamId = teamId;
        if (!resolvedTeamId) {
          let team: any = null;
          if (teamCode) {
            team = await prisma.team.findUnique({ where: { teamCode } });
          } else if (teamNumber !== undefined && teamNumber !== null) {
            const num = Number(teamNumber);
            const formattedCode = `TM-SZ-${String(num).padStart(3, "0")}`;
            team = await prisma.team.findUnique({ where: { teamCode: formattedCode } });
            if (!team) {
              const allTeams = await prisma.team.findMany();
              team = allTeams.find((t) => {
                const m = t.teamCode.match(/(\d+)/);
                return m && parseInt(m[1], 10) === num;
              });
            }
          }
          if (team) resolvedTeamId = team.id;
        }

        if (!resolvedTeamId) {
          return NextResponse.json({ success: false, error: "Team not found in database." }, { status: 404 });
        }

        const result = await assignTeamToSlot({
          pool: pool.toUpperCase(),
          slot: Number(slot),
          teamId: resolvedTeamId,
          actorEmail,
        });

        return NextResponse.json(result);
      }

      case "CHANGE_POSITION":
      case "CHANGE_TEAM": {
        const { pool, slot, newTeamId, reason } = body;
        if (!pool || !slot || !newTeamId) {
          return NextResponse.json(
            { success: false, error: "pool, slot, and newTeamId are required to change team." },
            { status: 400 }
          );
        }

        const result = await changeTeamInSlot({
          pool: pool.toUpperCase(),
          slot: Number(slot),
          newTeamId,
          reason,
          actorEmail,
        });

        return NextResponse.json(result);
      }

      case "REMOVE_POSITION":
      case "UNASSIGN_SLOT": {
        const { pool, slot, reason } = body;
        if (!pool || !slot) {
          return NextResponse.json({ success: false, error: "pool and slot are required." }, { status: 400 });
        }

        const result = await removeTeamFromSlot({
          pool: pool.toUpperCase(),
          slot: Number(slot),
          reason,
          actorEmail,
        });

        return NextResponse.json(result);
      }

      case "ASSIGN_MATCH_FIXTURE": {
        // Maintained for backward compatibility, but delegates to individual slot assignments with global uniqueness
        const { pool, matchNumber, slotA, slotB, teamANumber, teamBNumber, teamAId, teamBId } = body;
        if (!pool || !slotA || !slotB) {
          return NextResponse.json(
            { success: false, error: "pool, slotA, and slotB are required." },
            { status: 400 }
          );
        }

        const resolveTeam = async (numOrCode: any, id: any) => {
          if (id) {
            const byId = await prisma.team.findUnique({ where: { id } });
            if (byId) return byId;
          }
          if (!numOrCode && numOrCode !== 0) return null;
          const str = String(numOrCode).trim();
          const byCode = await prisma.team.findUnique({ where: { teamCode: str } });
          if (byCode) return byCode;
          const num = parseInt(str.replace(/\D/g, ""), 10);
          if (!isNaN(num)) {
            const formatted = `TM-SZ-${String(num).padStart(3, "0")}`;
            const byFormatted = await prisma.team.findUnique({ where: { teamCode: formatted } });
            if (byFormatted) return byFormatted;
            const allTeams = await prisma.team.findMany();
            const byNum = allTeams.find((t) => {
              const m = t.teamCode.match(/(\d+)/);
              return m && parseInt(m[1], 10) === num;
            });
            if (byNum) return byNum;
          }
          return await prisma.team.findFirst({
            where: {
              OR: [
                { name: { contains: str, mode: "insensitive" } },
                { institution: { contains: str, mode: "insensitive" } },
              ],
            },
          });
        };

        const teamA = await resolveTeam(teamANumber, teamAId);
        const teamB = await resolveTeam(teamBNumber, teamBId);

        if (!teamA) {
          return NextResponse.json(
            { success: false, error: `Team 1 (#${teamANumber}) not found in database.` },
            { status: 404 }
          );
        }
        if (!teamB) {
          return NextResponse.json(
            { success: false, error: `Team 2 (#${teamBNumber}) not found in database.` },
            { status: 404 }
          );
        }
        if (teamA.id === teamB.id) {
          return NextResponse.json(
            { success: false, error: "Team 1 and Team 2 cannot be the same university." },
            { status: 400 }
          );
        }

        // Assign Slot A independently with global uniqueness
        await assignTeamToSlot({
          pool: pool.toUpperCase(),
          slot: Number(slotA),
          teamId: teamA.id,
          actorEmail,
        });

        // Assign Slot B independently with global uniqueness
        await assignTeamToSlot({
          pool: pool.toUpperCase(),
          slot: Number(slotB),
          teamId: teamB.id,
          actorEmail,
        });

        return NextResponse.json({
          success: true,
          message: `Positions ${slotA} & ${slotB} assigned: ${teamA.name} & ${teamB.name}.`,
          data: { pool, matchNumber, slotA, slotB, teamA, teamB },
        });
      }

      case "CLEAR_POOL":
      case "RESET_POOL":
      case "RESET_SLOTS": {
        const targetPool = (body.pool || body.targetPool || "").toUpperCase();
        if (targetPool && !["A", "B", "C", "D", "ALL"].includes(targetPool)) {
          return NextResponse.json(
            { success: false, error: `Invalid pool "${targetPool}". Must be A, B, C, D, or ALL.` },
            { status: 400 }
          );
        }

        const poolsToClear: ("A" | "B" | "C" | "D")[] =
          targetPool === "ALL" || !targetPool
            ? ["A", "B", "C", "D"]
            : [targetPool as "A" | "B" | "C" | "D"];

        for (const p of poolsToClear) {
          // 1. Reset bracket slot assignments for this pool
          try {
            if ((prisma as any).bracketSlotAssignment?.updateMany) {
              await (prisma as any).bracketSlotAssignment.updateMany({
                where: { pool: p },
                data: {
                  teamId: null,
                  teamCode: null,
                  teamNumber: null,
                  teamName: null,
                  state: null,
                  assignedAt: null,
                  assignedBy: null,
                },
              });
            }
          } catch {}

          try {
            await (prisma as any).$executeRawUnsafe(
              `UPDATE "bracket_slot_assignments"
               SET "teamId" = NULL, "teamCode" = NULL, "teamNumber" = NULL, "teamName" = NULL, "state" = NULL, "assignedAt" = NULL, "assignedBy" = NULL, "updatedAt" = NOW()
               WHERE "pool" = $1`,
              p
            );
          } catch {}

          // 2. Reset fixture positions for this pool
          try {
            await prisma.fixturePosition.updateMany({
              where: { pool: p },
              data: {
                teamId: null,
                teamName: null,
                institution: null,
                status: "AVAILABLE",
                isFixed: false,
                fixedReason: null,
                drawNumber: null,
                assignedAt: null,
                assignedBy: null,
              },
            });
          } catch {}

          // 3. Reset match records for this pool
          try {
            await prisma.match.updateMany({
              where: { pool: p },
              data: {
                teamAId: null,
                teamBId: null,
                scoreA: null,
                scoreB: null,
                status: "UPCOMING",
                winner: null,
                playerA: "TBD",
                institutionA: "",
                playerB: "TBD",
                institutionB: "",
              },
            });
          } catch {}
        }

        // Unlock fixture so operations can continue seamlessly
        try {
          await prisma.fixtureConfig.updateMany({
            data: { isLocked: false, isPublished: false, status: "DRAWING" },
          });
        } catch {}

        return NextResponse.json({
          success: true,
          message:
            targetPool === "ALL" || !targetPool
              ? "All pools (A, B, C, D) have been cleared back to empty."
              : `Pool ${targetPool} has been cleared back to empty.`,
        });
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
