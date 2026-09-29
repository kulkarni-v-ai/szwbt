import { prisma } from "@/lib/prisma";
import {
  PoolCode,
  SideCode,
  getAllPositionTemplates,
  getAllMatchTemplates,
  getCanonicalDrawSequence,
} from "./fixtureTemplate";
import { logAuditEvent } from "@/lib/rbac/audit";
import {
  ROUND_1_MATCH_FLOW_AC,
  ROUND_1_MATCH_FLOW_BD,
} from "./fixtureConstants";

export interface FixtureValidationReport {
  isValid: boolean;
  totalPositions: number;
  positionsPerPool: Record<PoolCode, number>;
  totalMatches: number;
  totalAssigned: number;
  totalFixed: number;
  uniqueTeamsCount: number;
  fixedTeamsCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Ensures tournament teams exist dynamically up to targetCount (for test/simulation).
 * Uses registered teams from database or dynamic team identifiers without hardcoding fake universities.
 */
export async function ensureTournamentTeams(targetCount = 100): Promise<{ count: number; created: number }> {
  const currentCount = await prisma.team.count();
  if (currentCount >= targetCount) {
    return { count: currentCount, created: 0 };
  }

  // Check if institution master data is present in database
  const institutions = await prisma.institution.findMany({ select: { name: true, state: true } });

  let created = 0;
  for (let i = currentCount + 1; i <= targetCount; i++) {
    const code = `TM-SZ-${String(i).padStart(3, "0")}`;
    const inst = institutions.length > 0
      ? institutions[(i - 1) % institutions.length]
      : { name: `Participating University ${String(i).padStart(3, "0")}`, state: "South Zone" };

    await prisma.team.upsert({
      where: { teamCode: code },
      update: {},
      create: {
        teamCode: code,
        name: `Team ${code}`,
        institution: inst.name,
        state: inst.state,
        status: "COMPLETED",
        managerName: `Manager ${code}`,
        managerPhone: `+91 98765 ${String(10000 + i).slice(-5)}`,
        captainName: `Captain ${code}`,
        captainPhone: `+91 91234 ${String(10000 + i).slice(-5)}`,
      },
    });
    created++;
  }

  const finalCount = await prisma.team.count();
  return { count: finalCount, created };
}

/**
 * Initializes the entire 100-team fixture graph in advance.
 * Generates all 100 fixture positions and all 100 real database Match records.
 */
export async function initFixtureGraph(): Promise<{
  success: boolean;
  positionsCount: number;
  matchesCount: number;
  status: string;
}> {
  // 1. Ensure Tournament Days exist
  const days = [
    { id: "OCT18", date: "OCT 18", dayNumber: "Day 1", stage: "Round 1", isPublished: true },
    { id: "OCT19", date: "OCT 19", dayNumber: "Day 2", stage: "Round 2 & QF", isPublished: false },
    { id: "OCT20", date: "OCT 20", dayNumber: "Day 3", stage: "Semi-Finals", isPublished: false },
    { id: "OCT21", date: "OCT 21", dayNumber: "Day 4", stage: "Grand Finals", isPublished: false },
  ];

  for (const day of days) {
    await prisma.tournamentDay.upsert({
      where: { id: day.id },
      update: day,
      create: day,
    });
  }

  // 2. Ensure FixtureConfig exists
  let config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });

  if (!config) {
    config = await prisma.fixtureConfig.create({
      data: {
        id: "SZWBT-2026-FIXTURE",
        status: "DRAFT",
        totalTeams: 100,
        teamsPerPool: 25,
        currentDrawNumber: 1,
        currentPool: "A",
        currentSide: "FIRST",
      },
    });
  }

  // 3. Pre-create all 100 Match database records (M001 to M100)
  const matchTemplates = getAllMatchTemplates();

  for (const mt of matchTemplates) {
    const existing = await prisma.match.findUnique({
      where: { publicMatchNumber: mt.publicMatchNumber },
    });

    const matchData = {
      publicMatchNumber: mt.publicMatchNumber,
      matchNumber: `${mt.pool} - ${mt.roundName} - ${mt.publicMatchNumber}`,
      dayId: mt.dayId,
      time: mt.time,
      court: mt.court,
      category: "Institution Teams",
      pool: mt.pool,
      roundStage: mt.roundStage,
      roundName: mt.roundName,
      roundOrder: mt.roundOrder,
      sourceAType: mt.sourceAType,
      sourceBType: mt.sourceBType,
      sourceAPositionId: mt.sourceAPositionId,
      sourceBPositionId: mt.sourceBPositionId,
      sourceAMatchNumber: mt.sourceAMatchNumber,
      sourceBMatchNumber: mt.sourceBMatchNumber,
      downstreamMatchNumber: mt.downstreamMatchNumber,
      downstreamSlot: mt.downstreamSlot,
      playerA: existing?.playerA || (mt.sourceAType === "POSITION" ? `TBD (${mt.sourceAPositionId})` : `Winner of ${mt.sourceAMatchNumber}`),
      institutionA: existing?.institutionA || "",
      playerB: existing?.playerB || (mt.sourceBType === "POSITION" ? `TBD (${mt.sourceBPositionId})` : mt.sourceBType === "LOSER" ? `Loser of ${mt.sourceBMatchNumber}` : `Winner of ${mt.sourceBMatchNumber}`),
      institutionB: existing?.institutionB || "",
      status: existing?.status || "UPCOMING",
    };

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: matchData,
      });
    } else {
      await prisma.match.create({
        data: matchData,
      });
    }
  }

  // 4. Update Match upstream/downstream internal UUID references
  const allDbMatches = await prisma.match.findMany({
    where: { publicMatchNumber: { not: null } },
  });
  const matchNumToId = new Map(allDbMatches.map((m: any) => [m.publicMatchNumber!, m.id]));

  for (const m of allDbMatches) {
    const sourceAMatchId = m.sourceAMatchNumber ? matchNumToId.get(m.sourceAMatchNumber) : null;
    const sourceBMatchId = m.sourceBMatchNumber ? matchNumToId.get(m.sourceBMatchNumber) : null;
    const downstreamMatchId = m.downstreamMatchNumber ? matchNumToId.get(m.downstreamMatchNumber) : null;

    if (sourceAMatchId || sourceBMatchId || downstreamMatchId) {
      await prisma.match.update({
        where: { id: m.id },
        data: {
          sourceAMatchId: sourceAMatchId ?? undefined,
          sourceBMatchId: sourceBMatchId ?? undefined,
          downstreamMatchId: downstreamMatchId ?? undefined,
        },
      });
    }
  }

  // 5. Pre-create all 100 FixturePosition records
  const positionTemplates = getAllPositionTemplates();

  for (const pt of positionTemplates) {
    const firstMatchId = matchNumToId.get(pt.firstMatchNumber) || null;

    const existingPos = await prisma.fixturePosition.findUnique({
      where: { id: pt.id },
    });

    if (!existingPos) {
      await prisma.fixturePosition.create({
        data: {
          id: pt.id,
          pool: pt.pool,
          side: pt.side,
          positionNumber: pt.positionNumber,
          globalSequence: pt.globalSequence,
          status: "AVAILABLE",
          firstMatchId,
          firstMatchSlot: pt.firstMatchSlot,
          firstMatchNumber: pt.firstMatchNumber,
        },
      });
    } else {
      await prisma.fixturePosition.update({
        where: { id: pt.id },
        data: {
          firstMatchId,
          firstMatchSlot: pt.firstMatchSlot,
          firstMatchNumber: pt.firstMatchNumber,
          globalSequence: pt.globalSequence,
        },
      });
    }
  }

  return {
    success: true,
    positionsCount: positionTemplates.length,
    matchesCount: matchTemplates.length,
    status: config.status,
  };
}

/**
 * Resets the entire fixture graph to a clean unassigned state.
 * Clears all team assignments from positions, resets matches back to TBD,
 * clears match events, wipes draw history, and resets FixtureConfig to DRAFT Draw #1.
 */
