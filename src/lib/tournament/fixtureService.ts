import { prisma } from "@/lib/prisma";
import {
  PoolCode,
  SideCode,
  getAllPositionTemplates,
  getAllMatchTemplates,
  getCanonicalDrawSequence,
} from "./fixtureTemplate";
import { logAuditEvent } from "@/lib/rbac/audit";

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
  const report = await validateFixtureGraph();

  if (report.totalAssigned < 100) {
    throw new Error(`Cannot lock fixture: only ${report.totalAssigned} / 100 positions are assigned.`);
  }

  if (!report.isValid) {
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
