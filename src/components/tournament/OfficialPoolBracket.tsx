"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  ExternalLink,
  Flame,
  CheckCircle2,
  Clock,
  Radio,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";

export type PoolCode = "A" | "B" | "C" | "D" | "CHAMPIONSHIP";

export interface TeamSlot {
  slot: number;
  name: string;
  state: string;
  seed?: number;
  isByeToFinal?: boolean;
  isByeR1?: boolean;
  teamId?: string | null;
  teamCode?: string | null;
  teamNumber?: number | null;
}

export interface PoolBracketProps {
  initialPool?: PoolCode;
  liveMatches?: any[];
  bracketSlots?: any[];
  isAdmin?: boolean;
  onSelectMatch?: (matchNumber: string | number) => void;
  onSlotAssigned?: () => void;
}

// ── B/D Pool bracket (25 rows): strictly matches official handwritten bracket ──
// 4 sections of 6 rows each with byes at top and bottom:
// Section 1 (rows 1-6):   Bye 1,  Pairs: (2,3),   (4,5),   Bye 6
// Section 2 (rows 7-12):  Bye 7,  Pairs: (8,9),   (10,11), Bye 12
// Section 3 (rows 13-18): Bye 13, Pairs: (14,15), (16,17), Bye 18
// Section 4 (rows 19-24): Bye 19, Pairs: (20,21), (22,23), Bye 24
// Row 25: Seed with direct bye to Pool Final!
export const BD_R1_MATCHES = [
  { slotA: 2,  slotB: 3  },  // M1
  { slotA: 4,  slotB: 5  },  // M2
  { slotA: 8,  slotB: 9  },  // M3
  { slotA: 10, slotB: 11 },  // M4
  { slotA: 14, slotB: 15 },  // M5
  { slotA: 16, slotB: 17 },  // M6
  { slotA: 20, slotB: 21 },  // M7
  { slotA: 22, slotB: 23 },  // M8
];
export const BD_R1_BYE_SLOTS = [1, 6, 7, 12, 13, 18, 19, 24];

// ── A/C Pool bracket (26 rows): 1 seed + 7 R1 byes + 9 R1 matches = 26 ──
// Strictly matches official tournament handwritten draw:
// Section 1 (rows 2-8): Bye 2, Pairs: (3,4), (5,6), (7,8)
// Section 2 (rows 9-14): Bye 9, Bye 14, Pairs: (10,11), (12,13)
// Section 3 (rows 15-20): Bye 15, Bye 20, Pairs: (16,17), (18,19)
// Section 4 (rows 21-26): Bye 21, Bye 26, Pairs: (22,23), (24,25)
export const AC_R1_MATCHES = [
  { slotA: 3,  slotB: 4  },  // M1
  { slotA: 5,  slotB: 6  },  // M2
  { slotA: 7,  slotB: 8  },  // M3
  { slotA: 10, slotB: 11 },  // M4
  { slotA: 12, slotB: 13 },  // M5
  { slotA: 16, slotB: 17 },  // M6
  { slotA: 18, slotB: 19 },  // M7
  { slotA: 22, slotB: 23 },  // M8
  { slotA: 24, slotB: 25 },  // M9
];
export const AC_R1_BYE_SLOTS = [2, 9, 14, 15, 20, 21, 26];

export const ROUND_1_MATCH_SLOTS: Record<number, { slotA: number; slotB: number }> = {
  1: { slotA: 3,  slotB: 4  },
  2: { slotA: 5,  slotB: 6  },
  3: { slotA: 8,  slotB: 9  },
  4: { slotA: 10, slotB: 11 },
  5: { slotA: 13, slotB: 14 },
  6: { slotA: 16, slotB: 17 },
  7: { slotA: 19, slotB: 20 },
  8: { slotA: 22, slotB: 23 },
};