export async function resetFixtureGraph(actorEmail = "system@szwbt2026.edu"): Promise<{
  success: boolean;
  positionsReset: number;
  matchesReset: number;
}> {
  // 1. Reset all 100 positions to AVAILABLE
  const posTemplates = getAllPositionTemplates();
  const matchTemplates = getAllMatchTemplates();

  await prisma.fixturePosition.updateMany({
    data: {
      status: "AVAILABLE",
      isFixed: false,
      fixedReason: null,
      teamId: null,
      teamName: null,
      institution: null,
      drawNumber: null,
      assignedAt: null,
      assignedBy: null,
    },
  });

  // 2. Reset all 100 tournament matches back to TBD
  for (const mt of matchTemplates) {
    const playerA = mt.sourceAType === "POSITION" ? `TBD (${mt.sourceAPositionId})` : `Winner of ${mt.sourceAMatchNumber}`;
    const playerB =
      mt.sourceBType === "POSITION"
        ? `TBD (${mt.sourceBPositionId})`
        : mt.sourceBType === "LOSER"
        ? `Loser of ${mt.sourceBMatchNumber}`
        : `Winner of ${mt.sourceBMatchNumber}`;

    await prisma.match.updateMany({
      where: { publicMatchNumber: mt.publicMatchNumber },
      data: {
        playerA,
        institutionA: "",
        playerB,
        institutionB: "",
        scoreA: null,
        scoreB: null,
        status: "UPCOMING",
        winner: null,
        teamAId: null,
        teamBId: null,
      },
    });
  }

  // Clear events for tournament matches
  const tournamentMatches = await prisma.match.findMany({
    where: { publicMatchNumber: { not: null } },
    select: { id: true },
  });
  const tMatchIds = tournamentMatches.map((m) => m.id);
  if (tMatchIds.length > 0) {
    await prisma.matchEvent.deleteMany({
      where: { matchId: { in: tMatchIds } },
    });
  }

  // 3. Clear draw history
  await prisma.drawHistory.deleteMany({});

  // 4. Reset FixtureConfig
  await prisma.fixtureConfig.upsert({
    where: { id: "SZWBT-2026-FIXTURE" },
    update: {
      status: "DRAFT",
      totalTeams: 100,
      teamsPerPool: 25,
      currentDrawNumber: 1,
      currentPool: "A",
      currentSide: "FIRST",
      currentPositionId: null,
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      isPublished: false,
      publishedAt: null,
      publishedBy: null,
      version: 1,
    },
    create: {
      id: "SZWBT-2026-FIXTURE",
      status: "DRAFT",
      totalTeams: 100,
      teamsPerPool: 25,
      currentDrawNumber: 1,
      currentPool: "A",
      currentSide: "FIRST",
      currentPositionId: null,
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      isPublished: false,
      publishedAt: null,
      publishedBy: null,
      version: 1,
    },
  });

  await logAuditEvent({
    actorEmail,
    action: "RESET_FIXTURES",
    resourceType: "fixture_graph",
    resourceId: "SZWBT-2026-FIXTURE",
    metadata: { reason: "Fixtures cleared to unassigned state; ready for sequential draw flow." },
  });

  return {
    success: true,
    positionsReset: posTemplates.length,
    matchesReset: matchTemplates.length,
  };
}

/**
 * Computes the exact next position to draw following the strict sequence:
 * Cycle: A FIRST -> B FIRST -> C FIRST -> D FIRST -> A LAST -> B LAST -> C LAST -> D LAST -> repeat
 * Automatically skips fixed positions and already assigned positions.
 */
export function computeNextDrawPointer(positions: Array<{
  id: string;
  pool: string;
  side: string;
  positionNumber: number;
  status: string;
  isFixed: boolean;
}>): {
  nextPositionId: string | null;
  nextPool: PoolCode | null;
  nextSide: SideCode | null;
  nextPositionNumber: number | null;
  currentDrawNumber: number;
  isComplete: boolean;
} {
  const sequence = getCanonicalDrawSequence();
  const positionMap = new Map(positions.map((p) => [p.id, p]));

  let assignedCount = 0;
  let nextFound: (typeof sequence)[0] | null = null;

  for (const seqItem of sequence) {
    const pos = positionMap.get(seqItem.positionId);
    if (!pos) continue;

    if (pos.status === "ASSIGNED" || pos.status === "FIXED" || pos.isFixed) {
      assignedCount++;
    } else if (!nextFound) {
      nextFound = seqItem;
    }
  }

  const isComplete = assignedCount >= 100;
  const currentDrawNumber = assignedCount + 1;

  if (isComplete || !nextFound) {
    return {
      nextPositionId: null,
      nextPool: null,
      nextSide: null,
      nextPositionNumber: null,
      currentDrawNumber: 100,
      isComplete: true,
    };
  }

  return {
    nextPositionId: nextFound.positionId,
    nextPool: nextFound.pool,
    nextSide: nextFound.side,
    nextPositionNumber: nextFound.positionNumber,
    currentDrawNumber,
    isComplete: false,
  };
}

/**
 * Retrieves the full draw state, progress counters, four pool metrics, and active pointer.
 */
