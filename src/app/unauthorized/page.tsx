"use client";

import React from "react";
import Link from "next/link";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="p-8 sm:p-10 bg-[#07101D] border-2 border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.2)] rounded-xl w-full">
          {/* Security Icon */}
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-400" />
          </div>

          <span className="font-pixel text-6xl sm:text-7xl text-red-500 font-black tracking-widest block drop-shadow-[0_0_20px_rgba(239,68,68,0.4)] mb-2">
            403
          </span>

          <span className="font-pixel text-xs text-[#18D8D0] bg-[#050914] px-3 py-1 border border-[#18D8D0]/60 uppercase tracking-widest inline-block mb-4">
            ACCESS FORBIDDEN
          </span>

          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed mb-8">
            You do not have permission to access this page. Please return home or sign in with an authorized account.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="w-full sm:w-auto">
              <button className="w-full px-5 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition">
                <LogIn className="w-4 h-4" />
                <span>SIGN IN</span>
              </button>
            </Link>

            <Link href="/" className="w-full sm:w-auto">
              <button className="w-full px-4 py-2.5 bg-[#050914] hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs border border-slate-700 rounded flex items-center justify-center gap-2 transition">
                <ArrowLeft className="w-4 h-4" />
                <span>RETURN HOME</span>
              </button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-3 text-center font-mono text-[10px] text-slate-500">
        SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
      </footer>
    </div>
  );
}
