"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Server,
  Activity,
  Users,
  KeyRound,
  ShieldCheck,
  Settings,
  History,
  Home,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Clock,
  Terminal,
  RefreshCw,
  Cpu,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/rbac/useAuth";

export interface SystemAdminShellProps {
  currentTab?: string;
  onRefresh?: () => void;
  systemStatus?: "HEALTHY" | "DEGRADED" | "WARNING" | "ERROR";
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin/system", label: "01 OVERVIEW", icon: Server },
  { href: "/admin/system/health", label: "02 HEALTH & TELEMETRY", icon: Activity },
  { href: "/admin/system/accommodation", label: "03 HOUSING TOPOLOGY", icon: Home },
  { href: "/admin/system/users", label: "04 USERS", icon: Users },
  { href: "/admin/system/roles", label: "05 ROLES", icon: ShieldCheck },
  { href: "/admin/system/permissions", label: "06 PERMISSIONS", icon: KeyRound },
  { href: "/admin/system/configuration", label: "07 CONFIGURATION", icon: Settings },
  { href: "/admin/system/audit", label: "08 AUDIT TRAIL", icon: History },
];

export const SystemAdminShell: React.FC<SystemAdminShellProps> = ({
  currentTab,
  onRefresh,
  systemStatus = "HEALTHY",
  children,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#060608] text-[#f5e6ca] flex flex-col font-sans selection:bg-[#ff5500] selection:text-white">
      {/* ── TOP HUD COMMAND HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#0b0c10]/95 backdrop-blur border-b-2 border-[#1f2430]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Terminal Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#f5a623] hover:text-white border border-[#2d3748] rounded bg-[#0b0c10]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/admin/system" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-[#1b0d2b] border-2 border-[#ff5500] flex items-center justify-center text-[#ff5500] shadow-[0_0_12px_rgba(255,85,0,0.35)] group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5 text-[#ff5500]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-pixel text-xs sm:text-sm tracking-wider text-white">
                    SYSTEM <span className="text-[#ff5500]">//</span> COMMAND CENTER
                  </h1>
                  <span
                    className={`hidden sm:inline-block px-1.5 py-0.5 border font-pixel text-[8px] uppercase ${
                      systemStatus === "HEALTHY"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : systemStatus === "DEGRADED"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                        : "bg-red-500/20 text-red-400 border-red-500/50"
                    }`}
                  >
                    {systemStatus === "HEALTHY" ? "SYSTEM ONLINE" : `SYSTEM ${systemStatus}`}
                  </span>
                </div>
                <p className="hidden md:block font-pixel text-[9px] text-[#f5a623]/80">
                  CONTROL THE PLATFORM. PROTECT THE TOURNAMENT.
                </p>
              </div>
            </Link>
          </div>

          {/* Quick HUD Metrics & Clock */}
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#060608] border border-[#2d3748] font-pixel text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400">DATA CORE: 200 OK</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#060608] border border-[#2d3748] font-pixel text-[10px]">
              <Clock className="w-3.5 h-3.5 text-[#f5a623]" />
              <span className="text-[#f5a623]">{currentTime || "00:00:00 IST"}</span>
            </div>
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 bg-[#0b0c10] hover:bg-[#1a202c] text-[#f5e6ca] border border-[#2d3748] transition-colors"
                title="Refresh System Telemetry"
                aria-label="Refresh Data"
              >
                <RefreshCw className="w-4 h-4 hover:rotate-180 transition-transform duration-500" />
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 bg-[#060608] border border-[#2d3748] hover:border-[#ff5500] text-xs transition-colors"
              >
                <div className="w-6 h-6 bg-[#ff5500]/20 border border-[#ff5500] flex items-center justify-center font-pixel text-[10px] text-[#ff5500]">
                  {user?.name ? user.name[0].toUpperCase() : "A"}
                </div>
                <span className="hidden sm:inline font-pixel text-[10px] text-white">ROOT</span>
                <ChevronDown className="w-3 h-3 text-[#f5a623]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0b0c10] border-2 border-[#ff5500] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-50">
                  <div className="border-b border-[#2d3748] pb-2 mb-2">
                    <p className="font-pixel text-[11px] text-white truncate">{user?.name || "Super Administrator"}</p>
                    <p className="text-[10px] text-[#f5a623] truncate">{user?.email || "admin@szwbt2026.edu"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-[#ff5500]/20 text-[#ff5500] font-pixel text-[8px]">
                        LEVEL 04 ROOT
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-pixel text-[8px]">
                        SUPER ADMIN
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-2 py-1.5 bg-[#ff5500]/10 hover:bg-[#ff5500]/20 text-[#ff5500] font-pixel text-[10px] border border-[#ff5500]/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> SIGN OUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Navigation Strip (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto px-6 py-1 bg-[#060608] border-t border-[#1f2430] no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isSelected = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 font-pixel text-[10px] uppercase whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-[#ff5500] text-white border-[#ff5500] shadow-[0_0_8px_rgba(255,85,0,0.4)]"
                    : "bg-[#0b0c10] text-[#f5e6ca] border-[#2d3748] hover:border-[#f5a623] hover:text-[#f5a623]"
                }`}
              >
                <Icon className="w-3 h-3 text-[#f5a623]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0b0c10] border-r-2 border-[#ff5500] p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
                <span className="font-pixel text-xs text-white">SYSTEM NAVIGATION</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isSelected = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full text-left px-3 py-2 font-pixel text-xs flex items-center gap-2 border transition-all ${
                        isSelected
                          ? "bg-[#ff5500] text-white border-[#ff5500]"
                          : "bg-[#060608] text-[#f5e6ca] border-[#2d3748] hover:border-[#f5a623]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#f5a623]" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#2d3748]">
              <div className="font-pixel text-[10px] text-gray-400 mb-2">CLEARANCE STATUS</div>
              <div className="p-2 bg-[#060608] border border-[#2d3748] text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="text-[#ff5500] font-pixel">04 ROOT</span>
                </div>
                <div className="flex justify-between">
                  <span>Authority:</span>
                  <span className="text-emerald-400 font-pixel">UNRESTRICTED</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Workspace Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 mb-14 lg:mb-6">{children}</main>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0c10] border-t-2 border-[#1f2430] p-2 flex items-center justify-around">
        <Link
          href="/admin/system"
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Server className="w-4 h-4 text-[#ff5500]" />
          <span className="font-pixel text-[8px]">CORE</span>
        </Link>
        <Link
          href="/admin/system/health"
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-pixel text-[8px]">HEALTH</span>
        </Link>
        <Link
          href="/admin/system/users"
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="font-pixel text-[8px]">USERS</span>
        </Link>
        <Link
          href="/admin/system/configuration"
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Settings className="w-4 h-4 text-[#f5a623]" />
          <span className="font-pixel text-[8px]">CONFIG</span>
        </Link>
        <Link
          href="/admin/system/audit"
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <History className="w-4 h-4 text-yellow-400" />
          <span className="font-pixel text-[8px]">AUDIT</span>
        </Link>
      </div>
    </div>
  );
};
