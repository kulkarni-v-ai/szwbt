/**
 * Championship Fixture Template & Graph Definition
 * South Zone Inter-University Women's Badminton Championship 2026
 *
 * SPECIFICATION GUARANTEES:
 * - Exactly 100 teams total
 * - Exactly 4 pools (A, B, C, D)
 * - Exactly 25 teams per pool
 * - FIRST side: 13 positions per pool
 * - LAST side: 12 positions per pool
 * - Draw order: A 1st -> B 1st -> C 1st -> D 1st -> A Last -> B Last -> C Last -> D Last -> repeat
 * - 100 total matches (M001 to M100) pre-generated in database
 * - Upstream and downstream relational references
 */

export type PoolCode = "A" | "B" | "C" | "D";
export type SideCode = "FIRST" | "LAST";

export interface FixturePositionTemplate {
  id: string; // e.g. "POOL-A-FIRST-01"
  pool: PoolCode;
  side: SideCode;
  positionNumber: number; // 1 to 13
  globalSequence: number; // 1 to 100 in canonical draw order
  firstMatchNumber: string; // e.g. "M001"
  firstMatchSlot: "A" | "B";
  isByeToRound2: boolean;
}

export interface FixtureMatchTemplate {
  publicMatchNumber: string; // "M001" to "M100"
  pool: PoolCode | "CHAMPIONSHIP";
  roundStage: "ROUND_1" | "ROUND_2" | "QUARTER_FINAL" | "SEMI_FINAL" | "POOL_FINAL" | "PLAYOFF_3RD" | "GRAND_FINAL";
  roundName: string; // "Round 1", "Round of 16", "Quarter-Finals", "Semi-Finals", "Pool Final", "3rd Place Playoff", "Grand Final"
  roundOrder: number; // 1 to 7
  dayId: "OCT18" | "OCT19" | "OCT20" | "OCT21";
  time: string;
  court: string;
  sourceAType: "POSITION" | "WINNER" | "LOSER";
  sourceBType: "POSITION" | "WINNER" | "LOSER";
  sourceAPositionId?: string;
  sourceBPositionId?: string;
  sourceAMatchNumber?: string;
  sourceBMatchNumber?: string;
  downstreamMatchNumber?: string;
  downstreamSlot?: "A" | "B";
}

/**
 * Generates the canonical draw sequence across all 4 pools.
 * Order:
 * Cycle 1: A FIRST, B FIRST, C FIRST, D FIRST -> A LAST, B LAST, C LAST, D LAST
 * Cycle 2: A FIRST, B FIRST, C FIRST, D FIRST -> A LAST, B LAST, C LAST, D LAST
 * ...
 * Cycle 13: A FIRST, B FIRST, C FIRST, D FIRST
 * Exactly 100 positions.
 */
export function getCanonicalDrawSequence(): Array<{ pool: PoolCode; side: SideCode; positionNumber: number; positionId: string }> {
  const sequence: Array<{ pool: PoolCode; side: SideCode; positionNumber: number; positionId: string }> = [];
  const pools: PoolCode[] = ["A", "B", "C", "D"];

  for (let cycle = 1; cycle <= 13; cycle++) {
    // 1. ALL POOLS — FIRST POSITIONS
    for (const pool of pools) {
      if (cycle <= 13) {
        const numStr = String(cycle).padStart(2, "0");
        sequence.push({
          pool,
          side: "FIRST",
          positionNumber: cycle,
          positionId: `POOL-${pool}-FIRST-${numStr}`,
        });
      }
    }

    // 2. ALL POOLS — LAST POSITIONS (LAST side has 12 positions per pool)
    if (cycle <= 12) {
      for (const pool of pools) {
        const numStr = String(cycle).padStart(2, "0");
        sequence.push({
          pool,
          side: "LAST",
          positionNumber: cycle,
          positionId: `POOL-${pool}-LAST-${numStr}`,
        });
      }
    }
  }

  return sequence;
}

/**
 * Returns all 100 position templates with their initial match mapping.
 */
