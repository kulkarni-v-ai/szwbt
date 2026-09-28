"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function AdminFixturesPage() {
  const [fixturesData, setFixturesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "SUCCESS" | "ERROR" | "INFO"; text: string } | null>(null);

  // Draw input state
  const [searchTeamQuery, setSearchTeamQuery] = useState("");
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [lastAssignedInfo, setLastAssignedInfo] = useState<any | null>(null);

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

  // Position table filter & search
  const [tableFilterPool, setTableFilterPool] = useState("ALL");
  const [tableFilterSide, setTableFilterSide] = useState("ALL");
  const [tableFilterStatus, setTableFilterStatus] = useState("ALL");
  const [tableSearch, setTableSearch] = useState("");

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

  const fetchTeams = async (q = "") => {
    try {
      setTeamsLoading(true);
      const res = await fetch(`/api/tournament/fixtures/teams?available=true&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setAvailableTeams(data.teams);
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
    fetchTeams();
  }, []);

  const config = fixturesData?.config || {};
  const poolStats = fixturesData?.poolStats || {};
  const currentPos = fixturesData?.currentPosition;
  const nextPos = fixturesData?.nextPosition;
  const positions: any[] = fixturesData?.positions || [];
  const history: any[] = fixturesData?.history || [];

  // Handler: Provision 100 Teams
  const handleProvisionTeams = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PROVISION_TEAMS" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "Successfully ensured 100 accredited university teams in database." });
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Start Draw
  const handleStartDraw = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_DRAW" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "Championship draw has started! Active pointer set." });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Assign Fixed Team
  const handleAssignFixed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedTeamId || !fixedPositionId) {
      setStatusMessage({ type: "ERROR", text: "Please enter Team ID and select Position." });
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_FIXED",
          teamId: fixedTeamId,
          pool: fixedPool,
          positionId: fixedPositionId,
          fixedReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: `Fixed team assigned to ${fixedPositionId}.` });
      setShowFixedModal(false);
      setFixedTeamId("");
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Assign Team to Current Draw
  const handleConfirmDraw = async () => {
    if (!selectedTeam) {
      setStatusMessage({ type: "ERROR", text: "Please select an accredited team before confirming." });
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_DRAW",
          teamId: selectedTeam.id,
          expectedPositionId: currentPos?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setLastAssignedInfo({
        team: selectedTeam,
        position: data.data.assignedPosition,
        drawNumber: data.data.drawNumber,
        nextPosition: data.data.nextPosition,
      });

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ TEAM ASSIGNED: ${selectedTeam.name} assigned to ${data.data.assignedPosition.id} (Draw #${data.data.drawNumber}).`,
      });

      setSelectedTeam(null);
      setSearchTeamQuery("");
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Correction
  const handleCorrectAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctPositionId || !correctNewTeamId || !correctReason) {
      setStatusMessage({ type: "ERROR", text: "All fields including audit reason are mandatory." });
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CORRECTION",
          positionId: correctPositionId,
          newTeamId: correctNewTeamId,
          reason: correctReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: `Position ${correctPositionId} assignment corrected.` });
      setShowCorrectionModal(false);
      setCorrectPositionId("");
      setCorrectNewTeamId("");
      setCorrectReason("");
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Lock Fixture
  const handleLockFixture = async () => {
    if (!confirm("Are you sure you want to lock the 100-team fixture? Normal draw modifications will be disabled.")) {
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
      setStatusMessage({ type: "SUCCESS", text: "Fixture graph validated and permanently LOCKED." });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Publish Fixture
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
      setStatusMessage({ type: "SUCCESS", text: "Championship fixture is now PUBLISHED and live for the public." });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered positions for table
  const filteredPositions = positions.filter((p) => {
    if (tableFilterPool !== "ALL" && p.pool !== tableFilterPool) return false;
    if (tableFilterSide !== "ALL" && p.side !== tableFilterSide) return false;
    if (tableFilterStatus !== "ALL" && p.status !== tableFilterStatus) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const idMatch = p.id.toLowerCase().includes(q);
      const teamMatch = p.teamName?.toLowerCase().includes(q);
      const instMatch = p.institution?.toLowerCase().includes(q);
      const numMatch = p.firstMatchNumber?.toLowerCase().includes(q);
      if (!idMatch && !teamMatch && !instMatch && !numMatch) return false;
    }
    return true;
  });

  return (
    <TournamentAdminShell activeTab="fixtures">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ═══ 1. HEADER ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#ff5500]/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-[#ff5500] text-black font-pixel text-[10px] font-bold uppercase shadow-[2px_2px_0px_#000]">
                LEVEL 03 COMMAND
              </span>
              <span className="text-cyan-400 font-pixel text-xs tracking-widest uppercase">
                SOUTH ZONE 2026
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#f5e6ca] uppercase tracking-tight">
              FIXTURE &amp; <span className="text-[#ff5500]">DRAW CONTROL</span>
            </h1>
            <p className="font-pixel text-xs text-[#00F0FF] mt-1 uppercase tracking-wider">
              100 TEAM CHAMPIONSHIP FIXTURE &bull; DETERMINISTIC CYCLIC ALL-POOL DRAW
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/fixtures"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050A18] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 transition-colors shadow-[2px_2px_0px_#000]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Bracket View</span>
            </Link>

            <button
              onClick={() => fetchFixtures(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b0d2b] text-[#f5e6ca] border border-[#ff5500]/40 font-pixel text-xs uppercase hover:bg-[#ff5500]/20 transition-colors shadow-[2px_2px_0px_#000]"
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
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="hover:opacity-75 text-sm">
              &times;
            </button>
          </div>
        )}

        {/* ═══ 2. TOP STATUS CARDS (SECTION 9) ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Total Teams */}
          <div className="p-3 bg-[#0c101c] border border-[#18D8D0]/30 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">TOTAL TEAMS</span>
            <span className="font-pixel text-xl text-[#f5e6ca] font-bold">100</span>
          </div>

          {/* Card 2: Assigned */}
          <div className="p-3 bg-[#0c101c] border border-[#05D550]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">ASSIGNED</span>
            <span className="font-pixel text-xl text-[#05D550] font-bold">
              {fixturesData?.totalAssigned || 0} / 100
            </span>
          </div>

          {/* Card 3: Remaining */}
          <div className="p-3 bg-[#0c101c] border border-[#FFB800]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">REMAINING</span>
            <span className="font-pixel text-xl text-[#FFB800] font-bold">
              {fixturesData?.totalRemaining ?? 100}
            </span>
          </div>

          {/* Card 4: Current Draw */}
          <div className="p-3 bg-[#0c101c] border border-[#ff5500]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT DRAW</span>
            <span className="font-pixel text-xl text-[#ff5500] font-bold">
              #{String(fixturesData?.currentDrawNumber || 1).padStart(2, "0")}
            </span>
          </div>

          {/* Card 5: Current Pool */}
          <div className="p-3 bg-[#0c101c] border border-[#00F0FF]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT POOL</span>
            <span className="font-pixel text-xl text-[#00F0FF] font-bold">
              {currentPos ? `POOL ${currentPos.pool}` : "DONE"}
            </span>
          </div>

          {/* Card 6: Current Side */}
          <div className="p-3 bg-[#0c101c] border border-[#18D8D0]/30 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT SIDE</span>
            <span className="font-pixel text-xl text-[#18D8D0] font-bold">
              {currentPos ? currentPos.side : "DONE"}
            </span>
          </div>

          {/* Card 7: Fixed Teams */}
          <div className="p-3 bg-[#0c101c] border border-[#A78BFA]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">FIXED TEAMS</span>
            <span className="font-pixel text-xl text-[#A78BFA] font-bold">
              {fixturesData?.fixedTeamsCount || 0} / 4
            </span>
          </div>

          {/* Card 8: Status */}
          <div className="p-3 bg-[#0c101c] border border-[#ff5500]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">FIXTURE STATUS</span>
            <span
              className={`font-pixel text-xs px-2 py-1 rounded inline-block font-bold tracking-wider mt-1 ${
                config.status === "LOCKED"
                  ? "bg-[#A78BFA] text-black"
                  : config.status === "PUBLISHED"
                  ? "bg-[#05D550] text-black"
                  : config.status === "COMPLETE"
                  ? "bg-[#00F0FF] text-black"
                  : config.status === "DRAWING"
                  ? "bg-[#ff5500] text-black animate-pulse"
                  : "bg-[#2A354E] text-[#91A0AE]"
              }`}
            >
              {config.status || "DRAFT"}
            </span>
          </div>
        </div>

        {/* ═══ 3. DRAW CONTROLS & MASTER OPERATION SUITE (SECTION 10 & 27) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Draw Terminal (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0b0f1d] border-2 border-[#ff5500]/50 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1b253b]">
              <div>
                <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider block">
                  DETERMINISTIC DRAW ENGINE TERMINAL
                </span>
                <h2 className="font-display text-2xl text-[#f5e6ca] font-bold uppercase">
                  ACTIVE DRAW CONSOLE
                </h2>
              </div>

              {/* State Controls */}
              <div className="flex items-center gap-2">
                {config.status === "DRAFT" && (
                  <button
                    onClick={handleStartDraw}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#ff5500] text-black font-pixel text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#ff7728] transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START DRAW</span>
                  </button>
                )}

                {fixturesData?.totalAssigned >= 100 && !config.isLocked && (
                  <button
                    onClick={handleLockFixture}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#A78BFA] text-black font-pixel text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#c4b5fd] transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCK FIXTURE</span>
                  </button>
                )}

                {config.isLocked && !config.isPublished && (
                  <button
                    onClick={handlePublishFixture}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#05D550] text-black font-pixel text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#34d399] transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PUBLISH FIXTURE</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current & Next Pointer HUD (Section 49) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CURRENT POINTER */}
              <div className="p-4 bg-[#050914] border-2 border-[#ff5500] rounded-xl shadow-[0_0_15px_rgba(255,85,0,0.2)]">
                <span className="font-pixel text-[10px] text-[#ff5500] uppercase tracking-wider block mb-1">
                  CURRENT ACTIVE DRAW
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-pixel text-3xl font-black text-[#f5e6ca]">
                    #{String(fixturesData?.currentDrawNumber || 1).padStart(2, "0")}
                  </span>
                  <span className="font-pixel text-xs px-2 py-0.5 bg-[#ff5500] text-black font-bold uppercase">
                    POOL {currentPos?.pool || "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs font-pixel text-[#91A0AE] space-y-1">
                  <div>SIDE: <strong className="text-[#f5e6ca]">{currentPos?.side || "COMPLETED"}</strong></div>
                  <div>POSITION: <strong className="text-[#00F0FF]">{currentPos?.id || "ALL 100 FILLED"}</strong></div>
                  <div>FIRST MATCH: <strong className="text-[#f5e6ca]">{currentPos?.firstMatchNumber || "-"}</strong></div>
                </div>
              </div>

              {/* NEXT POINTER */}
              <div className="p-4 bg-[#050914] border border-[#18D8D0]/40 rounded-xl">
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider block mb-1">
                  UPCOMING NEXT DRAW
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-pixel text-3xl font-black text-[#91A0AE]">
                    #{String((fixturesData?.currentDrawNumber || 1) + 1).padStart(2, "0")}
                  </span>
                  <span className="font-pixel text-xs px-2 py-0.5 bg-[#1A2644] text-[#00F0FF] uppercase border border-[#00F0FF]/30">
                    POOL {nextPos?.pool || "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs font-pixel text-[#91A0AE] space-y-1">
                  <div>SIDE: <strong className="text-[#f5e6ca]">{nextPos?.side || "-"}</strong></div>
                  <div>POSITION: <strong className="text-[#00F0FF]">{nextPos?.id || "-"}</strong></div>
                  <div>FIRST MATCH: <strong className="text-[#f5e6ca]">{nextPos?.firstMatchNumber || "-"}</strong></div>
                </div>
              </div>
            </div>

            {/* Team Selector & Confirmation Form */}
            {config.status === "DRAWING" && currentPos ? (
              <div className="p-5 bg-[#050914] border border-[#1b253b] rounded-xl space-y-4">
                <span className="font-pixel text-xs text-[#f5e6ca] uppercase tracking-wider block">
                  ASSIGN ACCREDITED TEAM TO POSITION: <span className="text-[#ff5500]">{currentPos.id}</span>
                </span>

                {/* Team Search Input */}
                <div>
                  <label className="font-pixel text-[10px] text-[#91A0AE] uppercase block mb-1">
                    SEARCH AVAILABLE TEAM (TEAM ID OR UNIVERSITY)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#91A0AE] absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. TM-SZ-005 or Bangalore..."
                      value={searchTeamQuery}
                      onChange={(e) => {
                        setSearchTeamQuery(e.target.value);
                        fetchTeams(e.target.value);
                      }}
                      className="w-full bg-[#0b0f1d] border border-[#1b253b] text-sm text-[#f5e6ca] pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>

                {/* Team Selection Dropdown / Quick List */}
                <div>
                  <label className="font-pixel text-[10px] text-[#91A0AE] uppercase block mb-1">
                    SELECT FROM AVAILABLE POOL ({availableTeams.length} AVAILABLE)
                  </label>
                  <select
                    value={selectedTeam?.id || ""}
                    onChange={(e) => {
                      const t = availableTeams.find((item) => item.id === e.target.value);
                      setSelectedTeam(t || null);
                    }}
                    className="w-full bg-[#0b0f1d] border border-[#1b253b] text-xs text-[#f5e6ca] p-2.5 rounded focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="">-- Select Team --</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamCode} &bull; {t.name} ({t.institution} - {t.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Team Inspection Badge (Section 7) */}
                {selectedTeam && (
                  <div className="p-4 bg-[#0e162b] border border-[#00F0FF]/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-[#ff5500] font-bold">
                        {selectedTeam.teamCode}
                      </span>
                      <span className="px-2 py-0.5 bg-[#05D550] text-black font-pixel text-[9px] font-bold uppercase">
                        {selectedTeam.eligibility}
                      </span>
                    </div>
                    <h3 className="font-display text-lg text-[#f5e6ca] font-bold uppercase">
                      {selectedTeam.name}
                    </h3>
                    <p className="text-xs text-[#91A0AE]">{selectedTeam.institution} &bull; {selectedTeam.state}</p>
                    <div className="flex items-center gap-4 text-[10px] font-pixel text-[#18D8D0] pt-2 border-t border-[#1b253b]">
                      <span>CATEGORY: {selectedTeam.category}</span>
                      <span>MANAGER: {selectedTeam.managerName || "Assigned"}</span>
                    </div>
                  </div>
                )}

                {/* Confirm Draw Button */}
                <button
                  onClick={handleConfirmDraw}
                  disabled={!selectedTeam || actionLoading}
                  className="w-full py-3 bg-[#05D550] hover:bg-[#28e56b] disabled:opacity-50 text-black font-pixel text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONFIRM DRAW &bull; ASSIGN TEAM TO {currentPos.id}</span>
                </button>
              </div>
            ) : config.status === "DRAFT" ? (
              <div className="p-6 bg-[#050914] border border-[#1b253b] rounded-xl text-center space-y-3">
                <Clock className="w-8 h-8 text-[#ff5500] mx-auto animate-pulse" />
                <h3 className="font-display text-lg text-[#f5e6ca] uppercase">DRAW HAS NOT STARTED</h3>
                <p className="text-xs text-[#91A0AE] max-w-md mx-auto">
                  Configure the 4 pre-placed / fixed teams first, then click &ldquo;START DRAW&rdquo; to begin deterministic allocation.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowFixedModal(true)}
                    className="px-4 py-2 bg-[#A78BFA] text-black font-pixel text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:bg-[#c4b5fd]"
                  >
                    CONFIGURE FIXED TEAMS (4)
                  </button>
                  <button
                    onClick={handleProvisionTeams}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#1b253b] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 shadow-[2px_2px_0px_#000]"
                  >
                    PROVISION 100 TEAMS IN DB
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#050914] border border-[#05D550]/40 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-[#05D550] mx-auto" />
                <h3 className="font-display text-xl text-[#05D550] uppercase font-bold">ALL 100 TEAMS ASSIGNED</h3>
                <p className="text-xs text-[#91A0AE]">
                  Every pool has exactly 25 teams. Validate and lock the fixture before publication.
                </p>
              </div>
            )}
          </div>

          {/* Draw Cycle Indicator & Tools (5 Cols - Section 11 & 12) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Draw Sequence Visual Indicator (Section 11) */}
            <div className="bg-[#0b0f1d] border border-[#18D8D0]/30 p-5 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1b253b]">
                <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>CYCLIC DRAW SEQUENCE INDICATOR</span>
                </span>
                <span className="font-pixel text-[10px] text-[#91A0AE]">CYCLE-BASED</span>
              </div>

              <p className="text-[11px] text-[#91A0AE]">
                The draw sequence alternates strictly across all 4 pools by SIDE:
                <br />
                <span className="text-[#05D550] font-bold">A 1st &rarr; B 1st &rarr; C 1st &rarr; D 1st</span> &rarr;{" "}
                <span className="text-[#ff5500] font-bold">A Last &rarr; B Last &rarr; C Last &rarr; D Last</span> &rarr; repeat.
              </p>

              {/* Visual Cycle Matrix */}
              <div className="space-y-3 font-pixel text-xs">
                {/* FIRST Side Box */}
                <div className="p-3 bg-[#050914] border border-[#1b253b] rounded-lg">
                  <span className="text-[10px] text-[#18D8D0] block mb-2">1. ALL POOLS &bull; FIRST SIDE</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(["A", "B", "C", "D"] as const).map((p) => {
                      const isCurr = currentPos?.pool === p && currentPos?.side === "FIRST";
                      const isNext = nextPos?.pool === p && nextPos?.side === "FIRST";
                      const stat = poolStats[p];
                      return (
                        <div
                          key={p}
                          className={`p-2 rounded border ${
                            isCurr
                              ? "bg-[#ff5500] text-black font-bold animate-pulse"
                              : isNext
                              ? "bg-[#18D8D0]/20 border-[#18D8D0] text-[#00F0FF]"
                              : "bg-[#0c101c] border-[#1b253b] text-[#91A0AE]"
                          }`}
                        >
                          <div>[{p}]</div>
                          <div className="text-[9px] mt-0.5">{stat?.firstAssigned || 0}/13</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LAST Side Box */}
                <div className="p-3 bg-[#050914] border border-[#1b253b] rounded-lg">
                  <span className="text-[10px] text-[#ff5500] block mb-2">2. ALL POOLS &bull; LAST SIDE</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(["A", "B", "C", "D"] as const).map((p) => {
                      const isCurr = currentPos?.pool === p && currentPos?.side === "LAST";
                      const isNext = nextPos?.pool === p && nextPos?.side === "LAST";
                      const stat = poolStats[p];
                      return (
                        <div
                          key={p}
                          className={`p-2 rounded border ${
                            isCurr
                              ? "bg-[#ff5500] text-black font-bold animate-pulse"
                              : isNext
                              ? "bg-[#18D8D0]/20 border-[#18D8D0] text-[#00F0FF]"
                              : "bg-[#0c101c] border-[#1b253b] text-[#91A0AE]"
                          }`}
                        >
                          <div>[{p}]</div>
                          <div className="text-[9px] mt-0.5">{stat?.lastAssigned || 0}/12</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Administrative Quick Actions */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowFixedModal(true)}
                  className="flex-1 py-2 bg-[#1A2644] hover:bg-[#2A3B66] text-[#A78BFA] border border-[#A78BFA]/40 font-pixel text-[10px] uppercase shadow rounded"
                >
                  + Add Fixed Team
                </button>
                <button
                  onClick={() => setShowCorrectionModal(true)}
                  className="flex-1 py-2 bg-[#1A2644] hover:bg-[#2A3B66] text-[#FFB800] border border-[#FFB800]/40 font-pixel text-[10px] uppercase shadow rounded"
                >
                  Correction Workflow
                </button>
              </div>
            </div>

            {/* Four Pool Progress Panels (Section 12) */}
            <div className="grid grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as const).map((p) => {
                const stat = poolStats[p];
                return (
                  <div key={p} className="p-3 bg-[#0b0f1d] border border-[#1b253b] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs font-bold text-[#f5e6ca]">POOL {p}</span>
                      <span className="font-pixel text-[9px] px-1.5 py-0.2 bg-[#1A2644] text-[#00F0FF] rounded">
                        {stat?.status || "PENDING"}
                      </span>
                    </div>
                    <div className="text-[11px] font-pixel text-[#05D550]">
                      {stat?.assigned || 0} / 25 POSITIONS
                    </div>
                    <div className="w-full bg-[#050914] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#05D550] h-full"
                        style={{ width: `${((stat?.assigned || 0) / 25) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-pixel text-[#91A0AE] pt-1">
                      <span>1st: {stat?.firstAssigned || 0}/13</span>
                      <span>Last: {stat?.lastAssigned || 0}/12</span>
                      <span>Fixed: {stat?.fixed || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ 4. ALL 100 POSITIONS DIRECTORY TABLE (SECTION 25) ═══ */}
        <div className="bg-[#0b0f1d] border border-[#18D8D0]/30 p-6 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
            <div>
              <h2 className="font-display text-xl text-[#f5e6ca] font-bold uppercase">
                COMPLETE 100 FIXTURE POSITIONS DIRECTORY
              </h2>
              <p className="font-pixel text-[11px] text-[#91A0AE] mt-0.5">
                Every permanent fixture position with stable identifier, pool, side, assigned team &amp; match references.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={tableFilterPool}
                onChange={(e) => setTableFilterPool(e.target.value)}
                className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] p-2 rounded"
              >
                <option value="ALL">All Pools</option>
                <option value="A">Pool A</option>
                <option value="B">Pool B</option>
                <option value="C">Pool C</option>
                <option value="D">Pool D</option>
              </select>

              <select
                value={tableFilterSide}
                onChange={(e) => setTableFilterSide(e.target.value)}
                className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] p-2 rounded"
              >
                <option value="ALL">All Sides</option>
                <option value="FIRST">FIRST Side</option>
                <option value="LAST">LAST Side</option>
              </select>

              <select
                value={tableFilterStatus}
                onChange={(e) => setTableFilterStatus(e.target.value)}
                className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] p-2 rounded"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="FIXED">FIXED</option>
                <option value="ASSIGNED">ASSIGNED</option>
              </select>

              <input
                type="text"
                placeholder="Search position / team..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] px-3 py-2 rounded w-44"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#050914] border-b border-[#1b253b] font-pixel text-[10px] text-[#00F0FF]">
                <tr>
                  <th className="py-2.5 px-3">SEQ</th>
                  <th className="py-2.5 px-3">POSITION ID</th>
                  <th className="py-2.5 px-3">POOL</th>
                  <th className="py-2.5 px-3">SIDE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">ASSIGNED TEAM</th>
                  <th className="py-2.5 px-3">UNIVERSITY</th>
                  <th className="py-2.5 px-3">INITIAL MATCH</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b253b]/50">
                {filteredPositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-[#0e162b] transition-colors">
                    <td className="py-2 px-3 text-[#91A0AE]">{pos.globalSequence}</td>
                    <td className="py-2 px-3 font-pixel text-[#f5e6ca] font-bold">{pos.id}</td>
                    <td className="py-2 px-3 text-[#18D8D0]">Pool {pos.pool}</td>
                    <td className="py-2 px-3 text-[#91A0AE]">{pos.side}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 font-pixel text-[9px] rounded font-bold ${
                          pos.isFixed
                            ? "bg-[#A78BFA] text-black"
                            : pos.status === "ASSIGNED"
                            ? "bg-[#05D550] text-black"
                            : "bg-[#2A354E] text-[#91A0AE]"
                        }`}
                      >
                        {pos.isFixed ? "FIXED" : pos.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#f5e6ca] font-medium">{pos.teamName || "-"}</td>
                    <td className="py-2 px-3 text-[#91A0AE]">{pos.institution || "-"}</td>
                    <td className="py-2 px-3 text-[#00F0FF]">
                      {pos.firstMatchNumber ? `${pos.firstMatchNumber} (Slot ${pos.firstMatchSlot})` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {pos.status !== "AVAILABLE" && (
                        <button
                          onClick={() => {
                            setCorrectPositionId(pos.id);
                            setShowCorrectionModal(true);
                          }}
                          className="text-[10px] font-pixel text-[#FFB800] hover:underline"
                        >
                          CORRECT
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ 5. CHRONOLOGICAL DRAW HISTORY (SECTION 48) ═══ */}
        {history.length > 0 && (
          <div className="bg-[#0b0f1d] border border-[#1b253b] p-6 rounded-2xl shadow-lg space-y-4">
            <h2 className="font-display text-lg text-[#f5e6ca] font-bold uppercase">
              CHRONOLOGICAL DRAW AUDIT LOG
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 bg-[#050914] rounded border border-[#1b253b] text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-[#ff5500]">
                      #{String(h.drawNumber).padStart(2, "0")}
                    </span>
                    <span className="font-pixel text-[10px] text-[#00F0FF]">
                      POOL {h.pool} &bull; {h.side}
                    </span>
                    <span className="text-[#f5e6ca] font-bold">{h.positionId}</span>
                    <span className="text-[#91A0AE]">&rarr; {h.teamName} ({h.institution})</span>
                  </div>
                  <span className="text-[10px] text-[#91A0AE]">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ MODAL: CONFIGURE FIXED TEAMS (SECTION 26) ═══ */}
        {showFixedModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0b0f1d] border-2 border-[#A78BFA] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b253b]">
                <h3 className="font-display text-lg text-[#A78BFA] font-bold uppercase">
                  CONFIGURE PRE-PLACED / FIXED TEAM
                </h3>
                <button onClick={() => setShowFixedModal(false)} className="text-[#91A0AE] hover:text-white text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleAssignFixed} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">SELECT TEAM</label>
                  <select
                    value={fixedTeamId}
                    onChange={(e) => setFixedTeamId(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2.5 rounded text-[#f5e6ca]"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamCode} &bull; {t.name} ({t.institution})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">POOL</label>
                    <select
                      value={fixedPool}
                      onChange={(e) => setFixedPool(e.target.value as any)}
                      className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    >
                      <option value="A">Pool A</option>
                      <option value="B">Pool B</option>
                      <option value="C">Pool C</option>
                      <option value="D">Pool D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">EXACT POSITION</label>
                    <select
                      value={fixedPositionId}
                      onChange={(e) => setFixedPositionId(e.target.value)}
                      className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                      required
                    >
                      <option value="">-- Choose Position --</option>
                      {positions
                        .filter((p) => p.pool === fixedPool && (p.status === "AVAILABLE" || p.isFixed))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id} ({p.side})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">FIXED REASON / SEEDING</label>
                  <input
                    type="text"
                    value={fixedReason}
                    onChange={(e) => setFixedReason(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFixedModal(false)}
                    className="px-4 py-2 bg-[#1b253b] text-[#91A0AE] font-pixel text-xs rounded"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#A78BFA] text-black font-pixel text-xs font-bold rounded shadow-[2px_2px_0px_#000]"
                  >
                    ASSIGN FIXED TEAM
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ MODAL: CORRECTION WORKFLOW (SECTION 29) ═══ */}
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0b0f1d] border-2 border-[#FFB800] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b253b]">
                <h3 className="font-display text-lg text-[#FFB800] font-bold uppercase">
                  AUTHORIZE FIXTURE CORRECTION
                </h3>
                <button onClick={() => setShowCorrectionModal(false)} className="text-[#91A0AE] hover:text-white text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCorrectAssignment} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">TARGET POSITION ID</label>
                  <input
                    type="text"
                    value={correctPositionId}
                    onChange={(e) => setCorrectPositionId(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    placeholder="e.g. POOL-A-FIRST-01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">NEW REPLACEMENT TEAM</label>
                  <select
                    value={correctNewTeamId}
                    onChange={(e) => setCorrectNewTeamId(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2.5 rounded text-[#f5e6ca]"
                    required
                  >
                    <option value="">-- Choose New Team --</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamCode} &bull; {t.name} ({t.institution})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">MANDATORY AUDIT REASON</label>
                  <textarea
                    value={correctReason}
                    onChange={(e) => setCorrectReason(e.target.value)}
                    rows={3}
                    placeholder="Provide specific administrative reason for correcting this slot..."
                    className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 py-2 bg-[#1b253b] text-[#91A0AE] font-pixel text-xs rounded"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#FFB800] text-black font-pixel text-xs font-bold rounded shadow-[2px_2px_0px_#000]"
                  >
                    SAVE CORRECTION &bull; LOG AUDIT
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </TournamentAdminShell>
  );
}
