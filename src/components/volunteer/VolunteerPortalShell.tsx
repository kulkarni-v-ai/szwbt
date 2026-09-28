"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  CheckSquare,
  Calendar,
  AlertTriangle,
  Megaphone,
  User,
  Clock,
  LogOut,
  Bell,
  Menu,
  X,
  Wifi,
  WifiOff,
  LifeBuoy,
  Radio,
  ChevronDown,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface VolunteerPortalShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  shiftStatus: string;
  activeTasksCount: number;
  openIssuesCount: number;
  assignedArea?: string;
  onRefresh?: () => void;
  onRequestHelp?: () => void;
  children: React.ReactNode;
}

export const VolunteerPortalShell: React.FC<VolunteerPortalShellProps> = ({
  currentTab,
  onSelectTab,
  shiftStatus,
  activeTasksCount,
  openIssuesCount,
  assignedArea,
  onRefresh,
  onRequestHelp,
  children,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isOnShift = shiftStatus === "ON_SHIFT";

  const navItems = [
    { id: "overview", label: "OVERVIEW", icon: Layers, badge: null },
    {
      id: "tasks",
      label: "TASKS",
      icon: CheckSquare,
      badge: activeTasksCount > 0 ? `${activeTasksCount}` : null,
      badgeVariant: "cyan",
    },
    { id: "assignments", label: "ASSIGNMENTS", icon: Calendar, badge: null },
    {
      id: "issues",
      label: "REPORTED ISSUES",
      icon: AlertTriangle,
      badge: openIssuesCount > 0 ? `${openIssuesCount}` : null,
      badgeVariant: "yellow",
    },
    { id: "notifications", label: "NOTIFICATIONS", icon: Megaphone, badge: null },
    { id: "profile", label: "MY PROFILE", icon: User, badge: null },
  ];

  return (
    <div className="min-h-screen bg-[#050914] text-pixel-cream flex flex-col font-sans selection:bg-pixel-orange-fiery selection:text-white">
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pixel-orange-fiery/5 via-transparent to-black/80 z-40" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP VOLUNTEER HUD */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#07101D]/95 backdrop-blur-md border-b-2 border-pixel-orange-fiery/40 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-pixel-cream hover:text-pixel-orange-fiery border border-pixel-gray-800 bg-[#0A1628] rounded focus:outline-none"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/volunteer" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#0A1628] border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-xs text-pixel-orange-fiery shadow-[0_0_10px_rgba(217,78,22,0.4)] group-hover:scale-105 transition-transform">
              VLT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[11px] sm:text-xs text-pixel-cream tracking-wider">
                  SOUTH ZONE 2026
                </span>
                <span className="text-[10px] text-pixel-cyan hidden sm:inline-block font-mono">
                  [FIELD OPS]
                </span>
              </div>
              <p className="font-pixel text-[9px] sm:text-[10px] text-pixel-orange-fiery tracking-widest uppercase">
                VOLUNTEER OPERATIONS PORTAL
              </p>
            </div>
          </Link>
        </div>

        {/* Center Live HUD Telemetry (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 bg-[#0A1628] border border-pixel-orange-fiery/30 px-3.5 py-1.5 rounded-sm text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnShift ? "bg-pixel-green animate-pulse" : "bg-pixel-gray-500"
              }`}
            />
            <span
              className={`font-pixel text-[10px] ${
                isOnShift ? "text-pixel-green" : "text-pixel-gray-400"
              }`}
            >
              {isOnShift ? "● ON SHIFT" : "○ OFF SHIFT"}
            </span>
          </div>

          <div className="h-3 w-px bg-pixel-gray-800" />

          <div className="flex items-center gap-1 text-pixel-gray-300">
            <span className="text-pixel-gray-500">AREA:</span>
            <span className="text-pixel-cream truncate max-w-[150px]">
              {assignedArea || "Court Operations"}
            </span>
          </div>

          <div className="h-3 w-px bg-pixel-gray-800" />

          <div className="flex items-center gap-1.5 text-pixel-cream font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-pixel-orange-fiery" />
            <span>{currentTime || "10:00:00 IST"}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* REQUEST HELP Quick Action */}
          {onRequestHelp && (
            <button
              onClick={onRequestHelp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pixel-red/20 hover:bg-pixel-red/30 border border-pixel-red/60 text-pixel-red font-pixel text-[10px] tracking-wider transition-all shadow-[0_0_8px_rgba(239,68,68,0.2)]"
            >
              <LifeBuoy className="w-3.5 h-3.5 animate-bounce" />
              <span>REQUEST HELP</span>
            </button>
          )}

          {/* Connection status */}
          <div
            className={`hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border ${
              isOnline
                ? "bg-pixel-green/10 border-pixel-green/30 text-pixel-green"
                : "bg-pixel-red/10 border-pixel-red/30 text-pixel-red"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden md:inline">{isOnline ? "ONLINE" : "OFFLINE"}</span>
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 bg-[#0A1628] hover:bg-[#102038] border border-pixel-gray-800 rounded transition-colors text-left"
              aria-label="User profile options"
            >
              <div className="w-7 h-7 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery flex items-center justify-center font-pixel text-[10px] text-pixel-orange-fiery">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "VL"}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-pixel-cream leading-tight truncate max-w-[120px]">
                  {user?.name || "Field Volunteer"}
                </p>
                <p className="text-[10px] text-pixel-orange-fiery font-mono leading-none">
                  {user?.badge || "MOBILE FIELD"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-pixel-gray-400 hidden md:block" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#07101D] border-2 border-pixel-orange-fiery shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-pixel-gray-800">
                  <p className="font-pixel text-[11px] text-pixel-cream truncate">
                    {user?.name || "Field Volunteer"}
                  </p>
                  <p className="font-mono text-[10px] text-pixel-gray-400 truncate">
                    {user?.email || "volunteer@szwbt2026.edu"}
                  </p>
                  <div className="mt-1">
                    <PixelBadge variant="orange">
                      VOLUNTEER CLEARANCE
                    </PixelBadge>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      onSelectTab("profile");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-pixel-gray-300 hover:text-pixel-cream hover:bg-[#0A1628] rounded text-left transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-pixel-cyan" />
                    <span>My Profile</span>
                  </button>
                </div>

                <div className="border-t border-pixel-gray-800 pt-1">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-pixel-red hover:bg-pixel-red/10 rounded text-left transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BODY WITH DESKTOP SIDEBAR + MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#07101D] border-r-2 border-pixel-gray-800/80 
            flex flex-col transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Shift status pill banner */}
          <div className="p-3 bg-[#0A1628] border-b border-pixel-gray-800 flex items-center justify-between">
            <span className="font-pixel text-[10px] text-pixel-cyan tracking-wider">
              FIELD DEPLOYMENT
            </span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                isOnShift ? "bg-pixel-green/20 text-pixel-green border border-pixel-green/40" : "bg-pixel-gray-800 text-pixel-gray-400"
              }`}
            >
              {shiftStatus}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-xs font-pixel tracking-wider
                    transition-all text-left
                    ${
                      isActive
                        ? "bg-pixel-orange-fiery/20 border-l-4 border-pixel-orange-fiery text-pixel-orange-fiery font-bold shadow-[inset_0_0_10px_rgba(217,78,22,0.15)]"
                        : "text-pixel-gray-400 hover:text-pixel-cream hover:bg-[#0A1628] border-l-4 border-transparent"
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-pixel-orange-fiery" : "text-pixel-gray-500"}`} />
                    <span className="text-[11px]">{item.label}</span>
                  </div>
                  {item.badge && (
                    <PixelBadge
                      variant={(item.badgeVariant as any) || (isActive ? "orange" : "dark")}
                    >
                      {item.badge}
                    </PixelBadge>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div className="p-3 bg-[#0A1628] border-t border-pixel-gray-800 text-[10px] font-mono text-pixel-gray-500">
            <div className="flex justify-between">
              <span>ROLE:</span>
              <span className="text-pixel-cream">VOLUNTEER</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>LOCATION:</span>
              <span className="text-pixel-orange-fiery truncate max-w-[130px]">
                {assignedArea || "KLE Tech Arena"}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          />
        )}

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8 p-3 sm:p-6 bg-[#050914]">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Mobile-First Operations) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#07101D] border-t-2 border-pixel-orange-fiery px-2 py-1 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onSelectTab("overview")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel ${
            currentTab === "overview" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>HOME</span>
        </button>

        <button
          onClick={() => onSelectTab("tasks")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel relative ${
            currentTab === "tasks" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <CheckSquare className="w-4 h-4 mb-0.5" />
          <span>TASKS</span>
          {activeTasksCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-pixel-cyan rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab("issues")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel relative ${
            currentTab === "issues" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <AlertTriangle className="w-4 h-4 mb-0.5" />
          <span>ISSUES</span>
          {openIssuesCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-pixel-amber rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab("assignments")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel ${
            currentTab === "assignments" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>SHIFTS</span>
        </button>

        <button
          onClick={() => onSelectTab("profile")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel ${
            currentTab === "profile" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>ME</span>
        </button>
      </nav>
    </div>
  );
};