export function getAllPositionTemplates(): FixturePositionTemplate[] {
  const sequence = getCanonicalDrawSequence();
  const templates: FixturePositionTemplate[] = [];

  const poolOffsets: Record<PoolCode, number> = {
    A: 0,
    B: 24,
    C: 48,
    D: 72,
  };

  sequence.forEach((item, index) => {
    const offset = poolOffsets[item.pool];
    let firstMatchNumber = "";
    let firstMatchSlot: "A" | "B" = "A";
    let isByeToRound2 = false;

    if (item.side === "FIRST") {
      // Positions 1-10 play in Round 1 (Matches 1-5 of the pool)
      if (item.positionNumber <= 10) {
        const matchIndexInPool = Math.ceil(item.positionNumber / 2); // 1, 2, 3, 4, 5
        const matchNum = offset + matchIndexInPool;
        firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
        firstMatchSlot = item.positionNumber % 2 === 1 ? "A" : "B";
      } else {
        // Positions 11, 12, 13 get byes directly to Round 2 (Matches 12, 13 of pool)
        isByeToRound2 = true;
        if (item.positionNumber === 11) {
          const matchNum = offset + 12; // M012, M036, etc.
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "B"; // Slot A comes from Winner M005
        } else if (item.positionNumber === 12) {
          const matchNum = offset + 13; // M013, M037, etc.
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "A";
        } else {
          // 13
          const matchNum = offset + 13;
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "B";
        }
      }
    } else {
      // LAST side: 12 positions
      // Positions 1-8 play in Round 1 (Matches 6-9 of the pool)
      if (item.positionNumber <= 8) {
        const matchIndexInPool = 5 + Math.ceil(item.positionNumber / 2); // 6, 7, 8, 9
        const matchNum = offset + matchIndexInPool;
        firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
        firstMatchSlot = item.positionNumber % 2 === 1 ? "A" : "B";
      } else {
        // Positions 9, 10, 11, 12 get byes directly to Round 2 (Matches 16, 17 of pool)
        isByeToRound2 = true;
        if (item.positionNumber === 9) {
          const matchNum = offset + 16;
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "A";
        } else if (item.positionNumber === 10) {
          const matchNum = offset + 16;
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "B";
        } else if (item.positionNumber === 11) {
          const matchNum = offset + 17;
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "A";
        } else {
          // 12
          const matchNum = offset + 17;
          firstMatchNumber = `M${String(matchNum).padStart(3, "0")}`;
          firstMatchSlot = "B";
        }
      }
    }

    templates.push({
      id: item.positionId,
      pool: item.pool,
      side: item.side,
      positionNumber: item.positionNumber,
      globalSequence: index + 1,
      firstMatchNumber,
      firstMatchSlot,
      isByeToRound2,
    });
  });

  return templates;
}

/**
 * Generates all 100 Match templates (M001 to M100) with complete upstream and downstream wiring.
 */