export async function getDrawState(): Promise<{
  config: any;
  currentDrawNumber: number;
  currentPosition: any | null;
  nextPosition: any | null;
  totalAssigned: number;
  totalRemaining: number;
  fixedTeamsCount: number;
  isComplete: boolean;
  isLocked: boolean;
  isPublished: boolean;
  poolStats: Record<
    PoolCode,
    {
      pool: PoolCode;
      total: number;
      assigned: number;
      remaining: number;
      fixed: number;
      firstAssigned: number;
      firstTotal: number;
      lastAssigned: number;
      lastTotal: number;
      status: "PENDING" | "DRAWING" | "COMPLETE";
    }
  >;
  history: any[];
}> {
  // Ensure graph is initialized
  await initFixtureGraph();

  const config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });

  const positions = await prisma.fixturePosition.findMany({
    orderBy: { globalSequence: "asc" },
  });

  const history = await prisma.drawHistory.findMany({
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const pointer = computeNextDrawPointer(positions);

  let currentPosObj: any = null;
  let nextPosObj: any = null;

  if (pointer.nextPositionId) {
    currentPosObj = positions.find((p: any) => p.id === pointer.nextPositionId) || null;
    // Find what comes AFTER currentPosObj in sequence
    const sequence = getCanonicalDrawSequence();
    const currIdx = sequence.findIndex((s) => s.positionId === pointer.nextPositionId);
    if (currIdx >= 0) {
      for (let i = currIdx + 1; i < sequence.length; i++) {
        const candidate = positions.find((p: any) => p.id === sequence[i].positionId);
        if (candidate && candidate.status === "AVAILABLE" && !candidate.isFixed) {
          nextPosObj = candidate;
          break;
        }
      }
    }
  }

  // Calculate stats for all 4 pools
  const pools: PoolCode[] = ["A", "B", "C", "D"];
  const poolStats: any = {};

  let totalAssigned = 0;
  let fixedTeamsCount = 0;

  for (const pool of pools) {
    const poolPositions = positions.filter((p: any) => p.pool === pool);
    const assigned = poolPositions.filter((p: any) => p.status === "ASSIGNED" || p.status === "FIXED").length;
    const fixed = poolPositions.filter((p: any) => p.isFixed).length;
    const firstAssigned = poolPositions.filter((p: any) => p.side === "FIRST" && (p.status === "ASSIGNED" || p.status === "FIXED")).length;
    const lastAssigned = poolPositions.filter((p: any) => p.side === "LAST" && (p.status === "ASSIGNED" || p.status === "FIXED")).length;

    totalAssigned += assigned;
    fixedTeamsCount += fixed;

    poolStats[pool] = {
      pool,
      total: 25,
      assigned,
      remaining: 25 - assigned,
      fixed,
      firstAssigned,
      firstTotal: 13,
      lastAssigned,
      lastTotal: 12,
      status: assigned === 25 ? "COMPLETE" : assigned > 0 ? "DRAWING" : "PENDING",
    };
  }

  return {
    config,
    currentDrawNumber: pointer.currentDrawNumber,
    currentPosition: currentPosObj,
    nextPosition: nextPosObj,
    totalAssigned,
    totalRemaining: 100 - totalAssigned,
    fixedTeamsCount,
    isComplete: pointer.isComplete || totalAssigned === 100,
    isLocked: config?.isLocked || false,
    isPublished: config?.isPublished || false,
    poolStats,
    history,
  };
}

/**
 * Configures one of the four pre-placed / fixed teams.
 */
export async function assignFixedTeam(params: {
  teamId: string;
  pool: PoolCode;
  positionId: string;
  fixedReason?: string;
  actorEmail: string;
}): Promise<{ success: boolean; position: any }> {
  const { teamId, pool, positionId, fixedReason, actorEmail } = params;

  // 1. Validate team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error(`Team with ID "${teamId}" does not exist.`);
  }

  // 2. Validate position exists
  const position = await prisma.fixturePosition.findUnique({
    where: { id: positionId },
  });

  if (!position) {
    throw new Error(`Fixture position "${positionId}" does not exist.`);
  }

  if (position.pool !== pool) {
    throw new Error(`Position "${positionId}" belongs to Pool ${position.pool}, not Pool ${pool}.`);
  }

  if (position.status !== "AVAILABLE" && !position.isFixed) {
    throw new Error(`Position "${positionId}" is already occupied.`);
  }

  // 3. Validate team is not already assigned anywhere
  const existingAssignment = await prisma.fixturePosition.findUnique({
    where: { teamId },
  });

  if (existingAssignment && existingAssignment.id !== positionId) {
    throw new Error(`Team "${team.name}" (${team.teamCode}) is already assigned to position "${existingAssignment.id}". Duplicate assignment strictly prohibited.`);
  }

  // 4. Transactionally assign fixed team
  const result = await prisma.$transaction(async (tx: any) => {
    // Check if this position had a previous team
    if (position.isFixed && position.teamId && position.teamId !== teamId) {
      // Reassignment of fixed slot
    }

    const updatedPos = await tx.fixturePosition.update({
      where: { id: positionId },
      data: {
        status: "FIXED",
        isFixed: true,
        fixedReason: fixedReason || "Official Seed / Fixed Team",
        teamId: team.id,
        teamName: team.name,
        institution: team.institution,
        assignedAt: new Date(),
        assignedBy: actorEmail,
      },
    });

    // Update initial Match record
    if (position.firstMatchNumber) {
      const match = await tx.match.findUnique({
        where: { publicMatchNumber: position.firstMatchNumber },
      });

      if (match) {
        const updateData: any = {};
        if (position.firstMatchSlot === "A") {
          updateData.playerA = team.name;
          updateData.institutionA = team.institution;
          updateData.teamAId = team.id;
        } else {
          updateData.playerB = team.name;
          updateData.institutionB = team.institution;
          updateData.teamBId = team.id;
        }

        // If both slots filled, set to READY
        const hasA = (position.firstMatchSlot === "A" && team.name) || (match.playerA && !match.playerA.startsWith("TBD") && !match.playerA.startsWith("Winner"));
        const hasB = (position.firstMatchSlot === "B" && team.name) || (match.playerB && !match.playerB.startsWith("TBD") && !match.playerB.startsWith("Winner"));
        if (hasA && hasB) {
          updateData.status = "READY";
        }

        await tx.match.update({
          where: { id: match.id },
          data: updateData,
        });
      }
    }

    // Record History
    await tx.drawHistory.create({
      data: {
        drawNumber: 0,
        pool,
        side: position.side,
        positionId,
        teamId: team.id,
        teamName: team.name,
        institution: team.institution,
        actorEmail,
        action: "FIXED_ASSIGNMENT",
        notes: fixedReason || "Pre-placed seed team",
      },
    });

    return updatedPos;
  });

  await logAuditEvent({
    actorEmail,
    action: "FIXED_TEAM_ASSIGNED",
    resourceType: "fixture",
    resourceId: positionId,
    metadata: { teamId, pool, positionId, teamName: team.name },
  });

  return { success: true, position: result };
}

/**
 * Transitions fixture from DRAFT to DRAWING.
 */
export async function startDraw(actorEmail: string): Promise<{ success: boolean; config: any }> {
  const config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });

  if (!config) {
    throw new Error("Fixture configuration not found. Call initFixtureGraph first.");
  }

  if (config.isLocked) {
    throw new Error("Fixture is LOCKED. Cannot start draw on locked fixture.");
  }

  const updatedConfig = await prisma.fixtureConfig.update({
    where: { id: "SZWBT-2026-FIXTURE" },
    data: {
      status: "DRAWING",
      version: { increment: 1 },
    },
  });

  await logAuditEvent({
    actorEmail,
    action: "DRAW_STARTED",
    resourceType: "fixture",
    resourceId: "SZWBT-2026-FIXTURE",
    metadata: { status: "DRAWING" },
  });

  return { success: true, config: updatedConfig };
}

/**
 * Executes a deterministic draw assignment transaction.
 * Strictly enforces:
 * - Current sequence pointer (skipping fixed positions and completed pools)
 * - Optimistic concurrency (rejects if another admin moved the draw pointer)
 * - Team existence, eligibility, and uniqueness (no duplicate teams)
 */
