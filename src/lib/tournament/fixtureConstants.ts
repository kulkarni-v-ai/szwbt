// ─────────────────────────────────────────────────────────────
// OFFICIAL BRACKET STRUCTURES — SZWBT 2026
// Strictly follows the reference image drawn by the tournament organiser.
//
// ┌─────────────────────────────────────────────────────────┐
// │  B/D Pools — 25 rows total                             │
// │  Byes (R1 skippers): 2, 6, 11, 14, 17, 19, 24, 25     │
// │  R1 match pairs:                                        │
// │    M1(3,4)   M2(5,7)*  M3(8,9)   M4(10,12)*           │
// │    M5(13,15)* M6(16,18)* M7(20,21) M8(22,23)          │
// │  (* = pair crosses a bye slot at its midpoint)          │
// │  → 8 R1 matches + 8 R1 byes = 16 into R2              │
// │  → 8 R2 → 4 QF → 2 SF → CF → Final                    │
// ├─────────────────────────────────────────────────────────┤
// │  A/C Pools — 26 rows total                             │
// │  Byes (R1 skippers): 2, 9, 14, 17, 22, 25, 26         │
// │  R1 match pairs (all adjacent):                         │
// │    M1(3,4) M2(5,6) M3(7,8) M4(10,11) M5(12,13)        │
// │    M6(15,16) M7(18,19) M8(20,21) M9(23,24)             │
// │  → 9 R1 matches + 7 R1 byes = 16 into R2              │
// │  → 8 R2 → 4 QF → 2 SF → CF → Final                    │
// └─────────────────────────────────────────────────────────┘
// Total: A(26) + B(25) + C(26) + D(25) = 102 universities
// ─────────────────────────────────────────────────────────────

// B/D Pool R1 match flow (8 matches per pool)
export const ROUND_1_MATCH_FLOW_BD = [
  { index: 0, matchInPool: 1, slotA: 3,  slotB: 4,  label: "Match 1" },
  { index: 1, matchInPool: 2, slotA: 5,  slotB: 7,  label: "Match 2" }, // crosses bye-6
  { index: 2, matchInPool: 3, slotA: 8,  slotB: 9,  label: "Match 3" },
  { index: 3, matchInPool: 4, slotA: 10, slotB: 12, label: "Match 4" }, // crosses bye-11
  { index: 4, matchInPool: 5, slotA: 13, slotB: 15, label: "Match 5" }, // crosses bye-14
  { index: 5, matchInPool: 6, slotA: 16, slotB: 18, label: "Match 6" }, // crosses bye-17
  { index: 6, matchInPool: 7, slotA: 20, slotB: 21, label: "Match 7" },
  { index: 7, matchInPool: 8, slotA: 22, slotB: 23, label: "Match 8" },
];

// A/C Pool R1 match flow (9 matches per pool — strictly matches official handwritten draw)
export const ROUND_1_MATCH_FLOW_AC = [
  { index: 0, matchInPool: 1, slotA: 3,  slotB: 4,  label: "Match 1" },
  { index: 1, matchInPool: 2, slotA: 5,  slotB: 6,  label: "Match 2" },
  { index: 2, matchInPool: 3, slotA: 7,  slotB: 8,  label: "Match 3" },
  { index: 3, matchInPool: 4, slotA: 10, slotB: 11, label: "Match 4" },
  { index: 4, matchInPool: 5, slotA: 12, slotB: 13, label: "Match 5" },
  { index: 5, matchInPool: 6, slotA: 16, slotB: 17, label: "Match 6" },
  { index: 6, matchInPool: 7, slotA: 18, slotB: 19, label: "Match 7" },
  { index: 7, matchInPool: 8, slotA: 22, slotB: 23, label: "Match 8" },
  { index: 8, matchInPool: 9, slotA: 24, slotB: 25, label: "Match 9" },
];

