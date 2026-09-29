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

export const ROUND_1_MATCH_SLOTS: Record<number, { slotA: number; slotB: number }> = {
  1: { slotA: 3, slotB: 4 },
  2: { slotA: 5, slotB: 6 },
  3: { slotA: 7, slotB: 8 },
  4: { slotA: 9, slotB: 10 },
  5: { slotA: 11, slotB: 12 },
  6: { slotA: 13, slotB: 14 },
  7: { slotA: 15, slotB: 16 },
  8: { slotA: 18, slotB: 19 },
  9: { slotA: 20, slotB: 21 },
  10: { slotA: 22, slotB: 23 },
  11: { slotA: 24, slotB: 25 },
  12: { slotA: 26, slotB: 27 },
  13: { slotA: 28, slotB: 29 },
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

  const activePoolCount = activePool !== "CHAMPIONSHIP" ? poolCounts[activePool] || 0 : 0;
  const isActivePoolFull = activePoolCount >= 25;

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

    // Strict 25-team limit validation
    const otherAssignedCount = (localSlots || []).filter(
      (s: any) => s.pool === activePool && s.teamId && s.slot !== assignModalSlot.slot
    ).length;

    if (otherAssignedCount >= 25) {
      setAssignError(
        `POOL CAPACITY EXCEEDED: Pool ${activePool} has already reached its strict limit of 25 teams (25/25). Remove another team first before assigning this slot.`
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

  // Dynamically compute 30 slots for active pool from database assignments
  const currentRoster: TeamSlot[] = useMemo(() => {
    const slots: TeamSlot[] = [];
    const poolSlots = (localSlots || []).filter((s: any) => s.pool === activePool);
    const slotMap = new Map<number, any>(poolSlots.map((s: any) => [s.slot, s]));

    for (let slotNum = 1; slotNum <= 30; slotNum++) {
      const assigned = slotMap.get(slotNum);
      const isByeToFinal = slotNum === 1;
      const isByeR1 = slotNum === 2 || slotNum === 17 || slotNum === 30;
      const seed =
        slotNum === 1
          ? activePool === "A"
            ? 1
            : activePool === "B"
            ? 2
            : activePool === "C"
            ? 3
            : 4
          : undefined;

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
  const totalSvgHeight = config.topPadding + 30 * pitch + 50;
  const totalSvgWidth = config.endArrowX + 50;

  // Coordinate helpers
  const getSlotY = (slotNum: number) => {
    return config.topPadding + (slotNum - 1) * pitch;
  };

  const getSlotCenterY = (slotNum: number) => {
    return getSlotY(slotNum) + config.slotHeight / 2;
  };

  // Precomputed match centers
  const matchPositions = useMemo(() => {
    const o = poolOffsets;
    const pos: Record<number, number> = {};

    // Round 1
    pos[o.r1 + 0] = (getSlotCenterY(3) + getSlotCenterY(4)) / 2; // Match 1
    pos[o.r1 + 1] = (getSlotCenterY(5) + getSlotCenterY(6)) / 2; // Match 2
    pos[o.r1 + 2] = (getSlotCenterY(7) + getSlotCenterY(8)) / 2; // Match 3
    pos[o.r1 + 3] = (getSlotCenterY(9) + getSlotCenterY(10)) / 2; // Match 4
    pos[o.r1 + 4] = (getSlotCenterY(11) + getSlotCenterY(12)) / 2; // Match 5
    pos[o.r1 + 5] = (getSlotCenterY(13) + getSlotCenterY(14)) / 2; // Match 6
    pos[o.r1 + 6] = (getSlotCenterY(15) + getSlotCenterY(16)) / 2; // Match 7

    pos[o.r1 + 7] = (getSlotCenterY(18) + getSlotCenterY(19)) / 2; // Match 8
    pos[o.r1 + 8] = (getSlotCenterY(20) + getSlotCenterY(21)) / 2; // Match 9
    pos[o.r1 + 9] = (getSlotCenterY(22) + getSlotCenterY(23)) / 2; // Match 10
    pos[o.r1 + 10] = (getSlotCenterY(24) + getSlotCenterY(25)) / 2; // Match 11
    pos[o.r1 + 11] = (getSlotCenterY(26) + getSlotCenterY(27)) / 2; // Match 12
    pos[o.r1 + 12] = (getSlotCenterY(28) + getSlotCenterY(29)) / 2; // Match 13

    // Round 2
    pos[o.r2 + 0] = (getSlotCenterY(2) + pos[o.r1 + 0]) / 2; // Match 53
    pos[o.r2 + 1] = (pos[o.r1 + 1] + pos[o.r1 + 2]) / 2; // Match 54
    pos[o.r2 + 2] = (pos[o.r1 + 3] + pos[o.r1 + 4]) / 2; // Match 55
    pos[o.r2 + 3] = (pos[o.r1 + 5] + pos[o.r1 + 6]) / 2; // Match 56

    pos[o.r2 + 4] = (getSlotCenterY(17) + pos[o.r1 + 7]) / 2; // Match 57
    pos[o.r2 + 5] = (pos[o.r1 + 8] + pos[o.r1 + 9]) / 2; // Match 58
    pos[o.r2 + 6] = (pos[o.r1 + 10] + pos[o.r1 + 11]) / 2; // Match 59
    pos[o.r2 + 7] = (pos[o.r1 + 12] + getSlotCenterY(30)) / 2; // Match 60

    // Round 3 (Pool Quarter-Finals)
    pos[o.r3 + 0] = (pos[o.r2 + 0] + pos[o.r2 + 1]) / 2; // Match 85
    pos[o.r3 + 1] = (pos[o.r2 + 2] + pos[o.r2 + 3]) / 2; // Match 86
    pos[o.r3 + 2] = (pos[o.r2 + 4] + pos[o.r2 + 5]) / 2; // Match 87
    pos[o.r3 + 3] = (pos[o.r2 + 6] + pos[o.r2 + 7]) / 2; // Match 88

    // Round 4 (Pool Semi-Finals)
    pos[o.r4 + 0] = (pos[o.r3 + 0] + pos[o.r3 + 1]) / 2; // Match 101
    pos[o.r4 + 1] = (pos[o.r3 + 2] + pos[o.r3 + 3]) / 2; // Match 102

    // Round 5 (Pool Challenger Final)
    pos[o.r5] = (pos[o.r4 + 0] + pos[o.r4 + 1]) / 2; // Match 109

    // Round 6 (Pool Final / Seed 1 Match)
    pos[o.final] = (getSlotCenterY(1) + pos[o.r5]) / 2; // Match 113

    return pos;
  }, [poolOffsets]);

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

    const round1Pair = roundName === "Round 1" && ROUND_1_MATCH_SLOTS[matchInPool] ? ROUND_1_MATCH_SLOTS[matchInPool] : null;

    if (round1Pair) {
      const poolSlots = (localSlots || []).filter((s: any) => s.pool === activePool);
      const sA = poolSlots.find((s: any) => s.slot === round1Pair.slotA);
      const sB = poolSlots.find((s: any) => s.slot === round1Pair.slotB);

      if (sA && sA.teamId) {
        setPairModalTeam1Input(sA.teamNumber ? String(sA.teamNumber) : sA.teamCode || "");
        setPairModalTeam1Fetched({
          id: sA.teamId,
          teamCode: sA.teamCode,
          teamNumber: sA.teamNumber,
          name: sA.teamName,
          state: sA.state,
        });
      } else {
        setPairModalTeam1Input("");
        setPairModalTeam1Fetched(null);
      }

      if (sB && sB.teamId) {
        setPairModalTeam2Input(sB.teamNumber ? String(sB.teamNumber) : sB.teamCode || "");
        setPairModalTeam2Fetched({
          id: sB.teamId,
          teamCode: sB.teamCode,
          teamNumber: sB.teamNumber,
          name: sB.teamName,
          state: sB.state,
        });
      } else {
        setPairModalTeam2Input("");
        setPairModalTeam2Fetched(null);
      }
      setPairModalError(null);
    }

    setSelectedMatchModal({
      matchNumber: matchNum,
      matchInPool,
      roundName,
      pool: activePool,
      liveInfo,
      round1Pair,
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
        {/* Pool Selector Tabs with 25-Team Limit Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {(["A", "B", "C", "D"] as const).map((p) => {
            const isSelected = activePool === p;
            const count = poolCounts[p] || 0;
            const isFull = count >= 25;
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
                  {count}/25
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
              <span>{activePoolCount} / 25 TEAMS</span>
              <span className="text-[10px] opacity-75">(LIMIT: 25)</span>
            </div>
          </div>
          {isActivePoolFull && (
            <div className="text-[11px] font-pixel text-[#FF5A16] bg-[#FF5A16]/10 px-3 py-1 rounded-md border border-[#FF5A16]/30 animate-pulse">
              POOL {activePool} HAS REACHED ITS OFFICIAL 25-TEAM LIMIT (25/25 FILLED)
            </div>
          )}

          {/* Explanation badge for 25 teams in 30 knockout bracket rows */}
          <div className="w-full mt-2 p-2.5 bg-[#070D1E] border border-[#00F0FF]/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#00F0FF] text-black font-pixel text-[10px] font-bold rounded">
                25 TEAMS PER POOL
              </span>
              <span className="text-slate-300 font-sans text-xs">
                Each pool strictly has <strong>25 universities</strong>. The 30 bracket rows use standard AIU tournament structure (25 teams + 5 byes) to mathematically balance the single-elimination tree.
              </span>
            </div>
            <span className="font-pixel text-[10px] text-[#05D550]">
              TOTAL: 100 UNIVERSITIES ACROSS 4 POOLS
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
                        {t.slot}. {t.name}{t.state ? `, ${t.state}` : ""}{t.seed ? ` [Seed #${t.seed}]` : ""}
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
                        {t.slot}. {t.seed ? `[Seed #${t.seed} Bye] ` : t.isByeR1 ? `[Bye to R2] ` : ""}{isHovered ? "── Click to enter team # ──" : "──"}
                      </text>
                    )}

                    {/* Horizontal stub line connecting to bracket */}
                    <line
                      x1={config.startX + config.slotWidth}
                      y1={centerY}
                      x2={
                        t.slot === 1
                          ? config.finalColX // Madras runs across the top to match 113
                          : [2, 17, 30].includes(t.slot)
                          ? config.r2ColX // Byes in Round 1 connect to Round 2
                          : config.r1ColX // Normal slots connect to Round 1
                      }
                      y2={centerY}
                      stroke={isHovered ? colors.highlightLine : colors.lineColor}
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}

              {/* ── 2. ROUND 1 BRACKET LINES & BADGES (MATCHES 1 - 13) ── */}
              {[
                { m: poolOffsets.r1 + 0, t1: 3, t2: 4 },
                { m: poolOffsets.r1 + 1, t1: 5, t2: 6 },
                { m: poolOffsets.r1 + 2, t1: 7, t2: 8 },
                { m: poolOffsets.r1 + 3, t1: 9, t2: 10 },
                { m: poolOffsets.r1 + 4, t1: 11, t2: 12 },
                { m: poolOffsets.r1 + 5, t1: 13, t2: 14 },
                { m: poolOffsets.r1 + 6, t1: 15, t2: 16 },
                { m: poolOffsets.r1 + 7, t1: 18, t2: 19 },
                { m: poolOffsets.r1 + 8, t1: 20, t2: 21 },
                { m: poolOffsets.r1 + 9, t1: 22, t2: 23 },
                { m: poolOffsets.r1 + 10, t1: 24, t2: 25 },
                { m: poolOffsets.r1 + 11, t1: 26, t2: 27 },
                { m: poolOffsets.r1 + 12, t1: 28, t2: 29 },
              ].map(({ m, t1, t2 }) => {
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

              {/* ── 3. ROUND 2 BRACKET LINES & BADGES (MATCHES 53 - 60) ── */}
              {[
                { m: poolOffsets.r2 + 0, topY: getSlotCenterY(2), botY: matchPositions[poolOffsets.r1 + 0] },
                { m: poolOffsets.r2 + 1, topY: matchPositions[poolOffsets.r1 + 1], botY: matchPositions[poolOffsets.r1 + 2] },
                { m: poolOffsets.r2 + 2, topY: matchPositions[poolOffsets.r1 + 3], botY: matchPositions[poolOffsets.r1 + 4] },
                { m: poolOffsets.r2 + 3, topY: matchPositions[poolOffsets.r1 + 5], botY: matchPositions[poolOffsets.r1 + 6] },
                { m: poolOffsets.r2 + 4, topY: getSlotCenterY(17), botY: matchPositions[poolOffsets.r1 + 7] },
                { m: poolOffsets.r2 + 5, topY: matchPositions[poolOffsets.r1 + 8], botY: matchPositions[poolOffsets.r1 + 9] },
                { m: poolOffsets.r2 + 6, topY: matchPositions[poolOffsets.r1 + 10], botY: matchPositions[poolOffsets.r1 + 11] },
                { m: poolOffsets.r2 + 7, topY: matchPositions[poolOffsets.r1 + 12], botY: getSlotCenterY(30) },
              ].map(({ m, topY, botY }) => {
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

              {/* ── 4. ROUND 3 (POOL QUARTER-FINALS) (MATCHES 85 - 88) ── */}
              {[
                { m: poolOffsets.r3 + 0, topM: poolOffsets.r2 + 0, botM: poolOffsets.r2 + 1 },
                { m: poolOffsets.r3 + 1, topM: poolOffsets.r2 + 2, botM: poolOffsets.r2 + 3 },
                { m: poolOffsets.r3 + 2, topM: poolOffsets.r2 + 4, botM: poolOffsets.r2 + 5 },
                { m: poolOffsets.r3 + 3, topM: poolOffsets.r2 + 6, botM: poolOffsets.r2 + 7 },
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

              {/* ── 7. ROUND 6: POOL FINAL (MATCH 113) & SEED 1 BYE LINE ── */}
              {(() => {
                const m = poolOffsets.final;
                const topY = getSlotCenterY(1); // University of Madras bye line
                const botY = matchPositions[poolOffsets.r5]; // Winner of 109
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

            {isAdmin && selectedMatchModal.round1Pair ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#1b253b]">
                  <div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-tight text-[#f5e6ca]">
                      ROUND 1 FIXTURE PAIRING &bull; MATCH #{selectedMatchModal.matchInPool}
                    </h3>
                    <p className="font-pixel text-[10px] text-[#00F0FF] uppercase mt-0.5">
                      CONNECTS SLOT #{selectedMatchModal.round1Pair.slotA} VS SLOT #{selectedMatchModal.round1Pair.slotB}
                    </p>
                  </div>
                  {pairModalTeam1Fetched && pairModalTeam2Fetched && (
                    <button
                      type="button"
                      onClick={() => handleClearModalPair(selectedMatchModal.round1Pair.slotA, selectedMatchModal.round1Pair.slotB)}
                      disabled={pairModalAssigning}
                      className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-pixel text-[10px] uppercase rounded"
                    >
                      Clear Match
                    </button>
                  )}
                </div>

                {/* The Two Boxes VS Arena */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Box 1: Team 1 (Slot A) */}
                  <div className="md:col-span-5 p-3 rounded-xl bg-black/30 border border-[#00F0FF]/40 space-y-2">
                    <span className="font-pixel text-[10px] text-[#00F0FF] font-bold uppercase block">
                      TEAM 1 &bull; SLOT #{selectedMatchModal.round1Pair.slotA}
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Team # (e.g. 1)"
                        value={pairModalTeam1Input}
                        onChange={(e) => searchPairTeam1(e.target.value)}
                        className="w-full bg-[#050A18] border border-[#1b253b] focus:border-[#00F0FF] text-base font-bold font-mono text-[#00F0FF] px-2.5 py-2 rounded-lg focus:outline-none"
                      />
                      {pairModalTeam1Fetching && (
                        <RefreshCw className="w-3.5 h-3.5 text-[#00F0FF] animate-spin absolute right-2.5 top-3" />
                      )}
                    </div>
                    {pairModalTeam1Fetched ? (
                      <div className="p-2 bg-[#0e162b] rounded border border-[#00F0FF]/30 text-xs">
                        <strong className="block text-[#f5e6ca] truncate">{pairModalTeam1Fetched.name}</strong>
                        <span className="text-[10px] text-[#91A0AE]">#{pairModalTeam1Fetched.teamNumber} &bull; {pairModalTeam1Fetched.state}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">Enter team # to fetch from DB</div>
                    )}
                  </div>

                  {/* Center VS */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5A16] to-[#FF2A6D] text-black font-black font-display text-sm flex items-center justify-center shadow-[0_0_15px_rgba(255,90,22,0.6)]">
                      VS
                    </div>
                  </div>

                  {/* Box 2: Team 2 (Slot B) */}
                  <div className="md:col-span-5 p-3 rounded-xl bg-black/30 border border-[#FF5A16]/40 space-y-2">
                    <span className="font-pixel text-[10px] text-[#FF5A16] font-bold uppercase block">
                      TEAM 2 &bull; SLOT #{selectedMatchModal.round1Pair.slotB}
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Team # (e.g. 2)"
                        value={pairModalTeam2Input}
                        onChange={(e) => searchPairTeam2(e.target.value)}
                        className="w-full bg-[#050A18] border border-[#1b253b] focus:border-[#FF5A16] text-base font-bold font-mono text-[#FF5A16] px-2.5 py-2 rounded-lg focus:outline-none"
                      />
                      {pairModalTeam2Fetching && (
                        <RefreshCw className="w-3.5 h-3.5 text-[#FF5A16] animate-spin absolute right-2.5 top-3" />
                      )}
                    </div>
                    {pairModalTeam2Fetched ? (
                      <div className="p-2 bg-[#0e162b] rounded border border-[#FF5A16]/30 text-xs">
                        <strong className="block text-[#f5e6ca] truncate">{pairModalTeam2Fetched.name}</strong>
                        <span className="text-[10px] text-[#91A0AE]">#{pairModalTeam2Fetched.teamNumber} &bull; {pairModalTeam2Fetched.state}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">Enter team # to fetch from DB</div>
                    )}
                  </div>
                </div>

                {pairModalError && (
                  <p className="font-pixel text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded border border-rose-500/30">
                    {pairModalError}
                  </p>
                )}

                {/* Modal Buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSelectedMatchModal(null)}
                    className="px-3.5 py-2 border rounded-lg font-pixel text-xs text-slate-400 hover:text-white"
                  >
                    CLOSE
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/matches/M${String(selectedMatchModal.matchNumber).padStart(3, "0")}`}
                      className="px-3 py-2 bg-[#1A2644] text-[#00F0FF] border border-[#00F0FF]/30 font-pixel text-xs uppercase rounded flex items-center gap-1"
                    >
                      <span>DESK</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    <button
                      type="button"
                      disabled={
                        !pairModalTeam1Fetched ||
                        !pairModalTeam2Fetched ||
                        pairModalAssigning ||
                        (activePoolCount >= 25 &&
                          !localSlots.find((s: any) => s.pool === activePool && s.slot === selectedMatchModal.round1Pair.slotA)?.teamId &&
                          !localSlots.find((s: any) => s.pool === activePool && s.slot === selectedMatchModal.round1Pair.slotB)?.teamId)
                      }
                      onClick={() => handleConfirmModalPair(selectedMatchModal.matchNumber, selectedMatchModal.round1Pair.slotA, selectedMatchModal.round1Pair.slotB)}
                      className="px-4 py-2 bg-[#FF5A16] hover:bg-[#ff6a2d] disabled:opacity-40 text-black font-pixel text-xs font-bold uppercase rounded shadow transition-all flex items-center gap-1.5"
                    >
                      {pairModalAssigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>FILL FIXTURE &amp; BRACKET</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mt-2 mb-4">
                  Match Telemetry &amp; Official Lineup
                </h3>

                <div className="space-y-3 p-4 bg-black/10 dark:bg-black/30 rounded-xl border border-blue-900/30 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-pixel">STAGE:</span>
                    <span className="font-bold">{selectedMatchModal.roundName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-pixel">COURT:</span>
                    <span className="font-bold">Court 01 (Synthetic BWF Mat 1)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-pixel">STATUS:</span>
                    <span className="font-bold text-amber-500">SCHEDULED / UPCOMING</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-pixel">VENUE:</span>
                    <span className="font-bold">KLE Tech Indoor Stadium, Hubballi</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedMatchModal(null)}
                    className="px-4 py-2 border rounded-lg font-pixel text-xs font-bold"
                  >
                    CLOSE
                  </button>
                  <Link
                    href={`/matches/M${String(selectedMatchModal.matchNumber).padStart(3, "0")}`}
                    className="px-4 py-2 bg-[#FF5A16] text-black font-pixel text-xs font-bold uppercase rounded flex items-center gap-1.5 shadow"
                  >
                    <span>OPEN MATCH DESK</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            )}
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