export async function assignTeamToCurrentDraw(params: {
  teamId: string;
  expectedPositionId?: string;
  actorEmail: string;
}): Promise<{
  success: boolean;
  assignedPosition: any;
  nextPosition: any | null;
  drawNumber: number;
  isComplete: boolean;
}> {
  const { teamId, expectedPositionId, actorEmail } = params;

  return await prisma.$transaction(async (tx: any) => {
    // 1. Fetch and validate FixtureConfig
    const config = await tx.fixtureConfig.findUnique({
      where: { id: "SZWBT-2026-FIXTURE" },
    });

    if (!config) {
      throw new Error("Fixture config not found.");
    }

    if (config.status !== "DRAWING") {
      throw new Error(`Cannot assign draw team when fixture status is "${config.status}". Must be in DRAWING status.`);
    }

    if (config.isLocked) {
      throw new Error("Fixture is locked. Further draw assignments prohibited.");
    }

    // 2. Fetch all positions to determine current deterministic pointer
    const allPositions = await tx.fixturePosition.findMany({
      orderBy: { globalSequence: "asc" },
    });

    const pointer = computeNextDrawPointer(allPositions);

    if (pointer.isComplete || !pointer.nextPositionId) {
      throw new Error("All 100 positions are already assigned or fixed. Draw is complete.");
    }

    // 3. Optimistic concurrency check
    if (expectedPositionId && expectedPositionId !== pointer.nextPositionId) {
      throw new Error(
        `DRAW STATE CHANGED: Expected position was "${expectedPositionId}", but current active draw position is "${pointer.nextPositionId}". Please refresh.`
      );
    }

    const targetPositionId = pointer.nextPositionId;
    const targetPosition = allPositions.find((p: any) => p.id === targetPositionId);

    if (!targetPosition) {
      throw new Error(`Target position "${targetPositionId}" not found.`);
    }

    if (targetPosition.status !== "AVAILABLE" || targetPosition.isFixed) {
      throw new Error(`Target position "${targetPositionId}" is not available for draw.`);
    }

    // 4. Validate Team
    const team = await tx.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error(`Team with ID "${teamId}" does not exist.`);
    }

    // 5. Uniqueness validation: team must NOT be assigned anywhere
    const existingPos = await tx.fixturePosition.findUnique({
      where: { teamId },
    });

    if (existingPos) {
      throw new Error(
        `DUPLICATE ASSIGNMENT REJECTED: Team "${team.name}" (${team.teamCode}) is already assigned to position "${existingPos.id}". A team cannot occupy two positions or two pools.`
      );
    }

    // 6. Assign Team to target position
    const updatedPos = await tx.fixturePosition.update({
      where: { id: targetPositionId },
      data: {
        status: "ASSIGNED",
        teamId: team.id,
        teamName: team.name,
        institution: team.institution,
        drawNumber: pointer.currentDrawNumber,
        assignedAt: new Date(),
        assignedBy: actorEmail,
      },
    });

    // 7. Update initial Match record
    if (targetPosition.firstMatchNumber) {
      const match = await tx.match.findUnique({
        where: { publicMatchNumber: targetPosition.firstMatchNumber },
      });

      if (match) {
        const updateData: any = {};
        if (targetPosition.firstMatchSlot === "A") {
          updateData.playerA = team.name;
          updateData.institutionA = team.institution;
          updateData.teamAId = team.id;
        } else {
          updateData.playerB = team.name;
          updateData.institutionB = team.institution;
          updateData.teamBId = team.id;
        }

        const hasA = (targetPosition.firstMatchSlot === "A" && team.name) || (match.playerA && !match.playerA.startsWith("TBD") && !match.playerA.startsWith("Winner"));
        const hasB = (targetPosition.firstMatchSlot === "B" && team.name) || (match.playerB && !match.playerB.startsWith("TBD") && !match.playerB.startsWith("Winner"));
        if (hasA && hasB) {
          updateData.status = "READY";
        }

        await tx.match.update({
          where: { id: match.id },
          data: updateData,
        });
      }
    }

    // 8. Log Draw History
    await tx.drawHistory.create({
      data: {
        drawNumber: pointer.currentDrawNumber,
        pool: targetPosition.pool,
        side: targetPosition.side,
        positionId: targetPositionId,
        teamId: team.id,
        teamName: team.name,
        institution: team.institution,
        actorEmail,
        action: "DRAW_ASSIGNMENT",
      },
    });

    // 9. Recompute remaining positions and advance FixtureConfig
    const updatedPositions = allPositions.map((p: any) =>
      p.id === targetPositionId ? { ...p, status: "ASSIGNED", teamId: team.id } : p
    );
    const nextPointer = computeNextDrawPointer(updatedPositions);

    const isComplete = nextPointer.isComplete;
    await tx.fixtureConfig.update({
      where: { id: "SZWBT-2026-FIXTURE" },
      data: {
        status: isComplete ? "COMPLETE" : "DRAWING",
        currentDrawNumber: nextPointer.currentDrawNumber,
        currentPool: nextPointer.nextPool || "A",
        currentSide: nextPointer.nextSide || "FIRST",
        currentPositionId: nextPointer.nextPositionId,
        version: { increment: 1 },
      },
    });

    const nextPosObj = nextPointer.nextPositionId
      ? updatedPositions.find((p: any) => p.id === nextPointer.nextPositionId) || null
      : null;

    return {
      success: true,
      assignedPosition: updatedPos,
      nextPosition: nextPosObj,
      drawNumber: pointer.currentDrawNumber,
      isComplete,
    };
  });
}

/**
 * Super Admin / Tournament Admin correction workflow.
 */
export async function correctAssignment(params: {
  positionId: string;
  newTeamId: string;
  reason: string;
  actorEmail: string;
}): Promise<{ success: boolean; position: any }> {
  const { positionId, newTeamId, reason, actorEmail } = params;

  if (!reason || reason.trim().length < 5) {
    throw new Error("A clear audit reason (minimum 5 characters) is required to correct a fixture assignment.");
  }

  const newTeam = await prisma.team.findUnique({
    where: { id: newTeamId },
  });

  if (!newTeam) {
    throw new Error(`Team with ID "${newTeamId}" does not exist.`);
  }

  // Check if new team is already assigned elsewhere
  const existingAssign = await prisma.fixturePosition.findUnique({
    where: { teamId: newTeamId },
  });

  if (existingAssign && existingAssign.id !== positionId) {
    throw new Error(`Team "${newTeam.name}" is already assigned to "${existingAssign.id}". Cannot assign to two slots.`);
  }

  return await prisma.$transaction(async (tx: any) => {
    const position = await tx.fixturePosition.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new Error(`Position "${positionId}" not found.`);
    }

    const previousTeamId = position.teamId;

    const updated = await tx.fixturePosition.update({
      where: { id: positionId },
      data: {
        teamId: newTeam.id,
        teamName: newTeam.name,
        institution: newTeam.institution,
        assignedAt: new Date(),
        assignedBy: actorEmail,
      },
    });

    // Update Match slot
    if (position.firstMatchNumber) {
      const match = await tx.match.findUnique({
        where: { publicMatchNumber: position.firstMatchNumber },
      });

      if (match) {
        const updateData: any = {};
        if (position.firstMatchSlot === "A") {
          updateData.playerA = newTeam.name;
          updateData.institutionA = newTeam.institution;
          updateData.teamAId = newTeam.id;
        } else {
          updateData.playerB = newTeam.name;
          updateData.institutionB = newTeam.institution;
          updateData.teamBId = newTeam.id;
        }

        await tx.match.update({
          where: { id: match.id },
          data: updateData,
        });
      }
    }

    // Record History
    await tx.drawHistory.create({
      data: {
        drawNumber: position.drawNumber || 0,
        pool: position.pool,
        side: position.side,
        positionId,
        teamId: newTeam.id,
        teamName: newTeam.name,
        institution: newTeam.institution,
        actorEmail,
        action: "CORRECTION",
        previousTeamId,
        notes: reason,
      },
    });

    await logAuditEvent({
      actorEmail,
      action: "FIXTURE_ASSIGNMENT_CORRECTED",
      resourceType: "fixture",
      resourceId: positionId,
      metadata: {
        positionId,
        previousTeamId,
        newTeamId,
        reason,
      },
    });

    return { success: true, position: updated };
  });
}

/**
 * Validates the entire fixture graph and constraints.
 */
