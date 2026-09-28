"use client";

import React from "react";
import Image from "next/image";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { ANNOUNCEMENTS_DATA } from "@/data/announcements";
import { Megaphone, Pin, Bell, Calendar, Sparkles, X, CheckCircle2 } from "lucide-react";

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col justify-between selection:bg-[#FF5A16] selection:text-white">

      <ArcadeNav />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 my-4 z-10 pb-16">
        
        {/* ═══ MASTER HERO BANNER (WHITE & ORANGE THEME) ═══ */}
        <div className="relative border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-white to-orange-50/50 p-6 sm:p-8 rounded-2xl shadow-md mb-8 overflow-hidden">
          <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 border border-orange-300 rounded-full shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-pulse" />
                  <span className="font-rajdhani text-[11px] text-[#FF5A16] font-bold tracking-wider uppercase">
                    OFFICIAL BROADCAST BULLETIN
                  </span>
                </div>
                <span className="font-rajdhani text-xs text-orange-800 uppercase font-bold tracking-wider">
                  SOUTH ZONE 2026 DISPATCH
                </span>
              </div>

              <h1 className="font-rajdhani text-3xl sm:text-5xl text-slate-900 font-black tracking-tight mb-2 uppercase">
                TOURNAMENT <span className="text-[#FF5A16]">ANNOUNCEMENTS</span>
              </h1>

              <p className="font-sans text-xs sm:text-sm text-slate-700 max-w-xl leading-relaxed">
                Official notices, court schedule revisions, hostel protocols, and administrative circulars released by the Championship Organizing Committee.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 shadow-xs">
              <Megaphone className="w-8 h-8 text-[#FF5A16] animate-pulse" />
              <div>
                <div className="font-rajdhani text-xs text-[#FF5A16] font-bold uppercase tracking-wider">DISPATCH STATUS</div>
                <div className="font-rajdhani text-sm font-extrabold text-slate-900">LIVE BULLETIN FEED</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ANNOUNCEMENT FEED (WHITE & ORANGE CARDS WITH CRISP CONTRAST) ═══ */}
        <div className="flex flex-col gap-6">
          {ANNOUNCEMENTS_DATA.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-2xl p-6 sm:p-7 transition-all bg-white shadow-md border-2 hover:shadow-xl ${
                ann.pinned
                  ? "border-[#FF5A16] ring-4 ring-orange-500/10"
                  : "border-slate-200 hover:border-orange-400"
              }`}
            >
              {/* Header Strip with High Visibility Badges */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 flex-wrap gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A16] shrink-0" />
                  
                  {ann.pinned ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 font-rajdhani text-xs text-orange-900 font-bold tracking-wider uppercase shadow-xs">
                      <Pin className="w-3.5 h-3.5 text-[#FF5A16]" />
                      PINNED ANNOUNCEMENT
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-rajdhani text-xs text-slate-700 font-bold tracking-wider uppercase">
                      <Bell className="w-3.5 h-3.5 text-slate-500" />
                      OFFICIAL ADVISORY
                    </span>
                  )}

                  <span className="font-rajdhani text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                    {ann.category}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-[#FF5A16]" />
                  <span>{ann.date}</span>
                </div>
              </div>

              {/* Title: Pure Dark Slate for 100% Crisp Visibility */}
              <h2 className="font-rajdhani text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2.5">
                {ann.title}
              </h2>

              {/* Body: High-contrast Dark Slate Text */}
              <p className="font-sans text-sm sm:text-base text-slate-700 font-normal leading-relaxed">
                {ann.fullText}
              </p>

              {/* Verified Tournament Committee Tag */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-sans text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Championship Notice
                </span>
                <span className="font-rajdhani text-[11px] font-bold text-[#FF5A16] uppercase tracking-wider">
                  SOUTH ZONE WOMEN&apos;S BADMINTON 2026
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* BOTTOM BROADCAST TICKER */}
      <footer className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between font-rajdhani text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-2 text-[#FF5A16]">
          <span>🏸</span>
          <span className="text-slate-900 font-bold tracking-wider">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[#FF5A16] font-bold tracking-wider">
          <span className="text-orange-700">DISCIPLINE TODAY</span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-[#FF5A16]">CHAMPION TOMORROW</span>
        </div>
      </footer>
    </div>
  );
}
