"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Trophy,
  Flame,
  LayoutGrid,
  Settings,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Menu,
  X,
  LogOut,
  RefreshCw,
} from "lucide-react";

interface TournamentAdminShellProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function TournamentAdminShell({ children, activeTab }: TournamentAdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("admin@szwbt2026.edu");
  const [userRole, setUserRole] = useState<string>("TOURNAMENT_ADMIN");
  const [quickStatus, setQuickStatus] = useState<{
    tournamentStatus: string;
    isLocked: boolean;
    totalMatches: number;
    liveMatches: number;
    totalCourts: number;
  }>({
    tournamentStatus: "LIVE",
    isLocked: false,
    totalMatches: 0,
    liveMatches: 0,
    totalCourts: 8,
  });

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/api/tournament/overview");
        if (res.status === 401) {
          router.push("/login?redirect=/admin/tournament");
          return;
        }
        if (res.status === 403) {
          router.push("/unauthorized?required=TOURNAMENT_ADMIN");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.tournament) {
            setQuickStatus({
              tournamentStatus: data.tournament.status || "LIVE",
              isLocked: data.tournament.isScheduleLocked || false,
              totalMatches: data.metrics?.totalMatches || 0,
              liveMatches: data.metrics?.liveMatches || 0,
              totalCourts: data.metrics?.courts || 8,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load tournament quick status:", err);
      }
    }
    loadTelemetry();
  }, [router]);

  const navTabs = [
    { label: "COMMAND DECK", href: "/admin/tournament", icon: LayoutGrid, key: "overview" },
    { label: "FIXTURES & DRAW", href: "/admin/tournament/fixtures", icon: Trophy, key: "fixtures" },
    { label: "SETTINGS", href: "/admin/tournament/settings", icon: Settings, key: "settings" },
    { label: "CATEGORIES", href: "/admin/tournament/categories", icon: Layers, key: "categories" },
    { label: "EVENTS", href: "/admin/tournament/events", icon: Trophy, key: "events" },
    { label: "ROUNDS", href: "/admin/tournament/rounds", icon: Layers, key: "rounds" },
    { label: "COURTS", href: "/admin/tournament/courts", icon: MapPin, key: "courts" },
    { label: "SCHEDULE", href: "/admin/tournament/schedule", icon: Calendar, key: "schedule" },
    { label: "CONFLICTS", href: "/admin/tournament/conflicts", icon: AlertTriangle, key: "conflicts" },
    { label: "READINESS", href: "/admin/tournament/readiness", icon: CheckCircle2, key: "readiness" },
  ];

  const crossModuleLinks = [
    { label: "Registrations", href: "/admin/registrations" },
    { label: "Accommodation", href: "/admin/accommodation" },
    { label: "Transport Fleet", href: "/admin/transport" },
    { label: "Live Arena", href: "/admin/live" },
    { label: "Officials Desk", href: "/official" },
    { label: "Support Desk", href: "/support" },
    { label: "Reports", href: "/admin/reports" },
    { label: "System Core", href: "/admin/system" },
  ];

  return (
    <div className="min-h-screen bg-[#060608] text-[#f5e6ca] font-mono selection:bg-[#ff5500] selection:text-black relative">
      {/* CRT Scanline Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"
        aria-hidden="true"
      />

      {/* Top Tournament Command Header */}
      <header className="border-b-2 border-[#ff5500]/40 bg-[#0b0c10]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title / Identity */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#1b0d2b] border-2 border-[#ff5500] flex items-center justify-center shadow-[0_0_12px_rgba(255,85,0,0.3)]">
                <Trophy className="w-5 h-5 text-[#ff5500] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-1.5 py-0.5 bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40 font-bold tracking-widest uppercase">
                    SZWBT 2026 // LEVEL 03
                  </span>
                  <span className="text-[10px] text-cyan-400 border border-cyan-400/40 px-1 py-0.2 bg-cyan-950/40">
                    ARENA CONTROLLER
                  </span>
                  {quickStatus.isLocked && (
                    <span className="flex items-center space-x-1 text-[10px] text-amber-400 border border-amber-400/40 px-1.5 py-0.5 bg-amber-950/40">
                      <Lock className="w-2.5 h-2.5" />
                      <span>SCHEDULE LOCKED</span>
                    </span>
                  )}
                </div>
                <h1 className="text-sm sm:text-base font-bold tracking-wider text-white flex items-center gap-2">
                  <span>TOURNAMENT // COMMAND CENTER</span>
                </h1>
              </div>
            </div>

            {/* Quick Status LEDs (Desktop) */}
            <div className="hidden lg:flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2 px-2.5 py-1 bg-black/60 border border-[#2a2a3a]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="text-[10px] text-zinc-400">STATE:</span>
                <span className="text-[10px] font-bold text-emerald-400">{quickStatus.tournamentStatus}</span>
              </div>
              <div className="flex items-center space-x-2 px-2.5 py-1 bg-black/60 border border-[#2a2a3a]">
                <span className="text-[10px] text-zinc-400">FIXTURES:</span>
                <span className="text-[10px] font-bold text-[#f5a623]">{quickStatus.totalMatches}</span>
              </div>
              <div className="flex items-center space-x-2 px-2.5 py-1 bg-black/60 border border-[#2a2a3a]">
                <span className="text-[10px] text-zinc-400">COURTS:</span>
                <span className="text-[10px] font-bold text-cyan-400">{quickStatus.totalCourts} ACTIVE</span>
              </div>

              {/* Direct Link to Live Arena */}
              <Link
                href="/admin/live"
                className="flex items-center space-x-1.5 px-3 py-1 bg-[#ff5500]/15 hover:bg-[#ff5500]/30 text-[#ff5500] border border-[#ff5500]/50 transition-colors text-xs font-bold"
              >
                <Flame className="w-3.5 h-3.5 animate-bounce" />
                <span>LIVE ARENA</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 border border-[#ff5500]/40 bg-black/60 text-[#ff5500]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Sub Navigation Strip */}
          <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1 border-t border-[#1b0d2b]">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold tracking-wider whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? "text-white bg-[#ff5500]/20 border-[#ff5500] shadow-[inset_0_-2px_8px_rgba(255,85,0,0.3)]"
                      : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#ff5500]" : "text-zinc-400"}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b-2 border-[#ff5500]/40 bg-[#0b0c10] p-4 space-y-3 z-50 relative">
          <div className="text-xs text-zinc-400 font-bold mb-2 uppercase tracking-widest">
            Cross-Module Coordination
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {crossModuleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 bg-black/60 border border-[#2a2a3a] text-zinc-300 hover:text-white hover:border-[#ff5500]/50"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-2 border-t border-[#1b0d2b] flex justify-between items-center text-xs">
            <span className="text-zinc-400">Clearance: TOURNAMENT_ADMIN</span>
            <Link href="/login" className="text-rose-400 flex items-center space-x-1">
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </Link>
          </div>
        </div>
      )}

      {/* Charter Banner / Subtitle */}
      <div className="bg-[#1b0d2b]/60 border-b border-[#ff5500]/20 px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-[#f5a623]" />
            <span className="italic font-sans text-zinc-300">
              "ONE ARENA. ONE TOURNAMENT. EVERY DETAIL IN SYNC."
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-3 text-[10px]">
            <span>CROSS-MODULE COORDINATION:</span>
            {crossModuleLinks.slice(0, 4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center space-x-0.5"
              >
                <span>{link.label}</span>
                <ExternalLink className="w-2.5 h-2.5 inline" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">{children}</main>

      {/* Mobile Sticky Bottom Status Strip */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0c10]/95 border-t border-[#ff5500]/40 px-3 py-2 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-zinc-400">SZWBT 2026</span>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/tournament/readiness"
            className="px-2 py-1 bg-black/80 border border-[#2a2a3a] text-[10px] text-cyan-400 font-bold"
          >
            READINESS
          </Link>
          <Link
            href="/admin/tournament/schedule"
            className="px-2 py-1 bg-[#ff5500]/20 border border-[#ff5500]/60 text-[10px] text-white font-bold"
          >
            SCHEDULE
          </Link>
        </div>
      </footer>
    </div>
  );
}
