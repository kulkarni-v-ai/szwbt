"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home, X, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050914] text-[#F8FAFC] font-sans flex flex-col justify-between items-center p-6 text-center overflow-x-hidden selection:bg-[#00F0FF] selection:text-black">
      <div className="w-full max-w-7xl flex items-center justify-between border-b border-[#00F0FF]/30 pb-4">
        <Link href="/" className="font-rajdhani text-xs text-white font-bold flex items-center gap-2">
          <span>🏸</span>
          <span>SOUTH ZONE WOMEN&apos;S BADMINTON 2026</span>
        </Link>
        <Link href="/">
          <span className="font-rajdhani text-xs text-[#00F0FF] font-bold hover:underline">ARENA HOME &gt;</span>
        </Link>
      </div>

      <div className="max-w-2xl w-full my-auto flex flex-col items-center gap-6 z-10">
        {/* Large Cyber 404 Visual */}
        <div className="relative flex items-center justify-center">
          <span className="font-rajdhani text-8xl sm:text-9xl text-white font-black tracking-widest drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-rajdhani text-xs text-[#00F0FF] bg-[#07101D] px-4 py-1.5 border border-[#00F0FF]/60 rounded uppercase tracking-widest shadow-lg font-bold">
              OUT OF BOUNDS
            </span>
          </div>
        </div>

        <h1 className="font-rajdhani text-2xl sm:text-3xl text-white font-extrabold uppercase">
          PAGE NOT FOUND
        </h1>

        <p className="font-sans text-xs sm:text-sm text-slate-400 max-w-md">
          The requested coordinate or court route is out of play. Return to the championship arena to resume navigation.
        </p>

        <Link href="/" className="mt-2">
          <button className="px-6 py-3 bg-[#00F0FF] text-black font-rajdhani text-xs font-black uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer flex items-center gap-2 rounded-lg">
            <Home className="w-4 h-4" />
            <span>RETURN TO ARENA HOME</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* BOTTOM BROADCAST TICKER */}
      <footer className="w-full max-w-7xl border-t border-[#00F0FF]/30 pt-4 flex items-center justify-between font-rajdhani text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-[#00F0FF]">
          <span>🏸</span>
          <span className="text-white font-bold">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[#00F0FF] font-bold">
          <span className="text-[#FFD700]">DISCIPLINE TODAY</span>
          <span className="text-white">•</span>
          <span>CHAMPION TOMORROW</span>
          <X className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
        </div>
      </footer>
    </div>
  );
}
