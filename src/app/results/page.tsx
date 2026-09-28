"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelTable } from "@/components/pixel/PixelTable";
import { Trophy, Medal, CheckCircle2, ChevronRight, Activity, Flame, Shield, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      maxLife: number;
      life: number;
    }
    const particles: P[] = [];
    const colors = ["#FF5A16", "#00F0FF", "#FFD700", "#FFFFFF"];

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      if (particles.length < 30) {
        particles.push({
          x: Math.random() * w,
          y: h + 10,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -Math.random() * 1.0 - 0.2,
          size: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife: Math.random() * 240 + 80,
        });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife) * 0.45;
        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[2]" />;
}

const CATEGORY_LEADERBOARDS: Record<string, Array<{ pos: number; player: string; institution: string; state: string; score: string; badge: string; points: string }>> = {
  WS: [],
  WD: [],
  TEAM: [],
};

const COMPLETED_MATCH_CARDS: Array<{
  id: string;
  matchNumber: string;
  category: string;
  court: string;
  duration: string;
  playerA: string;
  instA: string;
  playerB: string;
  instB: string;
  sets: Array<{ a: number; b: number; wonA: boolean }>;
  winner: string;
}> = [];

export default function ResultsPage() {
  const [activeCategory, setActiveCategory] = useState<"WS" | "WD" | "TEAM">("WS");

  const currentLeaderboards = CATEGORY_LEADERBOARDS[activeCategory] || CATEGORY_LEADERBOARDS.WS;

  return (
    <div className="relative min-h-screen bg-[#03060C] text-[#F8FAFC] font-sans flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* ─── FULL-SCREEN HIGH-FIDELITY ARENA BACKGROUND ─── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/college-campus-pixel.jpg"
          alt="Championship Campus & Arena"
          fill
          priority
          className="object-cover object-center select-none opacity-80 filter brightness-90 contrast-105 scale-[1.02]"
        />
        {/* Atmospheric Scrim — preserves the neoclassic building visibility while ensuring high readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03060C]/75 via-[#03060C]/65 to-[#03060C]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.06)_0%,transparent_70%)]" />
      </div>

      <ParticleBackground />
      <ArcadeNav />

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 pb-20">
        
        {/* ═══ HERO HEADER (Arena Telemetry + Championship Podiums) ═══ */}
        <div className="relative border border-[#FF5A16]/40 bg-[#050A18]/80 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(255,90,22,0.15)] mb-8 overflow-hidden">
          {/* Subtle accent corner glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF5A16]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#00F0FF]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Title & Subtitle */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#050B18]/90 border border-[#FF5A16]/50 rounded-full shadow-[0_0_12px_rgba(255,90,22,0.35)]">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-pulse shadow-[0_0_8px_#FF5A16]" />
                  <span className="font-rajdhani text-xs text-[#FF8A4A] font-bold tracking-wider uppercase">
                    VICTORY STANDINGS
                  </span>
                </div>
                <span className="font-rajdhani text-xs text-[#FFD700] uppercase font-bold tracking-[0.15em] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
                  KLE TECH ARENA • HUBBALLI 2026
                </span>
              </div>

              <h1 className="font-rajdhani text-4xl sm:text-6xl lg:text-[4.2rem] text-white font-black tracking-tight leading-none mb-2"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 25px rgba(255,90,22,0.4)" }}>
                RESULTS &amp; <span className="bg-gradient-to-r from-white via-[#FF8A4A] to-[#FF5A16] bg-clip-text text-transparent">STANDINGS</span>
              </h1>

              <p className="font-rajdhani text-xs sm:text-sm text-[#00F0FF] font-bold tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                OFFICIAL BWF-RATIFIED CHAMPIONSHIP TELEMETRY
              </p>

              <p className="font-sans text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed font-normal">
                Official scores, match set results, and tournament leaderboards for the South Zone Inter-University Women&apos;s Badminton Championship 2026 across 4 synthetic courts.
              </p>
            </div>

            {/* Right: Championship Medal Podium Telemetry Card */}
            <div className="lg:col-span-5 flex justify-end">
              <div className="w-full max-w-sm bg-[#060D1A]/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 sm:p-5 shadow-[0_12px_35px_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                  <span className="flex items-center gap-2 font-rajdhani text-xs font-bold text-[#FFD700] uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-[#FFD700] drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                    PROVISIONAL PODIUM
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00FF88]/15 border border-[#00FF88]/40 font-rajdhani text-[10px] text-[#00FF88] font-bold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                    LIVE VERIFIED
                  </span>
                </div>

                {currentLeaderboards.length === 0 ? (
                  <div className="p-5 text-center bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5">
                    <Trophy className="w-8 h-8 text-[#FFD700] mx-auto opacity-70 mb-1" />
                    <div className="font-rajdhani font-black text-xs sm:text-sm text-white uppercase tracking-wider">
                      PODIUM STANDINGS PENDING
                    </div>
                    <div className="font-sans text-[10px] text-slate-400">
                      Medal ceremony &amp; official ratings active on match days (Oct 18–21)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#FFD700]/20 via-[#FFD700]/10 to-transparent border border-[#FFD700]/40 shadow-[0_0_15px_rgba(255,215,0,0.15)]">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🥇</span>
                        <div>
                          <div className="font-rajdhani font-black text-xs sm:text-sm text-white">{currentLeaderboards[0]?.player}</div>
                          <div className="font-sans text-[10px] text-slate-300">{currentLeaderboards[0]?.institution}</div>
                        </div>
                      </div>
                      <span className="font-rajdhani text-xs font-bold text-[#FFD700] font-mono">{currentLeaderboards[0]?.score}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🥈</span>
                        <div>
                          <div className="font-rajdhani font-black text-xs sm:text-sm text-white">{currentLeaderboards[1]?.player}</div>
                          <div className="font-sans text-[10px] text-slate-300">{currentLeaderboards[1]?.institution}</div>
                        </div>
                      </div>
                      <span className="font-rajdhani text-xs font-bold text-slate-300 font-mono">{currentLeaderboards[1]?.score}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🥉</span>
                        <div>
                          <div className="font-rajdhani font-black text-xs sm:text-sm text-white">{currentLeaderboards[2]?.player}</div>
                          <div className="font-sans text-[10px] text-slate-300">{currentLeaderboards[2]?.institution}</div>
                        </div>
                      </div>
                      <span className="font-rajdhani text-xs font-bold text-slate-300 font-mono">{currentLeaderboards[2]?.score}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CATEGORY SELECTOR TABS ═══ */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {[
            { id: "WS", label: "Women's Singles (WS)", count: "16 Contenders" },
            { id: "WD", label: "Women's Doubles (WD)", count: "12 Pairs" },
            { id: "TEAM", label: "Team Championship", count: "8 Contingents" },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-5 py-3 font-rajdhani text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer rounded-xl flex items-center gap-2.5 shadow-md ${
                  isActive
                    ? "bg-[#FF5A16] text-white border-[#FF5A16] shadow-[0_0_20px_rgba(255,90,22,0.45)]"
                    : "bg-[#060D1A]/85 backdrop-blur-md text-slate-300 border-white/15 hover:border-[#FF5A16]/50 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isActive ? "bg-black/30 text-white" : "bg-white/10 text-slate-400"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══ LEADERBOARD MATRIX TABLE ═══ */}
        <div className="bg-[#050B18]/85 border border-white/15 backdrop-blur-2xl p-5 sm:p-7 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.85)] mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
              <span className="font-rajdhani font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                CHAMPIONSHIP STANDINGS &amp; LEADERBOARD MATRIX
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF88]/15 border border-[#00FF88]/30 font-rajdhani text-[11px] font-bold text-[#00FF88]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED BY BWF TECHNICAL DELEGATE
              </span>
            </div>
          </div>

          {currentLeaderboards.length === 0 ? (
            <div className="p-12 text-center bg-black/40 border border-white/10 rounded-2xl my-2">
              <Trophy className="w-12 h-12 text-[#FFD700] mx-auto mb-3 opacity-60" />
              <h4 className="font-rajdhani text-lg font-black text-white uppercase tracking-wider">
                TOURNAMENT PODIUM &amp; STANDINGS PENDING
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 font-sans">
                Official championship scores, medal tallies, and qualification rankings will stream live as match scorecards are certified by court umpires.
              </p>
            </div>
          ) : (
            <PixelTable
              columns={[
                {
                  key: "pos",
                  header: "RANK",
                  render: (r) => (
                    <div className="flex items-center gap-2 font-rajdhani font-black text-sm">
                      {r.pos === 1 ? (
                        <span className="px-2 py-0.5 bg-[#FFD700]/20 border border-[#FFD700]/50 text-[#FFD700] rounded-lg shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                          #1 GOLD
                        </span>
                      ) : r.pos === 2 ? (
                        <span className="px-2 py-0.5 bg-slate-300/20 border border-slate-300/40 text-slate-200 rounded-lg">
                          #2 SILVER
                        </span>
                      ) : r.pos === 3 ? (
                        <span className="px-2 py-0.5 bg-[#FF8A4A]/20 border border-[#FF8A4A]/40 text-[#FF8A4A] rounded-lg">
                          #3 BRONZE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-slate-400">#{r.pos}</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "player",
                  header: "CONTENDER / TEAM",
                  render: (r) => (
                    <div>
                      <span className="font-rajdhani font-bold text-sm text-white block">{r.player}</span>
                      <span className="font-sans text-[10px] text-[#00F0FF]">{r.state}</span>
                    </div>
                  ),
                },
                {
                  key: "institution",
                  header: "UNIVERSITY / INSTITUTION",
                  render: (r) => <span className="font-sans text-xs text-slate-300">{r.institution}</span>,
                },
                {
                  key: "score",
                  header: "SET SCORES",
                  render: (r) => <span className="font-mono text-xs text-[#00F0FF] font-bold bg-[#00F0FF]/10 px-2.5 py-1 rounded-lg border border-[#00F0FF]/30">{r.score}</span>,
                },
                {
                  key: "points",
                  header: "RATING",
                  render: (r) => <span className="font-mono text-xs text-[#FFD700] font-bold">{r.points}</span>,
                },
                {
                  key: "badge",
                  header: "HONOR STATUS",
                  render: (r) => (
                    <span className={`font-rajdhani font-bold text-xs px-2.5 py-1 rounded-lg border ${
                      r.pos === 1 ? "bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]" : "bg-white/5 border-white/10 text-slate-300"
                    }`}>
                      {r.badge}
                    </span>
                  ),
                },
              ]}
              data={currentLeaderboards}
              keyExtractor={(item) => String(item.pos)}
              variant="glass"
            />
          )}
        </div>

        {/* ═══ RECENT COMPLETED MATCH CARDS ═══ */}
        <div className="bg-[#050B18]/85 border border-white/15 backdrop-blur-2xl p-5 sm:p-7 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A16] shadow-[0_0_8px_#FF5A16]" />
              <span className="font-rajdhani font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                RECENT COMPLETED MATCH SCORECARDS
              </span>
            </div>
            <span className="font-rajdhani text-xs text-slate-400 font-bold uppercase tracking-wider">
              OFFICIAL SCORESHEET LOG
            </span>
          </div>

          {COMPLETED_MATCH_CARDS.length === 0 ? (
            <div className="p-8 text-center bg-black/30 border border-white/10 rounded-2xl">
              <Clock className="w-8 h-8 text-[#00F0FF] mx-auto mb-2 opacity-60" />
              <p className="font-rajdhani font-black text-sm text-white uppercase tracking-wider">NO COMPLETED SCORECARDS YET</p>
              <p className="text-xs text-slate-400 mt-1 font-sans">Scorecards will publish here as matches conclude on Courts 01 through 04.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {COMPLETED_MATCH_CARDS.map((m) => (
                <div
                  key={m.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#060D1A]/90 border border-white/15 hover:border-[#FF5A16]/50 transition-all shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 font-rajdhani text-xs">
                      <span className="text-[#FF5A16] font-bold uppercase tracking-wider">{m.matchNumber}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{m.court} • {m.duration}</span>
                    </div>

                    <div className="space-y-2.5 my-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {m.winner === "A" && <span className="text-xs">🏆</span>}
                          <div>
                            <p className={`font-rajdhani font-bold text-xs sm:text-sm ${m.winner === "A" ? "text-white font-black" : "text-slate-400"}`}>
                              {m.playerA}
                            </p>
                            <p className="font-sans text-[10px] text-slate-400">{m.instA}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 font-mono text-xs font-bold">
                          {m.sets.map((s, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded ${s.wonA ? "bg-[#FF5A16]/20 text-[#FF8A4A] border border-[#FF5A16]/30" : "text-slate-500"}`}>
                              {s.a}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {m.winner === "B" && <span className="text-xs">🏆</span>}
                          <div>
                            <p className={`font-rajdhani font-bold text-xs sm:text-sm ${m.winner === "B" ? "text-white font-black" : "text-slate-400"}`}>
                              {m.playerB}
                            </p>
                            <p className="font-sans text-[10px] text-slate-400">{m.instB}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 font-mono text-xs font-bold">
                          {m.sets.map((s, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded ${!s.wonA ? "bg-[#FF5A16]/20 text-[#FF8A4A] border border-[#FF5A16]/30" : "text-slate-500"}`}>
                              {s.b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-rajdhani font-bold text-[#00FF88]">
                    <span>MATCH CONCLUDED</span>
                    <span className="text-slate-400">STATUS: RATIFIED</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* ═══ BOTTOM BROADCAST TICKER ═══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#03060C]/95 border-t border-[#FF5A16]/30 backdrop-blur-xl px-4 py-2 flex items-center justify-between font-rajdhani text-xs text-slate-400 shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2.5 text-[#FF5A16] font-bold">
          <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-ping" />
          <span className="text-[#F8FAFC]">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
          <span className="text-white/30">|</span>
          <span className="text-[#00F0FF]">KLE TECH SPORTS COMPLEX</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[#FFD700] font-bold">
          <span>THE SOUTH CONVERGES</span>
          <span className="text-white/30">•</span>
          <span className="text-[#00F0FF]">THE COURT DECIDES</span>
        </div>
      </footer>
    </div>
  );
}