export async function validateFixtureGraph(): Promise<FixtureValidationReport> {
  const positions = await prisma.fixturePosition.findMany();
  const matches = await prisma.match.findMany({
    where: { publicMatchNumber: { not: null } },
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  const poolCounts: Record<PoolCode, number> = { A: 0, B: 0, C: 0, D: 0 };
  const teamSet = new Set<string>();
  let fixedCount = 0;
  let assignedCount = 0;

  for (const pos of positions) {
    if (pos.pool in poolCounts) {
      poolCounts[pos.pool as PoolCode]++;
    }
    if (pos.isFixed) fixedCount++;
    if (pos.status === "ASSIGNED" || pos.status === "FIXED") assignedCount++;

    if (pos.teamId) {
      if (teamSet.has(pos.teamId)) {
        errors.push(`Duplicate team detected: Team ID ${pos.teamId} occupies multiple positions.`);
      }
      teamSet.add(pos.teamId);
    }
  }

  // Validate pool counts
  const pools: PoolCode[] = ["A", "B", "C", "D"];
  for (const p of pools) {
    if (poolCounts[p] !== 25) {
      errors.push(`Pool ${p} does not have exactly 25 positions (has ${poolCounts[p]}).`);
    }
  }

  if (positions.length !== 100) {
    errors.push(`Total fixture positions is ${positions.length}, expected 100.`);
  }

  // Validate matches
  const matchNumSet = new Set<string>();
  for (const m of matches) {
    if (matchNumSet.has(m.publicMatchNumber!)) {
      errors.push(`Duplicate match number detected: ${m.publicMatchNumber}`);
    }
    matchNumSet.add(m.publicMatchNumber!);

    // Validate downstream reachability
    if (m.downstreamMatchNumber && !matches.some((dm: any) => dm.publicMatchNumber === m.downstreamMatchNumber)) {
      errors.push(`Match ${m.publicMatchNumber} references non-existent downstream match ${m.downstreamMatchNumber}.`);
    }
  }

  if (matches.length !== 100) {
    warnings.push(`Total matches found is ${matches.length}, expected 100.`);
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    totalPositions: positions.length,
    positionsPerPool: poolCounts,
    totalMatches: matches.length,
    totalAssigned: assignedCount,
    totalFixed: fixedCount,
    uniqueTeamsCount: teamSet.size,
    fixedTeamsCount: fixedCount,
    errors,
    warnings,
  };
}

/**
 * Locks the completed fixture.
 */
export async function lockFixture(actorEmail: string): Promise<{ success: boolean; config: any }> {
  const uniquenessReport = await validateTournamentTeamUniqueness();
  if (uniquenessReport.hasDuplicates || !uniquenessReport.isValid) {
    throw new Error(
      `Cannot lock fixture: Duplicate team assignments found! ${uniquenessReport.errors.join("; ")}`
    );
  }

  const report = await validateFixtureGraph();

  if (report.totalAssigned < 100 && uniquenessReport.totalAssigned < 100) {
    throw new Error(`Cannot lock fixture: only ${Math.max(report.totalAssigned, uniquenessReport.totalAssigned)} / 100 positions are assigned.`);
  }

  if (!report.isValid && report.errors.length > 0) {
    throw new Error(`Fixture validation failed: ${report.errors.join("; ")}`);
  }

  const updatedConfig = await prisma.fixtureConfig.update({
    where: { id: "SZWBT-2026-FIXTURE" },
    data: {
      status: "LOCKED",
      isLocked: true,
      lockedBy: actorEmail,
      lockedAt: new Date(),
      version: { increment: 1 },
    },
  });

  await logAuditEvent({
    actorEmail,
    action: "FIXTURE_LOCKED",
    resourceType: "fixture",
    resourceId: "SZWBT-2026-FIXTURE",
    metadata: { totalTeams: report.uniqueTeamsCount },
  });

  return { success: true, config: updatedConfig };
}

/**
 * Publishes the fixture to public view.
 */
export async function publishFixture(actorEmail: string): Promise<{ success: boolean; config: any }> {
  const config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });

  if (!config) {
    throw new Error("Fixture not found.");
  }

  const updatedConfig = await prisma.fixtureConfig.update({
    where: { id: "SZWBT-2026-FIXTURE" },
    data: {
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      publishedBy: actorEmail,
      version: { increment: 1 },
    },
  });

  // Mark all 100 matches as published
  await prisma.match.updateMany({
    where: { publicMatchNumber: { not: null } },
    data: { isPublished: true },
  });

  await logAuditEvent({
    actorEmail,
    action: "FIXTURE_PUBLISHED",
    resourceType: "fixture",
    resourceId: "SZWBT-2026-FIXTURE",
    metadata: { publishedBy: actorEmail },
  });

  return { success: true, config: updatedConfig };
}

/**
 * Resolves upstream match completion and advances winner (and loser if applicable) to downstream matches.
 */
