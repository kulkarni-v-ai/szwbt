"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Shield,
  Users,
  UserCheck,
  CheckCircle2,
  Home,
  Bus,
  Calendar,
  Flame,
  Activity,
  Megaphone,
  AlertTriangle,
  Zap,
  Clock,
  HelpCircle,
  BarChart3,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  WifiOff,
  Search,
  RefreshCw,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface OrganizerHudIndicators {
  registration: string;
  accommodation: string;
  transport: string;
  matches: string;
}

interface OrganizerPortalShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  tournamentStatus: string;
  indicators: OrganizerHudIndicators;
  unreadCount?: number;
  alertsCount?: number;
  onRefresh?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: React.ReactNode;
}

export const OrganizerPortalShell: React.FC<OrganizerPortalShellProps> = ({
  currentTab,
  onSelectTab,
  tournamentStatus,
  indicators,
  unreadCount = 0,
  alertsCount = 0,
  onRefresh,
  searchQuery,
  onSearchChange,
  children,
}) => {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network status
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

  // Primary Organizer Navigation Items (Requirement 6)
  const mainNavItems = [
    { id: "overview", label: "Overview", icon: Layers, badge: "HUB" },
    { id: "tournament", label: "Tournament Status", icon: Shield, badge: tournamentStatus },
    { id: "teams", label: "Teams", icon: Users, badge: null },
    { id: "participants", label: "Participants", icon: UserCheck, badge: null },
    { id: "registration", label: "Registration", icon: CheckCircle2, badge: null },
    { id: "accommodation", label: "Accommodation", icon: Home, badge: null },
    { id: "transport", label: "Transport", icon: Bus, badge: "FREE" },
    { id: "schedule", label: "Schedule", icon: Calendar, badge: null },
    { id: "live-matches", label: "Live Matches", icon: Flame, badge: "LIVE" },
    { id: "results", label: "Results", icon: Activity, badge: null },
    { id: "announcements", label: "Announcements", icon: Megaphone, badge: null },
  ];

  const operationsNavItems = [
    { id: "action-center", label: "Action Center", icon: Zap, badge: "VIP" },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, badge: alertsCount > 0 ? `${alertsCount}` : null },
    { id: "activity", label: "Staff Activity", icon: Clock, badge: null },
    { id: "support", label: "Support", icon: HelpCircle, badge: null },
  ];

  const reportingNavItems = [
    { id: "reports", label: "Reports & Insights", icon: BarChart3, badge: null },
  ];

  const accountNavItems = [
    { id: "profile", label: "Profile", icon: User },
  ];

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setSidebarOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "READY":
      case "APPROVED":
        return "green";
      case "LIVE":
        return "orange";
      case "UPCOMING":
      case "ON TRACK":
        return "yellow";
      case "ACTION REQUIRED":
      case "CRITICAL":
      case "FAILED":
        return "red";
      default:
        return "dark";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-pixel-black text-pixel-cream font-sans selection:bg-pixel-orange-fiery selection:text-black">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-pixel-red text-white px-4 py-2 text-center font-pixel text-xs flex items-center justify-center gap-2 border-b-2 border-black animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>CONNECTION LOST &bull; OPERATING IN OFFLINE TELEMETRY MODE</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TOP HUD: SOUTH ZONE TOURNAMENT OPERATIONS & COMMAND BAR
         ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-pixel-dark/95 backdrop-blur-md border-b-2 border-pixel-orange-fiery shadow-pixel-sm">
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3">
            {/* Mobile/Tablet Sidebar Hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-pixel-cream hover:text-pixel-orange-fiery border border-pixel-gray-700 bg-pixel-black/60 rounded-none cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/organizer" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center shadow-pixel-sm">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-pixel-orange-fiery group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 font-pixel text-[9px] text-pixel-orange-bright tracking-widest uppercase">
                  <span>SOUTH ZONE 2026</span>
                  <span className="text-pixel-muted">&bull;</span>
                  <span className="text-pixel-cyan">OPERATIONS COMMAND</span>
                </div>
                <h1 className="font-pixel text-xs sm:text-sm text-pixel-cream tracking-wide group-hover:text-pixel-orange-fiery transition-colors">
                  ORGANIZER CONTROL CENTER
                </h1>
              </div>
            </Link>
          </div>

          {/* Center: Search & Operational Status */}
          <div className="flex-1 max-w-md mx-2 hidden md:flex items-center gap-3">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-pixel-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Find team, athlete, match, court..."
                className="w-full pl-8 pr-3 py-1.5 bg-pixel-black/80 border border-pixel-gray-700 hover:border-pixel-orange-fiery/70 focus:border-pixel-orange-fiery text-pixel-cream text-xs outline-none font-sans"
              />
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <PixelBadge variant={getStatusBadgeVariant(tournamentStatus)}>
                {tournamentStatus}
              </PixelBadge>
            </div>
          </div>

          {/* Right: Operational Status Indicators, Refresh, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mini HUD Statuses (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-pixel">
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Registration Status"
              >
                <span className="text-pixel-muted">REG:</span>
                <span className="text-pixel-green">{indicators.registration}</span>
              </div>
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Accommodation Status"
              >
                <span className="text-pixel-muted">ACC:</span>
                <span className="text-pixel-amber">{indicators.accommodation}</span>
              </div>
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Transport Status"
              >
                <span className="text-pixel-muted">BUS:</span>
                <span className="text-pixel-cyan">{indicators.transport}</span>
              </div>
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Match Status"
              >
                <span className="text-pixel-muted">MTC:</span>
                <span className="text-pixel-orange-bright">{indicators.matches}</span>
              </div>
            </div>

            {/* Quick Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-gray-300 hover:text-pixel-orange-bright transition-colors cursor-pointer"
                title="Refresh Tournament Telemetry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Alerts Indicator */}
            <button
              onClick={() => handleTabClick("alerts")}
              className="relative p-2 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-gray-300 hover:text-pixel-orange-bright transition-colors cursor-pointer"
              title="Operational Alerts"
            >
              <AlertTriangle className="w-4 h-4" />
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pixel-red text-white font-pixel text-[9px] flex items-center justify-center font-bold border border-black animate-pulse">
                  {alertsCount}
                </span>
              )}
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => handleTabClick("announcements")}
              className="relative p-2 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-gray-300 hover:text-pixel-orange-bright transition-colors cursor-pointer"
              title="Announcements & Bulletins"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pixel-orange-fiery text-black font-pixel text-[9px] flex items-center justify-center font-bold border border-black">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery cursor-pointer transition-colors"
                aria-label="Organizer Profile Menu"
              >
                <div className="w-6 h-6 bg-pixel-orange-fiery text-black font-pixel text-[10px] flex items-center justify-center font-bold">
                  OR
                </div>
                <span className="hidden md:inline font-pixel text-[11px] text-pixel-cream max-w-[120px] truncate">
                  Organizer
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-pixel-muted" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel z-50 p-2 space-y-1">
                  <div className="px-2 py-1.5 border-b border-pixel-gray-800 mb-1">
                    <p className="font-pixel text-xs text-pixel-cream truncate">Tournament Secretariat</p>
                    <p className="font-mono text-[10px] text-pixel-cyan">ROLE: ORGANIZER</p>
                    <p className="font-mono text-[10px] text-pixel-muted truncate">{user?.email || "organizer@szwbt2026.edu"}</p>
                  </div>

                  <button
                    onClick={() => {
                      handleTabClick("overview");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2 py-1.5 text-left font-pixel text-[11px] text-pixel-gray-300 hover:text-pixel-cream hover:bg-pixel-black/60 flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-pixel-orange-bright" />
                    <span>Control Center</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabClick("reports");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2 py-1.5 text-left font-pixel text-[11px] text-pixel-gray-300 hover:text-pixel-cream hover:bg-pixel-black/60 flex items-center gap-2 cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-pixel-cyan" />
                    <span>Operational Reports</span>
                  </button>

                  <div className="border-t border-pixel-gray-800 pt-1 mt-1">
                    <button
                      onClick={() => logout()}
                      className="w-full px-2 py-1.5 text-left font-pixel text-[11px] text-pixel-red hover:bg-pixel-red/10 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN WRAPPER: DESKTOP SIDEBAR + MAIN CONTENT AREA
         ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop Fixed, Tablet/Mobile Collapsible Drawer) */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-pixel-dark border-r-2 border-pixel-orange-fiery flex flex-col p-4 transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Mobile Drawer Close Button */}
          <div className="flex lg:hidden items-center justify-between pb-3 border-b border-pixel-gray-800 mb-3">
            <span className="font-pixel text-xs text-pixel-orange-bright tracking-widest uppercase">
              ORGANIZER NAVIGATION
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-pixel-cream hover:text-pixel-orange-fiery cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Organizer Clearance Badge */}
          <div className="mb-4 p-3 bg-pixel-black/60 border border-pixel-gray-800 shadow-inner">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery flex items-center justify-center font-pixel text-xs text-pixel-orange-bright font-bold">
                HQ
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-xs text-pixel-cream truncate">Tournament Secretariat</p>
                <p className="font-mono text-[10px] text-pixel-cyan font-bold">OPERATIONS CONTROL</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-pixel pt-1 border-t border-pixel-gray-800">
              <span className="text-pixel-muted">ROLE:</span>
              <span className="text-pixel-orange-bright">ORGANIZER</span>
            </div>
          </div>

          {/* Navigation Sections (Requirement 6) */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1" aria-label="Organizer Sidebar">
            {/* Section: MAIN */}
            <div className="mb-1">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase tracking-widest block px-1">
                MAIN
              </span>
            </div>

            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full px-3 py-1.5 flex items-center justify-between font-sans text-xs transition-colors border cursor-pointer ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border-pixel-orange-fiery font-bold shadow-pixel-sm"
                      : "bg-pixel-black/40 text-pixel-gray-300 border-pixel-gray-800 hover:border-pixel-orange-fiery/70 hover:text-pixel-cream hover:bg-pixel-black/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-black" : "text-pixel-orange-bright"
                      }`}
                    />
                    <span className="font-pixel text-xs truncate tracking-wide">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-pixel px-1.5 py-0.2 border ${
                        isActive
                          ? "bg-black text-pixel-orange-bright border-black"
                          : "bg-pixel-dark text-pixel-muted border-pixel-gray-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Section: OPERATIONS */}
            <div className="border-t border-pixel-gray-800 pt-3 mt-3 mb-1">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase tracking-widest block px-1">
                OPERATIONS
              </span>
            </div>

            {operationsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full px-3 py-1.5 flex items-center justify-between font-sans text-xs transition-colors border cursor-pointer ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border-pixel-orange-fiery font-bold shadow-pixel-sm"
                      : "bg-pixel-black/40 text-pixel-gray-300 border-pixel-gray-800 hover:border-pixel-orange-fiery/70 hover:text-pixel-cream hover:bg-pixel-black/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-black" : "text-pixel-cyan"}`} />
                    <span className="font-pixel text-xs truncate tracking-wide">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-pixel px-1.5 py-0.2 border ${
                        isActive
                          ? "bg-black text-pixel-orange-bright border-black"
                          : "bg-pixel-dark text-pixel-muted border-pixel-gray-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Section: REPORTING */}
            <div className="border-t border-pixel-gray-800 pt-3 mt-3 mb-1">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase tracking-widest block px-1">
                REPORTING
              </span>
            </div>

            {reportingNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full px-3 py-1.5 flex items-center gap-2.5 font-sans text-xs transition-colors border cursor-pointer ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border-pixel-orange-fiery font-bold shadow-pixel-sm"
                      : "bg-pixel-black/40 text-pixel-gray-400 border-pixel-gray-800 hover:border-pixel-orange-fiery/70 hover:text-pixel-cream"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-black" : "text-pixel-amber"}`} />
                  <span className="font-pixel text-xs truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Section: ACCOUNT */}
            <div className="border-t border-pixel-gray-800 pt-3 mt-3 mb-1">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase tracking-widest block px-1">
                ACCOUNT
              </span>
            </div>

            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full px-3 py-1.5 flex items-center gap-2.5 font-sans text-xs transition-colors border cursor-pointer ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border-pixel-orange-fiery font-bold shadow-pixel-sm"
                      : "bg-pixel-black/40 text-pixel-gray-400 border-pixel-gray-800 hover:border-pixel-orange-fiery/70 hover:text-pixel-cream"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-black" : "text-pixel-cyan"}`} />
                  <span className="font-pixel text-xs truncate">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => logout()}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 font-pixel text-xs text-pixel-red/80 hover:text-pixel-red hover:bg-pixel-red/10 border border-transparent hover:border-pixel-red/40 transition-colors mt-2"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </nav>

          {/* Sidebar Footer Security Status */}
          <div className="pt-3 border-t border-pixel-gray-800 mt-2 text-[10px] font-pixel text-pixel-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-pixel-green">
              <span className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-pulse" />
              SECRETARIAT ONLINE
            </span>
            <span>SZWBT 2026</span>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MAIN CONTENT AREA
           ═══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 custom-scrollbar pb-20 lg:pb-7">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION (Touch-First Priority)
         ═══════════════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-pixel-dark/95 backdrop-blur-md border-t-2 border-pixel-orange-fiery px-2 py-1.5 flex items-center justify-around"
        aria-label="Mobile Bottom Navigation"
      >
        <button
          onClick={() => handleTabClick("overview")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "overview" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => handleTabClick("live-matches")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "live-matches" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Live</span>
        </button>

        <button
          onClick={() => handleTabClick("alerts")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "alerts" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Alerts</span>
        </button>

        <button
          onClick={() => handleTabClick("teams")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "teams" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Teams</span>
        </button>

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 p-1 font-pixel text-[10px] text-pixel-cyan"
        >
          <Menu className="w-4 h-4" />
          <span>Hub Menu</span>
        </button>
      </nav>
    </div>
  );
};