export function OfficialPoolBracket({
  initialPool = "A",
  liveMatches = [],
  bracketSlots: initialBracketSlots,
  isAdmin = false,
  onSelectMatch,
  onSlotAssigned,
}: PoolBracketProps) {
  const [activePool, setActivePool] = useState<PoolCode>(initialPool);
  const [themeMode, setThemeMode] = useState<"PAPER" | "DARK">("PAPER");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedMatchModal, setSelectedMatchModal] = useState<any | null>(null);
  const [hoveredTeam, setHoveredTeam] = useState<number | null>(null);

  // Internal slots state
  const [localSlots, setLocalSlots] = useState<any[]>(initialBracketSlots || []);

  useEffect(() => {
    if (initialBracketSlots && initialBracketSlots.length > 0) {
      setLocalSlots(initialBracketSlots);
    } else {
      fetch("/api/tournament/fixtures")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data.bracketSlots) {
            setLocalSlots(data.data.bracketSlots);
          }
        })
        .catch((err) => console.error("Error loading bracket slots:", err));
    }
  }, [initialBracketSlots]);

  // Derived pool counts strictly capped at 25 teams per pool
  const poolCounts = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    (localSlots || []).forEach((s: any) => {
      if (s.teamId && counts[s.pool] !== undefined) {
        counts[s.pool]++;
      }
    });
    return counts;
  }, [localSlots]);

  const maxPoolCapacity = (activePool === "A" || activePool === "C") ? 26 : 25;
  const activePoolCount = activePool !== "CHAMPIONSHIP" ? poolCounts[activePool] || 0 : 0;
  const isActivePoolFull = activePoolCount >= maxPoolCapacity;

  // Slot Assignment Modal state
  const [assignModalSlot, setAssignModalSlot] = useState<TeamSlot | null>(null);
  const [teamNumberInput, setTeamNumberInput] = useState<string>("");
  const [fetchedTeam, setFetchedTeam] = useState<any | null>(null);
  const [isFetchingTeam, setIsFetchingTeam] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Match Fixture Pairing Modal State (for Round 1 Two Boxes VS interface)
  const [pairModalTeam1Input, setPairModalTeam1Input] = useState<string>("");
  const [pairModalTeam1Fetched, setPairModalTeam1Fetched] = useState<any | null>(null);
  const [pairModalTeam1Fetching, setPairModalTeam1Fetching] = useState<boolean>(false);

  const [pairModalTeam2Input, setPairModalTeam2Input] = useState<string>("");
  const [pairModalTeam2Fetched, setPairModalTeam2Fetched] = useState<any | null>(null);
  const [pairModalTeam2Fetching, setPairModalTeam2Fetching] = useState<boolean>(false);

  const [pairModalAssigning, setPairModalAssigning] = useState<boolean>(false);
  const [pairModalError, setPairModalError] = useState<string | null>(null);

  const searchPairTeam1 = async (query: string) => {
    setPairModalTeam1Input(query);
    if (!query.trim()) {
      setPairModalTeam1Fetched(null);
      return;
    }
    try {
      setPairModalTeam1Fetching(true);
      setPairModalError(null);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && data.teams && data.teams.length > 0) {
        setPairModalTeam1Fetched(data.teams[0]);
      } else {
        setPairModalTeam1Fetched(null);
      }
    } catch {
      setPairModalError("Failed to fetch team 1 details.");
    } finally {
      setPairModalTeam1Fetching(false);
    }
  };

  const searchPairTeam2 = async (query: string) => {
    setPairModalTeam2Input(query);
    if (!query.trim()) {
      setPairModalTeam2Fetched(null);
      return;
    }
    try {
      setPairModalTeam2Fetching(true);
      setPairModalError(null);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && data.teams && data.teams.length > 0) {
        setPairModalTeam2Fetched(data.teams[0]);
      } else {
        setPairModalTeam2Fetched(null);
      }
    } catch {
      setPairModalError("Failed to fetch team 2 details.");
    } finally {
      setPairModalTeam2Fetching(false);
    }
  };

  const handleConfirmModalPair = async (matchNum: number, slotA: number, slotB: number) => {
    if (!pairModalTeam1Fetched || !pairModalTeam2Fetched) {
      setPairModalError("Please enter valid team numbers for BOTH teams.");
      return;
    }
    if (pairModalTeam1Fetched.id === pairModalTeam2Fetched.id) {
      setPairModalError("Team 1 and Team 2 cannot be the same university.");
      return;
    }

    // Strict 25-team limit per pool check
    const otherAssignedCount = (localSlots || []).filter(
      (s: any) => s.pool === activePool && s.teamId && s.slot !== slotA && s.slot !== slotB
    ).length;

    if (otherAssignedCount + 2 > 25) {
      setPairModalError(
        `POOL CAPACITY EXCEEDED: Pool ${activePool} is limited to exactly 25 teams maximum. Currently assigned: ${otherAssignedCount}/25. Adding this match would breach the limit (${otherAssignedCount + 2}/25).`
      );
      return;
    }

    // Uniqueness validation
    const duplicateA = (localSlots || []).find(
      (s: any) => s.teamId === pairModalTeam1Fetched.id && !(s.pool === activePool && (s.slot === slotA || s.slot === slotB))
    );
    if (duplicateA) {
      setPairModalError(
        `Team #${pairModalTeam1Fetched.teamNumber || pairModalTeam1Fetched.teamCode} (${pairModalTeam1Fetched.name}) is already assigned to Pool ${duplicateA.pool} Slot #${duplicateA.slot}. Each team can only be assigned once.`
      );
      return;
    }

    const duplicateB = (localSlots || []).find(
      (s: any) => s.teamId === pairModalTeam2Fetched.id && !(s.pool === activePool && (s.slot === slotA || s.slot === slotB))
    );
    if (duplicateB) {
      setPairModalError(
        `Team #${pairModalTeam2Fetched.teamNumber || pairModalTeam2Fetched.teamCode} (${pairModalTeam2Fetched.name}) is already assigned to Pool ${duplicateB.pool} Slot #${duplicateB.slot}. Each team can only be assigned once.`
      );
      return;
    }
    try {
      setPairModalAssigning(true);
      setPairModalError(null);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_MATCH_FIXTURE",
          pool: activePool,
          matchNumber: matchNum,
          slotA,
          slotB,
          teamANumber: pairModalTeam1Fetched.teamNumber,
          teamBNumber: pairModalTeam2Fetched.teamNumber,
          teamAId: pairModalTeam1Fetched.id,
          teamBId: pairModalTeam2Fetched.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      // Refresh slots
      const updatedSlotsRes = await fetch("/api/tournament/fixtures");
      const updatedData = await updatedSlotsRes.json();
      if (updatedData.success && updatedData.data.bracketSlots) {
        setLocalSlots(updatedData.data.bracketSlots);
      }

      onSlotAssigned?.();
      setSelectedMatchModal(null);
    } catch (err: any) {
      setPairModalError(err.message || "Failed to save match fixture.");
    } finally {
      setPairModalAssigning(false);
    }
  };

  const handleClearModalPair = async (slotA: number, slotB: number) => {
    try {
      setPairModalAssigning(true);
      await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_SLOT",
          pool: activePool,
          slot: slotA,
        }),
      });
      await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_SLOT",
          pool: activePool,
          slot: slotB,
        }),
      });

      // Refresh slots
      const updatedSlotsRes = await fetch("/api/tournament/fixtures");
      const updatedData = await updatedSlotsRes.json();
      if (updatedData.success && updatedData.data.bracketSlots) {
        setLocalSlots(updatedData.data.bracketSlots);
      }

      onSlotAssigned?.();
      setSelectedMatchModal(null);
    } catch (err: any) {
      setPairModalError(err.message || "Failed to clear match fixture.");
    } finally {
      setPairModalAssigning(false);
    }
  };

  // Handler: Clear all slots in Active Pool
  const [isClearingPool, setIsClearingPool] = useState(false);
  const handleClearActivePool = async (poolToClear: PoolCode = activePool) => {
    if (poolToClear === "CHAMPIONSHIP") return;
    if (!confirm(`Are you sure you want to clear all team assignments in POOL ${poolToClear} back to empty?`)) {
      return;
    }
    try {
      setIsClearingPool(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLEAR_POOL",
          pool: poolToClear,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to clear Pool ${poolToClear}`);
      }
      const updatedSlotsRes = await fetch("/api/tournament/fixtures");
      const updatedData = await updatedSlotsRes.json();
      if (updatedData.success && updatedData.data.bracketSlots) {
        setLocalSlots(updatedData.data.bracketSlots);
      }
      onSlotAssigned?.();
    } catch (err: any) {
      alert(err.message || `Failed to clear Pool ${poolToClear}`);
    } finally {
      setIsClearingPool(false);
    }
  };

  // Handler: Search/Fetch team details from DB as admin types team number or code
  const searchTeam = async (query: string) => {
    if (!query.trim()) {
      setFetchedTeam(null);
      return;
    }
    try {
      setIsFetchingTeam(true);
      setAssignError(null);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && data.teams && data.teams.length > 0) {
        setFetchedTeam(data.teams[0]);
      } else {
        setFetchedTeam(null);
        setAssignError(`No university found matching "${query}".`);
      }
    } catch {
      setAssignError("Failed to fetch team details from database.");
    } finally {
      setIsFetchingTeam(false);
    }
  };

  const handleSlotClick = (slot: TeamSlot) => {
    setAssignModalSlot(slot);
    const initialQuery = slot.teamNumber ? String(slot.teamNumber) : slot.teamCode || "";
    setTeamNumberInput(initialQuery);
    setFetchedTeam(null);
    setAssignError(null);
    if (initialQuery) {
      searchTeam(initialQuery);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assignModalSlot || !fetchedTeam) {
      setAssignError("Please enter a valid team number to fetch university details first.");
      return;
    }

    // Strict pool limit validation (26 for A/C, 25 for B/D)
    const otherAssignedCount = (localSlots || []).filter(
      (s: any) => s.pool === activePool && s.teamId && s.slot !== assignModalSlot.slot
    ).length;

    if (otherAssignedCount >= maxPoolCapacity) {
      setAssignError(
        `POOL CAPACITY EXCEEDED: Pool ${activePool} has already reached its strict limit of ${maxPoolCapacity} teams (${maxPoolCapacity}/${maxPoolCapacity}). Remove another team first before assigning this slot.`
      );
      return;
    }

    // Uniqueness validation
    const duplicate = (localSlots || []).find(
      (s: any) => s.teamId === fetchedTeam.id && !(s.pool === activePool && s.slot === assignModalSlot.slot)
    );
    if (duplicate) {
      setAssignError(
        `Team #${fetchedTeam.teamNumber || fetchedTeam.teamCode} (${fetchedTeam.name}) is already assigned to Pool ${duplicate.pool} Slot #${duplicate.slot}. Each team can only be assigned once.`
      );
      return;
    }
    try {
      setIsAssigning(true);
      setAssignError(null);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_SLOT",
          pool: activePool,
          slot: assignModalSlot.slot,
          teamId: fetchedTeam.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign team to slot.");
      }

      // Refresh slots
      const updatedSlotsRes = await fetch("/api/tournament/fixtures");
      const updatedData = await updatedSlotsRes.json();
      if (updatedData.success && updatedData.data.bracketSlots) {
        setLocalSlots(updatedData.data.bracketSlots);
      }

      onSlotAssigned?.();
      setAssignModalSlot(null);
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign team.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignSlot = async () => {
    if (!assignModalSlot) return;
    try {
      setIsAssigning(true);
      setAssignError(null);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_SLOT",
          pool: activePool,
          slot: assignModalSlot.slot,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to unassign slot.");
      }

      // Refresh slots
      const updatedSlotsRes = await fetch("/api/tournament/fixtures");
      const updatedData = await updatedSlotsRes.json();
      if (updatedData.success && updatedData.data.bracketSlots) {
        setLocalSlots(updatedData.data.bracketSlots);
      }

      onSlotAssigned?.();
      setAssignModalSlot(null);
    } catch (err: any) {
      setAssignError(err.message || "Failed to unassign slot.");
    } finally {
      setIsAssigning(false);
    }
  };

  // A/C pools: 26 rows (9 R1 matches + 7 R1 byes + 1 seed)
  // B/D pools: 25 rows (8 R1 matches + 8 R1 byes + 1 seed)
  // Both produce 16 R2 entrants → 8 R2 → 4 QF → 2 SF → 1 CF → 1 Final
  const isACPool = activePool === "A" || activePool === "C";
  const totalBracketRows = isACPool ? 26 : 25;
  const r1ByeSlotSet = isACPool
    ? new Set(AC_R1_BYE_SLOTS)
    : new Set(BD_R1_BYE_SLOTS);

  // Global slot offset so displayed numbers run 1–102 across all pools:
  // Pool A: local 1–26  → global 1–26   (offset 0)
  // Pool B: local 1–25  → global 27–51  (offset 26)
  // Pool C: local 1–26  → global 52–77  (offset 51)
  // Pool D: local 1–25  → global 78–102 (offset 77)
  const poolSlotOffset = useMemo(() => {
    switch (activePool) {
      case "A": return 0;
      case "B": return 26;
      case "C": return 51;
      case "D": return 77;
      default:  return 0;
    }
  }, [activePool]);

  /** Returns the globally-numbered label for a pool-local slot. */
  const globalSlot = (localSlotNum: number) => poolSlotOffset + localSlotNum;

  // Dynamically compute slots for active pool from database assignments
  const currentRoster: TeamSlot[] = useMemo(() => {
    const slots: TeamSlot[] = [];
    const poolSlots = (localSlots || []).filter((s: any) => s.pool === activePool);
    const slotMap = new Map<number, any>(poolSlots.map((s: any) => [s.slot, s]));
    const isAC = activePool === "A" || activePool === "C";
    const rowCount = isAC ? 26 : 25;
    const byeSet = isAC ? new Set(AC_R1_BYE_SLOTS) : new Set(BD_R1_BYE_SLOTS);

    for (let slotNum = 1; slotNum <= rowCount; slotNum++) {
      const assigned = slotMap.get(slotNum);
      const isByeToFinal = isAC ? slotNum === 1 : slotNum === 25;
      const isByeR1 = byeSet.has(slotNum);
      const seed = isAC
        ? (slotNum === 1 ? (activePool === "A" ? 1 : 3) : undefined)
        : (slotNum === 25 ? (activePool === "B" ? 2 : 4) : undefined);

      slots.push({
        slot: slotNum,
        name: assigned?.teamName || "",
        state: assigned?.state || "",
        seed,
        isByeToFinal,
        isByeR1,
        teamId: assigned?.teamId || null,
        teamCode: assigned?.teamCode || null,
        teamNumber: assigned?.teamNumber || null,
      });
    }
    return slots;
  }, [activePool, localSlots]);

  // Match offsets for pools
  // A/C pools have 14 R1 matches and 9 R2 matches; B/D pools have 13 R1 and 8 R2 matches.
  const poolOffsets = useMemo(() => {
    switch (activePool) {
      case "A":
        return { r1: 1, r2: 53, r3: 85, r4: 101, r5: 109, final: 113 };
      case "B":
        return { r1: 14, r2: 61, r3: 89, r4: 103, r5: 110, final: 114 };
      case "C":
        return { r1: 27, r2: 69, r3: 93, r4: 105, r5: 111, final: 115 };
      case "D":
        return { r1: 40, r2: 77, r3: 97, r4: 107, r5: 112, final: 116 };
      default:
        return { r1: 1, r2: 53, r3: 85, r4: 101, r5: 109, final: 113 };
    }
  }, [activePool]);

  // Geometry configuration
  const config = {
    topPadding: 50,
    slotHeight: 26,
    slotGap: 8,
    slotWidth: 420,
    startX: 30,
    r1ColX: 470,
    r2ColX: 535,
    r3ColX: 600,
    r4ColX: 665,
    r5ColX: 730,
    finalColX: 835,
    endArrowX: 885,
    badgeW: 24,
    badgeH: 16,
  };

  const pitch = config.slotHeight + config.slotGap;
  // Height scales with the pool's row count (25 for B/D, 26 for A/C)
  const totalSvgHeight = config.topPadding + totalBracketRows * pitch + 50;
  const totalSvgWidth = config.endArrowX + 50;

  // Coordinate helpers
  const getSlotY = (slotNum: number) => {
    return config.topPadding + (slotNum - 1) * pitch;
  };

  const getSlotCenterY = (slotNum: number) => {
    return getSlotY(slotNum) + config.slotHeight / 2;
  };

  // ─────────────────────────────────────────────────────────────────
  // MATCH POSITION CALCULATION — Reference image bracket layout
  //
  // B/D (25 rows): byes at 2,7,12,15,18,21,24,25
  //   All R1 pairs are strictly adjacent (no pair crosses a bye slot):
  //   (3,4) (5,6) (8,9) (10,11) (13,14) (16,17) (19,20) (22,23)
  //
  // A/C (26 rows): byes at 2,9,14,17,22,25,26
  //   All R1 pairs strictly adjacent:
  //   (3,4) (5,6) (7,8) (10,11) (12,13) (15,16) (18,19) (20,21) (23,24)
  //
  // Both produce 16 R2 inputs → 8 R2 → 4 QF → 2 SF → CF → Final
  // ─────────────────────────────────────────────────────────────────
  const matchPositions = useMemo(() => {
    const o = poolOffsets;
    const pos: Record<number, number> = {};
    const isAC = activePool === "A" || activePool === "C";
    const g = getSlotCenterY;

    if (isAC) {
      // ── A/C: 9 R1 matches (strictly matches official tournament handwritten draw) ──
      pos[o.r1 + 0] = (g(3)  + g(4))  / 2; // M1: (3,4)
      pos[o.r1 + 1] = (g(5)  + g(6))  / 2; // M2: (5,6)
      pos[o.r1 + 2] = (g(7)  + g(8))  / 2; // M3: (7,8)
      pos[o.r1 + 3] = (g(10) + g(11)) / 2; // M4: (10,11)
      pos[o.r1 + 4] = (g(12) + g(13)) / 2; // M5: (12,13)
      pos[o.r1 + 5] = (g(16) + g(17)) / 2; // M6: (16,17)
      pos[o.r1 + 6] = (g(18) + g(19)) / 2; // M7: (18,19)
      pos[o.r1 + 7] = (g(22) + g(23)) / 2; // M8: (22,23)
      pos[o.r1 + 8] = (g(24) + g(25)) / 2; // M9: (24,25)

      // A/C R2 (8 matches):
      pos[o.r2 + 0] = (g(2)           + pos[o.r1+0]) / 2; // bye2   + M1
      pos[o.r2 + 1] = (pos[o.r1+1]   + pos[o.r1+2]) / 2; // M2     + M3
      pos[o.r2 + 2] = (g(9)           + pos[o.r1+3]) / 2; // bye9   + M4
      pos[o.r2 + 3] = (pos[o.r1+4]   + g(14))        / 2; // M5     + bye14
      pos[o.r2 + 4] = (g(15)          + pos[o.r1+5]) / 2; // bye15  + M6
      pos[o.r2 + 5] = (pos[o.r1+6]   + g(20))        / 2; // M7     + bye20
      pos[o.r2 + 6] = (g(21)          + pos[o.r1+7]) / 2; // bye21  + M8
      pos[o.r2 + 7] = (pos[o.r1+8]   + g(26))        / 2; // M9     + bye26
    } else {
      // B/D: 8 adjacent R1 pairs strictly matching official handwritten bracket
      // 4 sections of 6 rows, byes at top and bottom of each section:
      // Section 1 (rows 1-6):   Bye 1,  Pairs (2,3),   (4,5),   Bye 6
      // Section 2 (rows 7-12):  Bye 7,  Pairs (8,9),   (10,11), Bye 12
      // Section 3 (rows 13-18): Bye 13, Pairs (14,15), (16,17), Bye 18
      // Section 4 (rows 19-24): Bye 19, Pairs (20,21), (22,23), Bye 24
      // Row 25: Seed with direct bye to Pool Final!
      pos[o.r1+0] = (g(2)  + g(3))  / 2; // M1: (2,3)
      pos[o.r1+1] = (g(4)  + g(5))  / 2; // M2: (4,5)
      pos[o.r1+2] = (g(8)  + g(9))  / 2; // M3: (8,9)
      pos[o.r1+3] = (g(10) + g(11)) / 2; // M4: (10,11)
      pos[o.r1+4] = (g(14) + g(15)) / 2; // M5: (14,15)
      pos[o.r1+5] = (g(16) + g(17)) / 2; // M6: (16,17)
      pos[o.r1+6] = (g(20) + g(21)) / 2; // M7: (20,21)
      pos[o.r1+7] = (g(22) + g(23)) / 2; // M8: (22,23)

      // B/D R2 (8 matches):
      pos[o.r2+0] = (g(1)           + pos[o.r1+0]) / 2; // bye1  + M1
      pos[o.r2+1] = (pos[o.r1+1]   + g(6))         / 2; // M2    + bye6
      pos[o.r2+2] = (g(7)           + pos[o.r1+2]) / 2; // bye7  + M3
      pos[o.r2+3] = (pos[o.r1+3]   + g(12))        / 2; // M4    + bye12
      pos[o.r2+4] = (g(13)          + pos[o.r1+4]) / 2; // bye13 + M5
      pos[o.r2+5] = (pos[o.r1+5]   + g(18))        / 2; // M6    + bye18
      pos[o.r2+6] = (g(19)          + pos[o.r1+6]) / 2; // bye19 + M7
      pos[o.r2+7] = (pos[o.r1+7]   + g(24))        / 2; // M8    + bye24
    }

    // QF / SF / CF / Final — identical structure for all pools
    pos[o.r3 + 0] = (pos[o.r2+0] + pos[o.r2+1]) / 2; // QF1
    pos[o.r3 + 1] = (pos[o.r2+2] + pos[o.r2+3]) / 2; // QF2
    pos[o.r3 + 2] = (pos[o.r2+4] + pos[o.r2+5]) / 2; // QF3
    pos[o.r3 + 3] = (pos[o.r2+6] + pos[o.r2+7]) / 2; // QF4

    pos[o.r4 + 0] = (pos[o.r3+0] + pos[o.r3+1]) / 2; // SF1
    pos[o.r4 + 1] = (pos[o.r3+2] + pos[o.r3+3]) / 2; // SF2

    pos[o.r5]   = (pos[o.r4+0] + pos[o.r4+1]) / 2;   // Challenger Final
    pos[o.final] = isAC ? (g(1) + pos[o.r5]) / 2 : (pos[o.r5] + g(25)) / 2; // Pool Final (Seed vs CF winner)

    return pos;
  }, [poolOffsets, activePool]);

  // Color schemes
  const isPaper = themeMode === "PAPER";
  const colors = {
    bg: isPaper ? "#FFFFFF" : "#050914",
    cardBg: isPaper ? "#FFFFFF" : "#0B1226",
    cardBorder: isPaper ? "#002060" : "#00F0FF",
    textPrimary: isPaper ? "#000000" : "#F4E6CE",
    textMuted: isPaper ? "#1A365D" : "#91A0AE",
    lineColor: isPaper ? "#002060" : "#00F0FF",
    badgeBg: isPaper ? "#FFFFFF" : "#060D20",
    badgeBorder: isPaper ? "#002060" : "#FF5A16",
    badgeText: isPaper ? "#002060" : "#FF5A16",
    highlightLine: "#FF5A16",
  };

  const handleMatchClick = (matchNum: number, roundName: string) => {
    const liveInfo = liveMatches.find(
      (m) =>
        m.publicMatchNumber === `M${String(matchNum).padStart(3, "0")}` ||
        m.matchNumber?.includes(`M${String(matchNum).padStart(3, "0")}`)
    );

    let matchInPool = matchNum;
    if (activePool === "B") matchInPool = matchNum - 13;
    else if (activePool === "C") matchInPool = matchNum - 26;
    else if (activePool === "D") matchInPool = matchNum - 39;

    setSelectedMatchModal({
      matchNumber: matchNum,
      matchInPool,
      roundName,
      pool: activePool,
      liveInfo,
    });

    if (onSelectMatch) {
      onSelectMatch(matchNum);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl border transition-colors shadow-2xl overflow-hidden ${
        isPaper
          ? "bg-white border-blue-900 text-slate-900"
          : "bg-[#050914] border-[#00F0FF]/30 text-[#F4E6CE]"
      }`}
    >
      {/* ═══ TOP CONTROLS & POOL SELECTOR ═══ */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${
          isPaper ? "bg-slate-50 border-blue-200" : "bg-[#090F24] border-[#18D8D0]/30"
        }`}
      >
        {/* Pool Selector Tabs with Pool Limit Badges (26 for A/C, 25 for B/D) */}
        <div className="flex flex-wrap items-center gap-2">
          {(["A", "B", "C", "D"] as const).map((p) => {
            const isSelected = activePool === p;
            const count = poolCounts[p] || 0;
            const poolLimit = (p === "A" || p === "C") ? 26 : 25;
            const isFull = count >= poolLimit;
            return (
              <button
                key={p}
                onClick={() => setActivePool(p)}
                className={`px-3.5 py-2 rounded-lg font-pixel text-xs tracking-wider uppercase font-bold transition-all shadow-sm flex items-center gap-2 ${
                  isSelected
                    ? isPaper
                      ? "bg-[#002060] text-white ring-2 ring-blue-700 shadow-md"
                      : "bg-[#FF5A16] text-black shadow-[0_0_12px_rgba(255,90,22,0.6)]"
                    : isPaper
                    ? "bg-white text-blue-900 border border-blue-300 hover:bg-blue-50"
                    : "bg-[#050914] text-[#91A0AE] border border-[#1A2644] hover:text-white"
                }`}
              >
                <span>POOL - {p}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isSelected
                      ? isPaper
                        ? "bg-blue-900 text-blue-100"
                        : "bg-black/35 text-black font-extrabold"
                      : isFull
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : isPaper
                      ? "bg-blue-100 text-blue-800"
                      : "bg-[#101935] text-[#00F0FF]"
                  }`}
                >
                  {count}/{poolLimit}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setActivePool("CHAMPIONSHIP")}
            className={`px-4 py-2 rounded-lg font-pixel text-xs tracking-wider uppercase font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              activePool === "CHAMPIONSHIP"
                ? isPaper
                  ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-500"
                  : "bg-[#00F0FF] text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.6)]"
                : isPaper
                ? "bg-white text-amber-900 border border-amber-300 hover:bg-amber-50"
                : "bg-[#050914] text-[#91A0AE] border border-[#1A2644] hover:text-[#00F0FF]"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>FINAL 4 / PODIUM</span>
          </button>

          {isAdmin && activePool !== "CHAMPIONSHIP" && (
            <button
              onClick={() => handleClearActivePool()}
              disabled={isClearingPool || (poolCounts[activePool] || 0) === 0}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-30 text-rose-300 border border-rose-500/40 font-pixel text-xs uppercase transition-colors rounded-lg shadow flex items-center gap-1.5"
              title={`Clear all slots in Pool ${activePool}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR POOL {activePool}</span>
            </button>
          )}
        </div>

        {/* View Tools: Theme Toggle, Zoom Controls, Print */}
        <div className="flex items-center gap-2">
          {/* Paper vs Cyber Theme */}
          <button
            onClick={() => setThemeMode(isPaper ? "DARK" : "PAPER")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-pixel text-[11px] font-bold uppercase transition-colors border ${
              isPaper
                ? "bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200"
                : "bg-[#101935] text-[#00F0FF] border-[#00F0FF]/30 hover:bg-[#15234a]"
            }`}
            title="Toggle Official Print Paper vs Cyber Dark"
          >
            {isPaper ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPaper ? "Cyber Dark" : "Official Sheet"}</span>
          </button>

          {/* Zoom Controls */}
          <div
            className={`flex items-center rounded-lg border p-0.5 ${
              isPaper ? "bg-white border-blue-300" : "bg-[#050914] border-[#1A2644]"
            }`}
          >
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className={`p-1.5 rounded ${isPaper ? "hover:bg-blue-50 text-blue-900" : "hover:bg-[#1A2644] text-[#91A0AE]"}`}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              className={`font-pixel text-[10px] w-12 text-center font-bold ${
                isPaper ? "text-blue-950" : "text-[#91A0AE]"
              }`}
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className={`p-1.5 rounded ${isPaper ? "hover:bg-blue-50 text-blue-900" : "hover:bg-[#1A2644] text-[#91A0AE]"}`}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className={`px-2 py-1 font-pixel text-[10px] font-bold rounded ${
                isPaper ? "hover:bg-blue-50 text-blue-900" : "hover:bg-[#1A2644] text-[#00F0FF]"
              }`}
            >
              FIT
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className={`p-2 rounded-lg border font-pixel text-xs transition-colors ${
              isPaper
                ? "bg-white border-blue-300 text-blue-900 hover:bg-blue-50"
                : "bg-[#050914] border-[#1A2644] text-[#91A0AE] hover:text-white"
            }`}
            title="Print Bracket Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ POOL HEADER BADGE & 25-TEAM LIMIT TELEMETRY ═══ */}
      {activePool !== "CHAMPIONSHIP" ? (
        <div className="flex flex-col items-center justify-center pt-5 pb-2 gap-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              className={`px-6 py-1.5 rounded-lg border-2 font-display text-sm tracking-widest uppercase font-black shadow-md ${
                isPaper
                  ? "bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 border-[#002060] text-[#002060]"
                  : "bg-gradient-to-r from-cyan-950 via-[#0B1E40] to-cyan-950 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              }`}
            >
              POOL - {activePool}
            </div>
            <div
              className={`px-3 py-1 rounded-lg font-pixel text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isActivePoolFull
                  ? "bg-[#FF5A16] text-black shadow-[0_0_10px_rgba(255,90,22,0.5)]"
                  : isPaper
                  ? "bg-blue-100 text-blue-900 border border-blue-300"
                  : "bg-[#091228] text-[#00F0FF] border border-[#00F0FF]/30"
              }`}
            >
              <span>{activePoolCount} / {maxPoolCapacity} TEAMS</span>
              <span className="text-[10px] opacity-75">(LIMIT: {maxPoolCapacity})</span>
            </div>
          </div>
          {isActivePoolFull && (
            <div className="text-[11px] font-pixel text-[#FF5A16] bg-[#FF5A16]/10 px-3 py-1 rounded-md border border-[#FF5A16]/30 animate-pulse">
              POOL {activePool} HAS REACHED ITS OFFICIAL {maxPoolCapacity}-TEAM LIMIT ({maxPoolCapacity}/{maxPoolCapacity} FILLED)
            </div>
          )}

          {/* Explanation badge — A/C: 26 slots/26 rows, B/D: 25 slots/25 rows */}
          <div className="w-full mt-2 p-2.5 bg-[#070D1E] border border-[#00F0FF]/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#00F0FF] text-black font-pixel text-[10px] font-bold rounded">
                {isACPool ? "26" : "25"} SLOTS — POOL {activePool}
              </span>
              <span className="text-slate-300 font-sans text-xs">
                {isACPool
                  ? <>Pool {activePool}: <strong>26 team slots</strong> — 9 R1 matches + 7 R1 byes + 1 seed → 16 into R2 → 8 R2 → 4 QF → 2 SF → CF → Final.</>  
                  : <>Pool {activePool}: <strong>25 team slots</strong> — 8 R1 matches + 8 R1 byes + 1 seed → 16 into R2 → 8 R2 → 4 QF → 2 SF → CF → Final.</>}
              </span>
            </div>
            <span className="font-pixel text-[10px] text-[#05D550]">
              TOTAL: 102 UNIVERSITIES ACROSS 4 POOLS
            </span>
          </div>
        </div>
      ) : (
        <div className="flex justify-center pt-6 pb-2">
          <div
            className={`px-6 py-1.5 rounded-lg border-2 font-display text-sm tracking-widest uppercase font-black shadow-md ${
              isPaper
                ? "bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 border-amber-900 text-amber-900"
                : "bg-gradient-to-r from-amber-950 via-[#362208] to-amber-950 border-[#FFB800] text-[#FFB800] shadow-[0_0_15px_rgba(255,184,0,0.3)]"
            }`}
          >
            ALL-INDIA INTER-POOL PODIUM CHAMPIONSHIP
          </div>
        </div>
      )}

      {/* ═══ INTERACTIVE SVG BRACKET CANVAS ═══ */}
      {activePool !== "CHAMPIONSHIP" ? (
        <div className="overflow-x-auto overflow-y-auto p-4 sm:p-6 cursor-grab active:cursor-grabbing">
          <div
            className="transition-transform duration-150 origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <svg
              width={totalSvgWidth}
              height={totalSvgHeight}
              viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
              className="select-none font-sans"
            >
              <defs>
                {/* Marker for arrow ending match 113 */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill={colors.lineColor} />
                </marker>
              </defs>

              {/* ── 1. DRAW TEAM SLOTS (1 TO 30) ── */}
              {currentRoster.map((t) => {
                const y = getSlotY(t.slot);
                const centerY = getSlotCenterY(t.slot);
                const isHovered = hoveredTeam === t.slot;
                const isAssigned = !!t.name;

                return (
                  <g
                    key={t.slot}
                    className="cursor-pointer group"
                    onClick={() => handleSlotClick(t)}
                    onMouseEnter={() => setHoveredTeam(t.slot)}
                    onMouseLeave={() => setHoveredTeam(null)}
                  >
                    {/* Team slot rectangular box */}
                    <rect
                      x={config.startX}
                      y={y}
                      width={config.slotWidth}
                      height={config.slotHeight}
                      rx={3}
                      fill={
                        isHovered
                          ? isPaper
                            ? "#EBF4FF"
                            : "#18264A"
                          : isAssigned
                          ? colors.cardBg
                          : isPaper
                          ? "#F8FAFC"
                          : "#070E1E"
                      }
                      stroke={
                        isHovered
                          ? colors.highlightLine
                          : isAssigned
                          ? colors.cardBorder
                          : isPaper
                          ? "#94A3B8"
                          : "#1E3056"
                      }
                      strokeWidth={1.5}
                      strokeDasharray={isAssigned ? undefined : "3 3"}
                      className="transition-colors"
                    />

                    {/* Team slot text */}
                      {isAssigned ? (
                      <text
                        x={config.startX + 8}
                        y={centerY + 4}
                        fill={isHovered ? colors.highlightLine : colors.textPrimary}
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="Arial, Helvetica, sans-serif"
                        letterSpacing="0.2px"
                      >
                        {globalSlot(t.slot)}. {t.name}{t.state ? `, ${t.state}` : ""}{t.seed ? ` [Seed #${t.seed}]` : ""}
                      </text>
                    ) : (
                      <text
                        x={config.startX + 8}
                        y={centerY + 4}
                        fill={isHovered ? colors.highlightLine : isPaper ? "#64748B" : "#475569"}
                        fontSize="9.5"
                        fontWeight="500"
                        fontFamily="Arial, Helvetica, sans-serif"
                        letterSpacing="0.2px"
                      >
                        {globalSlot(t.slot)}. {t.seed ? `[Seed #${t.seed} Bye] ` : t.isByeR1 ? `[R1 Bye] ` : ""}{isHovered ? "── Click to assign ──" : "──"}
                      </text>
                    )}

                    {/* Horizontal stub: seed→final, R1 byes→R2, others→R1 */}
                    <line
                      x1={config.startX + config.slotWidth}
                      y1={centerY}
                      x2={
                        t.isByeToFinal
                          ? config.finalColX
                          : r1ByeSlotSet.has(t.slot)
                          ? config.r2ColX
                          : config.r1ColX
                      }
                      y2={centerY}
                      stroke={isHovered ? colors.highlightLine : colors.lineColor}
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}

              {/* ── 2. ROUND 1 BRACKET LINES & BADGES ── */}
              {/* A/C: 9 R1 pairs (all adjacent) | B/D: 8 R1 pairs (some cross a bye slot) */}
              {(isACPool ? AC_R1_MATCHES : BD_R1_MATCHES).map(({ slotA, slotB }, idx) => {
                const m = poolOffsets.r1 + idx;
                const t1 = slotA;
                const t2 = slotB;
                const y1 = getSlotCenterY(t1);
                const y2 = getSlotCenterY(t2);
                const midY = matchPositions[m];

                return (
                  <g key={m}>
                    {/* Vertical connector line */}
                    <line
                      x1={config.r1ColX}
                      y1={y1}
                      x2={config.r1ColX}
                      y2={y2}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {/* Horizontal stem to match badge */}
                    <line
                      x1={config.r1ColX}
                      y1={midY}
                      x2={config.r2ColX}
                      y2={midY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {/* Match number box badge */}
                    {renderMatchBadge(
                      m,
                      config.r1ColX + 18,
                      midY,
                      "Round 1",
                      colors,
                      handleMatchClick
                    )}
                  </g>
                );
              })}

              {/* ── 3. ROUND 2 BRACKET LINES & BADGES (8 matches per pool) ── */}
              {(isACPool ? [
                // A/C R2 (strictly matches official tournament handwritten draw)
                { m: poolOffsets.r2+0, topY: getSlotCenterY(2),              botY: matchPositions[poolOffsets.r1+0] }, // bye2 + M1
                { m: poolOffsets.r2+1, topY: matchPositions[poolOffsets.r1+1], botY: matchPositions[poolOffsets.r1+2] }, // M2+M3
                { m: poolOffsets.r2+2, topY: getSlotCenterY(9),              botY: matchPositions[poolOffsets.r1+3] }, // bye9+M4
                { m: poolOffsets.r2+3, topY: matchPositions[poolOffsets.r1+4], botY: getSlotCenterY(14) },              // M5+bye14
                { m: poolOffsets.r2+4, topY: getSlotCenterY(15),             botY: matchPositions[poolOffsets.r1+5] }, // bye15+M6
                { m: poolOffsets.r2+5, topY: matchPositions[poolOffsets.r1+6], botY: getSlotCenterY(20) },              // M7+bye20
                { m: poolOffsets.r2+6, topY: getSlotCenterY(21),             botY: matchPositions[poolOffsets.r1+7] }, // bye21+M8
                { m: poolOffsets.r2+7, topY: matchPositions[poolOffsets.r1+8], botY: getSlotCenterY(26) },              // M9+bye26
              ] : [
                // B/D R2 (strictly matches official tournament handwritten draw)
                { m: poolOffsets.r2+0, topY: getSlotCenterY(1),              botY: matchPositions[poolOffsets.r1+0] }, // bye1  + M1
                { m: poolOffsets.r2+1, topY: matchPositions[poolOffsets.r1+1], botY: getSlotCenterY(6) },              // M2    + bye6
                { m: poolOffsets.r2+2, topY: getSlotCenterY(7),              botY: matchPositions[poolOffsets.r1+2] }, // bye7  + M3
                { m: poolOffsets.r2+3, topY: matchPositions[poolOffsets.r1+3], botY: getSlotCenterY(12) },             // M4    + bye12
                { m: poolOffsets.r2+4, topY: getSlotCenterY(13),             botY: matchPositions[poolOffsets.r1+4] }, // bye13 + M5
                { m: poolOffsets.r2+5, topY: matchPositions[poolOffsets.r1+5], botY: getSlotCenterY(18) },             // M6    + bye18
                { m: poolOffsets.r2+6, topY: getSlotCenterY(19),             botY: matchPositions[poolOffsets.r1+6] }, // bye19 + M7
                { m: poolOffsets.r2+7, topY: matchPositions[poolOffsets.r1+7], botY: getSlotCenterY(24) },             // M8    + bye24
              ]).map(({ m, topY, botY }) => {
                const midY = matchPositions[m];

                return (
                  <g key={m}>
                    {/* Vertical connector line */}
                    <line
                      x1={config.r2ColX}
                      y1={topY}
                      x2={config.r2ColX}
                      y2={botY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {/* Horizontal stem to match badge */}
                    <line
                      x1={config.r2ColX}
                      y1={midY}
                      x2={config.r3ColX}
                      y2={midY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {/* Match number box badge */}
                    {renderMatchBadge(
                      m,
                      config.r2ColX + 22,
                      midY,
                      "Round 2",
                      colors,
                      handleMatchClick
                    )}
                  </g>
                );
              })}

              {/* ── 4. ROUND 3 (POOL QUARTER-FINALS) — same structure for all pools ── */}
              {[
                { m: poolOffsets.r3+0, topM: poolOffsets.r2+0, botM: poolOffsets.r2+1 },
                { m: poolOffsets.r3+1, topM: poolOffsets.r2+2, botM: poolOffsets.r2+3 },
                { m: poolOffsets.r3+2, topM: poolOffsets.r2+4, botM: poolOffsets.r2+5 },
                { m: poolOffsets.r3+3, topM: poolOffsets.r2+6, botM: poolOffsets.r2+7 },
              ].map(({ m, topM, botM }) => {
                const topY = matchPositions[topM];
                const botY = matchPositions[botM];
                const midY = matchPositions[m];

                return (
                  <g key={m}>
                    <line
                      x1={config.r3ColX}
                      y1={topY}
                      x2={config.r3ColX}
                      y2={botY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    <line
                      x1={config.r3ColX}
                      y1={midY}
                      x2={config.r4ColX}
                      y2={midY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {renderMatchBadge(
                      m,
                      config.r3ColX + 22,
                      midY,
                      "Pool Quarter-Final",
                      colors,
                      handleMatchClick
                    )}
                  </g>
                );
              })}

              {/* ── 5. ROUND 4 (POOL SEMI-FINALS) (MATCHES 101, 102) ── */}
              {[
                { m: poolOffsets.r4 + 0, topM: poolOffsets.r3 + 0, botM: poolOffsets.r3 + 1 },
                { m: poolOffsets.r4 + 1, topM: poolOffsets.r3 + 2, botM: poolOffsets.r3 + 3 },
              ].map(({ m, topM, botM }) => {
                const topY = matchPositions[topM];
                const botY = matchPositions[botM];
                const midY = matchPositions[m];

                return (
                  <g key={m}>
                    <line
                      x1={config.r4ColX}
                      y1={topY}
                      x2={config.r4ColX}
                      y2={botY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    <line
                      x1={config.r4ColX}
                      y1={midY}
                      x2={config.r5ColX}
                      y2={midY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {renderMatchBadge(
                      m,
                      config.r4ColX + 22,
                      midY,
                      "Pool Semi-Final",
                      colors,
                      handleMatchClick
                    )}
                  </g>
                );
              })}

              {/* ── 6. ROUND 5 (CHALLENGER FINAL) (MATCH 109) ── */}
              {(() => {
                const m = poolOffsets.r5;
                const topY = matchPositions[poolOffsets.r4 + 0];
                const botY = matchPositions[poolOffsets.r4 + 1];
                const midY = matchPositions[m];

                return (
                  <g key={m}>
                    <line
                      x1={config.r5ColX}
                      y1={topY}
                      x2={config.r5ColX}
                      y2={botY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    <line
                      x1={config.r5ColX}
                      y1={midY}
                      x2={config.finalColX}
                      y2={midY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />
                    {renderMatchBadge(
                      m,
                      config.r5ColX + 26,
                      midY,
                      "Challenger Final",
                      colors,
                      handleMatchClick
                    )}
                  </g>
                );
              })()}

              {/* ── 7. ROUND 6: POOL FINAL (MATCH 113/114/115/116) & SEED BYE LINE ── */}
              {(() => {
                const m = poolOffsets.final;
                const topY = isACPool ? getSlotCenterY(1) : matchPositions[poolOffsets.r5];
                const botY = isACPool ? matchPositions[poolOffsets.r5] : getSlotCenterY(25);
                const midY = matchPositions[m];

                return (
                  <g key={m}>
                    {/* Vertical line connecting Seed 1 and Winner 109 */}
                    <line
                      x1={config.finalColX}
                      y1={topY}
                      x2={config.finalColX}
                      y2={botY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                    />

                    {/* Stem to Pool Final badge [113] */}
                    <line
                      x1={config.finalColX}
                      y1={midY}
                      x2={config.endArrowX}
                      y2={midY}
                      stroke={colors.lineColor}
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />

                    {/* Pool Final Match Box Badge [113] */}
                    {renderMatchBadge(
                      m,
                      config.finalColX + 30,
                      midY,
                      "Pool Championship Final (All-India Qualifier)",
                      colors,
                      handleMatchClick,
                      true
                    )}

                    {/* Qualification Arrow Label */}
                    <text
                      x={config.endArrowX + 8}
                      y={midY + 4}
                      fill={colors.badgeText}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Arial, sans-serif"
                    >
                      ALL-INDIA SEMIS
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      ) : (
        /* ═══ PODIUM / INTER-POOL CHAMPIONSHIP STAGE ═══ */
        <div className="p-8 sm:p-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider">
                SOUTH ZONE INTER-UNIVERSITY 2026
              </span>
              <h2 className="font-display text-3xl font-black uppercase text-[#F4E6CE]">
                ALL-INDIA INTER-POOL QUALIFYING PODIUM
              </h2>
              <p className="text-xs text-[#91A0AE] max-w-xl mx-auto">
                The winners of Pool A, Pool B, Pool C, and Pool D advance to the Championship
                Semifinals and Finals to crown the South Zone Champions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Semi-Final 1 */}
              <div
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  isPaper
                    ? "bg-blue-50 border-[#002060]"
                    : "bg-[#0A122A] border-[#00F0FF]/40 hover:border-[#00F0FF]"
                }`}
                onClick={() => handleMatchClick(117, "Semi-Final 1")}
              >
                <div className="flex items-center justify-between pb-3 border-b border-blue-900/30">
                  <span className="font-pixel text-xs font-bold text-[#FF5A16]">
                    MATCH 117 &bull; SEMI-FINAL 1
                  </span>
                  <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#002060] text-white rounded">
                    OCT 20 &bull; 09:00 IST
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="font-bold text-sm">Winner of POOL A (Match 113)</span>
                    <span className="font-pixel text-xs text-emerald-400 font-bold">QUALIFIED</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="font-bold text-sm">Winner of POOL B (Match 114)</span>
                    <span className="font-pixel text-xs text-emerald-400 font-bold">QUALIFIED</span>
                  </div>
                </div>
              </div>

              {/* Semi-Final 2 */}
              <div
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  isPaper
                    ? "bg-blue-50 border-[#002060]"
                    : "bg-[#0A122A] border-[#00F0FF]/40 hover:border-[#00F0FF]"
                }`}
                onClick={() => handleMatchClick(118, "Semi-Final 2")}
              >
                <div className="flex items-center justify-between pb-3 border-b border-blue-900/30">
                  <span className="font-pixel text-xs font-bold text-[#FF5A16]">
                    MATCH 118 &bull; SEMI-FINAL 2
                  </span>
                  <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#002060] text-white rounded">
                    OCT 20 &bull; 11:30 IST
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="font-bold text-sm">Winner of POOL C (Match 115)</span>
                    <span className="font-pixel text-xs text-emerald-400 font-bold">QUALIFIED</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="font-bold text-sm">Winner of POOL D (Match 116)</span>
                    <span className="font-pixel text-xs text-emerald-400 font-bold">QUALIFIED</span>
                  </div>
                </div>
              </div>

              {/* 3rd Place Playoff */}
              <div
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  isPaper
                    ? "bg-amber-50 border-amber-800"
                    : "bg-[#141208] border-amber-500/40 hover:border-amber-400"
                }`}
                onClick={() => handleMatchClick(119, "Bronze Medal Playoff")}
              >
                <div className="flex items-center justify-between pb-3 border-b border-amber-900/30">
                  <span className="font-pixel text-xs font-bold text-amber-500">
                    MATCH 119 &bull; BRONZE PLAYOFF
                  </span>
                  <span className="font-pixel text-[10px] px-2 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-600">
                    OCT 21 &bull; 14:00 IST
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="font-bold text-sm">Loser of Match 117</span>
                    <span className="font-pixel text-xs text-amber-400">BRONZE CONTENDER</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <span className="font-bold text-sm">Loser of Match 118</span>
                    <span className="font-pixel text-xs text-amber-400">BRONZE CONTENDER</span>
                  </div>
                </div>
              </div>

              {/* Grand Championship Final */}
              <div
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-xl ${
                  isPaper
                    ? "bg-amber-100 border-amber-900"
                    : "bg-[#211608] border-[#FFB800] shadow-[0_0_25px_rgba(255,184,0,0.25)]"
                }`}
                onClick={() => handleMatchClick(120, "Grand Championship Final")}
              >
                <div className="flex items-center justify-between pb-3 border-b border-amber-700/40">
                  <span className="font-pixel text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 fill-amber-400" />
                    <span>MATCH 120 &bull; GRAND FINAL</span>
                  </span>
                  <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#FFB800] text-black font-bold rounded">
                    OCT 21 &bull; 16:30 IST
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <span className="font-bold text-sm text-[#F4E6CE]">Winner of Match 117</span>
                    <span className="font-pixel text-xs text-[#FFB800]">GOLD FINALIST</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <span className="font-bold text-sm text-[#F4E6CE]">Winner of Match 118</span>
                    <span className="font-pixel text-xs text-[#FFB800]">GOLD FINALIST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MATCH DETAILS MODAL ═══ */}
      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative ${
              isPaper
                ? "bg-white text-slate-900 border-blue-900"
                : "bg-[#090F24] text-[#F4E6CE] border-[#00F0FF]"
            }`}
          >
            <button
              onClick={() => setSelectedMatchModal(null)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-[#FF5A16] text-black font-pixel text-xs font-bold uppercase rounded">
                MATCH {selectedMatchModal.matchNumber}
              </span>
              <span className="font-pixel text-xs text-[#00F0FF] uppercase">
                {selectedMatchModal.roundName} &bull; POOL {selectedMatchModal.pool}
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-[#f5e6ca]">
                Match Telemetry &amp; Lineup
              </h3>

              <div className="space-y-3 p-4 bg-black/20 dark:bg-black/40 rounded-xl border border-blue-900/30 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-pixel text-[10px]">STAGE:</span>
                  <span className="font-bold text-[#00F0FF]">{selectedMatchModal.roundName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-pixel text-[10px]">POOL:</span>
                  <span className="font-bold text-[#FF5A16]">POOL {selectedMatchModal.pool}</span>
                </div>
                {selectedMatchModal.round1Pair && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-pixel text-[10px]">CONNECTS POSITIONS:</span>
                    <span className="font-mono text-[#f5e6ca]">
                      Slot #{selectedMatchModal.round1Pair.slotA} vs Slot #{selectedMatchModal.round1Pair.slotB}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-pixel text-[10px]">VENUE:</span>
                  <span className="font-medium text-slate-200">KLE Tech Indoor Stadium, Hubballi</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedMatchModal(null)}
                  className="px-4 py-2 border rounded-lg font-pixel text-xs text-slate-400 hover:text-white"
                >
                  CLOSE
                </button>

                <Link
                  href={`/matches/M${String(selectedMatchModal.matchNumber).padStart(3, "0")}`}
                  className="px-4 py-2 bg-[#FF5A16] text-black font-pixel text-xs font-bold uppercase rounded flex items-center gap-1.5 shadow hover:bg-[#ff6a2d] transition-colors"
                >
                  <span>OPEN MATCH DESK</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SLOT ASSIGNMENT / TEAM NUMBER ENTRY MODAL ═══ */}
      {assignModalSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl relative ${
              isPaper
                ? "bg-white text-slate-900 border-blue-900 shadow-blue-900/20"
                : "bg-[#090F24] text-[#F4E6CE] border-[#00F0FF]/50 shadow-[#00F0FF]/10"
            }`}
          >
            <button
              onClick={() => setAssignModalSlot(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-[#FF5A16] text-black font-pixel text-xs font-bold uppercase rounded">
                POOL {activePool} &bull; SLOT #{assignModalSlot.slot}
              </span>
              {assignModalSlot.seed && (
                <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40 rounded uppercase">
                  SEED #{assignModalSlot.seed} BYE
                </span>
              )}
              {assignModalSlot.isByeR1 && !assignModalSlot.seed && (
                <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 rounded uppercase">
                  ROUND 1 BYE
                </span>
              )}
            </div>

            <h3 className="font-display text-lg font-bold uppercase tracking-tight mt-1 mb-4">
              {assignModalSlot.name ? "Edit / Reassign Slot" : "Enter Team Number to Fill Slot"}
            </h3>

            {/* Input field */}
            <div className="space-y-3">
              <div>
                <label className="font-pixel text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  ENTER TEAM # (1-101), TEAM CODE (e.g. TM-SZ-012), OR UNIVERSITY
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 12 or TM-SZ-012 or Madras..."
                    value={teamNumberInput}
                    onChange={(e) => {
                      setTeamNumberInput(e.target.value);
                      searchTeam(e.target.value);
                    }}
                    autoFocus
                    className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-sans focus:outline-none transition-all ${
                      isPaper
                        ? "bg-slate-100 border border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white"
                        : "bg-[#050A18] border border-[#1A2644] text-[#F4E6CE] focus:border-[#FF5A16] focus:bg-[#080F24]"
                    }`}
                  />
                  {isFetchingTeam && (
                    <RefreshCw className="w-4 h-4 text-[#FF5A16] animate-spin absolute right-3 top-3" />
                  )}
                </div>
              </div>

              {/* Fetched Details Card */}
              {fetchedTeam && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2 text-xs transition-all ${
                    isPaper
                      ? "bg-blue-50 border-blue-200 text-slate-800"
                      : "bg-[#0D1836] border-[#00F0FF]/30 text-[#E0E7FF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs font-bold text-[#FF5A16]">
                      TEAM #{fetchedTeam.teamNumber || "-"} ({fetchedTeam.teamCode})
                    </span>
                    <span
                      className={`font-pixel text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
                        fetchedTeam.isAssigned
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}
                    >
                      {fetchedTeam.isAssigned
                        ? `Assigned (Pool ${fetchedTeam.assignedPool || "-"} Slot ${fetchedTeam.assignedSlot || "-"})`
                        : "Available"}
                    </span>
                  </div>

                  <div>
                    <span className="font-pixel text-[10px] text-slate-400 uppercase block">UNIVERSITY</span>
                    <strong className="text-sm font-bold block">{fetchedTeam.name}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-blue-900/40 font-sans">
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel uppercase block">STATE</span>
                      <span className="font-semibold">{fetchedTeam.state || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-pixel uppercase block">MANAGER</span>
                      <span className="font-semibold truncate block">{fetchedTeam.managerName || "Registered"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error / Alert */}
              {assignError && (
                <p className="font-pixel text-xs text-[#FF2A6D] bg-[#FF2A6D]/10 p-2.5 rounded border border-[#FF2A6D]/30">
                  {assignError}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4 border-slate-200 dark:border-blue-900/40">
              {assignModalSlot.teamId ? (
                <button
                  type="button"
                  onClick={handleUnassignSlot}
                  disabled={isAssigning}
                  className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-pixel text-xs font-bold uppercase rounded transition-colors"
                >
                  CLEAR SLOT
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalSlot(null)}
                  disabled={isAssigning}
                  className="px-3.5 py-2 border rounded-lg font-pixel text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssign}
                  disabled={!fetchedTeam || isAssigning || (activePoolCount >= 25 && !assignModalSlot.teamId)}
                  className="px-4 py-2 bg-[#FF5A16] hover:bg-[#ff6a2d] disabled:opacity-50 text-black font-pixel text-xs font-bold uppercase rounded shadow transition-all flex items-center gap-1.5"
                >
                  {isAssigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>FILL SLOT #{assignModalSlot.slot}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to render an authentic boxed match number badge centered on horizontal branch line
 */
function renderMatchBadge(
  matchNum: number,
  x: number,
  y: number,
  roundName: string,
  colors: any,
  onClick: (matchNum: number, roundName: string) => void,
  isSpecialFinal = false
) {
  const badgeWidth = isSpecialFinal ? 34 : 26;
  const badgeHeight = 18;

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onClick(matchNum, roundName)}
    >
      {/* Box badge rectangle */}
      <rect
        x={x - badgeWidth / 2}
        y={y - badgeHeight / 2}
        width={badgeWidth}
        height={badgeHeight}
        rx={2}
        fill={colors.badgeBg}
        stroke={isSpecialFinal ? "#FF5A16" : colors.badgeBorder}
        strokeWidth={1.5}
        className="group-hover:fill-blue-50 dark:group-hover:fill-[#15234A] transition-colors"
      />

      {/* Match number text */}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill={isSpecialFinal ? "#FF5A16" : colors.badgeText}
        fontSize="9"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {matchNum}
      </text>
    </g>
  );
}