export async function resolveMatchProgression(params: {
  matchId: string;
  winner: "PLAYER_A" | "PLAYER_B";
  scoreA?: string;
  scoreB?: string;
  actorEmail?: string;
}): Promise<{ success: boolean; updatedDownstream: any[] }> {
  const { matchId, winner, scoreA, scoreB, actorEmail } = params;

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Fetch current match
    const match = await tx.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error(`Match ${matchId} not found.`);
    }

    // 2. Mark match COMPLETED
    await tx.match.update({
      where: { id: matchId },
      data: {
        status: "COMPLETED",
        winner,
        scoreA: scoreA || match.scoreA,
        scoreB: scoreB || match.scoreB,
        actualEndTime: new Date(),
      },
    });

    // Determine winner details
    const winningPlayer = winner === "PLAYER_A" ? match.playerA : match.playerB;
    const winningInstitution = winner === "PLAYER_A" ? match.institutionA : match.institutionB;
    const winningTeamId = winner === "PLAYER_A" ? match.teamAId : match.teamBId;

    const losingPlayer = winner === "PLAYER_A" ? match.playerB : match.playerA;
    const losingInstitution = winner === "PLAYER_A" ? match.institutionB : match.institutionA;
    const losingTeamId = winner === "PLAYER_A" ? match.teamBId : match.teamAId;

    const updatedDownstream: any[] = [];

    // 3. Advance Winner to downstream match
    if (match.downstreamMatchNumber) {
      const downstreamMatch = await tx.match.findUnique({
        where: { publicMatchNumber: match.downstreamMatchNumber },
      });

      if (downstreamMatch) {
        const updateData: any = {};
        if (match.downstreamSlot === "A") {
          updateData.playerA = winningPlayer;
          updateData.institutionA = winningInstitution;
          updateData.teamAId = winningTeamId;
        } else {
          updateData.playerB = winningPlayer;
          updateData.institutionB = winningInstitution;
          updateData.teamBId = winningTeamId;
        }

        // Check if both teams are now determined
        const hasA = (match.downstreamSlot === "A" && winningPlayer) || (downstreamMatch.playerA && !downstreamMatch.playerA.startsWith("TBD") && !downstreamMatch.playerA.startsWith("Winner"));
        const hasB = (match.downstreamSlot === "B" && winningPlayer) || (downstreamMatch.playerB && !downstreamMatch.playerB.startsWith("TBD") && !downstreamMatch.playerB.startsWith("Winner"));
        if (hasA && hasB) {
          updateData.status = "READY";
        }

        const res = await tx.match.update({
          where: { id: downstreamMatch.id },
          data: updateData,
        });
        updatedDownstream.push(res);
      }
    }

    // 4. Special Case: Championship Semi-Finals (M097 and M098) losers advance to M099 (3rd Place Playoff)
    if (match.publicMatchNumber === "M097" || match.publicMatchNumber === "M098") {
      const playoffMatch = await tx.match.findUnique({
        where: { publicMatchNumber: "M099" },
      });

      if (playoffMatch) {
        const updateData: any = {};
        if (match.publicMatchNumber === "M097") {
          updateData.playerA = losingPlayer;
          updateData.institutionA = losingInstitution;
          updateData.teamAId = losingTeamId;
        } else {
          updateData.playerB = losingPlayer;
          updateData.institutionB = losingInstitution;
          updateData.teamBId = losingTeamId;
        }

        const hasA = (match.publicMatchNumber === "M097" && losingPlayer) || (playoffMatch.playerA && !playoffMatch.playerA.startsWith("TBD") && !playoffMatch.playerA.startsWith("Loser"));
        const hasB = (match.publicMatchNumber === "M098" && losingPlayer) || (playoffMatch.playerB && !playoffMatch.playerB.startsWith("TBD") && !playoffMatch.playerB.startsWith("Loser"));
        if (hasA && hasB) {
          updateData.status = "READY";
        }

        const res = await tx.match.update({
          where: { id: playoffMatch.id },
          data: updateData,
        });
        updatedDownstream.push(res);
      }
    }

    return { success: true, updatedDownstream };
  });

  if (actorEmail) {
    await logAuditEvent({
      action: "MATCH_SCORE_SUBMITTED",
      actorEmail,
      resourceType: "MATCH",
      resourceId: matchId,
      metadata: { winner, scoreA, scoreB },
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// GLOBAL TOURNAMENT TEAM UNIQUENESS & POSITION-FIRST SERVICES
// ─────────────────────────────────────────────────────────────

export interface GlobalTeamValidationReport {
  isValid: boolean;
  hasDuplicates: boolean;
  totalPositions: number;
  totalAssigned: number;
  totalRemaining: number;
  uniqueTeamsAssigned: number;
  unassignedTeamsCount: number;
  poolBreakdown: {
    A: { total: number; assigned: number; remaining: number };
    B: { total: number; assigned: number; remaining: number };
    C: { total: number; assigned: number; remaining: number };
    D: { total: number; assigned: number; remaining: number };
  };
  duplicates: {
    withinPool: {
      A: Array<{ teamId: string; teamCode?: string; teamName: string; slots: number[] }>;
      B: Array<{ teamId: string; teamCode?: string; teamName: string; slots: number[] }>;
      C: Array<{ teamId: string; teamCode?: string; teamName: string; slots: number[] }>;
      D: Array<{ teamId: string; teamCode?: string; teamName: string; slots: number[] }>;
    };
    crossPool: {
      AB: Array<{ teamId: string; teamCode?: string; teamName: string; locations: string[] }>;
      AC: Array<{ teamId: string; teamCode?: string; teamName: string; locations: string[] }>;
      AD: Array<{ teamId: string; teamCode?: string; teamName: string; locations: string[] }>;
      BC: Array<{ teamId: string; teamCode?: string; teamName: string; locations: string[] }>;
      BD: Array<{ teamId: string; teamCode?: string; teamName: string; locations: string[] }>;
      CD: Array<{ teamId: string; teamCode?: string; teamName: string; locations: string[] }>;
    };
    allDuplicateTeamIds: string[];
    duplicateCount: number;
  };
  errors: string[];
  statusText: string;
}

/**
 * Validates team assignment uniqueness across the entire tournament.
 * Detects duplicate assignments within each pool and across all pairs of pools (A/B, A/C, A/D, B/C, B/D, C/D).
 */
export async function validateTournamentTeamUniqueness(): Promise<GlobalTeamValidationReport> {
  const totalTeamsInDb = await prisma.team.count();

  let bracketSlots: any[] = [];
  try {
    if ((prisma as any).bracketSlotAssignment?.findMany) {
      bracketSlots = await (prisma as any).bracketSlotAssignment.findMany({
        where: { teamId: { not: null } },
      });
    } else {
      bracketSlots = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM "bracket_slot_assignments" WHERE "teamId" IS NOT NULL`
      );
    }
  } catch {
    bracketSlots = [];
  }

  // Fallback to FixturePosition if bracketSlots is empty
  if (bracketSlots.length === 0) {
    const pos = await prisma.fixturePosition.findMany({
      where: { teamId: { not: null } },
    });
    bracketSlots = pos.map((p) => ({
      pool: p.pool,
      slot: p.positionNumber,
      teamId: p.teamId,
      teamName: p.teamName,
      institution: p.institution,
    }));
  }

  const poolAssigned: Record<"A" | "B" | "C" | "D", any[]> = {
    A: bracketSlots.filter((s: any) => s.pool === "A"),
    B: bracketSlots.filter((s: any) => s.pool === "B"),
    C: bracketSlots.filter((s: any) => s.pool === "C"),
    D: bracketSlots.filter((s: any) => s.pool === "D"),
  };

  const poolBreakdown = {
    A: { total: 26, assigned: poolAssigned.A.length, remaining: Math.max(0, 26 - poolAssigned.A.length) },
    B: { total: 25, assigned: poolAssigned.B.length, remaining: Math.max(0, 25 - poolAssigned.B.length) },
    C: { total: 26, assigned: poolAssigned.C.length, remaining: Math.max(0, 26 - poolAssigned.C.length) },
    D: { total: 25, assigned: poolAssigned.D.length, remaining: Math.max(0, 25 - poolAssigned.D.length) },
  };

  // Map each teamId -> list of assignments { pool, slot, teamName, teamCode }
  const teamAssignmentMap = new Map<string, Array<{ pool: string; slot: number; teamName: string; teamCode?: string }>>();

  for (const slot of bracketSlots) {
    if (!slot.teamId) continue;
    const existing = teamAssignmentMap.get(slot.teamId) || [];
    existing.push({
      pool: slot.pool,
      slot: slot.slot,
      teamName: slot.teamName || slot.name || "Unknown Team",
      teamCode: slot.teamCode,
    });
    teamAssignmentMap.set(slot.teamId, existing);
  }

  const duplicatesWithin = {
    A: [] as any[],
    B: [] as any[],
    C: [] as any[],
    D: [] as any[],
  };

  const crossPool = {
    AB: [] as any[],
    AC: [] as any[],
    AD: [] as any[],
    BC: [] as any[],
    BD: [] as any[],
    CD: [] as any[],
  };

  const allDuplicateTeamIds = new Set<string>();
  const errors: string[] = [];

  // 1. Detect duplicates within pools
  for (const pool of ["A", "B", "C", "D"] as const) {
    const poolSlots = poolAssigned[pool];
    const seenInPool = new Map<string, number[]>();
    for (const s of poolSlots) {
      if (!s.teamId) continue;
      const list = seenInPool.get(s.teamId) || [];
      list.push(s.slot);
      seenInPool.set(s.teamId, list);
    }
    seenInPool.forEach((slots, teamId) => {
      if (slots.length > 1) {
        allDuplicateTeamIds.add(teamId);
        const name = poolSlots.find((s) => s.teamId === teamId)?.teamName || teamId;
        duplicatesWithin[pool].push({ teamId, teamName: name, slots });
        errors.push(`Duplicate within Pool ${pool}: Team "${name}" assigned to multiple slots [${slots.join(", ")}]`);
      }
    });
  }

  // 2. Detect duplicates across pools
  const checkCross = (p1: "A" | "B" | "C" | "D", p2: "A" | "B" | "C" | "D", targetArr: any[]) => {
    const s1 = new Set(poolAssigned[p1].map((s) => s.teamId).filter(Boolean));
    for (const slot of poolAssigned[p2]) {
      if (slot.teamId && s1.has(slot.teamId)) {
        allDuplicateTeamIds.add(slot.teamId);
        const matchingS1 = poolAssigned[p1].filter((s) => s.teamId === slot.teamId);
        const locations = [
          ...matchingS1.map((s) => `Pool ${p1} Slot #${s.slot}`),
          `Pool ${p2} Slot #${slot.slot}`,
        ];
        targetArr.push({
          teamId: slot.teamId,
          teamName: slot.teamName || "Unknown Team",
          locations,
        });
        errors.push(
          `Cross-pool duplicate between Pool ${p1} and Pool ${p2}: Team "${slot.teamName}" assigned to ${locations.join(" and ")}`
        );
      }
    }
  };

  checkCross("A", "B", crossPool.AB);
  checkCross("A", "C", crossPool.AC);
  checkCross("A", "D", crossPool.AD);
  checkCross("B", "C", crossPool.BC);
  checkCross("B", "D", crossPool.BD);
  checkCross("C", "D", crossPool.CD);

  const totalAssigned = bracketSlots.length;
  const uniqueTeamsAssigned = teamAssignmentMap.size;
  const hasDuplicates = allDuplicateTeamIds.size > 0;
  const unassignedTeamsCount = Math.max(0, totalTeamsInDb - uniqueTeamsAssigned);

  return {
    isValid: !hasDuplicates && errors.length === 0,
    hasDuplicates,
    totalPositions: 102,
    totalAssigned,
    totalRemaining: Math.max(0, 102 - totalAssigned),
    uniqueTeamsAssigned,
    unassignedTeamsCount,
    poolBreakdown,
    duplicates: {
      withinPool: duplicatesWithin,
      crossPool,
      allDuplicateTeamIds: Array.from(allDuplicateTeamIds),
      duplicateCount: allDuplicateTeamIds.size,
    },
    errors,
    statusText: hasDuplicates ? "✕ DUPLICATE TEAM ASSIGNMENTS FOUND" : "✓ NO DUPLICATES",
  };
}

/**
 * Assigns a single team to an individual fixture position / bracket slot.
 * Strictly verifies global uniqueness across ALL pools (A, B, C, D).
 */
export async function assignTeamToSlot(params: {
  pool: "A" | "B" | "C" | "D";
  slot: number;
  teamId: string;
  actorEmail: string;
}): Promise<{ success: boolean; slot: any; message: string }> {
  const { pool, slot, teamId, actorEmail } = params;
  const normalizedPool = pool.toUpperCase() as "A" | "B" | "C" | "D";
  const slotNum = Number(slot);

  // 1. Validate Fixture is not locked
  const config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });
  if (config?.isLocked) {
    throw new Error("Fixture is LOCKED. Modifications to team assignments are strictly prohibited.");
  }

  // 2. Validate Team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });
  if (!team) {
    throw new Error(`Team with ID "${teamId}" does not exist.`);
  }

  const numMatch = team.teamCode.match(/(\d+)/);
  const parsedTeamNum = numMatch ? parseInt(numMatch[1], 10) : null;

  // 3. Global Uniqueness Check & Transactional Assignment
  return await prisma.$transaction(async (tx: any) => {
    // Check if team is already assigned anywhere in the tournament (Pool A, B, C, D)
    let existingSlot: any = null;
    try {
      if (tx.bracketSlotAssignment?.findFirst) {
        existingSlot = await tx.bracketSlotAssignment.findFirst({
          where: {
            teamId: team.id,
            NOT: {
              pool: normalizedPool,
              slot: slotNum,
            },
          },
        });
      }
    } catch {}

    if (!existingSlot) {
      const rows: any[] = await tx.$queryRawUnsafe(
        `SELECT "pool", "slot", "teamName" FROM "bracket_slot_assignments" WHERE "teamId" = $1 AND NOT ("pool" = $2 AND "slot" = $3) LIMIT 1`,
        team.id,
        normalizedPool,
        slotNum
      );
      existingSlot = rows[0] || null;
    }

    if (existingSlot) {
      throw new Error(
        `TEAM ALREADY ASSIGNED: Team #${parsedTeamNum || team.teamCode} (${team.name}) is already assigned to Pool ${existingSlot.pool} Position/Slot #${existingSlot.slot}. Team uniqueness is global across the entire tournament.`
      );
    }

    // Pool bracket row-count limits: 26 for A/C (26 rows), 25 for B/D (25 rows)
    const maxCapacity = (normalizedPool === "A" || normalizedPool === "C") ? 26 : 25;

    // Validate slot is within the bracket's row range
    if (slotNum < 1 || slotNum > maxCapacity) {
      throw new Error(
        `INVALID SLOT: Slot #${slotNum} is out of range for Pool ${normalizedPool}. Valid slots: 1–${maxCapacity}.`
      );
    }

    let otherCount = 0;
    try {
      if (tx.bracketSlotAssignment?.count) {
        otherCount = await tx.bracketSlotAssignment.count({
          where: {
            pool: normalizedPool,
            teamId: { not: null },
            slot: { not: slotNum },
          },
        });
      }
    } catch {}

    if (otherCount >= maxCapacity) {
      throw new Error(
        `POOL CAPACITY FULL: Pool ${normalizedPool} has reached its tournament limit of ${maxCapacity} teams (Currently: ${maxCapacity}/${maxCapacity}). Remove another team first before assigning to this slot.`
      );
    }

    // Upsert BracketSlotAssignment
    let updatedSlot: any = null;
    try {
      if (tx.bracketSlotAssignment?.upsert) {
        updatedSlot = await tx.bracketSlotAssignment.upsert({
          where: { pool_slot: { pool: normalizedPool, slot: slotNum } },
          update: {
            teamId: team.id,
            teamCode: team.teamCode,
            teamNumber: parsedTeamNum,
            teamName: team.name,
            state: team.state,
            assignedAt: new Date(),
            assignedBy: actorEmail,
          },
          create: {
            pool: normalizedPool,
            slot: slotNum,
            teamId: team.id,
            teamCode: team.teamCode,
            teamNumber: parsedTeamNum,
            teamName: team.name,
            state: team.state,
            assignedAt: new Date(),
            assignedBy: actorEmail,
          },
        });
      }
    } catch {}

    if (!updatedSlot) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "bracket_slot_assignments" ("id", "pool", "slot", "teamId", "teamCode", "teamNumber", "teamName", "state", "assignedAt", "assignedBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
         ON CONFLICT ("pool", "slot")
         DO UPDATE SET "teamId" = $4, "teamCode" = $5, "teamNumber" = $6, "teamName" = $7, "state" = $8, "assignedAt" = NOW(), "assignedBy" = $9, "updatedAt" = NOW()`,
        `slot-${normalizedPool}-${slotNum}`,
        normalizedPool,
        slotNum,
        team.id,
        team.teamCode,
        parsedTeamNum,
        team.name,
        team.state,
        actorEmail
      );
      updatedSlot = { pool: normalizedPool, slot: slotNum, teamId: team.id, teamName: team.name, teamCode: team.teamCode, state: team.state };
    }

    // Update Match record if this slot belongs to a Round 1 match
    const round1Match = getR1MatchForSlot(normalizedPool, slotNum);
    if (round1Match) {
      const globalMNum = getGlobalMatchNumberForPool(normalizedPool, round1Match.matchInPool);
      const publicMNum = `M${String(globalMNum).padStart(3, "0")}`;
      const isSlotA = round1Match.slotA === slotNum;

      const existingMatch = await tx.match.findUnique({ where: { publicMatchNumber: publicMNum } });
      if (existingMatch) {
        const updateData: any = {};
        if (isSlotA) {
          updateData.playerA = team.name;
          updateData.institutionA = team.institution;
          updateData.teamAId = team.id;
        } else {
          updateData.playerB = team.name;
          updateData.institutionB = team.institution;
          updateData.teamBId = team.id;
        }

        const hasA = isSlotA || (existingMatch.playerA && !existingMatch.playerA.startsWith("TBD"));
        const hasB = !isSlotA || (existingMatch.playerB && !existingMatch.playerB.startsWith("TBD"));
        updateData.status = hasA && hasB ? "READY" : "UPCOMING";

        await tx.match.update({
          where: { publicMatchNumber: publicMNum },
          data: updateData,
        });
      }
    }

    // Log tamper-evident audit record
    await logAuditEvent({
      actorEmail,
      action: "FIXTURE_POSITION_TEAM_ASSIGNED",
      resourceType: "fixture_position",
      resourceId: `POOL-${normalizedPool}-SLOT-${slotNum}`,
      metadata: {
        pool: normalizedPool,
        slot: slotNum,
        teamId: team.id,
        teamCode: team.teamCode,
        teamName: team.name,
        assignedBy: actorEmail,
      },
    });

    return {
      success: true,
      slot: updatedSlot,
      message: `✓ ASSIGNED: Position ${slotNum} (Pool ${normalizedPool}) successfully filled with ${team.name} (${team.teamCode}).`,
    };
  });
}

/**
 * Changes the team assigned to a position.
 * Transactionally replaces old team with new team, enforcing global uniqueness.
 */
export async function changeTeamInSlot(params: {
  pool: "A" | "B" | "C" | "D";
  slot: number;
  newTeamId: string;
  reason?: string;
  actorEmail: string;
}): Promise<{ success: boolean; slot: any; message: string }> {
  const { pool, slot, newTeamId, reason, actorEmail } = params;
  const normalizedPool = pool.toUpperCase() as "A" | "B" | "C" | "D";
  const slotNum = Number(slot);

  const config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });
  if (config?.isLocked) {
    throw new Error("Fixture is LOCKED. Team changes are prohibited.");
  }

  const newTeam = await prisma.team.findUnique({
    where: { id: newTeamId },
  });
  if (!newTeam) {
    throw new Error(`Replacement team with ID "${newTeamId}" does not exist.`);
  }

  const numMatch = newTeam.teamCode.match(/(\d+)/);
  const parsedTeamNum = numMatch ? parseInt(numMatch[1], 10) : null;

  return await prisma.$transaction(async (tx: any) => {
    // 1. Fetch current assignment to verify it exists
    let currentSlot: any = null;
    try {
      if (tx.bracketSlotAssignment?.findUnique) {
        currentSlot = await tx.bracketSlotAssignment.findUnique({
          where: { pool_slot: { pool: normalizedPool, slot: slotNum } },
        });
      }
    } catch {}

    const oldTeamId = currentSlot?.teamId;
    const oldTeamName = currentSlot?.teamName;

    // 2. Global Uniqueness Check: ensure new team is not assigned elsewhere
    let duplicateSlot: any = null;
    try {
      if (tx.bracketSlotAssignment?.findFirst) {
        duplicateSlot = await tx.bracketSlotAssignment.findFirst({
          where: {
            teamId: newTeam.id,
            NOT: { pool: normalizedPool, slot: slotNum },
          },
        });
      }
    } catch {}

    if (!duplicateSlot) {
      const rows: any[] = await tx.$queryRawUnsafe(
        `SELECT "pool", "slot" FROM "bracket_slot_assignments" WHERE "teamId" = $1 AND NOT ("pool" = $2 AND "slot" = $3) LIMIT 1`,
        newTeam.id,
        normalizedPool,
        slotNum
      );
      duplicateSlot = rows[0] || null;
    }

    if (duplicateSlot) {
      throw new Error(
        `TEAM ALREADY ASSIGNED: Replacement team "${newTeam.name}" (${newTeam.teamCode}) is already assigned to Pool ${duplicateSlot.pool} Slot #${duplicateSlot.slot}. A team cannot be assigned to multiple positions.`
      );
    }

    // 3. Upsert slot with new team
    let updatedSlot: any = null;
    try {
      if (tx.bracketSlotAssignment?.upsert) {
        updatedSlot = await tx.bracketSlotAssignment.upsert({
          where: { pool_slot: { pool: normalizedPool, slot: slotNum } },
          update: {
            teamId: newTeam.id,
            teamCode: newTeam.teamCode,
            teamNumber: parsedTeamNum,
            teamName: newTeam.name,
            state: newTeam.state,
            assignedAt: new Date(),
            assignedBy: actorEmail,
          },
          create: {
            pool: normalizedPool,
            slot: slotNum,
            teamId: newTeam.id,
            teamCode: newTeam.teamCode,
            teamNumber: parsedTeamNum,
            teamName: newTeam.name,
            state: newTeam.state,
            assignedAt: new Date(),
            assignedBy: actorEmail,
          },
        });
      }
    } catch {}

    if (!updatedSlot) {
      await tx.$executeRawUnsafe(
        `UPDATE "bracket_slot_assignments"
         SET "teamId" = $1, "teamCode" = $2, "teamNumber" = $3, "teamName" = $4, "state" = $5, "assignedAt" = NOW(), "assignedBy" = $6, "updatedAt" = NOW()
         WHERE "pool" = $7 AND "slot" = $8`,
        newTeam.id,
        newTeam.teamCode,
        parsedTeamNum,
        newTeam.name,
        newTeam.state,
        actorEmail,
        normalizedPool,
        slotNum
      );
      updatedSlot = { pool: normalizedPool, slot: slotNum, teamId: newTeam.id, teamName: newTeam.name };
    }

    // 4. Update match record
    const round1Match = getR1MatchForSlot(normalizedPool, slotNum);
    if (round1Match) {
      const globalMNum = getGlobalMatchNumberForPool(normalizedPool, round1Match.matchInPool);
      const publicMNum = `M${String(globalMNum).padStart(3, "0")}`;
      const isSlotA = round1Match.slotA === slotNum;

      const updateData: any = {};
      if (isSlotA) {
        updateData.playerA = newTeam.name;
        updateData.institutionA = newTeam.institution;
        updateData.teamAId = newTeam.id;
      } else {
        updateData.playerB = newTeam.name;
        updateData.institutionB = newTeam.institution;
        updateData.teamBId = newTeam.id;
      }

      await tx.match.updateMany({
        where: { publicMatchNumber: publicMNum },
        data: updateData,
      });
    }

    // 5. Audit Log
    await logAuditEvent({
      actorEmail,
      action: "FIXTURE_POSITION_TEAM_CHANGED",
      resourceType: "fixture_position",
      resourceId: `POOL-${normalizedPool}-SLOT-${slotNum}`,
      metadata: {
        pool: normalizedPool,
        slot: slotNum,
        oldTeamId,
        oldTeamName,
        newTeamId: newTeam.id,
        newTeamName: newTeam.name,
        reason: reason || "Administrative team replacement",
        actorEmail,
      },
    });

    return {
      success: true,
      slot: updatedSlot,
      message: `✓ TEAM CHANGED: Position ${slotNum} (Pool ${normalizedPool}) updated to ${newTeam.name}.`,
    };
  });
}

