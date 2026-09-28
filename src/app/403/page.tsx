"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { useAuth } from "@/lib/rbac/useAuth";
import { ShieldAlert, ArrowLeft, LogIn, ChevronRight } from "lucide-react";

function ForbiddenContent() {
  const { user, roles } = useAuth();

  // Determine user's authorized destination
  const getAuthorizedDashboard = () => {
    if (user?.targetUrl) return user.targetUrl;
    if (roles.includes("SUPER_ADMIN")) return "/admin";
    if (roles.includes("TOURNAMENT_ADMIN")) return "/admin/tournament";
    if (roles.includes("REGISTRATION_STAFF")) return "/admin/registrations";
    if (roles.includes("ACCOMMODATION_STAFF")) return "/admin/accommodation";
    if (roles.includes("TRANSPORT_STAFF")) return "/admin/transport";
    if (roles.includes("FINANCE_STAFF")) return "/admin/finance";
    if (roles.includes("MATCH_OFFICIAL")) return "/official";
    if (roles.includes("ORGANIZER")) return "/organizer";
    if (roles.includes("OPERATIONS_STAFF")) return "/operations";
    if (roles.includes("VOLUNTEER")) return "/volunteer";
    if (roles.includes("TEAM_MANAGER")) return "/team";
    if (roles.includes("PARTICIPANT")) return "/dashboard";
    if (roles.includes("SUPPORT_STAFF")) return "/support";
    return "/";
  };

  const returnDashboardUrl = getAuthorizedDashboard();

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 flex flex-col items-center justify-center text-center z-10">
      <div className="relative bg-[#07101D] border-2 border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.2)] w-full p-8 sm:p-10 rounded-xl overflow-hidden">
        {/* Subtle scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-25 z-0" />

        {/* 403 Icon & Code */}
        <div className="relative z-10 mb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-400" />
          </div>
          <span className="font-pixel text-6xl sm:text-7xl text-red-500 font-black tracking-widest block drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            403
          </span>
          <span className="font-pixel text-xs text-[#18D8D0] bg-[#050914] px-3 py-1 border border-[#18D8D0]/60 uppercase tracking-widest inline-block mt-2">
            ACCESS FORBIDDEN
          </span>
        </div>

        {/* Clean, Simple Message */}
        <p className="relative z-10 text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed mb-8">
          You do not have permission to access this page. Please return to your assigned dashboard or log in with an authorized account.
        </p>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={returnDashboardUrl} className="w-full sm:w-auto">
            <button
              id="btn-return-dashboard"
              className="w-full sm:w-auto px-5 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 rounded transition cursor-pointer"
            >
              <span>GO TO DASHBOARD</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>

          <Link href="/login" className="w-full sm:w-auto">
            <button
              id="btn-switch-account"
              className="w-full sm:w-auto px-4 py-2.5 bg-[#050914] hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 rounded transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>SWITCH ACCOUNT</span>
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white">
      <ArcadeNav />

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <span className="font-pixel text-xs text-red-400 animate-pulse">CHECKING ACCESS...</span>
          </div>
        }
      >
        <ForbiddenContent />
      </Suspense>

      <footer className="w-full bg-[#050914] border-t border-slate-900 py-3 px-4 text-center text-[10px] text-slate-500 font-mono">
        SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
      </footer>
    </div>
  );
}
