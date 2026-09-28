"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import {
  Trophy,
  ArrowLeft,
  Clock,
  Radio,
  MapPin,
  Calendar,
  Layers,
  Activity,
  ArrowRight,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatch = async () => {
    try {
      if (!matchId) return;
      const res = await fetch(`/api/matches/${matchId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Match not found");
      }
      setMatch(data.match);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 8000);
    return () => clearInterval(interval);
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] text-[#F4E6CE] flex flex-col items-center justify-center font-pixel">
        <RefreshCw className="w-8 h-8 text-[#FF5A16] animate-spin mb-4" />
        <p className="text-sm tracking-widest text-[#18D8D0]">LOADING MATCH TELEMETRY...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#050914] text-[#F4E6CE] flex flex-col">
        <ArcadeNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-[#FF2A6D] mb-4" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-[#F4E6CE] mb-2">
            Match Record Not Found
          </h1>
          <p className="text-sm text-[#91A0AE] max-w-md mb-6">{error || "The requested match does not exist."}</p>
          <Link
            href="/fixtures"
            className="px-4 py-2 bg-[#FF5A16] text-black font-pixel text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#FF7A36] transition-colors"
          >
            &larr; Return to Fixtures
          </Link>
        </div>
      </div>
    );
  }

  const isLive = match.status === "LIVE" || match.status === "PAUSED";
  const isCompleted = match.status === "COMPLETED";
  const isReady = match.status === "READY";
  const isNotStarted = !isLive && !isCompleted;

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-20 z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/fixtures"
              className="flex items-center gap-1.5 text-xs font-pixel text-[#18D8D0] hover:text-[#FF5A16] transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Championship Fixtures</span>
            </Link>
            <span className="text-[#4E5D6C] font-pixel text-xs">/</span>
            <span className="text-xs font-pixel text-[#91A0AE] uppercase">{match.publicMatchNumber || match.id}</span>
          </div>

          <button
            onClick={fetchMatch}
            className="flex items-center gap-1 text-[10px] font-pixel text-[#91A0AE] hover:text-[#18D8D0] uppercase tracking-wider"
          >
            <RefreshCw className="w-3 h-3" />
            <span>SYNC</span>
          </button>
        </div>

        {/* Master Match HUD Banner */}
        <div className="relative border-2 border-[#00F0FF]/40 bg-[#0A1024]/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] mb-8 overflow-hidden">
          {/* Top badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#FF5A16] text-black font-pixel text-xs font-bold tracking-wider uppercase shadow-[2px_2px_0px_#000]">
                {match.publicMatchNumber || "MATCH"}
              </span>
              <span className="px-2.5 py-1 bg-[#1A2644] text-[#00F0FF] font-pixel text-[11px] tracking-wider uppercase border border-[#00F0FF]/30">
                POOL {match.pool || "A"} &bull; {match.roundName || match.roundStage}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isLive ? (
                <span className="px-3 py-1 bg-[#FF2A6D] text-white font-pixel text-[10px] tracking-wider uppercase flex items-center gap-1.5 animate-pulse shadow-[2px_2px_0px_#000]">
                  <Radio className="w-3 h-3" />
                  <span>LIVE IN PLAY</span>
                </span>
              ) : isCompleted ? (
                <span className="px-3 py-1 bg-[#05D550] text-black font-pixel text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-[2px_2px_0px_#000]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>FINAL RESULT</span>
                </span>
              ) : isReady ? (
                <span className="px-3 py-1 bg-[#FFB800] text-black font-pixel text-[10px] tracking-wider uppercase shadow-[2px_2px_0px_#000]">
                  TEAMS READY
                </span>
              ) : (
                <span className="px-3 py-1 bg-[#2C3B55] text-[#91A0AE] font-pixel text-[10px] tracking-wider uppercase">
                  NOT STARTED
                </span>
              )}
            </div>
          </div>

          {/* Schedule & Court Strip */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-pixel text-[#91A0AE] mb-8 pb-4 border-b border-[#1A2644]">
            <span className="flex items-center gap-1 text-[#F4E6CE]">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A16]" />
              <span>{match.day?.date || "OCT 18"} &bull; {match.time || "TBD"}</span>
            </span>
            <span className="flex items-center gap-1 text-[#18D8D0]">
              <MapPin className="w-3.5 h-3.5 text-[#18D8D0]" />
              <span>{match.court || "Court 01"} (KLE Tech Indoor Arena)</span>
            </span>
            <span className="flex items-center gap-1 text-[#E5A93C]">
              <Shield className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>BWF Official Regulation Standard</span>
            </span>
          </div>

          {/* Versus Display */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            {/* Team A */}
            <div
              className={`md:col-span-5 p-5 rounded-xl border transition-all ${
                match.winner === "PLAYER_A"
                  ? "bg-[#05D550]/10 border-[#05D550] shadow-[0_0_20px_rgba(5,213,80,0.2)]"
                  : "bg-[#070D1E] border-[#18D8D0]/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider">TEAM 1 (SLOT A)</span>
                {match.winner === "PLAYER_A" && (
                  <span className="px-2 py-0.5 bg-[#05D550] text-black font-pixel text-[9px] font-bold uppercase tracking-wider">
                    WINNER
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-[#F4E6CE] font-bold uppercase tracking-tight">
                {match.playerA || "TBD"}
              </h2>
              <p className="text-xs text-[#91A0AE] mt-1">{match.institutionA || "South Zone University"}</p>
              {match.sourceAPositionId && (
                <p className="font-pixel text-[9px] text-[#FF5A16] mt-2">Slot: {match.sourceAPositionId}</p>
              )}
            </div>

            {/* VS & Score Center */}
            <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
              <span className="font-pixel text-xs text-[#FF5A16] tracking-widest uppercase">VS</span>
              {isCompleted || isLive ? (
                <div className="mt-2 text-center">
                  <div className="font-pixel text-xl text-[#00F0FF] tracking-wider">
                    {match.scoreA || "0"} - {match.scoreB || "0"}
                  </div>
                  <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">SETS</span>
                </div>
              ) : null}
            </div>

            {/* Team B */}
            <div
              className={`md:col-span-5 p-5 rounded-xl border transition-all ${
                match.winner === "PLAYER_B"
                  ? "bg-[#05D550]/10 border-[#05D550] shadow-[0_0_20px_rgba(5,213,80,0.2)]"
                  : "bg-[#070D1E] border-[#18D8D0]/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider">TEAM 2 (SLOT B)</span>
                {match.winner === "PLAYER_B" && (
                  <span className="px-2 py-0.5 bg-[#05D550] text-black font-pixel text-[9px] font-bold uppercase tracking-wider">
                    WINNER
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-[#F4E6CE] font-bold uppercase tracking-tight">
                {match.playerB || "TBD"}
              </h2>
              <p className="text-xs text-[#91A0AE] mt-1">{match.institutionB || "South Zone University"}</p>
              {match.sourceBPositionId && (
                <p className="font-pixel text-[9px] text-[#FF5A16] mt-2">Slot: {match.sourceBPositionId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bracket Relationship & Progression Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upstream Sources */}
          <div className="border border-[#18D8D0]/30 bg-[#0A1024]/80 p-5 rounded-xl">
            <h3 className="font-pixel text-xs text-[#18D8D0] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-[#FF5A16]" />
              <span>Upstream Feeder Sources</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#050914] border border-[#1A2644] rounded">
                <span className="text-[#91A0AE] font-pixel text-[10px] block">SLOT A SOURCE:</span>
                {match.sourceAType === "POSITION" ? (
                  <span className="text-[#F4E6CE]">Initial Fixture Slot: <strong>{match.sourceAPositionId}</strong></span>
                ) : match.sourceAMatch ? (
                  <Link href={`/matches/${match.sourceAMatch.id}`} className="text-[#00F0FF] hover:underline">
                    Winner of Match {match.sourceAMatch.publicMatchNumber} ({match.sourceAMatch.playerA} vs {match.sourceAMatch.playerB})
                  </Link>
                ) : (
                  <span className="text-[#91A0AE]">Winner of {match.sourceAMatchNumber}</span>
                )}
              </div>

              <div className="p-3 bg-[#050914] border border-[#1A2644] rounded">
                <span className="text-[#91A0AE] font-pixel text-[10px] block">SLOT B SOURCE:</span>
                {match.sourceBType === "POSITION" ? (
                  <span className="text-[#F4E6CE]">Initial Fixture Slot: <strong>{match.sourceBPositionId}</strong></span>
                ) : match.sourceBMatch ? (
                  <Link href={`/matches/${match.sourceBMatch.id}`} className="text-[#00F0FF] hover:underline">
                    {match.sourceBType === "LOSER" ? "Loser" : "Winner"} of Match {match.sourceBMatch.publicMatchNumber} ({match.sourceBMatch.playerA} vs {match.sourceBMatch.playerB})
                  </Link>
                ) : (
                  <span className="text-[#91A0AE]">{match.sourceBType === "LOSER" ? "Loser" : "Winner"} of {match.sourceBMatchNumber}</span>
                )}
              </div>
            </div>
          </div>

          {/* Downstream Destination */}
          <div className="border border-[#18D8D0]/30 bg-[#0A1024]/80 p-5 rounded-xl">
            <h3 className="font-pixel text-xs text-[#18D8D0] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <ArrowRight className="w-3.5 h-3.5 text-[#05D550]" />
              <span>Downstream Progression</span>
            </h3>
            <div className="p-3 bg-[#050914] border border-[#1A2644] rounded text-xs min-h-[95px] flex flex-col justify-center">
              {match.downstreamMatch ? (
                <div>
                  <span className="text-[#05D550] font-pixel text-[10px] block mb-1">
                    WINNER ADVANCES TO {match.downstreamMatch.roundName?.toUpperCase() || "NEXT ROUND"}:
                  </span>
                  <Link
                    href={`/matches/${match.downstreamMatch.id}`}
                    className="text-[#F4E6CE] hover:text-[#FF5A16] font-display text-base uppercase font-bold flex items-center gap-1.5"
                  >
                    <span>Match {match.downstreamMatch.publicMatchNumber}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <p className="text-[11px] text-[#91A0AE] mt-1">Slot: {match.downstreamSlot || "A"}</p>
                </div>
              ) : match.roundStage === "GRAND_FINAL" ? (
                <div className="text-center py-2">
                  <Trophy className="w-6 h-6 text-[#E5A93C] mx-auto mb-1" />
                  <span className="font-pixel text-xs text-[#E5A93C] uppercase">
                    CHAMPIONSHIP FINAL &bull; WINNER AWARDED GOLD TROPHY
                  </span>
                </div>
              ) : (
                <span className="text-[#91A0AE]">Championship Podium Match</span>
              )}
            </div>
          </div>
        </div>

        {/* Live / Completed Event Log */}
        {match.events && match.events.length > 0 && (
          <div className="border border-[#1A2644] bg-[#0A1024]/60 p-5 rounded-xl">
            <h3 className="font-pixel text-xs text-[#F4E6CE] uppercase tracking-wider mb-3">
              Official Match Scoring Timeline
            </h3>
            <div className="space-y-2">
              {match.events.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between text-xs py-1.5 px-3 bg-[#050914] rounded border border-[#1A2644]">
                  <span className="font-pixel text-[10px] text-[#18D8D0]">{ev.eventType}</span>
                  <span className="text-[#F4E6CE] font-pixel">
                    Score: {ev.scoreA} - {ev.scoreB} ({ev.pointTo === "PLAYER_A" ? match.playerA : match.playerB})
                  </span>
                  <span className="text-[10px] text-[#91A0AE]">Set {ev.setNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
