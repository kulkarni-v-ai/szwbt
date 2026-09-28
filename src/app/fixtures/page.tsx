"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import {
  Trophy,
  Search,
  Filter,
  Layers,
  Calendar,
  Radio,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Activity,
  Flame,
  ChevronRight,
} from "lucide-react";

export default function PublicFixturesPage() {
  const [activePool, setActivePool] = useState<string>("A");
  const [activeRound, setActiveRound] = useState<string>("ALL");
  const [activeStatus, setActiveStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"BRACKET" | "LIST">("BRACKET");
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const [fixturesData, setFixturesData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchFixtures = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch("/api/tournament/fixtures");
      const data = await res.json();
      if (data.success) {
        setFixturesData(data.data);
      }
    } catch (err) {
      console.error("Error fetching fixtures:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
    const interval = setInterval(() => fetchFixtures(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const allMatches: any[] = fixturesData?.matches || [];
  const poolStats = fixturesData?.poolStats || {};

  // Filter matches for current view
  const filteredMatches = allMatches.filter((m) => {
    // Pool filter
    if (activePool !== "ALL") {
      if (activePool === "CHAMPIONSHIP") {
        if (m.pool !== "CHAMPIONSHIP") return false;
      } else {
        if (m.pool !== activePool) return false;
      }
    }

    // Round filter
    if (activeRound !== "ALL" && m.roundStage !== activeRound) {
      return false;
    }

    // Status filter
    if (activeStatus !== "ALL" && m.status !== activeStatus) {
      return false;
    }

    // Search query
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

  // Group matches by round for bracket view
  const roundsOrder = [
    { key: "ROUND_1", name: "Round 1", order: 1 },
    { key: "ROUND_2", name: "Round of 16", order: 2 },
    { key: "QUARTER_FINAL", name: "Quarter-Finals", order: 3 },
    { key: "SEMI_FINAL", name: "Semi-Finals", order: 4 },
    { key: "POOL_FINAL", name: "Pool Final", order: 5 },
    { key: "PLAYOFF_3RD", name: "3rd Place Playoff", order: 6 },
    { key: "GRAND_FINAL", name: "Grand Final", order: 7 },
  ];

  const currentPoolMatches = allMatches.filter((m) =>
    activePool === "ALL" ? true : activePool === "CHAMPIONSHIP" ? m.pool === "CHAMPIONSHIP" : m.pool === activePool
  );

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-20 z-10">
        {/* Championship Fixture Master Header */}
        <div className="relative border-2 border-[#00F0FF]/40 bg-[#080E22]/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.85)] mb-8 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-[#FF5A16] text-black font-pixel text-xs font-bold tracking-wider uppercase shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>OFFICIAL TOURNAMENT BRACKET</span>
              </span>
              <span className="font-pixel text-[11px] text-[#18D8D0] uppercase tracking-wider">
                100 TEAMS &bull; 4 POOLS &bull; 100 MATCHES
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-pixel text-[10px] text-[#91A0AE] bg-[#050914] px-2.5 py-1 border border-[#1A2644]">
                STATUS: {fixturesData?.config?.status || "INITIALIZED"}
              </span>
              <button
                onClick={() => fetchFixtures(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#1A2644] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 transition-colors shadow-[2px_2px_0px_#000]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>SYNC TELEMETRY</span>
              </button>
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-5xl text-[#F4E6CE] font-black uppercase tracking-tight leading-none">
              CHAMPIONSHIP <span className="text-[#FF5A16]">FIXTURES</span>
            </h1>
            <p className="font-pixel text-xs text-[#18D8D0] mt-2 uppercase tracking-wider">
              SOUTH ZONE INTER-UNIVERSITY WOMEN&apos;S BADMINTON TOURNAMENT 2026
            </p>
            <p className="text-xs sm:text-sm text-[#91A0AE] mt-2 leading-relaxed">
              Explore the complete 100-match tournament graph. Click any match card to view point-by-point telemetry,
              official referee scoresheets, and downstream progression.
            </p>
          </div>

          {/* Quick Pool Progress Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#1A2644]">
            {(["A", "B", "C", "D"] as const).map((p) => {
              const stat = poolStats[p];
              return (
                <button
                  key={p}
                  onClick={() => setActivePool(p)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePool === p
                      ? "bg-[#FF5A16]/15 border-[#FF5A16] shadow-[0_0_15px_rgba(255,90,22,0.2)]"
                      : "bg-[#050914] border-[#18D8D0]/20 hover:border-[#18D8D0]/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-pixel text-xs font-bold text-[#F4E6CE]">POOL {p}</span>
                    <span className="font-pixel text-[9px] text-[#18D8D0]">{stat?.assigned || 0}/25</span>
                  </div>
                  <div className="w-full bg-[#1A2644] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#05D550] h-full transition-all duration-500"
                      style={{ width: `${((stat?.assigned || 0) / 25) * 100}%` }}
                    />
                  </div>
                  <span className="font-pixel text-[9px] text-[#91A0AE] mt-1 block">
                    13 Top &bull; 12 Bottom
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Toolbar: Pool Tabs, Search, Round Filter, View Mode, Zoom */}
        <div className="bg-[#0A1024]/90 border border-[#18D8D0]/30 p-4 rounded-2xl shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Pool Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "A", label: "POOL A" },
              { id: "B", label: "POOL B" },
              { id: "C", label: "POOL C" },
              { id: "D", label: "POOL D" },
              { id: "CHAMPIONSHIP", label: "PODIUM FINALS" },
              { id: "ALL", label: "ALL POOLS" },
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

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="w-4 h-4 text-[#91A0AE] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team, match, university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050914] border border-[#1A2644] text-xs text-[#F4E6CE] pl-9 pr-3 py-2 rounded focus:outline-none focus:border-[#FF5A16]"
            />
          </div>

          {/* View Mode & Zoom */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#050914] border border-[#1A2644] rounded p-0.5">
              <button
                onClick={() => setViewMode("BRACKET")}
                className={`px-2.5 py-1 font-pixel text-[10px] uppercase rounded transition-colors ${
                  viewMode === "BRACKET" ? "bg-[#1A2644] text-[#00F0FF]" : "text-[#91A0AE]"
                }`}
              >
                Interactive Bracket
              </button>
              <button
                onClick={() => setViewMode("LIST")}
                className={`px-2.5 py-1 font-pixel text-[10px] uppercase rounded transition-colors ${
                  viewMode === "LIST" ? "bg-[#1A2644] text-[#00F0FF]" : "text-[#91A0AE]"
                }`}
              >
                Match Grid
              </button>
            </div>

            {viewMode === "BRACKET" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                  title="Zoom Out"
                  className="p-1.5 bg-[#050914] border border-[#1A2644] rounded text-[#91A0AE] hover:text-[#F4E6CE]"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-pixel text-[10px] text-[#91A0AE] w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  title="Zoom In"
                  className="p-1.5 bg-[#050914] border border-[#1A2644] rounded text-[#91A0AE] hover:text-[#F4E6CE]"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  title="Reset Zoom"
                  className="px-2 py-1 bg-[#050914] border border-[#1A2644] rounded text-[10px] font-pixel text-[#91A0AE] hover:text-[#F4E6CE]"
                >
                  FIT
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="border border-[#1A2644] bg-[#0A1024]/60 p-16 rounded-2xl flex flex-col items-center justify-center font-pixel text-center">
            <RefreshCw className="w-8 h-8 text-[#FF5A16] animate-spin mb-3" />
            <p className="text-xs text-[#00F0FF] uppercase tracking-wider">GENERATING 100-MATCH CHAMPIONSHIP GRAPH...</p>
          </div>
        ) : viewMode === "BRACKET" ? (
          /* ═══ INTERACTIVE TOURNAMENT BRACKET ═══ */
          <div className="relative border border-[#00F0FF]/20 bg-[#060B1C]/90 rounded-2xl p-6 overflow-x-auto shadow-2xl">
            <div
              className="min-w-[1200px] flex items-start gap-8 transition-transform duration-200 origin-top-left"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {roundsOrder.map((round) => {
                const roundMatches = currentPoolMatches.filter((m) => m.roundStage === round.key);
                if (roundMatches.length === 0) return null;

                return (
                  <div key={round.key} className="flex-1 min-w-[280px] max-w-[320px]">
                    {/* Round Header */}
                    <div className="mb-4 pb-2 border-b-2 border-[#FF5A16] flex items-center justify-between">
                      <span className="font-pixel text-xs text-[#F4E6CE] font-bold uppercase tracking-wider">
                        {round.name}
                      </span>
                      <span className="font-pixel text-[10px] text-[#00F0FF]">
                        {roundMatches.length} {roundMatches.length === 1 ? "MATCH" : "MATCHES"}
                      </span>
                    </div>

                    {/* Round Matches Column */}
                    <div className="space-y-5">
                      {roundMatches.map((m) => (
                        <MatchCardItem key={m.id} match={m} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ═══ GRID / LIST VIEW ═══ */
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

/**
 * Reusable, clickable Match Card component strictly linking to /matches/[matchId].
 */
function MatchCardItem({ match }: { match: any }) {
  const isLive = match.status === "LIVE" || match.status === "PAUSED";
  const isCompleted = match.status === "COMPLETED";
  const isReady = match.status === "READY";

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`group block p-3.5 rounded-xl border transition-all duration-150 ${
        isLive
          ? "bg-[#FF2A6D]/10 border-[#FF2A6D] shadow-[0_0_20px_rgba(255,42,109,0.3)] hover:scale-[1.02]"
          : isCompleted
          ? "bg-[#070D1E] border-[#05D550]/40 hover:border-[#05D550] hover:scale-[1.01]"
          : isReady
          ? "bg-[#070D1E] border-[#FFB800]/40 hover:border-[#FFB800] hover:scale-[1.01]"
          : "bg-[#050A18] border-[#18D8D0]/20 hover:border-[#18D8D0]/60 hover:scale-[1.01]"
      }`}
    >
      {/* Card Header: Match Number & Status */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#1A2644]">
        <div className="flex items-center gap-1.5">
          <span className="font-pixel text-[11px] font-bold text-[#F4E6CE] group-hover:text-[#FF5A16] transition-colors">
            {match.publicMatchNumber}
          </span>
          <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">
            POOL {match.pool}
          </span>
        </div>

        {isLive ? (
          <span className="px-1.5 py-0.5 bg-[#FF2A6D] text-white font-pixel text-[8px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1 rounded">
            <Radio className="w-2.5 h-2.5" />
            <span>LIVE</span>
          </span>
        ) : isCompleted ? (
          <span className="px-1.5 py-0.5 bg-[#05D550] text-black font-pixel text-[8px] font-bold uppercase tracking-wider rounded flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>FINAL</span>
          </span>
        ) : isReady ? (
          <span className="px-1.5 py-0.5 bg-[#FFB800] text-black font-pixel text-[8px] font-bold uppercase tracking-wider rounded">
            READY
          </span>
        ) : (
          <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">
            UPCOMING
          </span>
        )}
      </div>

      {/* Team A Slot */}
      <div
        className={`flex items-center justify-between p-1.5 rounded mb-1.5 transition-colors ${
          match.winner === "PLAYER_A"
            ? "bg-[#05D550]/20 font-bold text-[#F4E6CE]"
            : "bg-[#040814] text-[#F4E6CE]"
        }`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs truncate font-medium">
            {match.playerA || "TBD"}
          </p>
          {match.institutionA && (
            <p className="text-[10px] text-[#91A0AE] truncate">{match.institutionA}</p>
          )}
        </div>
        {match.scoreA ? (
          <span className="font-pixel text-xs text-[#00F0FF]">{match.scoreA}</span>
        ) : null}
      </div>

      {/* Team B Slot */}
      <div
        className={`flex items-center justify-between p-1.5 rounded transition-colors ${
          match.winner === "PLAYER_B"
            ? "bg-[#05D550]/20 font-bold text-[#F4E6CE]"
            : "bg-[#040814] text-[#F4E6CE]"
        }`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs truncate font-medium">
            {match.playerB || "TBD"}
          </p>
          {match.institutionB && (
            <p className="text-[10px] text-[#91A0AE] truncate">{match.institutionB}</p>
          )}
        </div>
        {match.scoreB ? (
          <span className="font-pixel text-xs text-[#00F0FF]">{match.scoreB}</span>
        ) : null}
      </div>

      {/* Card Footer: Court, Time & Link Arrow */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1A2644] text-[9px] font-pixel text-[#91A0AE]">
        <span className="truncate">{match.court || "Court 01"} &bull; {match.time || "09:00 IST"}</span>
        <span className="text-[#FF5A16] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
          <span>MATCH HUD</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
