"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Clock, MapPin, ChevronRight, Filter, Trophy, ArrowRight, Play, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { ScheduleMatch, getStoredSchedule } from "@/data/scheduleStorage";

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState("OCT18");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [scheduleData, setScheduleData] = useState<Record<string, { matches: ScheduleMatch[]; isTba: boolean }>>({});
  const [loading, setLoading] = useState(true);

  const dayTabs = [
    { id: "OCT18", date: "OCT 18", dayNumber: "Day 1", title: "Round 1" },
    { id: "OCT19", date: "OCT 19", dayNumber: "Day 2", title: "Round 2 & QF" },
    { id: "OCT20", date: "OCT 20", dayNumber: "Day 3", title: "Semi-Finals" },
    { id: "OCT21", date: "OCT 21", dayNumber: "Day 4", title: "Grand Finals" },
  ];

  const fetchScheduleFromDb = async () => {
    try {
      const res = await fetch("/api/schedule");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const map: Record<string, { matches: ScheduleMatch[]; isTba: boolean }> = {};
          for (const k of Object.keys(json.data)) {
            map[k] = {
              matches: json.data[k].matches || [],
              isTba: json.data[k].isTba ?? ((json.data[k].matches || []).length === 0),
            };
          }
          setScheduleData(map);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("API fetch error, fallback to local storage", e);
    }

    // Fallback to local storage
    const local = getStoredSchedule();
    const fallbackMap: Record<string, { matches: ScheduleMatch[]; isTba: boolean }> = {
      OCT18: { matches: local.OCT18 || [], isTba: false },
      OCT19: { matches: local.OCT19 || [], isTba: (local.OCT19 || []).length === 0 },
      OCT20: { matches: local.OCT20 || [], isTba: (local.OCT20 || []).length === 0 },
      OCT21: { matches: local.OCT21 || [], isTba: (local.OCT21 || []).length === 0 },
    };
    setScheduleData(fallbackMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchScheduleFromDb();
    const handleUpdate = () => fetchScheduleFromDb();
    window.addEventListener("szwbt_schedule_updated", handleUpdate);
    return () => window.removeEventListener("szwbt_schedule_updated", handleUpdate);
  }, []);

  const currentDayInfo = scheduleData[selectedDay];
  const isTba = currentDayInfo ? currentDayInfo.isTba : (selectedDay !== "OCT18");
  const currentMatches = currentDayInfo?.matches || [];
  const filteredMatches = categoryFilter === "ALL" 
    ? currentMatches 
    : currentMatches.filter((m) => m.category.toLowerCase().includes(categoryFilter.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-24 z-10">
        
        {/* ═══ MASTER SCHEDULE BANNER — EXACT TO REFERENCE 3 (PANEL 03) & REFERENCE 1 ═══ */}
        <section className="relative w-full border border-[#FF5A16]/40 bg-[#050A18]/85 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.85)] mb-8 overflow-hidden rounded-3xl">
          {/* Background image: dusk arena with high visual clarity */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/college-campus-pixel.jpg"
              alt="KLE Tech Arena & Female Athlete"
              fill
              priority
              className="object-cover object-center opacity-75 filter contrast-110 brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#03060C]/90 via-[#03060C]/60 to-[#03060C]/40 lg:w-3/4" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050A18] via-transparent to-[#03060C]/60" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col justify-between min-h-[360px]">
            {/* Top tags */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#00F0FF] text-black font-rajdhani text-[11px] font-bold tracking-wider uppercase rounded-full shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                  SCHEDULE
                </span>
                <span className="font-rajdhani text-xs text-[#FFD700] uppercase tracking-widest font-bold">
                  EVERY MATCH A NEW STORY
                </span>
              </div>
              <span className="font-rajdhani text-xs text-slate-400">
                KLE TECH ARENA • 8 COURTS LIVE
              </span>
            </div>

            {/* Title */}
            <div className="max-w-xl">
              <h1 className="font-rajdhani text-4xl sm:text-6xl text-white font-black tracking-tight uppercase leading-none"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 0 25px rgba(0,240,255,0.3)" }}>
                MATCH <span className="bg-gradient-to-r from-white via-[#00F0FF] to-[#0077FE] bg-clip-text text-transparent">SCHEDULE</span>
              </h1>
              <p className="font-rajdhani text-xs text-[#00F0FF] mt-2 uppercase tracking-wider font-bold">
                OCTOBER 18 – 21, 2026 • OFFICIAL BWF TIMINGS
              </p>
              <p className="font-sans text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed">
                Real-time court allocations, match progression, and live scoring links across all 4 championship days.
              </p>
            </div>

            {/* Quote on right */}
            <div className="hidden lg:block absolute right-12 bottom-12 max-w-xs text-right bg-[#050914]/85 border border-[#00F0FF]/40 p-4 rounded-xl backdrop-blur-md">
              <p className="font-rajdhani text-xs text-white uppercase font-bold">
                &quot;TIME ON COURT
              </p>
              <p className="font-rajdhani text-xs text-[#FFD700] uppercase font-bold">
                BUILDS CHARACTER.&quot;
              </p>
              <span className="font-rajdhani text-[10px] text-[#00F0FF] mt-1 block uppercase font-bold">
                EFFORT BUILDS CHAMPIONS
              </span>
            </div>
          </div>
        </section>

        {/* ═══ DAY SELECTOR TABS & FILTER BAR (EXACT TO REFERENCE 3 PANEL 03) ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Day Pills: [OCT 18 / Day 1] [OCT 19 / Day 2] [OCT 20 / Day 3] [OCT 21 / Day 4] */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {dayTabs.map((day) => {
              const isActive = selectedDay === day.id;
              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`px-4 sm:px-6 py-2.5 font-rajdhani text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer rounded-lg border flex items-center gap-2 ${
                    isActive
                      ? "bg-[#00F0FF] text-black border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      : "bg-[#07101D] text-[#F8FAFC] border-white/20 hover:border-[#00F0FF]/50"
                  }`}
                >
                  <span>{day.date}</span>
                  <span className="text-[10px] opacity-80 font-mono">[{day.dayNumber}]</span>
                </button>
              );
            })}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00F0FF]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#07101D] border border-[#00F0FF]/40 text-[#F8FAFC] font-rajdhani text-xs p-2 outline-none rounded-lg"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="Singles">WOMEN&apos;S SINGLES</option>
              <option value="Doubles">WOMEN&apos;S DOUBLES</option>
              <option value="Teams">INSTITUTION TEAMS</option>
              <option value="Mixed">MIXED DOUBLES</option>
            </select>
          </div>
        </div>

        {/* ═══ ARCADE SCHEDULE TABLE MATRIX OR TBA VIEW ═══ */}
        <div className="bg-[#07101D]/90 backdrop-blur-xl border-2 border-[#00F0FF]/40 p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.7)] rounded-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 font-rajdhani text-xs">
            <span className="text-[#00F0FF] font-bold uppercase tracking-wider">
              MATCHES FOR {dayTabs.find((d) => d.id === selectedDay)?.date} — {dayTabs.find((d) => d.id === selectedDay)?.title}
            </span>
            <span className={isTba ? "text-amber-400 font-bold" : "text-[#00FF88] font-bold"}>
              {isTba ? "STATUS: TBA (PENDING CSV INTAKE)" : `${filteredMatches.length} MATCHES SCHEDULED`}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#00F0FF] animate-spin mb-3" />
              <p className="font-rajdhani text-xs text-slate-400">FETCHING LIVE FIXTURES FROM DATABASE...</p>
            </div>
          ) : isTba ? (
            /* ═══ OFFICIAL TBA VIEW (WHEN SUPER ADMIN HAS NOT UPLOADED CSV YET) ═══ */
            <div className="py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_20px_rgba(245,166,35,0.2)]">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#050914] border border-amber-500/50 text-amber-400 font-rajdhani text-[10px] uppercase tracking-wider mb-3 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>OFFICIAL FIXTURES TBA • PENDING CSV UPLOAD</span>
              </div>

              <h3 className="font-rajdhani text-xl sm:text-2xl text-white font-extrabold uppercase mb-2">
                FIXTURES TO BE ANNOUNCED (TBA)
              </h3>

              <p className="font-sans text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed mb-6">
                The match roster, court assignments, and qualifiers for <strong className="text-white">{dayTabs.find((d) => d.id === selectedDay)?.date} ({dayTabs.find((d) => d.id === selectedDay)?.title})</strong> are currently withheld pending the Super Admin&apos;s daily CSV fixture intake. Once uploaded, the court schedule will immediately publish here.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/admin"
                  className="px-5 py-2.5 bg-[#00F0FF] hover:bg-white text-black font-rajdhani text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center gap-2 cursor-pointer rounded-lg"
                >
                  <span>SUPER ADMIN: UPLOAD CSV FOR THIS DAY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={fetchScheduleFromDb}
                  className="px-4 py-2.5 bg-[#050914] border border-[#00F0FF]/40 hover:border-[#00F0FF] text-[#00F0FF] font-rajdhani text-xs tracking-wider flex items-center gap-2 cursor-pointer transition-colors rounded-lg font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>REFRESH STATUS</span>
                </button>
              </div>
            </div>
          ) : (
            /* ═══ REAL MATCHES TABLE ═══ */
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e2638] font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider">
                      <th className="py-3 px-3">TIME</th>
                      <th className="py-3 px-3">CATEGORY</th>
                      <th className="py-3 px-3">COURT</th>
                      <th className="py-3 px-3">MATCH</th>
                      <th className="py-3 px-3">PLAYERS / INSTITUTIONS</th>
                      <th className="py-3 px-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2638]/70 text-xs">
                    {filteredMatches.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-[#050914]/80 transition-colors group"
                      >
                        {/* Time */}
                        <td className="py-3.5 px-3 font-mono font-bold text-[#FFD700] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
                            <span>{m.time}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 font-rajdhani text-xs font-bold text-white whitespace-nowrap">
                          {m.category}
                        </td>

                        {/* Court */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="font-rajdhani text-[11px] font-bold text-[#00F0FF] bg-[#050914] px-2.5 py-0.5 border border-[#00F0FF]/30 rounded">
                            {m.court}
                          </span>
                        </td>

                        {/* Match number */}
                        <td className="py-3.5 px-3 font-mono text-xs text-[#00F0FF] font-bold whitespace-nowrap">
                          {m.matchNumber}
                        </td>

                        {/* Players & Institutions */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-0.5 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{m.playerA}</span>
                              <span className="text-[10px] text-slate-400 truncate">({m.institutionA})</span>
                            </div>
                            <span className="text-[9px] text-[#00F0FF] font-mono font-bold">VS</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{m.playerB}</span>
                              <span className="text-[10px] text-slate-400 truncate">({m.institutionB})</span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {m.status === "LIVE" ? (
                            <Link href="/matches">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#00F0FF] text-black font-rajdhani text-[10px] font-bold animate-pulse cursor-pointer rounded shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                                <Play className="w-3 h-3 fill-current" />
                                <span>LIVE (WATCH)</span>
                              </span>
                            </Link>
                          ) : m.status === "COMPLETED" ? (
                            <span className="inline-block px-2 py-0.5 bg-[#00FF88]/15 border border-[#00FF88]/40 text-[#00FF88] font-rajdhani text-[10px] font-bold rounded">
                              COMPLETED
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-[#050914] border border-white/10 text-slate-400 font-rajdhani text-[10px] rounded">
                              UPCOMING
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action footer */}
              <div className="flex flex-wrap items-center justify-between pt-5 border-t border-white/10 mt-4 gap-4">
                <span className="font-rajdhani text-xs text-slate-400">
                  MATCHES SUBJECT TO COURT RUNTIME &amp; REFEREE SCHEDULING
                </span>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ═══ BOTTOM BROADCAST TICKER ═══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#050914]/95 backdrop-blur-md border-t border-[#00F0FF]/30 px-4 py-2 flex items-center justify-between font-rajdhani text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-[#00F0FF]">
          <span>🏸</span>
          <span className="text-white font-bold">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[#00F0FF] font-bold">
          <span>OCT 18 – 21 • 8 COURTS LIVE</span>
          <span className="text-[#FFD700]">DISCIPLINE TODAY — CHAMPION TOMORROW</span>
          <span className="text-white">KLE TECH ARENA</span>
        </div>
      </footer>
    </div>
  );
}
