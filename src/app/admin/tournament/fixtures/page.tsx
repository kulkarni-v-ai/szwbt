"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Search,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Users,
} from "lucide-react";
import { OfficialPoolBracket } from "@/components/tournament/OfficialPoolBracket";

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

  // Active pool selection for bracket
  const [activePool, setActivePool] = useState<"A" | "B" | "C" | "D">("A");

  // View Mode: Visual Tree Bracket (default) or Directory Table
  const [activeViewMode, setActiveViewMode] = useState<"BRACKET" | "TABLE">("BRACKET");
  const [adminTableTab, setAdminTableTab] = useState<"MATCHES" | "POSITIONS">("MATCHES");
  const [tableFilterPool, setTableFilterPool] = useState("ALL");
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

  useEffect(() => {
    fetchFixtures();
  }, []);

  // Compute Pool Statistics & Bracket Slots
  const bracketSlots: any[] = fixturesData?.bracketSlots || [];
  const positions: any[] = fixturesData?.positions || [];
  const matches: any[] = fixturesData?.matches || [];
  const config = fixturesData?.config || {};
  const validation = fixturesData?.validation || null;

  const poolCounts = useMemo(() => {
    return {
      A: bracketSlots.filter((s: any) => s.pool === "A" && s.teamId).length,
      B: bracketSlots.filter((s: any) => s.pool === "B" && s.teamId).length,
      C: bracketSlots.filter((s: any) => s.pool === "C" && s.teamId).length,
      D: bracketSlots.filter((s: any) => s.pool === "D" && s.teamId).length,
    };
  }, [bracketSlots]);

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

        {/* ═══ VIEW MODE TOGGLE (TREE BRACKET vs DIRECTORY TABLE) ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0b0f1d] border border-[#18D8D0]/30 p-4 rounded-2xl shadow-lg">
          <div>
            <span className="font-pixel text-[11px] text-[#00F0FF] uppercase tracking-wider block">
              TOURNAMENT FIXTURES &amp; DRAW ARENA
            </span>
            <h2 className="font-display text-xl text-[#f5e6ca] font-bold uppercase">
              {activeViewMode === "BRACKET"
                ? "OFFICIAL POOL-WISE KNOCKOUT TREE BRACKET"
                : "MATCH & POSITION DIRECTORY TABLE"}
            </h2>
          </div>

          <div className="flex items-center bg-[#050914] border border-[#1b253b] rounded-lg p-1">
            <button
              onClick={() => setActiveViewMode("BRACKET")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors flex items-center gap-1.5 ${
                activeViewMode === "BRACKET" ? "bg-[#00F0FF] text-black shadow font-black" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Visual Tree Bracket</span>
            </button>
            <button
              onClick={() => setActiveViewMode("TABLE")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors flex items-center gap-1.5 ${
                activeViewMode === "TABLE" ? "bg-[#00F0FF] text-black shadow font-black" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Directory Table</span>
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
                                setActiveViewMode("BRACKET");
                              }}
                              className="text-[10px] font-pixel text-[#00F0FF] hover:underline inline-flex items-center gap-1"
                            >
                              <span>View in Bracket</span>
                              <ArrowRight className="w-3 h-3" />
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
      </div>
    </TournamentAdminShell>
  );
}
