"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Zap,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Home,
  Bus,
  Trophy,
  CheckCircle2,
  QrCode,
  Megaphone,
  HelpCircle,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
  Flame,
  Activity,
  Layers,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface AuthorizedTeamOption {
  id: string;
  teamCode: string;
  name: string;
  institution: string;
  state: string;
  status: string;
  managerName?: string | null;
}

export interface HudIndicators {
  registration: string;
  accommodation: string;
  transport: string;
  matches: string;
}

interface TeamPortalShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  authorizedTeams: AuthorizedTeamOption[];
  selectedTeamId: string | null;
  onSelectTeamId: (teamId: string) => void;
  teamName: string;
  institution: string;
  teamStatus: string;
  indicators: HudIndicators;
  unreadCount?: number;
  announcements?: Array<{ id: string; title: string; category: string; createdAt: string | Date }>;
  children: React.ReactNode;
}

export const TeamPortalShell: React.FC<TeamPortalShellProps> = ({
  currentTab,
  onSelectTab,
  authorizedTeams,
  selectedTeamId,
  onSelectTeamId,
  teamName,
  institution,
  teamStatus,
  indicators,
  unreadCount = 0,
  announcements = [],
  children,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Navigation states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teamSelectorOpen, setTeamSelectorOpen] = useState(false);
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

  // Navigation items mapping
  const navItems = [
    { id: "overview", label: "Overview", icon: Layers, badge: "HUB" },
    { id: "team", label: "Team Identity", icon: Shield, badge: null },
    { id: "members", label: "Members Roster", icon: Users, badge: null },
    { id: "registration", label: "Registration", icon: CheckCircle2, badge: null },
    { id: "documents", label: "Documents", icon: FileText, badge: null },
    { id: "payments", label: "Payments", icon: CreditCard, badge: "FEES" },
    { id: "accommodation", label: "Accommodation", icon: Home, badge: null },
    { id: "transport", label: "Transport", icon: Bus, badge: "FREE" },
    { id: "matches", label: "Matches", icon: Trophy, badge: null },
    { id: "results", label: "Results", icon: Activity, badge: null },
    { id: "pass", label: "Team Pass", icon: QrCode, badge: "QR" },
    { id: "announcements", label: "Announcements", icon: Megaphone, badge: unreadCount > 0 ? `${unreadCount}` : null },
  ];

  const accountItems = [
    { id: "support", label: "Tournament Support", icon: HelpCircle },
    { id: "profile", label: "Manager Profile", icon: User },
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

            <Link href="/team" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center shadow-pixel-sm">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-pixel-orange-fiery group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 font-pixel text-[9px] text-pixel-orange-bright tracking-widest uppercase">
                  <span>SOUTH ZONE 2026</span>
                  <span className="text-pixel-muted">&bull;</span>
                  <span className="text-pixel-cyan">TEAM PORTAL</span>
                </div>
                <h1 className="font-pixel text-xs sm:text-sm text-pixel-cream tracking-wide group-hover:text-pixel-orange-fiery transition-colors">
                  SZWBT TEAM COMMAND
                </h1>
              </div>
            </Link>
          </div>

          {/* Center: Team Identity / Multiple Team Selector */}
          <div className="flex-1 max-w-md mx-2 hidden md:flex items-center justify-center">
            {authorizedTeams.length > 1 ? (
              <div className="relative w-full max-w-xs">
                <button
                  onClick={() => setTeamSelectorOpen(!teamSelectorOpen)}
                  className="w-full px-3 py-1.5 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <div className="truncate">
                    <span className="text-[9px] font-pixel text-pixel-muted uppercase block leading-none">
                      ACTIVE TEAM ({authorizedTeams.length})
                    </span>
                    <span className="font-pixel text-xs text-pixel-cream truncate block mt-0.5">
                      {teamName || "Select Team"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-pixel-orange-bright shrink-0" />
                </button>

                {/* Dropdown Options */}
                {teamSelectorOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel z-50 p-1 space-y-1">
                    {authorizedTeams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTeamId(t.id);
                          setTeamSelectorOpen(false);
                        }}
                        className={`w-full p-2 text-left font-sans text-xs border transition-colors flex items-center justify-between ${
                          t.id === selectedTeamId
                            ? "bg-pixel-orange-fiery/20 border-pixel-orange-fiery text-pixel-cream"
                            : "bg-pixel-black/60 border-transparent text-pixel-gray-400 hover:text-pixel-cream hover:border-pixel-gray-700"
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-pixel text-xs text-pixel-cream">{t.name}</p>
                          <p className="font-mono text-[10px] text-pixel-muted truncate">{t.institution}</p>
                        </div>
                        <PixelBadge variant={getStatusBadgeVariant(t.status)}>
                          {t.status}
                        </PixelBadge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center px-3 py-1 bg-pixel-black/60 border border-pixel-gray-800">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-pixel text-xs text-pixel-cream tracking-wide">{teamName}</span>
                  <PixelBadge variant={getStatusBadgeVariant(teamStatus)}>{teamStatus}</PixelBadge>
                </div>
                <p className="font-mono text-[10px] text-pixel-muted truncate max-w-xs">{institution}</p>
              </div>
            )}
          </div>

          {/* Right: Operational Status Indicators, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mini HUD Statuses (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-pixel">
              <div className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5" title="Registration Status">
                <span className="text-pixel-muted">REG:</span>
                <span className="text-pixel-green">{indicators.registration}</span>
              </div>
              <div className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5" title="Accommodation Status">
                <span className="text-pixel-muted">ACC:</span>
                <span className="text-pixel-amber">{indicators.accommodation}</span>
              </div>
              <div className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5" title="Transit Shuttle Status">
                <span className="text-pixel-muted">BUS:</span>
                <span className="text-pixel-cyan">{indicators.transport}</span>
              </div>
              <div className="px-2 py-1 bg-pixel-black/60 border border-pixel-gray-800 flex items-center gap-1.5" title="Match Readiness">
                <span className="text-pixel-muted">MTC:</span>
                <span className="text-pixel-orange-bright">{indicators.matches}</span>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-gray-300 hover:text-pixel-orange-bright transition-colors cursor-pointer"
                title="Tournament Bulletins"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pixel-orange-fiery text-black font-pixel text-[9px] flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Slideout Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel p-4 z-50 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2 mb-3">
                    <span className="font-pixel text-xs text-pixel-orange-bright uppercase tracking-wider">
                      OFFICIAL TOURNAMENT ALERTS
                    </span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-pixel-gray-400 hover:text-pixel-orange-fiery text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-pixel-muted py-2">No active announcements.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {announcements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-2.5 bg-pixel-black border border-pixel-gray-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-pixel text-[9px] text-pixel-cyan">{ann.category}</span>
                            <span className="text-[10px] text-pixel-muted font-mono">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-semibold text-pixel-cream">{ann.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t border-pixel-gray-800 mt-3 text-right">
                    <button
                      onClick={() => {
                        handleTabClick("announcements");
                        setNotificationsOpen(false);
                      }}
                      className="font-pixel text-[10px] text-pixel-amber hover:text-pixel-orange-bright"
                    >
                      VIEW ALL ANNOUNCEMENTS &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Control */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery transition-colors cursor-pointer"
                aria-label="User profile menu"
              >
                <div className="w-6 h-6 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery flex items-center justify-center font-pixel text-[10px] text-pixel-orange-bright">
                  TM
                </div>
                <div className="hidden md:block text-left">
                  <span className="font-pixel text-[10px] text-pixel-cream block truncate max-w-[120px]">
                    {user?.name || "Team Manager"}
                  </span>
                  <span className="text-[9px] text-pixel-muted block leading-none">TEAM_MANAGER</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-pixel-muted hidden md:block" />
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel z-50 p-2 space-y-1">
                  <div className="p-2 border-b border-pixel-gray-800 mb-1">
                    <p className="font-pixel text-xs text-pixel-cream truncate">{user?.name}</p>
                    <p className="font-mono text-[10px] text-pixel-muted truncate">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] font-pixel text-pixel-green">
                      <span className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-pulse" />
                      UNIVERSITY CLEARANCE
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleTabClick("profile");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left font-pixel text-xs text-pixel-gray-300 hover:text-pixel-orange-bright hover:bg-pixel-black flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>SECURITY PROFILE</span>
                  </button>
                  <button
                    onClick={() => {
                      handleTabClick("support");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left font-pixel text-xs text-pixel-gray-300 hover:text-pixel-orange-bright hover:bg-pixel-black flex items-center gap-2"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>TOURNAMENT SUPPORT</span>
                  </button>
                  <button
                    onClick={() => logout()}
                    className="w-full px-2.5 py-1.5 text-left font-pixel text-xs text-pixel-red hover:bg-pixel-red/10 flex items-center gap-2 border-t border-pixel-gray-800 pt-1.5 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>SIGN OUT</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          CORE BODY: SIDEBAR + MAIN CONTENT AREA
         ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop Fixed & Mobile Slideover Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-pixel-dark border-r-2 border-pixel-orange-fiery/40 p-4 transform transition-transform duration-200 lg:static lg:translate-x-0 flex flex-col shrink-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          {/* Mobile Drawer Close */}
          <div className="lg:hidden flex items-center justify-between pb-3 mb-3 border-b border-pixel-gray-800">
            <span className="font-pixel text-xs text-pixel-orange-bright">TEAM HUB NAVIGATION</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-pixel-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Section: TEAM HUB */}
          <div className="border-b border-pixel-gray-800 pb-2 mb-3 flex items-center justify-between">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest">
              TEAM HUB
            </span>
            <span className="font-mono text-[9px] text-pixel-muted font-bold">CLEARANCE 02</span>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1" aria-label="Team Hub">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full px-3 py-2 flex items-center justify-between group font-sans text-xs transition-colors border cursor-pointer ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border-pixel-orange-fiery font-bold shadow-pixel-sm"
                      : "bg-pixel-black/40 text-pixel-gray-400 border-pixel-gray-800 hover:border-pixel-orange-fiery/70 hover:text-pixel-cream"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-black" : "text-pixel-orange-bright group-hover:scale-105"}`} />
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
                ACCOUNT & SUPPORT
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
              PORTAL READY
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
          MOBILE BOTTOM NAVIGATION (TOUCH-FIRST ACCESS)
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
          onClick={() => handleTabClick("members")}
          className={`flex flex-col items-center gap-1 p-1 font-pixel text-[10px] ${
            currentTab === "members" ? "text-pixel-orange-fiery" : "text-pixel-gray-400"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members</span>
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
