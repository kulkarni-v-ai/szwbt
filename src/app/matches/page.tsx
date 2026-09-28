"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { 
  Play, Radio, Tv, Eye, ChevronRight, Trophy, Zap, 
  BarChart3, RefreshCw, Volume2, Shield, Activity, Maximize2 
} from "lucide-react";

type MatchFilter = "LIVE" | "UPCOMING" | "COMPLETED";

export default function MatchesPage() {
  const [activeFilter, setActiveFilter] = useState<MatchFilter>("LIVE");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("m-101");
  const [simulatedScoreA, setSimulatedScoreA] = useState(16);
  const [simulatedScoreB, setSimulatedScoreB] = useState(14);
  const [isServingA, setIsServingA] = useState(true);

  const featuredMatch: any = null;
  const courtMatches: any[] = [];

  const handleSimulatePoint = () => {
    if (Math.random() > 0.5) {
      setSimulatedScoreA((prev) => (prev >= 20 ? 21 : prev + 1));
      setIsServingA(true);
    } else {
      setSimulatedScoreB((prev) => (prev >= 20 ? 21 : prev + 1));
      setIsServingA(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-24 z-10">
        
        {/* ═══ MASTER LIVE MATCHES HERO — EXACT TO REFERENCE 3 (PANEL 09) ═══ */}
        <section className="relative w-full border border-[#00F0FF]/40 bg-[#050A18]/85 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.85)] mb-8 overflow-hidden rounded-3xl">
          {/* Background image: dusk arena with high visual clarity */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/college-campus-pixel.jpg"
              alt="KLE Tech Arena & Live Match"
              fill
              priority
              className="object-cover object-center opacity-75 filter contrast-110 brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#03060C]/90 via-[#03060C]/60 to-[#03060C]/40 lg:w-3/4" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050A18] via-transparent to-[#03060C]/60" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col justify-between min-h-[380px]">
            {/* Top badges */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#FF5A16] text-black font-pixel text-[10px] font-bold tracking-wider uppercase shadow-[2px_2px_0px_#000] flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  <span>LIVE BROADCAST ARENA</span>
                </span>
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-widest">
                  EVERY RALLY MATTERS
                </span>
              </div>
              <span className="font-pixel text-[9px] text-[#18D8D0] bg-[#050914]/80 px-2.5 py-1 border border-[#18D8D0]/40">
                4 BWF COURTS ACTIVE
              </span>
            </div>

            {/* Main Title */}
            <div className="max-w-xl">
              <h1 className="font-display text-4xl sm:text-6xl text-[#F4E6CE] font-extrabold tracking-tight uppercase leading-none">
                LIVE <span className="text-[#FF5A16]">MATCHES</span>
              </h1>
              <p className="font-pixel text-xs text-[#18D8D0] mt-2 uppercase tracking-wider">
                FEEL THE INTENSITY &bull; REAL-TIME BWF HUD SCORING
              </p>
              <p className="font-sans text-xs sm:text-sm text-[#91A0AE] mt-2 leading-relaxed">
                Stream multiple championship courts simultaneously with live telemetry, rally timelines, and point-by-point referee synchronization.
              </p>
            </div>

            {/* Quote badge on right */}
            <div className="hidden lg:block absolute right-12 bottom-10 max-w-xs text-right bg-[#050914]/85 border border-[#18D8D0]/40 p-4">
              <p className="font-pixel text-xs text-[#F4E6CE]">
                &quot;SPORT UNITES.
              </p>
              <p className="font-pixel text-xs text-[#FF5A16]">
                OPPORTUNITY ELEVATES.&quot;
              </p>
              <span className="font-pixel text-[9px] text-[#18D8D0] mt-1 block">
                KLE TECH ARENA CENTER COURT
              </span>
            </div>
          </div>
        </section>

        {/* ═══ FILTER TABS: [LIVE (2)] [UPCOMING] [COMPLETED] ═══ */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {(["LIVE", "UPCOMING", "COMPLETED"] as MatchFilter[]).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 sm:px-7 py-2.5 font-pixel text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer border flex items-center gap-2 ${
                  isActive
                    ? "bg-[#FF5A16] text-black border-black shadow-[3px_3px_0px_#18D8D0]"
                    : "bg-[#07101D] text-[#91A0AE] border-[#18D8D0]/40 hover:border-[#18D8D0] hover:text-[#F4E6CE]"
                }`}
              >
                <span>{filter}</span>
                {filter === "LIVE" && (
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ LIVE FEATURED MATCH SHOWCASE (EXACT TO REFERENCE 3 PANEL 09) ═══ */}
        {featuredMatch ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Left Column: Live Scoreboard Card */}
            <div className="lg:col-span-8 bg-[#07101D] border-2 border-[#18D8D0] p-6 sm:p-8 rounded-sm shadow-[0_0_25px_rgba(24,216,208,0.15)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-[#18D8D0]/30 pb-4 mb-6 gap-2">
                  <div>
                    <span className="font-pixel text-[9px] text-[#18D8D0] uppercase block">
                      {featuredMatch.court}
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl text-[#F4E6CE] font-bold">
                      {featuredMatch.stage}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#FF5A16] text-black font-pixel text-[9px] font-bold animate-pulse">
                      ● LIVE DECIDER SET 3
                    </span>
                  </div>
                </div>

                {/* Main Scoreboard Display */}
                <div className="space-y-4 mb-8">
                  {/* Player A */}
                  <div className={`p-4 sm:p-5 border-2 rounded-xs flex items-center justify-between transition-colors ${
                    isServingA ? "bg-[#050914] border-[#18D8D0]" : "bg-[#050914]/60 border-[#1e2638]"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#18D8D0] shrink-0" style={{ opacity: isServingA ? 1 : 0.2 }} />
                      <div>
                        <h4 className="font-display text-xl sm:text-2xl text-[#F4E6CE] font-bold">
                          {featuredMatch.playerA}
                        </h4>
                        <p className="font-sans text-xs text-[#91A0AE]">
                          {featuredMatch.institutionA}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 font-mono font-black text-2xl sm:text-4xl text-[#18D8D0]">
                      <span className="text-[#91A0AE] text-base sm:text-xl font-normal">{featuredMatch.set1[0]}</span>
                      <span className="text-[#91A0AE] text-base sm:text-xl font-normal">{featuredMatch.set2[0]}</span>
                      <span className="text-3xl sm:text-5xl text-[#18D8D0] bg-[#07101D] px-3 py-1 border border-[#18D8D0]/40">
                        {simulatedScoreA}
                      </span>
                    </div>
                  </div>

                  {/* Player B */}
                  <div className={`p-4 sm:p-5 border-2 rounded-xs flex items-center justify-between transition-colors ${
                    !isServingA ? "bg-[#050914] border-[#FF5A16]" : "bg-[#050914]/60 border-[#1e2638]"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#FF5A16] shrink-0" style={{ opacity: !isServingA ? 1 : 0.2 }} />
                      <div>
                        <h4 className="font-display text-xl sm:text-2xl text-[#F4E6CE] font-bold">
                          {featuredMatch.playerB}
                        </h4>
                        <p className="font-sans text-xs text-[#91A0AE]">
                          {featuredMatch.institutionB}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 font-mono font-black text-2xl sm:text-4xl text-[#FF5A16]">
                      <span className="text-[#91A0AE] text-base sm:text-xl font-normal">{featuredMatch.set1[1]}</span>
                      <span className="text-[#91A0AE] text-base sm:text-xl font-normal">{featuredMatch.set2[1]}</span>
                      <span className="text-3xl sm:text-5xl text-[#FF5A16] bg-[#07101D] px-3 py-1 border border-[#FF5A16]/40">
                        {simulatedScoreB}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Telemetry Bars */}
                <div className="bg-[#050914] border border-[#1e2638] p-4 rounded-xs mb-6">
                  <span className="font-pixel text-[10px] text-[#18D8D0] uppercase mb-3 block">
                    LIVE MATCH TELEMETRY &bull; SET 3
                  </span>
                  <div className="space-y-3 font-sans text-xs">
                    <div>
                      <div className="flex justify-between text-[#91A0AE] text-[11px] mb-1 font-pixel">
                        <span>SMASH WINNERS: {featuredMatch.stats.smashesA}</span>
                        <span>SMASH WINNERS: {featuredMatch.stats.smashesB}</span>
                      </div>
                      <div className="h-2 bg-[#07101D] flex overflow-hidden">
                        <div className="bg-[#18D8D0] h-full" style={{ width: "54%" }} />
                        <div className="bg-[#FF5A16] h-full" style={{ width: "46%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[#91A0AE] text-[11px] mb-1 font-pixel">
                        <span>NET PLAY WINNERS: {featuredMatch.stats.netWinnersA}</span>
                        <span>NET PLAY WINNERS: {featuredMatch.stats.netWinnersB}</span>
                      </div>
                      <div className="h-2 bg-[#07101D] flex overflow-hidden">
                        <div className="bg-[#18D8D0] h-full" style={{ width: "56%" }} />
                        <div className="bg-[#FF5A16] h-full" style={{ width: "44%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions: Simulate point & interactive links */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-[#18D8D0]/30 gap-4">
                <button
                  onClick={handleSimulatePoint}
                  className="px-4 py-2 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-black font-pixel text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>SIMULATE NEXT RALLY POINT</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="font-pixel text-[10px] text-[#91A0AE]">
                    DURATION: {featuredMatch.stats.matchTime}
                  </span>
                  <Link href="/schedule">
                    <button className="px-4 py-2 bg-[#FF5A16] text-black font-pixel text-xs font-bold hover:bg-[#FF7A1A] transition-all flex items-center gap-1 shadow-[2px_2px_0px_#000]">
                      <span>FULL SCHEDULE</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Multi-Court Feed Switcher */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-5 rounded-sm">
                <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-[#18D8D0]" />
                    <span className="font-pixel text-xs text-[#18D8D0] uppercase">
                      ACTIVE SATELLITE CHANNELS
                    </span>
                  </div>
                  <span className="font-pixel text-[9px] text-[#FF5A16]">{courtMatches.length} COURTS</span>
                </div>

                <div className="space-y-3">
                  {courtMatches.map((cm) => (
                    <div
                      key={cm.id}
                      onClick={() => setSelectedMatchId(cm.id)}
                      className="p-3.5 bg-[#050914] border border-[#1e2638] hover:border-[#18D8D0] rounded-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5 font-pixel text-[9px]">
                        <span className="text-[#18D8D0]">{cm.courtName}</span>
                        <span className={cm.status === "LIVE" ? "text-[#FF5A16] font-bold" : "text-[#91A0AE]"}>
                          {cm.status}
                        </span>
                      </div>
                      <h5 className="font-display text-sm text-[#F4E6CE] font-bold truncate">
                        {cm.playerA} vs {cm.playerB}
                      </h5>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1e2638] font-mono text-[10px]">
                        <span className="text-[#FF7A1A] font-bold">{cm.scores}</span>
                        <span className="text-[#91A0AE] text-[9px]">{cm.stream}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Link to Interactive Court */}
              <div className="p-4 bg-[#07101D] border border-[#18D8D0]/40 rounded-sm flex items-center justify-between font-pixel text-xs">
                <span className="text-[#F4E6CE]">LOOKING FOR 3D COURT VIEW?</span>
                <Link href="/#court" className="text-[#FF5A16] hover:underline flex items-center gap-1">
                  <span>OPEN COURT</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-[#18D8D0]/40 bg-[#07101D] p-10 sm:p-14 text-center rounded-2xl shadow-[0_0_30px_rgba(24,216,208,0.1)] mb-8 space-y-4">
            <Radio className="w-12 h-12 text-[#18D8D0] mx-auto animate-pulse" />
            <h3 className="font-display text-2xl sm:text-3xl text-white font-bold uppercase tracking-wider">
              ALL COURTS ON PRE-TOURNAMENT STANDBY
            </h3>
            <p className="font-sans text-xs sm:text-sm text-[#91A0AE] max-w-xl mx-auto leading-relaxed">
              Official court live streaming, digital score counters, and rally telemetry broadcasts will go live on match days (October 18–21, 2026) across Courts 01 through 04 at the Dr. Prabhakar Kore Sports Arena.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link href="/schedule">
                <button className="px-5 py-2.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-black font-pixel text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_#000] flex items-center gap-2 cursor-pointer">
                  <span>VIEW TOURNAMENT SCHEDULE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/register">
                <button className="px-5 py-2.5 bg-[#050914] border border-[#18D8D0] hover:bg-[#18D8D0] hover:text-black text-[#18D8D0] font-pixel text-xs uppercase transition-all flex items-center gap-2 cursor-pointer">
                  <span>DESK REGISTRATION</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ═══ BOTTOM BROADCAST TICKER ═══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#050914] border-t border-[#18D8D0]/40 px-4 py-2 flex items-center justify-between font-pixel text-[10px] text-[#91A0AE]">
        <div className="flex items-center gap-2 text-[#18D8D0]">
          <span>🏸</span>
          <span className="text-[#F4E6CE]">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[#FF7A1A]">
          <span>LIVE SATELLITE CHANNELS 01 – 10</span>
          <span className="text-[#F4E6CE]">KLE TECH ARENA CENTER COURT</span>
          <span className="text-[#18D8D0]">BWF RATIFIED SCORING</span>
        </div>
      </footer>
    </div>
  );
}
