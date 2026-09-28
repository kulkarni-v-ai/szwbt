"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  User,
  Users,
  CheckCircle2,
  FileText,
  CreditCard,
  Home,
  Bus,
  Trophy,
  Activity,
  QrCode,
  Megaphone,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  WifiOff,
  Flame,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface ParticipantHudIndicators {
  registration: string;
  accommodation: string;
  transport: string;
  matchReady: string;
}

interface ParticipantPortalShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  participantName: string;
  playerId: string;
  teamName: string;
  institution: string;
  participantStatus: string;
  indicators: ParticipantHudIndicators;
  unreadCount?: number;
  announcements?: Array<{ id: string; title: string; category: string; createdAt: string | Date }>;
  children: React.ReactNode;
}

export const ParticipantPortalShell: React.FC<ParticipantPortalShellProps> = ({
  currentTab,
  onSelectTab,
  participantName,
  playerId,
  teamName,
  institution,
  participantStatus,
  indicators,
  unreadCount = 0,
  announcements = [],
  children,
}) => {
  const { user, logout } = useAuth();

  // Navigation states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  // Primary participant navigation items (Requirement 5)
  const navItems = [
    { id: "overview", label: "Overview", icon: Layers, badge: "HUD" },
    { id: "profile", label: "My Profile", icon: User, badge: null },
    { id: "team", label: "My Team", icon: Users, badge: null },
    { id: "registration", label: "Registration", icon: CheckCircle2, badge: null },
    { id: "documents", label: "Documents", icon: FileText, badge: null },
    { id: "payments", label: "Payments", icon: CreditCard, badge: "FEES" },
    { id: "accommodation", label: "Accommodation", icon: Home, badge: null },
    { id: "transport", label: "Transport", icon: Bus, badge: "FREE" },
    { id: "matches", label: "Matches", icon: Trophy, badge: null },
    { id: "results", label: "Results", icon: Activity, badge: null },
    { id: "pass", label: "Tournament Pass", icon: QrCode, badge: "PASS" },
    { id: "announcements", label: "Announcements", icon: Megaphone, badge: unreadCount > 0 ? `${unreadCount}` : null },
  ];

  const accountItems = [
    { id: "support", label: "Support", icon: HelpCircle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setSidebarOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "APPROVED":
      case "SETTLED":
      case "READY":
        return "green";
      case "PENDING_VERIFICATION":
      case "PENDING":
      case "IN_PROGRESS":
      case "SCHEDULED":
        return "yellow";
      case "ACTION_REQUIRED":
      case "ACTION REQUIRED":
      case "FAILED":
      case "REJECTED":
        return "red";
      default:
        return "orange";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-pixel-black text-pixel-cream font-sans selection:bg-pixel-orange-fiery selection:text-black">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-pixel-red text-white px-4 py-2 text-center font-pixel text-xs flex items-center justify-center gap-2 border-b-2 border-black animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>CONNECTION LOST &bull; OPERATING IN OFFLINE CACHE MODE</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TOP HUD: SOUTH ZONE TOURNAMENT STATUS & COMMAND BAR
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

            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center shadow-pixel-sm">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-pixel-orange-fiery group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 font-pixel text-[9px] text-pixel-orange-bright tracking-widest uppercase">
                  <span>SOUTH ZONE 2026</span>
                  <span className="text-pixel-muted">&bull;</span>
                  <span className="text-pixel-cyan">ATHLETE COMMAND</span>
                </div>
                <h1 className="font-pixel text-xs sm:text-sm text-pixel-cream tracking-wide group-hover:text-pixel-orange-fiery transition-colors">
                  PARTICIPANT PORTAL
                </h1>
              </div>
            </Link>
          </div>

          {/* Center: Participant Identity & Team */}
          <div className="flex-1 max-w-md mx-2 hidden md:flex items-center justify-center">
            <div className="text-center px-4 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-3">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-xs text-pixel-cream tracking-wide">
                    {participantName || "Authenticated Athlete"}
                  </span>
                  <span className="font-mono text-[10px] text-pixel-cyan">[{playerId || "SZ-2026"}]</span>
                </div>
                <p className="font-mono text-[10px] text-pixel-muted truncate max-w-xs">
                  {teamName} &bull; {institution}
                </p>
              </div>
              <PixelBadge variant={getStatusBadgeVariant(participantStatus)}>
                {participantStatus || "ACTIVE"}
              </PixelBadge>
            </div>
          </div>

          {/* Right: Real Backend Status Indicators, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real Backend Status Indicators (Desktop HUD) */}
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-pixel">
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Registration Accreditation"
              >
                <span className="text-pixel-muted">REG:</span>
                <span className="text-pixel-green">{indicators.registration}</span>
              </div>
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Hostel Allocation"
              >
                <span className="text-pixel-muted">ACC:</span>
                <span className="text-pixel-amber">{indicators.accommodation}</span>
              </div>
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Transit Shuttle"
              >
                <span className="text-pixel-muted">BUS:</span>
                <span className="text-pixel-cyan">{indicators.transport}</span>
              </div>
              <div
                className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5"
                title="Match Readiness"
              >
                <span className="text-pixel-muted">MTC:</span>
                <span className="text-pixel-orange-bright">{indicators.matchReady}</span>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-gray-300 hover:text-pixel-orange-bright transition-colors cursor-pointer"
                aria-label="Tournament Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pixel-orange-fiery text-black font-pixel text-[9px] flex items-center justify-center rounded-none font-bold border border-black animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel z-50 p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                    <span className="font-pixel text-[11px] text-pixel-cream tracking-wide">
                      NOTIFICATIONS
                    </span>
                    <button
                      onClick={() => handleTabClick("announcements")}
                      className="text-[9px] font-pixel text-pixel-cyan hover:underline cursor-pointer"
                    >
                      VIEW ALL
                    </button>
                  </div>

                  {announcements.length === 0 ? (
                    <div className="py-4 text-center text-pixel-muted font-pixel text-[10px]">
                      NO NEW ANNOUNCEMENTS
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {announcements.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            handleTabClick("announcements");
                            setNotificationsOpen(false);
                          }}
                          className="p-2 bg-pixel-black/60 border border-pixel-gray-800 hover:border-pixel-orange-fiery/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-pixel text-[9px] text-pixel-orange-bright">
                              [{a.category}]
                            </span>
                            <span className="font-mono text-[9px] text-pixel-muted">
                              {new Date(a.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-sans text-xs text-pixel-cream line-clamp-2">
                            {a.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery cursor-pointer transition-colors"
                aria-label="Athlete Profile Menu"
              >
                <div className="w-6 h-6 bg-pixel-orange-fiery text-black font-pixel text-[10px] flex items-center justify-center font-bold">
                  {participantName ? participantName.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="hidden md:inline font-pixel text-[11px] text-pixel-cream max-w-[100px] truncate">
                  {participantName?.split(" ")[0] || "Athlete"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-pixel-muted" />
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel z-50 p-2 space-y-1">
                  <div className="px-2 py-1.5 border-b border-pixel-gray-800 mb-1">
                    <p className="font-pixel text-xs text-pixel-cream truncate">{participantName}</p>
                    <p className="font-mono text-[10px] text-pixel-cyan">ROLE: PARTICIPANT</p>
                    <p className="font-mono text-[10px] text-pixel-muted truncate">{user?.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      handleTabClick("profile");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2 py-1.5 text-left font-pixel text-[11px] text-pixel-gray-300 hover:text-pixel-cream hover:bg-pixel-black/60 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-pixel-orange-bright" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabClick("pass");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2 py-1.5 text-left font-pixel text-[11px] text-pixel-gray-300 hover:text-pixel-cream hover:bg-pixel-black/60 flex items-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-pixel-cyan" />
                    <span>Tournament Pass</span>
                  </button>

                  <button
                    onClick={() => {
                      handleTabClick("settings");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2 py-1.5 text-left font-pixel text-[11px] text-pixel-gray-300 hover:text-pixel-cream hover:bg-pixel-black/60 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-pixel-amber" />
                    <span>Account Settings</span>
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
              ATHLETE NAVIGATION
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-pixel-cream hover:text-pixel-orange-fiery cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Athlete Identity Badge */}
          <div className="mb-4 p-3 bg-pixel-black/60 border border-pixel-gray-800 shadow-inner">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery flex items-center justify-center font-pixel text-xs text-pixel-orange-bright font-bold">
                {participantName ? participantName.charAt(0) : "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-xs text-pixel-cream truncate">{participantName}</p>
                <p className="font-mono text-[10px] text-pixel-cyan font-bold">{playerId}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-pixel pt-1 border-t border-pixel-gray-800">
              <span className="text-pixel-muted">ROLE:</span>
              <span className="text-pixel-orange-bright">PARTICIPANT</span>
            </div>
          </div>

          {/* Navigation Links (Requirement 5) */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1" aria-label="Participant Sidebar">
            <div className="mb-1">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase tracking-widest block px-1">
                MAIN
              </span>
            </div>

            {navItems.map((item) => {
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

            {/* Sidebar Section: ACCOUNT */}
            <div className="border-t border-pixel-gray-800 pt-3 mt-4 mb-2">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase tracking-widest block px-1">
                ACCOUNT
              </span>
            </div>

            {accountItems.map((item) => {
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
              ATHLETE HUD READY
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
          MOBILE BOTTOM NAVIGATION (TOUCH-FIRST PRIORITY)
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
          onClick={() => handleTabClick("matches")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "matches" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Matches</span>
        </button>

        <button
          onClick={() => handleTabClick("pass")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "pass" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Pass</span>
        </button>

        <button
          onClick={() => handleTabClick("team")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "team" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team</span>
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