export function getAllMatchTemplates(): FixtureMatchTemplate[] {
  const matches: FixtureMatchTemplate[] = [];
  const pools: PoolCode[] = ["A", "B", "C", "D"];
  const courts = ["Court 01", "Court 02", "Court 03", "Court 04"];

  // Helper to format M001
  const mId = (num: number) => `M${String(num).padStart(3, "0")}`;

  pools.forEach((pool, poolIdx) => {
    const offset = poolIdx * 24;

    // ── ROUND 1 (9 Matches per pool) ──
    // Match 1: POOL-x-FIRST-01 vs POOL-x-FIRST-02 -> feeds into Match 10 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 1),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "09:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-FIRST-01`,
      sourceBPositionId: `POOL-${pool}-FIRST-02`,
      downstreamMatchNumber: mId(offset + 10),
      downstreamSlot: "A",
    });

    // Match 2: POOL-x-FIRST-03 vs POOL-x-FIRST-04 -> feeds into Match 10 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 2),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "10:30 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-FIRST-03`,
      sourceBPositionId: `POOL-${pool}-FIRST-04`,
      downstreamMatchNumber: mId(offset + 10),
      downstreamSlot: "B",
    });

    // Match 3: POOL-x-FIRST-05 vs POOL-x-FIRST-06 -> feeds into Match 11 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 3),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "12:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-FIRST-05`,
      sourceBPositionId: `POOL-${pool}-FIRST-06`,
      downstreamMatchNumber: mId(offset + 11),
      downstreamSlot: "A",
    });

    // Match 4: POOL-x-FIRST-07 vs POOL-x-FIRST-08 -> feeds into Match 11 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 4),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "13:30 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-FIRST-07`,
      sourceBPositionId: `POOL-${pool}-FIRST-08`,
      downstreamMatchNumber: mId(offset + 11),
      downstreamSlot: "B",
    });

    // Match 5: POOL-x-FIRST-09 vs POOL-x-FIRST-10 -> feeds into Match 12 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 5),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "15:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-FIRST-09`,
      sourceBPositionId: `POOL-${pool}-FIRST-10`,
      downstreamMatchNumber: mId(offset + 12),
      downstreamSlot: "A",
    });

    // Match 6: POOL-x-LAST-01 vs POOL-x-LAST-02 -> feeds into Match 14 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 6),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "16:30 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-LAST-01`,
      sourceBPositionId: `POOL-${pool}-LAST-02`,
      downstreamMatchNumber: mId(offset + 14),
      downstreamSlot: "A",
    });

    // Match 7: POOL-x-LAST-03 vs POOL-x-LAST-04 -> feeds into Match 14 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 7),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "18:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-LAST-03`,
      sourceBPositionId: `POOL-${pool}-LAST-04`,
      downstreamMatchNumber: mId(offset + 14),
      downstreamSlot: "B",
    });

    // Match 8: POOL-x-LAST-05 vs POOL-x-LAST-06 -> feeds into Match 15 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 8),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "19:30 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-LAST-05`,
      sourceBPositionId: `POOL-${pool}-LAST-06`,
      downstreamMatchNumber: mId(offset + 15),
      downstreamSlot: "A",
    });

    // Match 9: POOL-x-LAST-07 vs POOL-x-LAST-08 -> feeds into Match 15 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 9),
      pool,
      roundStage: "ROUND_1",
      roundName: "Round 1",
      roundOrder: 1,
      dayId: "OCT18",
      time: "20:30 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-LAST-07`,
      sourceBPositionId: `POOL-${pool}-LAST-08`,
      downstreamMatchNumber: mId(offset + 15),
      downstreamSlot: "B",
    });

    // ── ROUND 2 (8 Matches per pool - Round of 16) ──
    // Match 10: Winner M1 vs Winner M2 -> feeds into Match 18 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 10),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "09:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 1),
      sourceBMatchNumber: mId(offset + 2),
      downstreamMatchNumber: mId(offset + 18),
      downstreamSlot: "A",
    });

    // Match 11: Winner M3 vs Winner M4 -> feeds into Match 18 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 11),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "10:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 3),
      sourceBMatchNumber: mId(offset + 4),
      downstreamMatchNumber: mId(offset + 18),
      downstreamSlot: "B",
    });

    // Match 12: Winner M5 vs POOL-x-FIRST-11 -> feeds into Match 19 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 12),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "11:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "POSITION",
      sourceAMatchNumber: mId(offset + 5),
      sourceBPositionId: `POOL-${pool}-FIRST-11`,
      downstreamMatchNumber: mId(offset + 19),
      downstreamSlot: "A",
    });

    // Match 13: POOL-x-FIRST-12 vs POOL-x-FIRST-13 -> feeds into Match 19 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 13),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "12:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-FIRST-12`,
      sourceBPositionId: `POOL-${pool}-FIRST-13`,
      downstreamMatchNumber: mId(offset + 19),
      downstreamSlot: "B",
    });

    // Match 14: Winner M6 vs Winner M7 -> feeds into Match 20 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 14),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "13:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 6),
      sourceBMatchNumber: mId(offset + 7),
      downstreamMatchNumber: mId(offset + 20),
      downstreamSlot: "A",
    });

    // Match 15: Winner M8 vs Winner M9 -> feeds into Match 20 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 15),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "14:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 8),
      sourceBMatchNumber: mId(offset + 9),
      downstreamMatchNumber: mId(offset + 20),
      downstreamSlot: "B",
    });

    // Match 16: POOL-x-LAST-09 vs POOL-x-LAST-10 -> feeds into Match 21 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 16),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "15:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-LAST-09`,
      sourceBPositionId: `POOL-${pool}-LAST-10`,
      downstreamMatchNumber: mId(offset + 21),
      downstreamSlot: "A",
    });

    // Match 17: POOL-x-LAST-11 vs POOL-x-LAST-12 -> feeds into Match 21 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 17),
      pool,
      roundStage: "ROUND_2",
      roundName: "Round of 16",
      roundOrder: 2,
      dayId: "OCT19",
      time: "16:00 IST",
      court: courts[poolIdx],
      sourceAType: "POSITION",
      sourceBType: "POSITION",
      sourceAPositionId: `POOL-${pool}-LAST-11`,
      sourceBPositionId: `POOL-${pool}-LAST-12`,
      downstreamMatchNumber: mId(offset + 21),
      downstreamSlot: "B",
    });

    // ── ROUND 3 (4 Matches per pool - Quarter-Finals) ──
    // Match 18: Winner M10 vs Winner M11 -> feeds into Match 22 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 18),
      pool,
      roundStage: "QUARTER_FINAL",
      roundName: "Quarter-Finals",
      roundOrder: 3,
      dayId: "OCT19",
      time: "17:30 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 10),
      sourceBMatchNumber: mId(offset + 11),
      downstreamMatchNumber: mId(offset + 22),
      downstreamSlot: "A",
    });

    // Match 19: Winner M12 vs Winner M13 -> feeds into Match 22 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 19),
      pool,
      roundStage: "QUARTER_FINAL",
      roundName: "Quarter-Finals",
      roundOrder: 3,
      dayId: "OCT19",
      time: "18:30 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 12),
      sourceBMatchNumber: mId(offset + 13),
      downstreamMatchNumber: mId(offset + 22),
      downstreamSlot: "B",
    });

    // Match 20: Winner M14 vs Winner M15 -> feeds into Match 23 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 20),
      pool,
      roundStage: "QUARTER_FINAL",
      roundName: "Quarter-Finals",
      roundOrder: 3,
      dayId: "OCT19",
      time: "19:30 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 14),
      sourceBMatchNumber: mId(offset + 15),
      downstreamMatchNumber: mId(offset + 23),
      downstreamSlot: "A",
    });

    // Match 21: Winner M16 vs Winner M17 -> feeds into Match 23 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 21),
      pool,
      roundStage: "QUARTER_FINAL",
      roundName: "Quarter-Finals",
      roundOrder: 3,
      dayId: "OCT19",
      time: "20:30 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 16),
      sourceBMatchNumber: mId(offset + 17),
      downstreamMatchNumber: mId(offset + 23),
      downstreamSlot: "B",
    });

    // ── ROUND 4 (2 Matches per pool - Pool Semi-Finals) ──
    // Match 22: Winner M18 vs Winner M19 -> feeds into Match 24 Slot A
    matches.push({
      publicMatchNumber: mId(offset + 22),
      pool,
      roundStage: "SEMI_FINAL",
      roundName: "Semi-Finals",
      roundOrder: 4,
      dayId: "OCT20",
      time: "09:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 18),
      sourceBMatchNumber: mId(offset + 19),
      downstreamMatchNumber: mId(offset + 24),
      downstreamSlot: "A",
    });

    // Match 23: Winner M20 vs Winner M21 -> feeds into Match 24 Slot B
    matches.push({
      publicMatchNumber: mId(offset + 23),
      pool,
      roundStage: "SEMI_FINAL",
      roundName: "Semi-Finals",
      roundOrder: 4,
      dayId: "OCT20",
      time: "10:30 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 20),
      sourceBMatchNumber: mId(offset + 21),
      downstreamMatchNumber: mId(offset + 24),
      downstreamSlot: "B",
    });

    // ── ROUND 5 (1 Match per pool - Pool Final) ──
    // Match 24: Winner M22 vs Winner M23 -> Winner is Pool Champion
    const championshipSlot = pool === "A" ? { downstreamMatchNumber: "M097", downstreamSlot: "A" as const }
      : pool === "B" ? { downstreamMatchNumber: "M097", downstreamSlot: "B" as const }
      : pool === "C" ? { downstreamMatchNumber: "M098", downstreamSlot: "A" as const }
      : { downstreamMatchNumber: "M098", downstreamSlot: "B" as const };

    matches.push({
      publicMatchNumber: mId(offset + 24),
      pool,
      roundStage: "POOL_FINAL",
      roundName: "Pool Final",
      roundOrder: 5,
      dayId: "OCT20",
      time: "14:00 IST",
      court: courts[poolIdx],
      sourceAType: "WINNER",
      sourceBType: "WINNER",
      sourceAMatchNumber: mId(offset + 22),
      sourceBMatchNumber: mId(offset + 23),
      downstreamMatchNumber: championshipSlot.downstreamMatchNumber,
      downstreamSlot: championshipSlot.downstreamSlot,
    });
  });

  // ── CHAMPIONSHIP FINALS (Matches 97 to 100) ──

  // Match 97: Championship Semi-Final 1 (Pool A Winner vs Pool B Winner)
  matches.push({
    publicMatchNumber: "M097",
    pool: "CHAMPIONSHIP",
    roundStage: "SEMI_FINAL",
    roundName: "Championship Semi-Final 1",
    roundOrder: 6,
    dayId: "OCT21",
    time: "09:00 IST",
    court: "Court 01",
    sourceAType: "WINNER",
    sourceBType: "WINNER",
    sourceAMatchNumber: "M024", // Pool A Final Winner
    sourceBMatchNumber: "M048", // Pool B Final Winner
    downstreamMatchNumber: "M100", // Grand Final Winner slot A
    downstreamSlot: "A",
  });

  // Match 98: Championship Semi-Final 2 (Pool C Winner vs Pool D Winner)
  matches.push({
    publicMatchNumber: "M098",
    pool: "CHAMPIONSHIP",
    roundStage: "SEMI_FINAL",
    roundName: "Championship Semi-Final 2",
    roundOrder: 6,
    dayId: "OCT21",
    time: "10:30 IST",
    court: "Court 01",
    sourceAType: "WINNER",
    sourceBType: "WINNER",
    sourceAMatchNumber: "M072", // Pool C Final Winner
    sourceBMatchNumber: "M096", // Pool D Final Winner
    downstreamMatchNumber: "M100", // Grand Final Winner slot B
    downstreamSlot: "B",
  });

  // Match 99: 3rd Place Playoff (Loser SF1 vs Loser SF2)
  matches.push({
    publicMatchNumber: "M099",
    pool: "CHAMPIONSHIP",
    roundStage: "PLAYOFF_3RD",
    roundName: "3rd Place Bronze Playoff",
    roundOrder: 7,
    dayId: "OCT21",
    time: "14:00 IST",
    court: "Court 02",
    sourceAType: "LOSER",
    sourceBType: "LOSER",
    sourceAMatchNumber: "M097",
    sourceBMatchNumber: "M098",
  });

  // Match 100: Grand Championship Final (Winner SF1 vs Winner SF2)
  matches.push({
    publicMatchNumber: "M100",
    pool: "CHAMPIONSHIP",
    roundStage: "GRAND_FINAL",
    roundName: "Championship Grand Final",
    roundOrder: 7,
    dayId: "OCT21",
    time: "16:00 IST",
    court: "Court 01",
    sourceAType: "WINNER",
    sourceBType: "WINNER",
    sourceAMatchNumber: "M097",
    sourceBMatchNumber: "M098",
  });

  return matches;
}