// Legacy export — defaults to B/D structure for backward compatibility
export const ROUND_1_MATCH_FLOW = ROUND_1_MATCH_FLOW_BD;

// ─── R1 Bye Slot Definitions ────────────────────────────────

export const BYE_SLOT_OPTIONS_BD = [
  { slot: 1,  label: "Slot 1: Seed — Direct to Pool Final (Round 6)", isSeed: true  },
  { slot: 2,  label: "Slot 2: R1 Bye → advances to R2",               isSeed: false },
  { slot: 6,  label: "Slot 6: R1 Bye → advances to R2",               isSeed: false },
  { slot: 11, label: "Slot 11: R1 Bye → advances to R2",              isSeed: false },
  { slot: 14, label: "Slot 14: R1 Bye → advances to R2",              isSeed: false },
  { slot: 17, label: "Slot 17: R1 Bye → advances to R2",              isSeed: false },
  { slot: 19, label: "Slot 19: R1 Bye → advances to R2",              isSeed: false },
  { slot: 24, label: "Slot 24: R1 Bye → advances to R2",              isSeed: false },
  { slot: 25, label: "Slot 25: R1 Bye → advances to R2",              isSeed: false },
];

export const BYE_SLOT_OPTIONS_AC = [
  { slot: 1,  label: "Slot 1: Seed — Direct to Pool Final (Round 6)", isSeed: true  },
  { slot: 2,  label: "Slot 2: R1 Bye → advances to R2",               isSeed: false },
  { slot: 9,  label: "Slot 9: R1 Bye → advances to R2",               isSeed: false },
  { slot: 14, label: "Slot 14: R1 Bye → advances to R2",              isSeed: false },
  { slot: 15, label: "Slot 15: R1 Bye → advances to R2",              isSeed: false },
  { slot: 20, label: "Slot 20: R1 Bye → advances to R2",              isSeed: false },
  { slot: 21, label: "Slot 21: R1 Bye → advances to R2",              isSeed: false },
  { slot: 26, label: "Slot 26: R1 Bye → advances to R2",              isSeed: false },
];

// Legacy export
export const BYE_SLOT_OPTIONS = BYE_SLOT_OPTIONS_BD;

// ─── Helper Functions ────────────────────────────────────────

/** Returns R1 match flow for a given pool. */
export function getR1MatchFlow(pool: "A" | "B" | "C" | "D") {
  return pool === "A" || pool === "C" ? ROUND_1_MATCH_FLOW_AC : ROUND_1_MATCH_FLOW_BD;
}

/** Returns R1 bye slot options for a given pool. */
export function getByeSlots(pool: "A" | "B" | "C" | "D") {
  return pool === "A" || pool === "C" ? BYE_SLOT_OPTIONS_AC : BYE_SLOT_OPTIONS_BD;
}

/**
 * Returns the number of R1 matches for a pool.
 * A/C: 9 | B/D: 8
 */
export function getR1MatchCount(pool: "A" | "B" | "C" | "D"): number {
  return pool === "A" || pool === "C" ? 9 : 8;
}

/**
 * Returns the bracket row count (= team slot count) for a pool.
 * A/C: 26 rows | B/D: 25 rows
 */
export function getBracketRowCount(pool: "A" | "B" | "C" | "D"): number {
  return pool === "A" || pool === "C" ? 26 : 25;
}

/** Returns the max assignable teams for a pool (same as row count). */
export function getPoolCapacity(pool: "A" | "B" | "C" | "D"): number {
  return getBracketRowCount(pool);
}

export function getGlobalMatchNumber(pool: "A" | "B" | "C" | "D", matchInPool: number): number {
  switch (pool) {
    case "A": return matchInPool;       // Pool A R1: 1–9
    case "B": return 9  + matchInPool;  // Pool B R1: 10–17
    case "C": return 17 + matchInPool;  // Pool C R1: 18–26
    case "D": return 26 + matchInPool;  // Pool D R1: 27–34
    default:  return matchInPool;
  }
}
