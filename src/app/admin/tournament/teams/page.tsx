"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import {
  Users,
  Search,
  Trophy,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Shield,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
  RefreshCw,
} from "lucide-react";

interface TeamItem {
  id: string;
  teamCode: string;
  teamNumber: number | null;
  name: string;
  institution: string;
  state: string;
  status: string;
  managerName?: string | null;
  managerPhone?: string | null;
  captainName?: string | null;
  captainPhone?: string | null;
  isAssigned: boolean;
  assignedPositionId?: string | null;
  assignedPool?: "A" | "B" | "C" | "D" | null;
  assignedSlot?: number | null;
  isFixed?: boolean;
}

export default function TournamentAllTeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [poolFilter, setPoolFilter] = useState<"ALL" | "A" | "B" | "C" | "D">("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15; // Strictly 15 teams per page as requested: "15 team in page next 15 likewise ..."

  // Load official teams from fixtures teams API
  async function loadTeams() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/fixtures/teams");
      if (res.ok) {
        const json = await res.json();
        const rawTeams: TeamItem[] = json.teams || [];
        // Sort stably by teamNumber (1 to 102)
        rawTeams.sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0));
        setTeams(rawTeams);
      }
    } catch (err) {
      console.error("Failed to load tournament teams:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, poolFilter, stateFilter]);

  // Derived states list
  const stateOptions = useMemo(() => {
    const states = new Set<string>();
    teams.forEach((t) => {
      if (t.state && t.state.trim()) {
        states.add(t.state.trim());
      }
    });
    return Array.from(states).sort();
  }, [teams]);

  // Pool counts
  const poolCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, TOTAL: teams.length };
    teams.forEach((t) => {
      if (t.assignedPool && counts[t.assignedPool] !== undefined) {
        counts[t.assignedPool]++;
      }
    });
    return counts;
  }, [teams]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      // Pool filter
      if (poolFilter !== "ALL" && t.assignedPool !== poolFilter) {
        return false;
      }
      // State filter
      if (stateFilter !== "ALL" && t.state !== stateFilter) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const numStr = t.teamNumber ? String(t.teamNumber) : "";
        const codeMatch = t.teamCode?.toLowerCase().includes(q);
        const nameMatch = t.name?.toLowerCase().includes(q);
        const instMatch = t.institution?.toLowerCase().includes(q);
        const stateMatch = t.state?.toLowerCase().includes(q);
        const numMatch = numStr === q || numStr.includes(q);
        return codeMatch || nameMatch || instMatch || stateMatch || numMatch;
      }
      return true;
    });
  }, [teams, poolFilter, stateFilter, search]);

  // Pagination calculation
  const totalItems = filteredTeams.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedTeams = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredTeams.slice(startIndex, startIndex + pageSize);
  }, [filteredTeams, safePage, pageSize]);

  const startIndexDisplay = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndexDisplay = Math.min(safePage * pageSize, totalItems);

  // Helper to determine seed / bye badge
  const getSlotBadge = (team: TeamItem) => {
    if (!team.assignedPool || !team.assignedSlot) return null;
    const pool = team.assignedPool;
    const slot = team.assignedSlot;

    // Seeds
    if (pool === "A" && slot === 1) return { label: "SEED #1 (POOL FINAL)", color: "bg-[#FFB800] text-black" };
    if (pool === "B" && slot === 25) return { label: "SEED #2 (POOL FINAL)", color: "bg-[#FFB800] text-black" };
    if (pool === "C" && slot === 1) return { label: "SEED #3 (POOL FINAL)", color: "bg-[#FFB800] text-black" };
    if (pool === "D" && slot === 25) return { label: "SEED #4 (POOL FINAL)", color: "bg-[#FFB800] text-black" };

    // Byes
    const acByes = [2, 9, 14, 15, 20, 21, 26];
    const bdByes = [1, 6, 7, 12, 13, 18, 19, 24];
    const isBye = (pool === "A" || pool === "C") ? acByes.includes(slot) : bdByes.includes(slot);
    if (isBye) return { label: "R1 BYE → R2", color: "bg-[#18D8D0]/20 text-[#00F0FF] border border-[#00F0FF]/40" };

    return { label: "ROUND 1 MATCH", color: "bg-[#0e162b] text-slate-300 border border-slate-700/50" };
  };

  return (
    <TournamentAdminShell activeTab="teams">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ═══ 1. COMMAND HEADER & QUICK STATS ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ff5500]/30 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40 text-xs font-bold font-pixel tracking-wider uppercase rounded">
                OFFICIAL ENTRY DIRECTORY
              </span>
              <span className="text-xs text-cyan-400 font-pixel">
                SOUTH ZONE 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f5e6ca] uppercase tracking-wide font-display">
              ALL PARTICIPATING UNIVERSITIES &amp; TEAMS
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Complete official registry of all 102 participating universities, mapped across Pools A, B, C &amp; D.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadTeams}
              disabled={loading}
              className="px-3.5 py-2 bg-[#121829] hover:bg-[#1C2742] text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-pixel uppercase font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>REFRESH</span>
            </button>
            <Link
              href="/admin/tournament/fixtures"
              className="px-4 py-2 bg-gradient-to-r from-[#ff5500] to-[#FF8C00] hover:from-[#ff6a1a] hover:to-[#ffa033] text-black font-pixel text-xs font-black uppercase rounded-lg shadow-[0_0_15px_rgba(255,85,0,0.4)] transition-all flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>VIEW BRACKETS</span>
            </Link>
          </div>
        </div>

        {/* ═══ 2. POOL METRICS HUD ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-[#050914] border border-[#1b253b] rounded-xl">
            <span className="text-[11px] font-pixel text-zinc-400 uppercase tracking-wider block mb-1">
              TOTAL TEAMS
            </span>
            <div className="text-2xl font-black font-pixel text-[#00F0FF]">
              {poolCounts.TOTAL}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              100% Seeded in Draw
            </div>
          </div>

          <div
            onClick={() => setPoolFilter("A")}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              poolFilter === "A"
                ? "bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                : "bg-[#050914] border-[#1b253b] hover:border-[#00F0FF]/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-pixel text-[#00F0FF] font-bold uppercase tracking-wider">
                POOL A
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#00F0FF]/20 text-[#00F0FF] rounded font-mono font-bold">
                SLOTS 1–26
              </span>
            </div>
            <div className="text-2xl font-black font-pixel text-[#f5e6ca] mt-1">
              {poolCounts.A} <span className="text-xs text-zinc-400 font-normal">/ 26</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Seed #1 &bull; 9 R1 Matches
            </div>
          </div>

          <div
            onClick={() => setPoolFilter("B")}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              poolFilter === "B"
                ? "bg-purple-950/30 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                : "bg-[#050914] border-[#1b253b] hover:border-purple-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-pixel text-purple-400 font-bold uppercase tracking-wider">
                POOL B
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono font-bold">
                SLOTS 27–51
              </span>
            </div>
            <div className="text-2xl font-black font-pixel text-[#f5e6ca] mt-1">
              {poolCounts.B} <span className="text-xs text-zinc-400 font-normal">/ 25</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Seed #2 &bull; 8 R1 Matches
            </div>
          </div>

          <div
            onClick={() => setPoolFilter("C")}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              poolFilter === "C"
                ? "bg-amber-950/30 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                : "bg-[#050914] border-[#1b253b] hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-pixel text-amber-400 font-bold uppercase tracking-wider">
                POOL C
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">
                SLOTS 52–77
              </span>
            </div>
            <div className="text-2xl font-black font-pixel text-[#f5e6ca] mt-1">
              {poolCounts.C} <span className="text-xs text-zinc-400 font-normal">/ 26</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Seed #3 &bull; 9 R1 Matches
            </div>
          </div>

          <div
            onClick={() => setPoolFilter("D")}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              poolFilter === "D"
                ? "bg-emerald-950/30 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "bg-[#050914] border-[#1b253b] hover:border-emerald-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-pixel text-emerald-400 font-bold uppercase tracking-wider">
                POOL D
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                SLOTS 78–102
              </span>
            </div>
            <div className="text-2xl font-black font-pixel text-[#f5e6ca] mt-1">
              {poolCounts.D} <span className="text-xs text-zinc-400 font-normal">/ 25</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Seed #4 &bull; 8 R1 Matches
            </div>
          </div>
        </div>

        {/* ═══ 3. FILTER, SEARCH & PAGINATION TOOLBAR ═══ */}
        <div className="bg-[#050914] p-3.5 rounded-2xl border border-[#1b253b] flex flex-wrap items-center justify-between gap-3">
          {/* Left: Pool Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["ALL", "A", "B", "C", "D"] as const).map((p) => {
              const count = p === "ALL" ? poolCounts.TOTAL : poolCounts[p];
              const isActive = poolFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPoolFilter(p)}
                  className={`px-3.5 py-1.5 font-pixel text-xs sm:text-[13px] uppercase font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#00F0FF] text-black font-black shadow"
                      : "text-zinc-400 hover:text-white bg-[#0e162b] border border-[#1b253b]"
                  }`}
                >
                  <span>{p === "ALL" ? "ALL POOLS" : `POOL ${p}`}</span>
                  <span className={`text-[11px] font-mono font-bold ${isActive ? "text-black" : "text-[#00F0FF]"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: State Filter + Search Box */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* State Dropdown */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="bg-[#0b0f1d] border border-[#1b253b] text-xs sm:text-sm text-[#f5e6ca] px-3 py-2 rounded-lg focus:outline-none focus:border-[#00F0FF] font-medium"
            >
              <option value="ALL">All States ({stateOptions.length})</option>
              {stateOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search team #, university, state..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0b0f1d] border border-[#1b253b] text-xs sm:text-sm text-[#f5e6ca] pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-[#00F0FF] font-medium"
              />
            </div>
          </div>
        </div>

        {/* ═══ 4. TOP PAGINATION & RANGE SUMMARY ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-zinc-400 font-mono">
          <div>
            Showing <strong className="text-[#f5e6ca] font-bold">{startIndexDisplay}–{endIndexDisplay}</strong> of{" "}
            <strong className="text-[#00F0FF] font-bold">{totalItems}</strong> teams
            {poolFilter !== "ALL" && (
              <span className="ml-1 text-zinc-400">in Pool {poolFilter}</span>
            )}
            {" "}&bull; <span className="text-zinc-400 font-bold">15 teams per page</span>
          </div>

          {/* Page Pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="p-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-zinc-400 hover:text-white disabled:opacity-25"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-2.5 py-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-xs font-pixel font-bold text-zinc-300 hover:text-white disabled:opacity-25 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>PREV</span>
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              const isCurrent = pNum === safePage;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 rounded font-pixel text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-[#00F0FF] text-black font-black shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                      : "bg-[#0b0f1d] border border-[#1b253b] text-zinc-400 hover:text-white"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-xs font-pixel font-bold text-zinc-300 hover:text-white disabled:opacity-25 flex items-center gap-1"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-zinc-400 hover:text-white disabled:opacity-25"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ 5. 15 TEAMS PER PAGE TABLE ═══ */}
        <div className="bg-[#050914] border border-[#1b253b] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1b253b] bg-[#080E1F]/90 text-[11px] font-pixel uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 font-bold"># DRAW NO</th>
                  <th className="py-3.5 px-4 font-bold">TEAM CODE</th>
                  <th className="py-3.5 px-4 font-bold">UNIVERSITY / INSTITUTION NAME</th>
                  <th className="py-3.5 px-4 font-bold">STATE</th>
                  <th className="py-3.5 px-4 font-bold">ASSIGNED POOL &amp; SLOT</th>
                  <th className="py-3.5 px-4 font-bold">BRACKET ROLE</th>
                  <th className="py-3.5 px-4 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131b2e] text-xs sm:text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 font-pixel">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00F0FF]" />
                      LOADING OFFICIAL PARTICIPATING TEAMS...
                    </td>
                  </tr>
                ) : paginatedTeams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 font-pixel">
                      NO UNIVERSITIES MATCH YOUR FILTER CRITERIA.
                    </td>
                  </tr>
                ) : (
                  paginatedTeams.map((team) => {
                    const badge = getSlotBadge(team);
                    const isAssigned = !!team.assignedPool && !!team.assignedSlot;

                    return (
                      <tr
                        key={team.id}
                        className={`transition-colors group ${
                          isAssigned
                            ? "hover:bg-[#061814]/70 border-l-4 border-l-[#05D550]"
                            : "hover:bg-[#0c1429]"
                        }`}
                      >
                        {/* 1. Team / Draw Number */}
                        <td className="py-3 px-4 whitespace-nowrap font-pixel font-bold">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#101935] text-[#00F0FF] border border-[#00F0FF]/40 text-xs sm:text-[13px] font-black">
                            #{String(team.teamNumber || "-").padStart(3, "0")}
                          </span>
                        </td>

                        {/* 2. Team Code */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-300 text-xs">
                          {team.teamCode}
                        </td>

                        {/* 3. University Name */}
                        <td className="py-3 px-4">
                          <div className="font-display font-bold text-[#f5e6ca] text-sm uppercase group-hover:text-[#00F0FF] transition-colors line-clamp-1">
                            {team.name}
                          </div>
                          {team.managerName && (
                            <div className="text-[11px] font-mono text-zinc-400 mt-0.5 truncate">
                              Contact: {team.managerName} {team.managerPhone ? `(${team.managerPhone})` : ""}
                            </div>
                          )}
                        </td>

                        {/* 4. State */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0c1426] border border-slate-700/60 text-slate-300 text-[11px] font-medium">
                            <MapPin className="w-3 h-3 text-[#18D8D0]" />
                            {team.state || "South Zone"}
                          </span>
                        </td>

                        {/* 5. Assigned Pool & Slot (Vivid Green when assigned a place) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isAssigned ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#05D550]/15 border border-[#05D550]/70 shadow-[0_0_12px_rgba(5,213,80,0.25)]">
                              <span className="w-2 h-2 rounded-full bg-[#05D550] shadow-[0_0_8px_#05D550] shrink-0 animate-pulse" />
                              <span className="font-pixel text-xs font-black text-[#05D550] tracking-wide uppercase">
                                POOL {team.assignedPool} &bull; SLOT #{String(team.assignedSlot).padStart(2, "0")}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-zinc-500 font-pixel text-[11px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>

                        {/* 6. Bracket Role Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {badge ? (
                            <span className={`px-2 py-0.5 rounded font-pixel text-[10px] sm:text-[11px] font-bold ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px] font-pixel">
                              PARTICIPANT
                            </span>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/tournament/fixtures?pool=${team.assignedPool || "A"}`}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded font-pixel text-xs font-bold uppercase transition-all ${
                              isAssigned
                                ? "bg-[#05D550]/15 hover:bg-[#05D550]/30 text-[#05D550] border border-[#05D550]/60 shadow-[0_0_8px_rgba(5,213,80,0.2)]"
                                : "bg-[#121829] hover:bg-[#1C2742] text-[#00F0FF] border border-[#00F0FF]/40"
                            }`}
                            title="View this team in the official pool bracket"
                          >
                            <span>VIEW</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ 6. BOTTOM PAGINATION CONTROLS ═══ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-zinc-400 font-mono">
          <div>
            Showing <strong className="text-[#f5e6ca]">{startIndexDisplay}–{endIndexDisplay}</strong> of{" "}
            <strong className="text-[#00F0FF]">{totalItems}</strong> official entries (Page {safePage} of {totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="px-2.5 py-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-zinc-400 hover:text-white disabled:opacity-25 font-pixel text-xs font-bold"
            >
              FIRST
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-zinc-300 hover:text-white disabled:opacity-25 font-pixel text-xs font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>PREVIOUS</span>
            </button>

            <span className="px-3 py-1.5 rounded bg-[#00F0FF] text-black font-pixel text-xs font-black">
              {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-zinc-300 hover:text-white disabled:opacity-25 font-pixel text-xs font-bold flex items-center gap-1"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1.5 rounded border border-[#1b253b] bg-[#0b0f1d] text-zinc-400 hover:text-white disabled:opacity-25 font-pixel text-xs font-bold"
            >
              LAST
            </button>
          </div>
        </div>
      </div>
    </TournamentAdminShell>
  );
}
