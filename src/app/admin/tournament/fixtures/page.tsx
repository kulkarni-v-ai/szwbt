"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import {
  Trophy,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Clock,
  Layers,
  Search,
  RefreshCw,
  ArrowRight,
  Shield,
  Eye,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck,
  AlertCircle,
  FileCheck,
  PlusCircle,
  Edit3,
  Trash2,
  Check,
  X,
  Filter,
  Users,
} from "lucide-react";
import { OfficialPoolBracket } from "@/components/tournament/OfficialPoolBracket";
import {
  ROUND_1_MATCH_FLOW,
  BYE_SLOT_OPTIONS,
  getR1MatchFlow,
  getByeSlots,
  getGlobalMatchNumber,
} from "@/lib/tournament/fixtureConstants";

export default function AdminFixturesPage() {
  const [fixturesData, setFixturesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "SUCCESS" | "ERROR" | "INFO";
    text: string;
    details?: string;
  } | null>(null);

  // Active pool selection for Position-First Console
  const [activePool, setActivePool] = useState<"A" | "B" | "C" | "D">("A");
  const [positionFilter, setPositionFilter] = useState<"ALL" | "EMPTY" | "ASSIGNED" | "FIXED" | "BYES">("ALL");
  const [positionSearch, setPositionSearch] = useState("");

  // Position-First Single Team Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    pool: "A" | "B" | "C" | "D";
    slot: number;
    positionId?: string;
    label?: string;
    isBye?: boolean;
    isSeed?: boolean;
    currentTeam?: {
      id: string;
      teamNumber?: number;
      teamCode?: string;
      teamName?: string;
      institution?: string;
      state?: string;
    } | null;
  } | null>(null);

  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalSelectedTeam, setModalSelectedTeam] = useState<any | null>(null);
  const [allTournamentTeams, setAllTournamentTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Fixed team modal state
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [fixedTeamId, setFixedTeamId] = useState("");
  const [fixedPool, setFixedPool] = useState<"A" | "B" | "C" | "D">("A");
  const [fixedPositionId, setFixedPositionId] = useState("");
  const [fixedReason, setFixedReason] = useState("");

  // Correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctPositionId, setCorrectPositionId] = useState("");
  const [correctNewTeamId, setCorrectNewTeamId] = useState("");
  const [correctReason, setCorrectReason] = useState("");

  // Position / Bracket View Mode
  const [activeViewMode, setActiveViewMode] = useState<"BRACKET" | "POSITIONS" | "TABLE">("BRACKET");
  const [adminTableTab, setAdminTableTab] = useState<"MATCHES" | "POSITIONS">("MATCHES");
  const [tableFilterPool, setTableFilterPool] = useState("ALL");
  const [tableFilterStatus, setTableFilterStatus] = useState("ALL");
  const [tableSearch, setTableSearch] = useState("");

  // 1. Fetch Fixtures
  const fetchFixtures = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await fetch("/api/tournament/fixtures");
      const data = await res.json();
      if (data.success) {
        setFixturesData(data.data);
      }
    } catch (err: any) {
      console.error("Error fetching fixtures:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Fetch All Teams (Enriched with global assignment status)
  const fetchAllTeams = async (q = "") => {
    try {
      setTeamsLoading(true);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.teams) {
        setAllTournamentTeams(data.teams);
      }
    } catch (err) {
      console.error("Error fetching tournament teams:", err);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
    fetchAllTeams();
  }, []);

  // Compute Pool Statistics & Bracket Slots
  const bracketSlots: any[] = fixturesData?.bracketSlots || [];
  const positions: any[] = fixturesData?.positions || [];
  const matches: any[] = fixturesData?.matches || [];
  const config = fixturesData?.config || {};
  const currentPos = fixturesData?.currentPosition;
  const nextPos = fixturesData?.nextPosition;
  const history: any[] = fixturesData?.history || [];
  const validation = fixturesData?.validation || null;

  const poolCounts = useMemo(() => {
    return {
      A: bracketSlots.filter((s: any) => s.pool === "A" && s.teamId).length,
      B: bracketSlots.filter((s: any) => s.pool === "B" && s.teamId).length,
      C: bracketSlots.filter((s: any) => s.pool === "C" && s.teamId).length,
      D: bracketSlots.filter((s: any) => s.pool === "D" && s.teamId).length,
    };
  }, [bracketSlots]);

  // Generate 30 Position/Slot representations for the active pool
  const activePoolPositions = useMemo(() => {
    const slots = bracketSlots.filter((s: any) => s.pool === activePool);
    const result = [];

    // Identify which slots are byes / seeds for this specific pool
    const byeOptions = getByeSlots(activePool);
    const byeMap = new Map(byeOptions.map((b) => [b.slot, b]));
    const totalSlotsForPool = (activePool === "A" || activePool === "C") ? 26 : 25;
    const poolR1Flow = getR1MatchFlow(activePool);

    for (let slotNum = 1; slotNum <= totalSlotsForPool; slotNum++) {
      const existingSlot = slots.find((s: any) => s.slot === slotNum);
      const byeInfo = byeMap.get(slotNum);

      // Find match in Round 1 that uses this slot
      const r1Match = poolR1Flow.find((m) => m.slotA === slotNum || m.slotB === slotNum);
      let matchLabel = "-";
      let opponentSlot = null;
      if (r1Match) {
        const globalMNum = getGlobalMatchNumber(activePool, r1Match.matchInPool);
        matchLabel = `Match ${r1Match.matchInPool} (M${String(globalMNum).padStart(3, "0")})`;
        opponentSlot = r1Match.slotA === slotNum ? r1Match.slotB : r1Match.slotA;
      } else if (byeInfo) {
        const seedNum = activePool === "A" ? 1 : activePool === "B" ? 2 : activePool === "C" ? 3 : 4;
        matchLabel = byeInfo.isSeed ? `Seed #${seedNum} (Pool Final)` : "Round 1 Bye (R2)";
      }

      // Check if opponent is assigned
      let opponentTeam = null;
      if (opponentSlot) {
        const oppSlotData = slots.find((s: any) => s.slot === opponentSlot);
        if (oppSlotData && oppSlotData.teamId) {
          opponentTeam = {
            teamNumber: oppSlotData.teamNumber,
            teamName: oppSlotData.teamName,
          };
        }
      }

      result.push({
        pool: activePool,
        slot: slotNum,
        positionId: `POOL-${activePool}-SLOT-${String(slotNum).padStart(2, "0")}`,
        isBye: !!byeInfo,
        isSeed: !!byeInfo?.isSeed,
        typeLabel: byeInfo?.isSeed ? "SEED 1 (BYE)" : byeInfo ? "ROUND 1 BYE" : "ROUND 1 SLOT",
        matchLabel,
        opponentSlot,
        opponentTeam,
        teamId: existingSlot?.teamId || null,
        teamNumber: existingSlot?.teamNumber || null,
        teamCode: existingSlot?.teamCode || null,
        teamName: existingSlot?.teamName || null,
        institution: existingSlot?.institution || existingSlot?.teamName || null,
        state: existingSlot?.state || null,
        assignedAt: existingSlot?.assignedAt || null,
        isFixed: !!(existingSlot?.slot === 1 && existingSlot?.teamId),
        status: existingSlot?.teamId ? "ASSIGNED" : "EMPTY",
      });
    }

    return result;
  }, [bracketSlots, activePool]);

  // Filtered positions in grid
  const filteredActivePositions = useMemo(() => {
    return activePoolPositions.filter((pos) => {
      if (positionFilter === "EMPTY" && pos.status !== "EMPTY") return false;
      if (positionFilter === "ASSIGNED" && pos.status !== "ASSIGNED") return false;
      if (positionFilter === "FIXED" && !pos.isFixed) return false;
      if (positionFilter === "BYES" && !pos.isBye) return false;

      if (positionSearch.trim()) {
        const q = positionSearch.toLowerCase();
        const numMatch = String(pos.slot).includes(q) || String(pos.teamNumber || "").includes(q);
        const nameMatch = pos.teamName?.toLowerCase().includes(q);
        const codeMatch = pos.teamCode?.toLowerCase().includes(q);
        const stateMatch = pos.state?.toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !codeMatch && !stateMatch) return false;
      }
      return true;
    });
  }, [activePoolPositions, positionFilter, positionSearch]);

  // Open Single Position Assignment Modal
  const handleOpenAssignModal = (pos: any) => {
    setAssignTarget({
      pool: pos.pool,
      slot: pos.slot,
      positionId: pos.positionId,
      label: `Pool ${pos.pool} • Slot #${pos.slot}`,
      isBye: pos.isBye,
      isSeed: pos.isSeed,
      currentTeam: pos.teamId
        ? {
            id: pos.teamId,
            teamNumber: pos.teamNumber,
            teamCode: pos.teamCode,
            teamName: pos.teamName,
            institution: pos.institution,
            state: pos.state,
          }
        : null,
    });
    setModalSearchQuery("");
    setModalSelectedTeam(null);
    setAssignModalOpen(true);
    fetchAllTeams();
  };

  // Filter Teams for the Assignment Modal
  const modalFilteredTeams = useMemo(() => {
    if (!modalSearchQuery.trim()) {
      return allTournamentTeams;
    }
    const q = modalSearchQuery.toLowerCase().trim();
    const numQ = parseInt(q, 10);
    return allTournamentTeams.filter((t) => {
      if (!isNaN(numQ) && t.teamNumber === numQ) return true;
      return (
        t.teamCode?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.institution?.toLowerCase().includes(q) ||
        t.state?.toLowerCase().includes(q)
      );
    });
  }, [allTournamentTeams, modalSearchQuery]);

  // Submit Single Position Assignment / Change
  const handleConfirmSingleAssignment = async () => {
    if (!assignTarget || !modalSelectedTeam) {
      setStatusMessage({
        type: "ERROR",
        text: "Please select an accredited team before confirming assignment.",
      });
      return;
    }

    try {
      setModalSubmitting(true);
      const isChange = !!assignTarget.currentTeam;

      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isChange ? "CHANGE_POSITION" : "ASSIGN_POSITION",
          pool: assignTarget.pool,
          slot: assignTarget.slot,
          teamId: modalSelectedTeam.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign team to position");
      }

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ TEAM ASSIGNED: Team #${modalSelectedTeam.teamNumber || "-"} (${modalSelectedTeam.name}) assigned to Pool ${assignTarget.pool} Slot #${assignTarget.slot}.`,
      });

      setAssignModalOpen(false);
      setAssignTarget(null);
      setModalSelectedTeam(null);
      await fetchFixtures(true);
      await fetchAllTeams();
    } catch (err: any) {
      setStatusMessage({
        type: "ERROR",
        text: err.message || "Failed to assign team",
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  // Remove / Unassign Team from Single Position
  const handleRemoveSingleAssignment = async (pos: any) => {
    if (!confirm(`Are you sure you want to remove Team #${pos.teamNumber} (${pos.teamName}) from Pool ${pos.pool} Slot #${pos.slot}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_POSITION",
          pool: pos.pool,
          slot: pos.slot,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove assignment");
      }

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ Assignment removed: Pool ${pos.pool} Slot #${pos.slot} is now empty and available.`,
      });

      if (assignModalOpen) setAssignModalOpen(false);
      await fetchFixtures(true);
      await fetchAllTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Clear all slots in Active Pool or specific Pool (A, B, C, D)
  const handleClearPool = async (poolToClear: "A" | "B" | "C" | "D" = activePool) => {
    if (!confirm(`Are you sure you want to clear all assignments in POOL ${poolToClear} back to empty?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_POOL", pool: poolToClear }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to clear Pool ${poolToClear}`);
      }

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ Pool ${poolToClear} has been cleared back to empty state.`,
      });
      await fetchFixtures(true);
      await fetchAllTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Lock Fixture with Global Uniqueness Validation Check
  const handleLockFixture = async () => {
    if (validation && !validation.isValid) {
      setStatusMessage({
        type: "ERROR",
        text: `Cannot lock fixture: ${validation.error || "Duplicate team assignments found across pools!"}`,
      });
      return;
    }

    if (!confirm("Are you sure you want to lock the tournament fixture? Normal modifications will be locked.")) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LOCK" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setStatusMessage({
        type: "SUCCESS",
        text: "✓ Fixture graph validated with 0 duplicates and permanently LOCKED.",
      });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Publish Fixture
  const handlePublishFixture = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setStatusMessage({
        type: "SUCCESS",
        text: "✓ Championship fixture is now PUBLISHED and live for the public.",
      });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <TournamentAdminShell activeTab="fixtures">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ═══ 1. COMMAND HEADER ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#00F0FF]/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#00F0FF] text-black font-pixel text-[10px] font-bold uppercase shadow-[2px_2px_0px_#000]">
                LEVEL 03 COMMAND
              </span>
              <span className="text-[#00F0FF] font-pixel text-xs tracking-widest uppercase">
                SOUTH ZONE 2026 &bull; AIU WOMEN&apos;S BASKETBALL
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#f5e6ca] uppercase tracking-tight">
              FIXTURE &amp; <span className="text-[#00F0FF]">POSITION ASSIGNMENT</span>
            </h1>
            <p className="font-pixel text-xs text-[#91A0AE] mt-1 uppercase tracking-wider">
              INDIVIDUAL POSITION-FIRST ASSIGNMENT &bull; GLOBAL TOURNAMENT UNIQUENESS ENFORCEMENT
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/fixtures"
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#050A18] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 transition-colors shadow-[2px_2px_0px_#000]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Bracket View</span>
            </Link>

            <button
              onClick={() => {
                fetchFixtures(false);
                fetchAllTeams();
              }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1b0d2b] text-[#f5e6ca] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 transition-colors shadow-[2px_2px_0px_#000]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-pixel tracking-wider uppercase shadow-md ${
              statusMessage.type === "SUCCESS"
                ? "bg-[#05D550]/15 border-[#05D550] text-[#05D550]"
                : statusMessage.type === "ERROR"
                ? "bg-[#FF2A6D]/15 border-[#FF2A6D] text-[#FF2A6D]"
                : "bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "SUCCESS" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="hover:opacity-75 text-sm font-bold ml-4">
              &times;
            </button>
          </div>
        )}

        {/* ═══ 2. GLOBAL VALIDATION & PROGRESS STATUS HUD ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Total Teams */}
          <div className="p-3 bg-[#0c101c] border border-[#18D8D0]/30 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">TOTAL TEAMS</span>
            <span className="font-pixel text-xl text-[#f5e6ca] font-bold">102</span>
          </div>

          {/* Card 2: Assigned */}
          <div className="p-3 bg-[#0c101c] border border-[#05D550]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">TOTAL ASSIGNED</span>
            <span className="font-pixel text-xl text-[#05D550] font-bold">
              {fixturesData?.totalAssigned || 0} / 102
            </span>
          </div>

          {/* Card 3: Remaining */}
          <div className="p-3 bg-[#0c101c] border border-[#FFB800]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">REMAINING</span>
            <span className="font-pixel text-xl text-[#FFB800] font-bold">
              {fixturesData?.totalRemaining ?? 102}
            </span>
          </div>

          {/* Card 4: Global Unique Teams */}
          <div className="p-3 bg-[#0c101c] border border-[#00F0FF]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">UNIQUE TEAMS</span>
            <span className="font-pixel text-xl text-[#00F0FF] font-bold">
              {validation?.uniqueTeamsAssigned ?? validation?.totalAssignedUniqueTeams ?? fixturesData?.totalAssigned ?? 0} / 102
            </span>
          </div>

          {/* Card 5: Duplicate Teams */}
          <div className={`p-3 bg-[#0c101c] rounded-xl border ${
            (validation?.duplicates?.duplicateCount ?? validation?.duplicateTeamsCount ?? 0) > 0
              ? "border-[#FF2A6D] bg-[#FF2A6D]/10"
              : "border-[#05D550]/40"
          }`}>
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">DUPLICATE TEAMS</span>
            <span className={`font-pixel text-xl font-bold ${
              (validation?.duplicates?.duplicateCount ?? validation?.duplicateTeamsCount ?? 0) > 0 ? "text-[#FF2A6D]" : "text-[#05D550]"
            }`}>
              {validation?.duplicates?.duplicateCount ?? validation?.duplicateTeamsCount ?? 0}
            </span>
          </div>

          {/* Card 6: Current Active Draw */}
          <div className="p-3 bg-[#0c101c] border border-[#FF5A16]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">GUIDED DRAW</span>
            <span className="font-pixel text-xl text-[#FF5A16] font-bold">
              #{String(fixturesData?.currentDrawNumber || 1).padStart(2, "0")}
            </span>
          </div>

          {/* Card 7: Active Pool */}
          <div className="p-3 bg-[#0c101c] border border-[#A78BFA]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT POOL</span>
            <span className="font-pixel text-xl text-[#A78BFA] font-bold">
              POOL {activePool} ({poolCounts[activePool]}/{(activePool === "A" || activePool === "C") ? 26 : 25})
            </span>
          </div>

          {/* Card 8: Status & Lock */}
          <div className="p-3 bg-[#0c101c] border border-[#00F0FF]/40 rounded-xl flex flex-col justify-between">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">FIXTURE LOCK</span>
            <span
              className={`font-pixel text-xs px-2 py-0.5 rounded font-bold tracking-wider text-center ${
                config.isLocked
                  ? "bg-[#A78BFA] text-black"
                  : config.isPublished
                  ? "bg-[#05D550] text-black"
                  : "bg-[#2A354E] text-[#00F0FF]"
              }`}
            >
              {config.isLocked ? "LOCKED" : config.isPublished ? "PUBLISHED" : "UNLOCKED"}
            </span>
          </div>
        </div>

        {/* ═══ 2.1 TOURNAMENT-WIDE VALIDATION REPORT BANNER ═══ */}
        {validation && (
          <div className={`p-4 rounded-2xl border ${
            validation.isValid
              ? "bg-[#05D550]/10 border-[#05D550]/40"
              : "bg-[#FF2A6D]/15 border-[#FF2A6D]"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {validation.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-[#05D550] flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#FF2A6D] flex-shrink-0 animate-pulse" />
                )}
                <div>
                  <h4 className="font-pixel text-xs font-bold uppercase tracking-wider text-[#f5e6ca]">
                    TEAM ASSIGNMENT VALIDATION &bull; {validation.statusText || validation.statusBadge || (validation.isValid ? "✓ NO DUPLICATES" : "✕ CONFLICTS DETECTED")}
                  </h4>
                  <p className="font-pixel text-[10px] text-[#91A0AE] mt-0.5">
                    Pool A: {validation.poolBreakdown?.A?.assigned ?? poolCounts.A}/25 &bull; Pool B: {validation.poolBreakdown?.B?.assigned ?? poolCounts.B}/25 &bull; Pool C: {validation.poolBreakdown?.C?.assigned ?? poolCounts.C}/25 &bull; Pool D: {validation.poolBreakdown?.D?.assigned ?? poolCounts.D}/25 &bull; Global Unique: {validation.uniqueTeamsAssigned ?? validation.totalAssignedUniqueTeams ?? fixturesData?.totalAssigned ?? 0}/100 &bull; Duplicates: {validation.duplicates?.duplicateCount ?? validation.duplicateTeamsCount ?? 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!config.isLocked && (
                  <button
                    onClick={handleLockFixture}
                    disabled={actionLoading || !validation.isValid || fixturesData?.totalAssigned < 100}
                    className="px-4 py-2 bg-[#A78BFA] hover:bg-[#c4b5fd] disabled:opacity-40 text-black font-pixel text-xs font-bold uppercase tracking-wider rounded-lg shadow transition-all flex items-center gap-1.5"
                    title={validation.isValid ? "Lock fixture" : "Fix duplicate assignments before locking"}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCK FIXTURE</span>
                  </button>
                )}

                {config.isLocked && !config.isPublished && (
                  <button
                    onClick={handlePublishFixture}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#05D550] hover:bg-[#34d399] text-black font-pixel text-xs font-bold uppercase tracking-wider rounded-lg shadow transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PUBLISH FIXTURE</span>
                  </button>
                )}
              </div>
            </div>

            {/* If duplicates exist, show detail warning */}
            {!validation.isValid && (validation.errors?.length > 0 || (Array.isArray(validation.duplicates) && validation.duplicates.length > 0)) && (
              <div className="mt-3 pt-3 border-t border-[#FF2A6D]/30 space-y-1.5">
                <span className="font-pixel text-[10px] text-[#FF2A6D] font-bold uppercase block">
                  ✕ CRITICAL DUPLICATE CONFLICTS DETECTED:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {(validation.errors || []).map((err: string, idx: number) => (
                    <div key={idx} className="p-2 bg-black/40 border border-[#FF2A6D]/40 rounded text-rose-200">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ 3. POSITION-FIRST ASSIGNMENT CONSOLE ═══ */}
        <div className="bg-[#0b0f1d] border-2 border-[#00F0FF]/50 p-6 rounded-3xl shadow-[0_15px_45px_rgba(0,240,255,0.1)] space-y-6">
          {/* Top Bar: Pool Selector Tabs & Global Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#00F0FF] to-[#05D550] text-black rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                <Users className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 uppercase tracking-wider rounded">
                    ONE-POSITION-AT-A-TIME WORKFLOW
                  </span>
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">
                    &bull; NO MATCH PAIRING REQUIRED
                  </span>
                </div>
                <h2 className="font-display text-2xl text-[#f5e6ca] font-extrabold uppercase tracking-tight mt-0.5">
                  POSITION-FIRST <span className="text-[#00F0FF]">TEAM ASSIGNMENT</span>
                </h2>
              </div>
            </div>

            {/* Pool Selector (A, B, C, D) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#050A18] border border-[#1b253b] rounded-xl p-1 gap-1">
                {(["A", "B", "C", "D"] as const).map((p) => {
                  const count = poolCounts[p];
                  const poolLimit = (p === "A" || p === "C") ? 26 : 25;
                  const isFull = count >= poolLimit;
                  const isActive = activePool === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePool(p)}
                      className={`px-4 py-2 font-pixel text-xs sm:text-sm uppercase font-black rounded-lg transition-all flex items-center gap-2 ${
                        isActive
                          ? "bg-[#00F0FF] text-black shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                          : "text-[#91A0AE] hover:text-[#f5e6ca]"
                      }`}
                    >
                      <span>POOL {p}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                          isFull
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : isActive
                            ? "bg-black/30 text-black font-black"
                            : "bg-[#101935] text-[#00F0FF]"
                        }`}
                      >
                        {count}/{poolLimit}
                      </span>
                    </button>
                  );
                })}

                <Link
                  href="/admin/tournament/teams"
                  className="px-3.5 py-2 font-pixel text-xs sm:text-sm uppercase font-bold rounded-lg transition-all flex items-center gap-1.5 text-zinc-400 hover:text-white bg-[#0e162b] border border-[#1b253b] hover:border-[#00F0FF]/50"
                  title="View all 102 teams roster (15 teams per page)"
                >
                  <Users className="w-3.5 h-3.5 text-[#00F0FF]" />
                  <span>ALL TEAMS</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#101935] text-[#00F0FF]">
                    102
                  </span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleClearPool(activePool)}
                  disabled={actionLoading || poolCounts[activePool] === 0}
                  className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-30 text-rose-300 border border-rose-500/40 font-pixel text-xs uppercase transition-colors rounded-lg shadow flex items-center gap-1.5"
                  title={`Clear all slots in Pool ${activePool}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Pool {activePool}</span>
                </button>

                <div className="flex items-center gap-1 border-l border-slate-700/60 pl-2">
                  {(["A", "B", "C", "D"] as const).map((p) => (
                    <button
                      key={`quick-clear-btn-${p}`}
                      type="button"
                      onClick={() => handleClearPool(p)}
                      disabled={actionLoading || poolCounts[p] === 0}
                      className={`px-2.5 py-1.5 text-[10.5px] font-pixel uppercase rounded-md border transition-colors ${
                        activePool === p
                          ? "bg-rose-900/80 text-rose-200 border-rose-400 font-bold"
                          : "bg-rose-950/30 text-rose-400 border-rose-900/50 hover:bg-rose-900/40"
                      } disabled:opacity-25`}
                      title={`Directly clear all slots in Pool ${p}`}
                    >
                      Clear {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Guided Draw Sequence Pointers (HUD) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CURRENT ACTIVE POSITION */}
            <div className="p-4 bg-[#050914] border-2 border-[#00F0FF] rounded-2xl shadow-[0_0_15px_rgba(0,240,255,0.15)] flex items-center justify-between">
              <div>
                <span className="font-pixel text-[10px] text-[#00F0FF] uppercase tracking-wider block mb-1">
                  CURRENT GUIDED DRAW POSITION
                </span>
                <div className="font-display text-2xl text-[#f5e6ca] font-extrabold uppercase">
                  POOL {currentPos?.pool || activePool} &bull; {currentPos?.id || `POSITION ${activePool}-01`}
                </div>
                <div className="font-pixel text-[10px] text-[#91A0AE] mt-1">
                  Side: <strong className="text-[#f5e6ca]">{currentPos?.side || "FIRST"}</strong> &bull; Initial Match: <strong className="text-[#00F0FF]">{currentPos?.firstMatchNumber || "Round 1"}</strong>
                </div>
              </div>
              <div className="font-pixel text-3xl font-black text-[#00F0FF]">
                #{String(fixturesData?.currentDrawNumber || 1).padStart(2, "0")}
              </div>
            </div>

            {/* UPCOMING NEXT POSITION */}
            <div className="p-4 bg-[#050914] border border-[#18D8D0]/40 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider block mb-1">
                  UPCOMING NEXT DRAW POSITION
                </span>
                <div className="font-display text-2xl text-[#91A0AE] font-extrabold uppercase">
                  POOL {nextPos?.pool || (activePool === "D" ? "A" : "B")} &bull; {nextPos?.id || "NEXT DRAW"}
                </div>
                <div className="font-pixel text-[10px] text-[#91A0AE] mt-1">
                  Side: <strong className="text-[#f5e6ca]">{nextPos?.side || "FIRST"}</strong> &bull; Sequence: <strong className="text-[#18D8D0]">Deterministic Cyclic</strong>
                </div>
              </div>
              <div className="font-pixel text-3xl font-black text-[#91A0AE]">
                #{String((fixturesData?.currentDrawNumber || 1) + 1).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Filter Bar for Positions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050914] p-3 rounded-2xl border border-[#1b253b]">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["ALL", "EMPTY", "ASSIGNED", "BYES", "FIXED"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPositionFilter(mode)}
                  className={`px-3.5 py-1.5 font-pixel text-xs sm:text-[13px] uppercase font-bold rounded-lg transition-colors ${
                    positionFilter === mode
                      ? "bg-[#00F0FF] text-black font-black shadow"
                      : "text-[#91A0AE] hover:text-white"
                  }`}
                >
                  {mode === "ALL"
                    ? `ALL POSITIONS (${(activePool === "A" || activePool === "C") ? 26 : 25})`
                    : mode === "EMPTY"
                    ? `EMPTY (${activePoolPositions.filter((p) => p.status === "EMPTY").length})`
                    : mode === "ASSIGNED"
                    ? `ASSIGNED (${activePoolPositions.filter((p) => p.status === "ASSIGNED").length})`
                    : mode === "BYES"
                    ? `BYES & SEEDS (${(activePool === "A" || activePool === "C") ? 8 : 9})`
                    : `FIXED (${activePoolPositions.filter((p) => p.isFixed).length})`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#91A0AE] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search slot # or team..."
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                className="bg-[#0b0f1d] border border-[#1b253b] text-xs sm:text-sm text-[#f5e6ca] pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00F0FF] w-60 font-medium"
              />
            </div>
          </div>

          {/* ═══ INTERACTIVE POSITION GRID FOR ACTIVE POOL ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredActivePositions.map((pos) => {
              const isAssigned = pos.status === "ASSIGNED";
              const isFixed = pos.isFixed;
              const isBye = pos.isBye;
              const isSeed = pos.isSeed;
              const seedNum = pos.seed || (activePool === "A" ? 1 : activePool === "B" ? 2 : activePool === "C" ? 3 : 4);

              return (
                <div
                  key={pos.slot}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 relative hover:shadow-lg ${
                    isAssigned
                      ? "bg-[#050A18] border-[#05D550]/60 hover:border-[#05D550] shadow-[0_0_15px_rgba(5,213,80,0.12)]"
                      : isFixed
                      ? "bg-[#050A18] border-[#A78BFA]/60"
                      : isSeed
                      ? "bg-[#050A18] border-[#FFB800]/50 hover:border-[#FFB800]"
                      : isBye
                      ? "bg-[#050A18] border-[#18D8D0]/50 hover:border-[#18D8D0]"
                      : "bg-[#050A18] border-[#1b253b] hover:border-[#00F0FF]/70"
                  }`}
                >
                  {/* Position Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-pixel text-sm sm:text-[15px] font-black text-[#f5e6ca] tracking-tight">
                        SLOT #{String(pos.slot).padStart(2, "0")}
                      </span>
                      {isSeed ? (
                        <span className="px-2 py-0.5 bg-[#FFB800] text-black font-pixel text-[10px] sm:text-[11px] font-extrabold rounded uppercase shadow-sm">
                          SEED #{seedNum}
                        </span>
                      ) : isBye ? (
                        <span className="px-2 py-0.5 bg-[#18D8D0]/20 text-[#00F0FF] border border-[#00F0FF]/50 font-pixel text-[10px] sm:text-[11px] font-extrabold rounded uppercase">
                          BYE
                        </span>
                      ) : null}
                    </div>

                    <span
                      className={`font-pixel text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                        isFixed
                          ? "bg-[#A78BFA] text-black"
                          : isAssigned
                          ? "bg-[#05D550] text-black"
                          : "bg-[#1b253b] text-[#91A0AE]"
                      }`}
                    >
                      {isFixed ? "FIXED" : isAssigned ? "ASSIGNED" : "EMPTY"}
                    </span>
                  </div>

                  {/* Fixture Context / Progression */}
                  <div className="font-pixel text-xs text-[#00F0FF] font-semibold truncate">
                    {pos.matchLabel}
                  </div>

                  {/* Assigned Team Card or Empty Placeholder */}
                  {isAssigned ? (
                    <div className="p-2 bg-[#0e162b] border border-[#05D550]/30 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-pixel text-xs font-black text-[#05D550]">
                          TEAM #{pos.teamNumber || "-"}
                        </span>
                        <span className="font-pixel text-xs font-bold text-[#00F0FF] truncate">
                          {pos.teamCode}
                        </span>
                      </div>
                      <h4 className="font-display text-sm sm:text-[15px] text-[#f5e6ca] font-bold uppercase line-clamp-2 leading-tight">
                        {pos.teamName}
                      </h4>
                      {pos.state && (
                        <div className="text-xs text-[#91A0AE] truncate font-medium">{pos.state}</div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 px-2 bg-[#0b0f1d]/70 border border-dashed border-[#1b253b] rounded-lg text-center">
                      <span className="font-pixel text-xs font-bold text-[#91A0AE] block uppercase tracking-wider">
                        POSITION UNASSIGNED
                      </span>
                    </div>
                  )}

                  {/* Opponent Context (Display Only) */}
                  {pos.opponentSlot && (
                    <div className="text-xs font-mono text-[#91A0AE] flex items-center justify-between pt-1 border-t border-[#1b253b]/80">
                      <span className="font-semibold">VS Slot #{pos.opponentSlot}:</span>
                      <span className="text-[#f5e6ca] font-bold truncate max-w-[120px]">
                        {pos.opponentTeam ? `#${pos.opponentTeam.teamNumber} ${pos.opponentTeam.teamName}` : "TBD"}
                      </span>
                    </div>
                  )}

                  {/* Individual Action Buttons */}
                  <div className="pt-1 flex items-center gap-1.5">
                    {isAssigned ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(pos)}
                          disabled={actionLoading || (config.isLocked && !pos.isFixed)}
                          className="flex-1 py-1.5 bg-[#1A2644] hover:bg-[#2A3B66] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>CHANGE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleAssignment(pos)}
                          disabled={actionLoading || (config.isLocked && !pos.isFixed)}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-lg transition-colors"
                          title="Remove team from position"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(pos)}
                        disabled={actionLoading || poolCounts[activePool] >= ((activePool === "A" || activePool === "C") ? 26 : 25)}
                        className="w-full py-1.5 sm:py-2 bg-gradient-to-r from-[#00F0FF] to-[#05D550] hover:from-[#33f3ff] hover:to-[#22e666] disabled:opacity-40 text-black font-pixel text-xs sm:text-[13px] font-black uppercase rounded-lg shadow transition-all flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>ASSIGN TEAM</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ 4. VIEW MODE TOGGLE (POSITIONS DIRECTORY vs TREE BRACKET) ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0b0f1d] border border-[#18D8D0]/30 p-4 rounded-2xl shadow-lg">
          <div>
            <span className="font-pixel text-[11px] text-[#00F0FF] uppercase tracking-wider block">
              GRAPH VISUALIZATION &amp; FIXTURE DIRECTORY
            </span>
            <h2 className="font-display text-xl text-[#f5e6ca] font-bold uppercase">
              {activeViewMode === "BRACKET"
                ? "OFFICIAL POOL-WISE KNOCKOUT TREE BRACKET"
                : "TOURNAMENT MATCH & POSITION DIRECTORY"}
            </h2>
          </div>

          <div className="flex items-center bg-[#050914] border border-[#1b253b] rounded-lg p-1">
            <button
              onClick={() => setActiveViewMode("POSITIONS")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors ${
                activeViewMode === "POSITIONS" ? "bg-[#00F0FF] text-black shadow" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              Position Console
            </button>
            <button
              onClick={() => setActiveViewMode("BRACKET")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors ${
                activeViewMode === "BRACKET" ? "bg-[#00F0FF] text-black shadow" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              Visual Tree Bracket
            </button>
            <button
              onClick={() => setActiveViewMode("TABLE")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors ${
                activeViewMode === "TABLE" ? "bg-[#00F0FF] text-black shadow" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              Directory Table
            </button>
          </div>
        </div>

        {/* Visual Bracket Mode */}
        {activeViewMode === "BRACKET" && (
          <div className="w-full">
            <OfficialPoolBracket
              liveMatches={matches}
              bracketSlots={bracketSlots}
              isAdmin={true}
              initialPool={activePool}
              onSlotAssigned={() => {
                fetchFixtures(true);
                fetchAllTeams();
              }}
            />
          </div>
        )}

        {/* Directory Table Mode */}
        {activeViewMode === "TABLE" && (
          <div className="bg-[#0b0f1d] border border-[#18D8D0]/30 p-6 rounded-2xl shadow-lg space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminTableTab("MATCHES")}
                  className={`px-4 py-2 font-pixel text-xs uppercase tracking-wider rounded-xl transition-all ${
                    adminTableTab === "MATCHES"
                      ? "bg-[#00F0FF] text-black font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      : "bg-[#050914] text-[#91A0AE] hover:text-white border border-[#1b253b]"
                  }`}
                >
                  Match Fixtures Table (100 Matches)
                </button>
                <button
                  onClick={() => setAdminTableTab("POSITIONS")}
                  className={`px-4 py-2 font-pixel text-xs uppercase tracking-wider rounded-xl transition-all ${
                    adminTableTab === "POSITIONS"
                      ? "bg-[#00F0FF] text-black font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      : "bg-[#050914] text-[#91A0AE] hover:text-white border border-[#1b253b]"
                  }`}
                >
                  Position Slots Table (120 Slots)
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={tableFilterPool}
                  onChange={(e) => setTableFilterPool(e.target.value)}
                  className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] p-2 rounded"
                >
                  <option value="ALL">All Pools</option>
                  <option value="A">Pool A (25 Teams)</option>
                  <option value="B">Pool B (25 Teams)</option>
                  <option value="C">Pool C (25 Teams)</option>
                  <option value="D">Pool D (25 Teams)</option>
                </select>

                <input
                  type="text"
                  placeholder="Search team / match..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] px-3 py-2 rounded w-44"
                />
              </div>
            </div>

            {adminTableTab === "MATCHES" ? (
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead className="sticky top-0 bg-[#050914] border-b border-[#1b253b] font-pixel text-[10px] text-[#00F0FF] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">MATCH #</th>
                      <th className="py-2.5 px-3">POOL &amp; ROUND</th>
                      <th className="py-2.5 px-3">DATE &amp; TIME</th>
                      <th className="py-2.5 px-3">COURT</th>
                      <th className="py-2.5 px-3">TEAM 1</th>
                      <th className="py-2.5 px-3 text-center">VS</th>
                      <th className="py-2.5 px-3">TEAM 2</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b253b]/50">
                    {matches
                      .filter((m: any) => {
                        if (tableFilterPool !== "ALL" && m.pool !== tableFilterPool) return false;
                        if (tableSearch.trim()) {
                          const q = tableSearch.toLowerCase();
                          const pA = m.playerA?.toLowerCase() || "";
                          const pB = m.playerB?.toLowerCase() || "";
                          const mNum = m.publicMatchNumber?.toLowerCase() || "";
                          if (!pA.includes(q) && !pB.includes(q) && !mNum.includes(q)) return false;
                        }
                        return true;
                      })
                      .map((m: any) => (
                        <tr key={m.id} className="hover:bg-[#0e162b] transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-xs text-[#00F0FF]">
                            {m.publicMatchNumber || m.matchNumber}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-pixel text-[10px] text-[#FF5A16] font-bold">
                              POOL {m.pool || "-"}
                            </span>
                            <div className="text-[11px] text-slate-300">
                              {m.roundName || m.roundStage}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-[#FFD700]">
                            {m.day?.date || "OCT 18"} &bull; {m.time}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-pixel text-[10px] text-[#00F0FF] bg-[#050914] px-2 py-0.5 border border-[#00F0FF]/30 rounded">
                              {m.court}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs font-semibold text-white">
                            <div className="truncate">{m.playerA || "TBD"}</div>
                            {m.institutionA && m.institutionA !== m.playerA && (
                              <div className="text-[10px] text-[#91A0AE] truncate">{m.institutionA}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold text-[#00FF88]">
                            VS
                          </td>
                          <td className="py-2.5 px-3 max-w-xs font-semibold text-white">
                            <div className="truncate">{m.playerB || "TBD"}</div>
                            {m.institutionB && m.institutionB !== m.playerB && (
                              <div className="text-[10px] text-[#91A0AE] truncate">{m.institutionB}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 font-pixel text-[9px] rounded font-bold ${
                                m.status === "LIVE"
                                  ? "bg-[#FF2A6D] text-white animate-pulse"
                                  : m.status === "COMPLETED"
                                  ? "bg-[#05D550] text-black"
                                  : "bg-[#2A354E] text-[#91A0AE]"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-[#050914] border-b border-[#1b253b] font-pixel text-[10px] text-[#00F0FF]">
                    <tr>
                      <th className="py-2.5 px-3">POOL</th>
                      <th className="py-2.5 px-3">SLOT #</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">TEAM #</th>
                      <th className="py-2.5 px-3">TEAM CODE</th>
                      <th className="py-2.5 px-3">UNIVERSITY</th>
                      <th className="py-2.5 px-3">STATE</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b253b]/50">
                    {bracketSlots
                      .filter((s: any) => {
                        if (tableFilterPool !== "ALL" && s.pool !== tableFilterPool) return false;
                        if (tableSearch.trim()) {
                          const q = tableSearch.toLowerCase();
                          const numMatch = String(s.slot).includes(q) || String(s.teamNumber || "").includes(q);
                          const nameMatch = s.teamName?.toLowerCase().includes(q);
                          if (!numMatch && !nameMatch) return false;
                        }
                        return true;
                      })
                      .map((s: any) => (
                        <tr key={s.id} className="hover:bg-[#0e162b] transition-colors">
                          <td className="py-2 px-3 font-pixel text-[#00F0FF]">Pool {s.pool}</td>
                          <td className="py-2 px-3 font-pixel text-[#f5e6ca] font-bold">Slot #{s.slot}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 font-pixel text-[9px] rounded font-bold ${
                                s.teamId ? "bg-[#05D550] text-black" : "bg-[#2A354E] text-[#91A0AE]"
                              }`}
                            >
                              {s.teamId ? "ASSIGNED" : "EMPTY"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#FF5A16] font-bold">{s.teamNumber ? `#${s.teamNumber}` : "-"}</td>
                          <td className="py-2 px-3 text-[#00F0FF]">{s.teamCode || "-"}</td>
                          <td className="py-2 px-3 text-[#f5e6ca] font-medium">{s.teamName || "-"}</td>
                          <td className="py-2 px-3 text-[#91A0AE]">{s.state || "-"}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => {
                                setActivePool(s.pool);
                                handleOpenAssignModal(s);
                              }}
                              className="text-[10px] font-pixel text-[#00F0FF] hover:underline"
                            >
                              {s.teamId ? "CHANGE" : "ASSIGN"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ 5. SINGLE-POSITION TEAM ASSIGNMENT MODAL ═══ */}
        {assignModalOpen && assignTarget && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0b0f1d] border-2 border-[#00F0FF] p-6 rounded-3xl max-w-2xl w-full space-y-5 shadow-[0_20px_60px_rgba(0,240,255,0.2)]">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1b253b]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#00F0FF] text-black font-pixel text-[10px] font-bold uppercase rounded">
                      SINGLE-POSITION ASSIGNMENT
                    </span>
                    <span className="font-pixel text-[10px] text-[#00F0FF] uppercase">
                      {assignTarget.label}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl text-[#f5e6ca] font-extrabold uppercase mt-1">
                    {assignTarget.currentTeam ? "CHANGE ASSIGNED TEAM" : "ASSIGN TEAM TO POSITION"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="p-2 text-[#91A0AE] hover:text-white rounded-lg hover:bg-[#1b253b] transition-colors text-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Assignment Status Banner */}
              {assignTarget.currentTeam ? (
                <div className="p-3.5 bg-[#0e162b] border border-[#05D550]/40 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="font-pixel text-[9px] text-[#05D550] uppercase block">
                      CURRENTLY OCCUPYING THIS SLOT:
                    </span>
                    <h4 className="font-display text-base text-[#f5e6ca] font-bold uppercase">
                      Team #{assignTarget.currentTeam.teamNumber || "-"} &bull; {assignTarget.currentTeam.teamName}
                    </h4>
                    <span className="text-xs text-[#91A0AE]">
                      {assignTarget.currentTeam.teamCode} &bull; {assignTarget.currentTeam.state}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSingleAssignment(assignTarget)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-pixel text-[10px] uppercase rounded-lg transition-colors whitespace-nowrap"
                  >
                    Remove Team
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-[#050A18] border border-dashed border-[#1b253b] rounded-xl text-xs font-pixel text-[#91A0AE]">
                  Slot is currently EMPTY and ready for draw assignment.
                </div>
              )}

              {/* Team Search Input */}
              <div>
                <label className="font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider block mb-1.5">
                  SEARCH TEAMS (BY TEAM NUMBER, CODE, UNIVERSITY OR STATE)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#91A0AE] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. 1 or TM-SZ-001 or Madras or Kerala..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="w-full bg-[#050A18] border-2 border-[#1b253b] focus:border-[#00F0FF] text-sm text-[#f5e6ca] pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition-colors font-mono"
                    autoFocus
                  />
                  {teamsLoading && (
                    <RefreshCw className="w-4 h-4 text-[#00F0FF] animate-spin absolute right-3.5 top-3.5" />
                  )}
                </div>
              </div>

              {/* Team Selection List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block mb-1">
                  AVAILABLE &amp; ACCREDITED TEAMS ({modalFilteredTeams.length} TOTAL)
                </span>

                {modalFilteredTeams.map((t) => {
                  const isCurrentSlotTeam = assignTarget.currentTeam?.id === t.id;
                  const isAssignedElsewhere = t.isAssigned && !isCurrentSlotTeam;
                  const isSelected = modalSelectedTeam?.id === t.id;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isAssignedElsewhere}
                      onClick={() => setModalSelectedTeam(t)}
                      className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-[#00F0FF]/20 border-[#00F0FF] ring-2 ring-[#00F0FF]"
                          : isAssignedElsewhere
                          ? "bg-[#050A18]/40 border-[#1b253b]/40 opacity-50 cursor-not-allowed"
                          : "bg-[#050A18] border-[#1b253b] hover:border-[#00F0FF]/60 hover:bg-[#0e162b]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-pixel text-xs font-bold text-[#00F0FF]">
                            #{t.teamNumber || "-"}
                          </span>
                          <span className="font-pixel text-[10px] text-[#91A0AE] font-mono">
                            {t.teamCode}
                          </span>
                          <span className="text-[11px] text-[#91A0AE]">&bull; {t.state}</span>
                        </div>
                        <h5 className="font-display text-sm text-[#f5e6ca] font-bold uppercase truncate">
                          {t.name}
                        </h5>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isAssignedElsewhere ? (
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-rose-950/60 text-rose-300 border border-rose-500/40 font-pixel text-[9px] font-bold uppercase rounded block">
                              ALREADY ASSIGNED
                            </span>
                            <span className="font-pixel text-[8px] text-[#91A0AE] block mt-0.5">
                              Pool {t.assignedPool} &bull; Slot #{t.assignedSlot}
                            </span>
                          </div>
                        ) : isCurrentSlotTeam ? (
                          <span className="px-2 py-0.5 bg-[#05D550] text-black font-pixel text-[9px] font-bold uppercase rounded">
                            CURRENT
                          </span>
                        ) : isSelected ? (
                          <span className="px-2 py-0.5 bg-[#00F0FF] text-black font-pixel text-[9px] font-bold uppercase rounded">
                            SELECTED ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#1b253b] text-[#05D550] font-pixel text-[9px] font-bold uppercase rounded">
                            AVAILABLE
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Team Pre-Assignment Preview */}
              {modalSelectedTeam && (
                <div className="p-3.5 bg-[#0e162b] border border-[#00F0FF]/40 rounded-2xl space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[10px] text-[#00F0FF] font-bold uppercase">
                      READY TO ASSIGN TO POOL {assignTarget.pool} SLOT #{assignTarget.slot}
                    </span>
                    <span className="px-2 py-0.5 bg-[#05D550] text-black font-pixel text-[9px] font-bold uppercase rounded">
                      ELIGIBLE &bull; ACCREDITED
                    </span>
                  </div>
                  <h4 className="font-display text-base text-[#f5e6ca] font-bold uppercase">
                    Team #{modalSelectedTeam.teamNumber || "-"} &bull; {modalSelectedTeam.name}
                  </h4>
                  <div className="flex justify-between text-xs text-[#91A0AE] pt-1 border-t border-[#1b253b]">
                    <span>Institution: <strong className="text-[#f5e6ca]">{modalSelectedTeam.institution}</strong></span>
                    <span>State: <strong className="text-[#00F0FF]">{modalSelectedTeam.state}</strong></span>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b253b]">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 bg-[#1b253b] hover:bg-[#2A354E] text-[#91A0AE] hover:text-white font-pixel text-xs uppercase rounded-xl transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleAssignment}
                  disabled={!modalSelectedTeam || modalSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#00F0FF] to-[#05D550] hover:from-[#33f3ff] hover:to-[#22e666] disabled:opacity-40 text-black font-pixel text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2"
                >
                  {modalSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>CONFIRM ASSIGNMENT</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TournamentAdminShell>
  );
}
