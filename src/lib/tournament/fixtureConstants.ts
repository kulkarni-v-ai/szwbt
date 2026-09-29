// ─────────────────────────────────────────────────────────────
// OFFICIAL ROUND 1 FIXTURE MATCH FLOW (13 MATCHES PER POOL)
// ─────────────────────────────────────────────────────────────
export const ROUND_1_MATCH_FLOW = [
  { index: 0, matchInPool: 1, slotA: 3, slotB: 4, label: "Match 1" },
  { index: 1, matchInPool: 2, slotA: 5, slotB: 6, label: "Match 2" },
  { index: 2, matchInPool: 3, slotA: 7, slotB: 8, label: "Match 3" },
  { index: 3, matchInPool: 4, slotA: 9, slotB: 10, label: "Match 4" },
  { index: 4, matchInPool: 5, slotA: 11, slotB: 12, label: "Match 5" },
  { index: 5, matchInPool: 6, slotA: 13, slotB: 14, label: "Match 6" },
  { index: 6, matchInPool: 7, slotA: 15, slotB: 16, label: "Match 7" },
  { index: 7, matchInPool: 8, slotA: 18, slotB: 19, label: "Match 8" },
  { index: 8, matchInPool: 9, slotA: 20, slotB: 21, label: "Match 9" },
  { index: 9, matchInPool: 10, slotA: 22, slotB: 23, label: "Match 10" },
  { index: 10, matchInPool: 11, slotA: 24, slotB: 25, label: "Match 11" },
  { index: 11, matchInPool: 12, slotA: 26, slotB: 27, label: "Match 12" },
  { index: 12, matchInPool: 13, slotA: 28, slotB: 29, label: "Match 13" },
];


export const BYE_SLOT_OPTIONS = [
  { slot: 1, label: "Slot 1: Seed Bye (Direct to Pool Final / Round 6)", isSeed: true },
  { slot: 2, label: "Slot 2: Round 1 Bye (Advances to Round 2 Match)", isSeed: false },
  { slot: 17, label: "Slot 17: Round 1 Bye (Advances to Round 2 Match)", isSeed: false },
  { slot: 30, label: "Slot 30: Round 1 Bye (Advances to Round 2 Match)", isSeed: false },
];

export function getGlobalMatchNumber(pool: "A" | "B" | "C" | "D", matchInPool: number): number {
  switch (pool) {
    case "A": return matchInPool;       // M001 - M013
    case "B": return 24 + matchInPool;  // M025 - M037
    case "C": return 48 + matchInPool;  // M049 - M061
    case "D": return 72 + matchInPool;  // M073 - M085
    default: return matchInPool;
  }
}