/**
 * Removes a team from an individual fixture position / bracket slot.
 * The removed team immediately becomes globally available for assignment.
 */
export async function removeTeamFromSlot(params: {
  pool: "A" | "B" | "C" | "D";
  slot: number;
  reason?: string;
  actorEmail: string;
}): Promise<{ success: boolean; slot: any; message: string }> {
  const { pool, slot, reason, actorEmail } = params;
  const normalizedPool = pool.toUpperCase() as "A" | "B" | "C" | "D";
  const slotNum = Number(slot);

  const config = await prisma.fixtureConfig.findUnique({
    where: { id: "SZWBT-2026-FIXTURE" },
  });
  if (config?.isLocked) {
    throw new Error("Fixture is LOCKED. Team removal is prohibited.");
  }

  return await prisma.$transaction(async (tx: any) => {
    let currentSlot: any = null;
    try {
      if (tx.bracketSlotAssignment?.findUnique) {
        currentSlot = await tx.bracketSlotAssignment.findUnique({
          where: { pool_slot: { pool: normalizedPool, slot: slotNum } },
        });
      }
    } catch {}

    const oldTeamId = currentSlot?.teamId;
    const oldTeamName = currentSlot?.teamName;

    // Clear slot
    try {
      if (tx.bracketSlotAssignment?.update) {
        await tx.bracketSlotAssignment.update({
          where: { pool_slot: { pool: normalizedPool, slot: slotNum } },
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

    await tx.$executeRawUnsafe(
      `UPDATE "bracket_slot_assignments"
       SET "teamId" = NULL, "teamCode" = NULL, "teamNumber" = NULL, "teamName" = NULL, "state" = NULL, "assignedAt" = NULL, "assignedBy" = NULL, "updatedAt" = NOW()
       WHERE "pool" = $1 AND "slot" = $2`,
      normalizedPool,
      slotNum
    );

    // Update match record back to TBD
    const round1Match = getR1MatchForSlot(normalizedPool, slotNum);
    if (round1Match) {
      const globalMNum = getGlobalMatchNumberForPool(normalizedPool, round1Match.matchInPool);
      const publicMNum = `M${String(globalMNum).padStart(3, "0")}`;
      const isSlotA = round1Match.slotA === slotNum;

      const updateData: any = { status: "UPCOMING" };
      if (isSlotA) {
        updateData.playerA = `TBD (Slot ${slotNum})`;
        updateData.institutionA = "";
        updateData.teamAId = null;
      } else {
        updateData.playerB = `TBD (Slot ${slotNum})`;
        updateData.institutionB = "";
        updateData.teamBId = null;
      }

      await tx.match.updateMany({
        where: { publicMatchNumber: publicMNum },
        data: updateData,
      });
    }

    // Log audit
    await logAuditEvent({
      actorEmail,
      action: "FIXTURE_POSITION_TEAM_REMOVED",
      resourceType: "fixture_position",
      resourceId: `POOL-${normalizedPool}-SLOT-${slotNum}`,
      metadata: {
        pool: normalizedPool,
        slot: slotNum,
        oldTeamId,
        oldTeamName,
        reason: reason || "Administrator unassigned team from position",
        actorEmail,
      },
    });

    return {
      success: true,
      slot: { pool: normalizedPool, slot: slotNum, teamId: null },
      message: `✓ REMOVED: Team removed from Position ${slotNum} (Pool ${normalizedPool}). Position is now empty and available.`,
    };
  });
}

function getR1MatchForSlot(pool: "A" | "B" | "C" | "D", slotNum: number) {
  const isAC = pool === "A" || pool === "C";
  const flow = isAC ? ROUND_1_MATCH_FLOW_AC : ROUND_1_MATCH_FLOW_BD;
  const match = flow.find((m) => m.slotA === slotNum || m.slotB === slotNum);
  if (!match) return null;
  return {
    matchInPool: match.matchInPool,
    slotA: match.slotA,
    slotB: match.slotB,
  };
}

function getGlobalMatchNumberForPool(pool: "A" | "B" | "C" | "D", matchInPool: number): number {
  switch (pool) {
    case "A": return matchInPool;
    case "B": return 24 + matchInPool;
    case "C": return 48 + matchInPool;
    case "D": return 72 + matchInPool;
    default: return matchInPool;
  }
}

