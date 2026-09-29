"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { OfficialPoolBracket } from "@/components/tournament/OfficialPoolBracket";
import {
  Trophy,
  Search,
  Layers,
  Radio,
  Clock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  ChevronRight,
  Table,
  LayoutGrid,
  Users,
  X,
  MapPin,
} from "lucide-react";

export default function PublicFixturesPage() {
  const [activePool, setActivePool] = useState<string>("A");
  const [activeRound, setActiveRound] = useState<string>("ALL");
  const [activeStatus, setActiveStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"TABLE" | "BRACKET" | "LIST">("TABLE");
  const [tableSubTab, setTableSubTab] = useState<"MATCHES" | "ROSTER">("MATCHES");
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const [fixturesData, setFixturesData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const retryCountRef = React.useRef(0);

  const fetchFixtures = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
        retryCountRef.current = 0;
      }
      setFetchError(null);
      const res = await fetch("/api/tournament/fixtures");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setFixturesData(data.data);
        setLastUpdated(new Date());
        retryCountRef.current = 0;
      }
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
      if (isNetworkError && retryCountRef.current < 5) {
        retryCountRef.current += 1;
        const delay = retryCountRef.current * 2000;
        setTimeout(() => fetchFixtures(false), delay);
      } else {
        setFetchError(isNetworkError ? "Cannot reach the server. Is the dev server running?" : err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFixtures();
    const interval = setInterval(() => fetchFixtures(false), 15000);
    return () => clearInterval(interval);
  }, [fetchFixtures]);

  const allMatches: any[] = fixturesData?.matches || [];
  const poolStats = fixturesData?.poolStats || {};

  const filteredMatches = allMatches.filter((m) => {
    if (activePool !== "ALL") {
      if (activePool === "CHAMPIONSHIP") {
        if (m.pool !== "CHAMPIONSHIP") return false;
      } else {
        if (m.pool !== activePool) return false;
      }
    }
    if (activeRound !== "ALL" && m.roundStage !== activeRound) return false;
    if (activeStatus !== "ALL" && m.status !== activeStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = m.publicMatchNumber?.toLowerCase() || "";
      const pA = m.playerA?.toLowerCase() || "";
      const pB = m.playerB?.toLowerCase() || "";
      const instA = m.institutionA?.toLowerCase() || "";
      const instB = m.institutionB?.toLowerCase() || "";
      if (!matchNum.includes(q) && !pA.includes(q) && !pB.includes(q) && !instA.includes(q) && !instB.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const liveMatches = allMatches.filter((m) => m.status === "LIVE" || m.status === "PAUSED");
  const completedMatches = allMatches.filter((m) => m.status === "COMPLETED");
  const upcomingMatches = allMatches.filter((m) => m.status === "UPCOMING" || m.status === "READY");

  const bracketSlots: any[] = fixturesData?.bracketSlots || [];
  const rosterSlots = bracketSlots
    .filter(
      (s: any) =>
        (activePool === "ALL" || activePool === "CHAMPIONSHIP" ? true : s.pool === activePool) &&
        s.teamId &&
        s.slot <= ((s.pool === "A" || s.pool === "C") ? 26 : 25)
    )
    .sort((a: any, b: any) => a.pool.localeCompare(b.pool) || a.slot - b.slot);

  function isTBD(val: string | null | undefined) {
    return !val || val.startsWith("TBD") || val.includes("POOL-");
  }

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-20 z-10">

        {/* HERO HEADER */}
        <div className="relative border-2 border-[#00F0FF]/40 bg-[#080E22]/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.85)] mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 via-transparent to-[#FF5A16]/5 pointer-events-none" />
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-[#FF5A16] text-black font-pixel text-xs font-bold tracking-wider uppercase shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>OFFICIAL TOURNAMENT BRACKET</span>
                </span>
                <span className="font-pixel text-[11px] text-[#18D8D0] uppercase tracking-wider hidden sm:block">
                  4 POOLS &bull; 100 TEAMS &bull; 100 MATCHES
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-5xl text-[#F4E6CE] font-black uppercase tracking-tight leading-none">
                CHAMPIONSHIP <span className="text-[#FF5A16]">FIXTURES</span>
              </h1>
              <p className="font-pixel text-xs text-[#18D8D0] mt-2 uppercase tracking-wider">
                SOUTH ZONE INTER-UNIVERSITY WOMEN&apos;S BADMINTON TOURNAMENT 2026
              </p>
              <p className="text-xs sm:text-sm text-[#91A0AE] mt-2 leading-relaxed max-w-xl">
                Live fixture graph for all 100 championship matches across 4 pools. Results update every 15 seconds.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {liveMatches.length > 0 && (
                  <span className="px-3 py-1.5 bg-[#FF2A6D] text-white font-pixel text-xs font-bold flex items-center gap-1.5 animate-pulse rounded-lg">
                    <Radio className="w-3.5 h-3.5" />
                    {liveMatches.length} LIVE NOW
                  </span>
                )}
                <button
                  onClick={() => fetchFixtures(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2644] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 transition-colors rounded-lg"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>REFRESH</span>
                </button>
              </div>
              {lastUpdated && (
                <span className="font-pixel text-[9px] text-[#91A0AE]">
                  UPDATED: {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}

            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-4 border-t border-[#1A2644]">
            {[
              { label: "TOTAL MATCHES", value: allMatches.length, color: "#00F0FF" },
              { label: "LIVE NOW", value: liveMatches.length, color: "#FF2A6D" },
              { label: "COMPLETED", value: completedMatches.length, color: "#05D550" },
              { label: "UPCOMING", value: upcomingMatches.length, color: "#FFB800" },
              { label: "TEAMS DRAWN", value: fixturesData?.totalAssigned || 0, color: "#FF5A16" },
              { label: "POOLS", value: "4", color: "#18D8D0" },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-[#050914]/80 rounded-xl p-2.5 border border-[#1A2644]">
                <div className="font-display text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="font-pixel text-[8px] text-[#91A0AE] uppercase mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* POOL PROGRESS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["A", "B", "C", "D"] as const).map((p) => {
            const stat = poolStats[p];
            const assigned = stat?.assigned || 0;
            const isFull = assigned >= 25;
            return (
              <button
                key={p}
                onClick={() => setActivePool(p)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  activePool === p
                    ? "bg-[#FF5A16]/15 border-[#FF5A16] shadow-[0_0_15px_rgba(255,90,22,0.25)]"
                    : "bg-[#050914] border-[#18D8D0]/20 hover:border-[#18D8D0]/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-pixel text-xs font-bold text-[#F4E6CE]">POOL {p}</span>
                  <span className={`font-pixel text-[10px] font-bold ${isFull ? "text-[#05D550]" : "text-[#18D8D0]"}`}>
                    {assigned}/25 {isFull ? "• FULL" : "TEAMS"}
                  </span>
                </div>
                <div className="w-full bg-[#1A2644] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isFull ? "bg-[#05D550]" : "bg-gradient-to-r from-[#00F0FF] to-[#FF5A16]"}`}
                    style={{ width: `${Math.min(100, (assigned / 25) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-pixel text-[9px] text-[#91A0AE]">{Math.max(0, 25 - assigned)} slots left</span>
                  <span className="font-pixel text-[9px] text-[#FFB800]">MAX: 25</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* LIVE BANNER */}
        {liveMatches.length > 0 && (
          <div className="bg-[#FF2A6D]/10 border-2 border-[#FF2A6D] rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#FF2A6D] animate-pulse" />
                <span className="font-pixel text-xs text-[#FF2A6D] font-bold uppercase tracking-wider">
                  {liveMatches.length} MATCH{liveMatches.length > 1 ? "ES" : ""} IN PROGRESS
                </span>
              </div>
              <span className="font-pixel text-[9px] text-[#91A0AE]">AUTO-UPDATES EVERY 15s</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {liveMatches.slice(0, 6).map((m: any) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between gap-2 bg-[#FF2A6D]/10 border border-[#FF2A6D]/40 hover:border-[#FF2A6D] rounded-xl p-2.5 group transition-all"
                >
                  <div className="min-w-0">
                    <div className="font-pixel text-[10px] text-[#FF2A6D] font-bold">{m.publicMatchNumber} &bull; POOL {m.pool}</div>
                    <div className="text-xs text-white font-semibold truncate">{isTBD(m.playerA) ? "TBD" : m.playerA}</div>
                    <div className="font-pixel text-[8px] text-[#91A0AE]">VS {isTBD(m.playerB) ? "TBD" : m.playerB}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {m.scoreA != null || m.scoreB != null ? (
                      <div className="font-mono text-sm font-black text-[#00FF88]">{m.scoreA ?? "0"} &ndash; {m.scoreB ?? "0"}</div>
                    ) : (
                      <div className="font-pixel text-[9px] text-[#FF2A6D]">LIVE</div>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-[#FF5A16] ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CONTROLS TOOLBAR */}
        <div className="bg-[#0A1024]/90 border border-[#18D8D0]/30 p-4 rounded-2xl shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "A", label: "POOL A" },
              { id: "B", label: "POOL B" },
              { id: "C", label: "POOL C" },
              { id: "D", label: "POOL D" },
              { id: "CHAMPIONSHIP", label: "FINALS" },
              { id: "ALL", label: "ALL" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePool(tab.id)}
                className={`px-3 py-1.5 font-pixel text-xs uppercase tracking-wider transition-all rounded shadow-[2px_2px_0px_#000] ${
                  activePool === tab.id
                    ? "bg-[#FF5A16] text-black font-bold"
                    : "bg-[#050914] text-[#91A0AE] hover:text-[#F4E6CE] border border-[#1A2644]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">ROUND:</span>
              {[
                { id: "ALL", label: "All" },
                { id: "ROUND_1", label: "R1" },
                { id: "ROUND_2", label: "R2" },
                { id: "QUARTER_FINAL", label: "QF" },
                { id: "SEMI_FINAL", label: "SF" },
                { id: "GRAND_FINAL", label: "GF" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRound(r.id)}
                  className={`px-2.5 py-1 font-pixel text-[9px] uppercase rounded transition-all ${
                    activeRound === r.id
                      ? "bg-[#18D8D0] text-black font-bold"
                      : "bg-[#050914] text-[#91A0AE] border border-[#1A2644] hover:text-[#F4E6CE]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">STATUS:</span>
              {[
                { id: "ALL", label: "All", active: "bg-[#1A2644] text-white" },
                { id: "LIVE", label: "Live", active: "bg-[#FF2A6D] text-white" },
                { id: "UPCOMING", label: "Upcoming", active: "bg-[#FFB800] text-black" },
                { id: "COMPLETED", label: "Done", active: "bg-[#05D550] text-black" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStatus(s.id)}
                  className={`px-2.5 py-1 font-pixel text-[9px] uppercase rounded transition-all font-bold ${
                    activeStatus === s.id
                      ? s.active
                      : "bg-[#050914] text-[#91A0AE] border border-[#1A2644] hover:text-[#F4E6CE] font-normal"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="w-4 h-4 text-[#91A0AE] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team, match, university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050914] border border-[#1A2644] text-xs text-[#F4E6CE] pl-9 pr-8 py-2 rounded-lg focus:outline-none focus:border-[#FF5A16] transition-all"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="text-[#91A0AE] hover:text-[#F4E6CE] absolute right-2.5 top-2.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#050914] border border-[#1A2644] rounded p-0.5">
              {([
                { mode: "TABLE" as const, icon: <Table className="w-3.5 h-3.5" />, label: "Table" },
                { mode: "BRACKET" as const, icon: <Layers className="w-3.5 h-3.5" />, label: "Bracket" },
                { mode: "LIST" as const, icon: <LayoutGrid className="w-3.5 h-3.5" />, label: "Cards" },
              ]).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 font-pixel text-[10px] uppercase rounded transition-all flex items-center gap-1.5 ${
                    viewMode === mode ? "bg-[#FF5A16] text-black font-bold" : "text-[#91A0AE] hover:text-[#F4E6CE]"
                  }`}
                >
                  {icon}<span>{label}</span>
                </button>
              ))}
            </div>
            {viewMode === "BRACKET" && (
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))} className="p-1.5 bg-[#050914] border border-[#1A2644] rounded text-[#91A0AE] hover:text-[#F4E6CE]"><ZoomOut className="w-3.5 h-3.5" /></button>
                <span className="font-pixel text-[10px] text-[#91A0AE] w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))} className="p-1.5 bg-[#050914] border border-[#1A2644] rounded text-[#91A0AE] hover:text-[#F4E6CE]"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={() => setZoomLevel(1)} className="px-2 py-1 bg-[#050914] border border-[#1A2644] rounded text-[10px] font-pixel text-[#91A0AE] hover:text-[#F4E6CE]">FIT</button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        {loading ? (
          <div className="border border-[#1A2644] bg-[#0A1024]/60 p-16 rounded-2xl flex flex-col items-center justify-center font-pixel text-center">
            <RefreshCw className="w-8 h-8 text-[#FF5A16] animate-spin mb-3" />
            <p className="text-xs text-[#00F0FF] uppercase tracking-wider">LOADING CHAMPIONSHIP FIXTURES...</p>
          </div>

        ) : viewMode === "TABLE" ? (
          <div className="space-y-5">
            {/* Sub-tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#080E22] border border-[#00F0FF]/30 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTableSubTab("MATCHES")}
                  className={`px-4 py-2 font-pixel text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
                    tableSubTab === "MATCHES"
                      ? "bg-[#00F0FF] text-black font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      : "bg-[#050914] text-[#91A0AE] hover:text-white border border-[#1A2644]"
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span>MATCH FIXTURES ({filteredMatches.length})</span>
                </button>
                <button
                  onClick={() => setTableSubTab("ROSTER")}
                  className={`px-4 py-2 font-pixel text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${
                    tableSubTab === "ROSTER"
                      ? "bg-[#00F0FF] text-black font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      : "bg-[#050914] text-[#91A0AE] hover:text-white border border-[#1A2644]"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>TEAM ROSTER ({rosterSlots.length} TEAMS)</span>
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs font-pixel">
                <span className="text-[#05D550] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#05D550] animate-pulse" />
                  <span>LIVE DB FEED</span>
                </span>
                <span className="text-[#91A0AE]">4 POOLS &bull; 25 TEAMS EACH &bull; 100 TOTAL</span>
              </div>
            </div>

            {tableSubTab === "MATCHES" ? (
              <div className="bg-[#07101D]/95 border-2 border-[#00F0FF]/40 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#050914]/80">
                  <div className="flex items-center gap-2.5">
                    <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider font-bold">
                      {activePool === "ALL" ? "ALL CHAMPIONSHIP MATCHES" : activePool === "CHAMPIONSHIP" ? "PODIUM FINALS" : `POOL ${activePool} FIXTURES`}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#FF5A16] text-black font-pixel text-[10px] font-bold rounded">
                      {filteredMatches.length} MATCHES
                    </span>
                  </div>
                  <span className="font-pixel text-xs text-[#91A0AE]">KLE TECH ARENA &bull; 8 COURTS</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-[#1b253b] bg-[#050914] font-pixel text-[10px] text-[#00F0FF] uppercase tracking-wider">
                        <th className="py-3 px-3">MATCH #</th>
                        <th className="py-3 px-3">POOL &amp; ROUND</th>
                        <th className="py-3 px-3">DATE &amp; TIME</th>
                        <th className="py-3 px-3">COURT</th>
                        <th className="py-3 px-3">TEAM 1 (SLOT A)</th>
                        <th className="py-3 px-3 text-center">VS / SCORE</th>
                        <th className="py-3 px-3">TEAM 2 (SLOT B)</th>
                        <th className="py-3 px-3 text-center">STATUS</th>
                        <th className="py-3 px-3 text-right">HUD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b253b]/60 text-xs">
                      {filteredMatches.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 font-pixel text-xs">
                            NO MATCHES FOUND MATCHING SELECTED FILTERS.
                          </td>
                        </tr>
                      ) : (
                        filteredMatches.map((m) => {
                          const isLive = m.status === "LIVE" || m.status === "PAUSED";
                          const isCompleted = m.status === "COMPLETED";
                          return (
                            <tr key={m.id} className={`hover:bg-[#0c1429] transition-colors group ${isLive ? "bg-[#FF2A6D]/5" : ""}`}>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className={`font-mono font-bold text-xs bg-[#050914] px-2.5 py-1 border rounded shadow-sm ${isLive ? "text-[#FF2A6D] border-[#FF2A6D]/50" : "text-[#00F0FF] border-[#00F0FF]/40"}`}>
                                  {m.publicMatchNumber || m.matchNumber}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-pixel text-[10px] text-[#FF5A16] font-bold">POOL {m.pool || "-"}</span>
                                  <span className="font-rajdhani text-xs font-semibold text-slate-300">{m.roundName || m.roundStage || "Round 1"}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs">
                                <div className="flex items-center gap-1.5 text-[#FFD700]">
                                  <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
                                  <span>{m.day?.date || "OCT 18"} &bull; {m.time || "09:00 IST"}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-[#00F0FF]">
                                  <MapPin className="w-3 h-3" />
                                  <span className="font-rajdhani text-xs font-bold bg-[#050914] px-2 py-0.5 border border-[#00F0FF]/30 rounded">{m.court || "Court 01"}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 max-w-[180px]">
                                <span className={`font-bold text-xs truncate block ${isTBD(m.playerA) ? "text-[#91A0AE] italic" : "text-white"}`}>
                                  {isTBD(m.playerA) ? "TBD" : m.playerA}
                                </span>
                                {m.institutionA && m.institutionA !== m.playerA && (
                                  <span className="text-[10px] text-[#91A0AE] truncate block">{m.institutionA}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                {m.scoreA != null || m.scoreB != null ? (
                                  <span className="font-mono text-xs font-bold text-[#00FF88] bg-[#050914] px-2 py-0.5 border border-[#00FF88]/40 rounded">
                                    {m.scoreA ?? "0"} &ndash; {m.scoreB ?? "0"}
                                  </span>
                                ) : (
                                  <span className="font-mono text-[10px] text-[#00F0FF] font-bold bg-[#050914] px-2 py-0.5 border border-[#00F0FF]/20 rounded">VS</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 max-w-[180px]">
                                <span className={`font-bold text-xs truncate block ${isTBD(m.playerB) ? "text-[#91A0AE] italic" : "text-white"}`}>
                                  {isTBD(m.playerB) ? "TBD" : m.playerB}
                                </span>
                                {m.institutionB && m.institutionB !== m.playerB && (
                                  <span className="text-[10px] text-[#91A0AE] truncate block">{m.institutionB}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                {isLive ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#FF2A6D] text-white font-pixel text-[9px] font-bold uppercase rounded animate-pulse">
                                    <Radio className="w-2.5 h-2.5" /><span>LIVE</span>
                                  </span>
                                ) : isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#05D550]/20 border border-[#05D550]/60 text-[#05D550] font-pixel text-[9px] font-bold rounded">
                                    <CheckCircle2 className="w-2.5 h-2.5" /><span>FINAL</span>
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 bg-[#050914] border border-white/10 text-slate-400 font-pixel text-[9px] rounded">UPCOMING</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <Link
                                  href={`/matches/${m.id}`}
                                  className="px-2.5 py-1 bg-[#1A2644] hover:bg-[#00F0FF] text-[#00F0FF] hover:text-black font-pixel text-[9px] font-bold uppercase rounded transition-all flex items-center gap-1 border border-[#00F0FF]/30 ml-auto w-fit"
                                >
                                  <span>HUD</span><ChevronRight className="w-3 h-3" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredMatches.length > 0 && (
                  <div className="p-3 bg-[#050914]/60 border-t border-[#1b253b] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-pixel text-[9px] text-[#91A0AE]">
                      {filteredMatches.length} MATCHES SHOWN &bull; {activePool !== "ALL" ? `POOL ${activePool}` : "ALL POOLS"}
                    </span>
                    <div className="flex items-center gap-3 font-pixel text-[9px]">
                      <span className="flex items-center gap-1 text-[#FF2A6D]"><Radio className="w-2.5 h-2.5" /> LIVE</span>
                      <span className="flex items-center gap-1 text-[#05D550]"><CheckCircle2 className="w-2.5 h-2.5" /> FINAL</span>
                      <span className="text-[#91A0AE]">UPCOMING = SCHEDULED</span>
                    </div>
                  </div>
                )}
              </div>

            ) : (
              /* ROSTER TABLE */
              <div className="bg-[#07101D]/95 border-2 border-[#00F0FF]/40 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#050914]/80">
                  <div>
                    <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider font-bold block">
                      OFFICIAL TEAM DIRECTORY &bull; {activePool === "ALL" ? "ALL POOLS" : `POOL ${activePool}`}
                    </span>
                    <p className="text-xs text-[#91A0AE] mt-0.5">Each pool consists of exactly 25 accredited universities. Limit: 25 teams / pool.</p>
                  </div>
                  <span className="px-3 py-1 bg-[#05D550] text-black font-pixel text-xs font-bold rounded">
                    {rosterSlots.length} TEAMS REGISTERED
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-[#1b253b] bg-[#050914] font-pixel text-[10px] text-[#00F0FF] uppercase tracking-wider">
                        <th className="py-3 px-3">POOL</th>
                        <th className="py-3 px-3">SLOT #</th>
                        <th className="py-3 px-3">TEAM #</th>
                        <th className="py-3 px-3">OFFICIAL UNIVERSITY NAME</th>
                        <th className="py-3 px-3">STATE</th>
                        <th className="py-3 px-3">TEAM CODE</th>
                        <th className="py-3 px-3">SEED / BYE STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b253b]/60 text-xs">
                      {rosterSlots.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-pixel text-xs">
                            NO TEAMS ASSIGNED YET. DRAW IN PROGRESS.
                          </td>
                        </tr>
                      ) : (
                        rosterSlots.map((slot: any) => (
                          <tr key={`${slot.pool}-${slot.slot}`} className="hover:bg-[#0c1429] transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-pixel text-xs font-bold text-[#FF5A16] bg-[#050914] px-2 py-0.5 border border-[#FF5A16]/30 rounded">POOL {slot.pool}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs font-bold text-[#00F0FF]">Slot #{slot.slot}</td>
                            <td className="py-3 px-3 font-mono text-xs text-[#FFD700] font-bold">#{slot.teamNumber || "-"}</td>
                            <td className="py-3 px-3 font-semibold text-white">{slot.teamName || "Unassigned"}</td>
                            <td className="py-3 px-3 text-slate-300">
                              <span className="px-2 py-0.5 bg-[#050914] border border-white/10 rounded text-[11px]">{slot.state || "-"}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-[#00F0FF]">{slot.teamCode || "-"}</td>
                            <td className="py-3 px-3">
                              {slot.slot === 1 ? (
                                <span className="px-2 py-0.5 bg-[#FFD700] text-black font-pixel text-[9px] font-bold rounded">SEED 1 &bull; POOL FINAL BYE</span>
                              ) : slot.slot === 2 || slot.slot === 17 ? (
                                <span className="px-2 py-0.5 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-[9px] rounded">R1 BYE &bull; ADVANCES TO R2</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-[#050914] text-slate-400 border border-white/10 font-pixel text-[9px] rounded">ROUND 1 COMPETITOR</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        ) : viewMode === "BRACKET" ? (
          <div className="w-full">
            <OfficialPoolBracket
              initialPool={(activePool === "ALL" || activePool === "CHAMPIONSHIP" ? "A" : activePool) as any}
              liveMatches={allMatches}
              bracketSlots={fixturesData?.bracketSlots || []}
              isAdmin={false}
              onSelectMatch={() => {}}
              onSlotAssigned={() => {}}
            />
          </div>

        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.length === 0 ? (
              <div className="col-span-full border border-[#1A2644] bg-[#0A1024] p-12 text-center rounded-xl font-pixel text-xs text-[#91A0AE]">
                NO MATCHES MATCHING SELECTED FILTERS.
              </div>
            ) : (
              filteredMatches.map((m) => <MatchCardItem key={m.id} match={m} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MatchCardItem({ match }: { match: any }) {
  const isLive = match.status === "LIVE" || match.status === "PAUSED";
  const isCompleted = match.status === "COMPLETED";
  const isReady = match.status === "READY";
  function isTBD(val: string | null | undefined) {
    return !val || val.startsWith("TBD") || val.includes("POOL-");
  }
  return (
    <Link
      href={`/matches/${match.id}`}
      className={`group block p-3.5 rounded-xl border transition-all duration-150 ${
        isLive ? "bg-[#FF2A6D]/10 border-[#FF2A6D] shadow-[0_0_20px_rgba(255,42,109,0.3)] hover:scale-[1.02]"
          : isCompleted ? "bg-[#070D1E] border-[#05D550]/40 hover:border-[#05D550] hover:scale-[1.01]"
          : isReady ? "bg-[#070D1E] border-[#FFB800]/40 hover:border-[#FFB800] hover:scale-[1.01]"
          : "bg-[#050A18] border-[#18D8D0]/20 hover:border-[#18D8D0]/60 hover:scale-[1.01]"
      }`}
    >
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#1A2644]">
        <div className="flex items-center gap-1.5">
          <span className="font-pixel text-[11px] font-bold text-[#F4E6CE] group-hover:text-[#FF5A16] transition-colors">{match.publicMatchNumber}</span>
          <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">POOL {match.pool}</span>
        </div>
        {isLive ? (
          <span className="px-1.5 py-0.5 bg-[#FF2A6D] text-white font-pixel text-[8px] font-bold uppercase animate-pulse flex items-center gap-1 rounded"><Radio className="w-2.5 h-2.5" /><span>LIVE</span></span>
        ) : isCompleted ? (
          <span className="px-1.5 py-0.5 bg-[#05D550] text-black font-pixel text-[8px] font-bold uppercase rounded flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /><span>FINAL</span></span>
        ) : isReady ? (
          <span className="px-1.5 py-0.5 bg-[#FFB800] text-black font-pixel text-[8px] font-bold uppercase rounded">READY</span>
        ) : (
          <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">UPCOMING</span>
        )}
      </div>
      <div className={`flex items-center justify-between p-1.5 rounded mb-1.5 ${match.winner === "PLAYER_A" ? "bg-[#05D550]/20 font-bold" : "bg-[#040814]"} text-[#F4E6CE]`}>
        <div className="min-w-0 flex-1 pr-2">
          <p className={`text-xs truncate font-medium ${isTBD(match.playerA) ? "text-[#91A0AE] italic" : ""}`}>{isTBD(match.playerA) ? "TBD" : match.playerA}</p>
          {match.institutionA && <p className="text-[10px] text-[#91A0AE] truncate">{match.institutionA}</p>}
        </div>
        {match.scoreA ? <span className="font-pixel text-xs text-[#00F0FF]">{match.scoreA}</span> : null}
      </div>
      <div className={`flex items-center justify-between p-1.5 rounded ${match.winner === "PLAYER_B" ? "bg-[#05D550]/20 font-bold" : "bg-[#040814]"} text-[#F4E6CE]`}>
        <div className="min-w-0 flex-1 pr-2">
          <p className={`text-xs truncate font-medium ${isTBD(match.playerB) ? "text-[#91A0AE] italic" : ""}`}>{isTBD(match.playerB) ? "TBD" : match.playerB}</p>
          {match.institutionB && <p className="text-[10px] text-[#91A0AE] truncate">{match.institutionB}</p>}
        </div>
        {match.scoreB ? <span className="font-pixel text-xs text-[#00F0FF]">{match.scoreB}</span> : null}
      </div>
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1A2644] text-[9px] font-pixel text-[#91A0AE]">
        <span className="truncate">{match.court || "Court 01"} &bull; {match.time || "09:00 IST"}</span>
        <span className="text-[#FF5A16] group-hover:translate-x-1 transition-transform flex items-center gap-0.5"><span>HUD</span><ChevronRight className="w-3 h-3" /></span>
      </div>
    </Link>
  );
}
