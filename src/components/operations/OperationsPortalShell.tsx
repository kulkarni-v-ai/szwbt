"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Shield,
  Activity,
  CheckSquare,
  AlertTriangle,
  Users,
  Building,
  Megaphone,
  Clock,
  Search,
  RefreshCw,
  LogOut,
  Bell,
  Menu,
  X,
  Wifi,
  WifiOff,
  Flame,
  ChevronDown,
  User,
  PlusCircle,
  Radio,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface OperationsPortalShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  operationsState: "NORMAL" | "ALERT";
  activeIncidentsCount: number;
  criticalIncidentsCount: number;
  activeTasksCount: number;
  activeVolunteersCount: number;
  onRefresh?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenReportIncident?: () => void;
  onOpenCreateTask?: () => void;
  children: React.ReactNode;
}

export const OperationsPortalShell: React.FC<OperationsPortalShellProps> = ({
  currentTab,
  onSelectTab,
  operationsState,
  activeIncidentsCount,
  criticalIncidentsCount,
  activeTasksCount,
  activeVolunteersCount,
  onRefresh,
  searchQuery,
  onSearchChange,
  onOpenReportIncident,
  onOpenCreateTask,
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

  const navItems = [
    { id: "overview", label: "OVERVIEW", icon: Layers, badge: "HUB" },
    { id: "live", label: "LIVE OPERATIONS", icon: Flame, badge: "LIVE" },
    { id: "tasks", label: "TASKS", icon: CheckSquare, badge: activeTasksCount > 0 ? `${activeTasksCount}` : null },
    {
      id: "incidents",
      label: "INCIDENTS & ISSUES",
      icon: AlertTriangle,
      badge: activeIncidentsCount > 0 ? `${activeIncidentsCount}` : null,
      badgeVariant: criticalIncidentsCount > 0 ? "red" : "yellow",
    },
    { id: "staff", label: "STAFF & VOLUNTEERS", icon: Users, badge: `${activeVolunteersCount} ACTIVE` },
    { id: "venue", label: "VENUE & COURTS", icon: Building, badge: null },
    { id: "announcements", label: "ANNOUNCEMENTS", icon: Megaphone, badge: null },
    { id: "activity", label: "ACTIVITY AUDIT", icon: Activity, badge: null },
    { id: "profile", label: "MY PROFILE", icon: User, badge: null },
  ];

  return (
    <div className="min-h-screen bg-[#050914] text-pixel-cream flex flex-col font-sans selection:bg-pixel-orange-fiery selection:text-white">
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pixel-orange-fiery/5 via-transparent to-black/80 z-40" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP OPERATIONS HUD */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#07101D]/95 backdrop-blur-md border-b-2 border-pixel-orange-fiery/40 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl">
        {/* Left Brand & Mission Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-pixel-cream hover:text-pixel-orange-fiery border border-pixel-gray-800 bg-[#0A1628] rounded focus:outline-none focus:ring-1 focus:ring-pixel-orange-fiery"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/operations" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#0A1628] border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-xs text-pixel-orange-fiery shadow-[0_0_10px_rgba(217,78,22,0.4)] group-hover:scale-105 transition-transform">
              OPS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[11px] sm:text-xs text-pixel-cream tracking-wider">
                  SOUTH ZONE 2026
                </span>
                <span className="text-[10px] text-pixel-cyan hidden sm:inline-block font-mono">
                  [COMMAND CENTER]
                </span>
              </div>
              <p className="font-pixel text-[9px] sm:text-[10px] text-pixel-orange-fiery tracking-widest uppercase">
                ON-GROUND OPERATIONS PORTAL
              </p>
            </div>
          </Link>
        </div>

        {/* Center Live HUD Telemetry (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 bg-[#0A1628] border border-pixel-orange-fiery/30 px-3.5 py-1.5 rounded-sm text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Radio
              className={`w-3.5 h-3.5 ${
                operationsState === "ALERT" ? "text-pixel-red animate-ping" : "text-pixel-green animate-pulse"
              }`}
            />
            <span
              className={`font-pixel text-[10px] ${
                operationsState === "ALERT" ? "text-pixel-red" : "text-pixel-green"
              }`}
            >
              {operationsState === "ALERT" ? "● ALERT ACTIVE" : "● OPS ACTIVE"}
            </span>
          </div>

          <div className="h-3 w-px bg-pixel-gray-800" />

          <div className="flex items-center gap-1 text-pixel-gray-300">
            <AlertTriangle className="w-3.5 h-3.5 text-pixel-amber" />
            <span>
              INCIDENTS: <strong className="text-pixel-amber">{activeIncidentsCount}</strong>
              {criticalIncidentsCount > 0 && (
                <span className="ml-1 text-pixel-red font-bold">({criticalIncidentsCount} CRITICAL)</span>
              )}
            </span>
          </div>

          <div className="h-3 w-px bg-pixel-gray-800" />

          <div className="flex items-center gap-1 text-pixel-gray-300">
            <CheckSquare className="w-3.5 h-3.5 text-pixel-cyan" />
            <span>
              TASKS: <strong className="text-pixel-cyan">{activeTasksCount}</strong>
            </span>
          </div>

          <div className="h-3 w-px bg-pixel-gray-800" />

          <div className="flex items-center gap-1.5 text-pixel-cream font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-pixel-orange-fiery" />
            <span>{currentTime || "10:00:00 IST"}</span>
          </div>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Action: Report Incident */}
          {onOpenReportIncident && (
            <button
              onClick={onOpenReportIncident}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-pixel-red/20 hover:bg-pixel-red/30 border border-pixel-red/60 text-pixel-red font-pixel text-[10px] tracking-wider transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>REPORT INCIDENT</span>
            </button>
          )}

          {/* Quick Action: Create Task */}
          {onOpenCreateTask && (
            <button
              onClick={onOpenCreateTask}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 border border-pixel-orange-fiery/60 text-pixel-orange-fiery font-pixel text-[10px] tracking-wider transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>NEW TASK</span>
            </button>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh telemetry"
              className="p-1.5 bg-[#0A1628] hover:bg-pixel-dark border border-pixel-gray-800 text-pixel-gray-300 hover:text-pixel-cream transition-colors"
              aria-label="Refresh telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Online/Offline indicator */}
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
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "OP"}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-pixel-cream leading-tight truncate max-w-[120px]">
                  {user?.name || "Ops Controller"}
                </p>
                <p className="text-[10px] text-pixel-orange-fiery font-mono leading-none">
                  {user?.badge || "FIELD COMMAND"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-pixel-gray-400 hidden md:block" />
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#07101D] border-2 border-pixel-orange-fiery shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-pixel-gray-800">
                  <p className="font-pixel text-[11px] text-pixel-cream truncate">
                    {user?.name || "Operations Staff"}
                  </p>
                  <p className="font-mono text-[10px] text-pixel-gray-400 truncate">
                    {user?.email || "ops@szwbt2026.edu"}
                  </p>
                  <div className="mt-1">
                    <PixelBadge variant="orange">
                      OPERATIONS CLEARANCE
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
                    <span>My Profile & Clearance</span>
                  </button>

                  <Link
                    href="/volunteer"
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-pixel-gray-300 hover:text-pixel-cream hover:bg-[#0A1628] rounded text-left transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5 text-pixel-amber" />
                    <span>Volunteer Portal</span>
                  </Link>

                  <Link
                    href="/organizer"
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-pixel-gray-300 hover:text-pixel-cream hover:bg-[#0A1628] rounded text-left transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-pixel-orange-fiery" />
                    <span>Organizer Secretariat</span>
                  </Link>
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
          {/* Operations Badge banner */}
          <div className="p-3 bg-[#0A1628] border-b border-pixel-gray-800 flex items-center justify-between">
            <span className="font-pixel text-[10px] text-pixel-cyan tracking-wider">
              FIELD DESK // LEVEL 02
            </span>
            <span className="font-mono text-[10px] text-pixel-green">KLE TECH ARENA</span>
          </div>

          {/* Quick Search in Sidebar */}
          <div className="p-3 border-b border-pixel-gray-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-pixel-gray-500" />
              <input
                type="text"
                placeholder="Search ops telemetry..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#050914] border border-pixel-gray-800 text-xs text-pixel-cream placeholder-pixel-gray-600 focus:outline-none focus:border-pixel-orange-fiery font-sans rounded-none"
              />
            </div>
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
              <span>SECURITY:</span>
              <span className="text-pixel-cream">RBAC ENFORCED</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>VENUE:</span>
              <span className="text-pixel-orange-fiery">KLE TECH ARENA</span>
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
          <span>OVERVIEW</span>
        </button>

        <button
          onClick={() => onSelectTab("live")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel ${
            currentTab === "live" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Flame className="w-4 h-4 mb-0.5" />
          <span>LIVE OPS</span>
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
          onClick={() => onSelectTab("incidents")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel relative ${
            currentTab === "incidents" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <AlertTriangle className="w-4 h-4 mb-0.5" />
          <span>INCIDENTS</span>
          {activeIncidentsCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 bg-pixel-red rounded-full animate-ping" />
          )}
        </button>

        <button
          onClick={() => onSelectTab("staff")}
          className={`flex flex-col items-center p-1.5 text-[9px] font-pixel ${
            currentTab === "staff" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>STAFF</span>
        </button>
      </nav>
    </div>
  );
};
