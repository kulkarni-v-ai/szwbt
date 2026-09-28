import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Layers,
  Radio,
  FileText,
  Calendar,
  History,
  Bell,
  LayoutTemplate,
  User,
  Search,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Menu,
  X,
  Wifi,
  WifiOff,
  ChevronDown,
  PlusCircle,
  Megaphone,
  Send,
  AlertCircle,
  Flame,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface CommunicationsPortalShellProps {
  currentTab: string;
  onSelectTab?: (tab: string) => void;
  publishedCount?: number;
  draftCount?: number;
  scheduledCount?: number;
  failedDeliveriesCount?: number;
  urgentCount?: number;
  canCreate?: boolean;
  canPublish?: boolean;
  canEmergency?: boolean;
  onRefresh?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenCompose?: () => void;
  onOpenEmergency?: () => void;
  children: React.ReactNode;
}

export const CommunicationsPortalShell: React.FC<CommunicationsPortalShellProps> = ({
  currentTab,
  onSelectTab,
  publishedCount,
  draftCount,
  scheduledCount,
  failedDeliveriesCount,
  urgentCount,
  canCreate,
  canPublish,
  canEmergency,
  onRefresh,
  searchQuery,
  onSearchChange,
  onOpenCompose,
  onOpenEmergency,
  children,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    { id: "overview", label: "COMMAND CENTER", icon: Layers, href: "/admin/communications", badge: "HUB" },
    {
      id: "announcements",
      label: "ANNOUNCEMENTS",
      icon: Megaphone,
      href: "/admin/communications/announcements",
      badge: (publishedCount ?? 0) > 0 ? `${publishedCount}` : null,
    },
    { id: "create", label: "CREATE ANNOUNCEMENT", icon: PlusCircle, href: "/admin/communications/create", badge: "NEW" },
    {
      id: "scheduled",
      label: "SCHEDULED",
      icon: Calendar,
      href: "/admin/communications/scheduled",
      badge: (scheduledCount ?? 0) > 0 ? `${scheduledCount}` : null,
      badgeVariant: "cyan" as const,
    },
    { id: "templates", label: "TEMPLATES", icon: LayoutTemplate, href: "/admin/communications/templates", badge: null },
    { id: "history", label: "BROADCAST HISTORY", icon: History, href: "/admin/communications/history", badge: null },
    {
      id: "delivery",
      label: "DELIVERY MONITOR",
      icon: Bell,
      href: "/admin/communications/delivery",
      badge: (failedDeliveriesCount ?? 0) > 0 ? `! ${failedDeliveriesCount} FAIL` : null,
      badgeVariant: "red" as const,
    },
    {
      id: "emergency",
      label: "EMERGENCY CHANNEL",
      icon: Flame,
      href: "/admin/communications/emergency",
      badge: "ALERT",
      badgeVariant: "red" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050914] text-pixel-cream flex flex-col font-sans selection:bg-pixel-orange-fiery selection:text-white">
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pixel-orange-fiery/5 via-transparent to-black/80 z-40" />

      {/* TOP COMMUNICATIONS HUD BAR */}
      <header className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-md border-b-2 border-pixel-orange-fiery/40 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        {/* Left: Branding & Tournament Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 bg-pixel-navy border border-pixel-orange-fiery/50 text-pixel-orange-fiery hover:bg-pixel-orange-fiery hover:text-black transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin/communications" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center text-pixel-orange-fiery shadow-[0_0_12px_rgba(249,115,22,0.4)] group-hover:bg-pixel-orange-fiery group-hover:text-black transition-colors">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[10px] tracking-wider text-pixel-orange-fiery uppercase">
                  SOUTH ZONE 2026
                </span>
                <span className="hidden sm:inline-block">
                  <PixelBadge variant="orange" size="sm">
                    LEVEL 03 COMM
                  </PixelBadge>
                </span>
              </div>
              <h1 className="font-display font-bold text-xs sm:text-sm tracking-wide text-pixel-cream group-hover:text-pixel-orange-bright transition-colors">
                COMMUNICATIONS & ANNOUNCEMENTS CENTER
              </h1>
            </div>
          </Link>
        </div>

        {/* Center: Live Status Telemetry & Emergency Alert Indicator */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1 bg-pixel-navy/80 border border-pixel-gray-700">
            <span className="w-2 h-2 rounded-full bg-pixel-green animate-ping" />
            <span className="font-pixel text-[10px] text-pixel-green">COMMUNICATIONS ONLINE</span>
          </div>

          {(urgentCount ?? 0) > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/60 border border-red-500/80 text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />
              <span className="font-pixel text-[10px]">{urgentCount} URGENT ALERTS ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-pixel-navy/60 border border-pixel-gray-700/60 text-pixel-muted">
              <span className="font-pixel text-[10px]">ALL BROADCAST NODES NOMINAL</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-400 bg-cyan-950/30 px-2.5 py-1 border border-cyan-800/40">
            <span className="text-cyan-500 font-bold">IST:</span>
            <span>{currentTime || "09:00:00 IST"}</span>
          </div>
        </div>

        {/* Right: Quick Actions, Connection, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Emergency Notice Button (for authorized users) */}
          {canEmergency && onOpenEmergency && (
            <button
              onClick={onOpenEmergency}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/40 border border-red-500/80 text-red-200 hover:bg-red-700 hover:text-white transition-all text-xs font-pixel tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.3)] active:scale-95"
              title="Broadcast Emergency Safety Notice"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="hidden sm:inline">EMERGENCY NOTICE</span>
            </button>
          )}

          {/* Quick Compose Button */}
          {canCreate && onOpenCompose && (
            <button
              onClick={onOpenCompose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright transition-all text-xs font-pixel tracking-wider font-bold shadow-[0_0_12px_rgba(249,115,22,0.4)] active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">COMPOSE</span>
            </button>
          )}

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream hover:text-pixel-orange-fiery hover:border-pixel-orange-fiery transition-colors"
              title="Refresh Communications Telemetry"
              aria-label="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Online/Offline Status */}
          <div
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-pixel border ${
              isOnline
                ? "bg-green-950/40 border-green-800 text-green-400"
                : "bg-red-950/40 border-red-800 text-red-400"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden md:inline">{isOnline ? "SYNCED" : "OFFLINE"}</span>
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-pixel-navy border border-pixel-orange-fiery/40 text-pixel-cream hover:border-pixel-orange-fiery transition-all text-xs"
            >
              <div className="w-6 h-6 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery flex items-center justify-center text-pixel-orange-fiery font-bold text-[10px]">
                {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="font-pixel text-[10px] text-pixel-orange-bright leading-tight">
                  {user?.badge || "BROADCAST HUD"}
                </p>
                <p className="text-[11px] text-pixel-gray-300 max-w-[110px] truncate leading-tight">
                  {user?.email || "comm@szwbt2026.edu"}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-pixel-muted" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0a0e1a] border-2 border-pixel-orange-fiery shadow-2xl z-50 p-2 space-y-2">
                <div className="border-b border-pixel-gray-800 pb-2 px-1">
                  <p className="font-pixel text-[10px] text-pixel-orange-bright">AUTHENTICATED OPERATOR</p>
                  <p className="font-display text-xs text-pixel-cream font-bold truncate">
                    {user?.name || "Communications Controller"}
                  </p>
                  <p className="text-[11px] text-pixel-muted truncate">{user?.email}</p>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onSelectTab?.("profile");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-pixel-navy hover:text-pixel-orange-fiery flex items-center gap-2 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>OPERATOR CLEARANCE</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectTab?.("templates");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-pixel-navy hover:text-pixel-orange-fiery flex items-center gap-2 transition-colors"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>MESSAGE TEMPLATES</span>
                  </button>
                  <button
                    onClick={async () => {
                      await logout();
                      window.location.href = "/login";
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 flex items-center gap-2 transition-colors border-t border-pixel-gray-800 pt-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>TERMINATE SESSION</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0a0e1a] border-r-2 border-pixel-orange-fiery/30 flex flex-col justify-between transition-transform duration-200 transform md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-3 space-y-4 overflow-y-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-pixel-muted absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search broadcasts..."
                value={searchQuery || ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full bg-[#050914] text-xs text-pixel-cream pl-8 pr-3 py-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none placeholder:text-pixel-gray-500 font-sans"
              />
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              <p className="font-pixel text-[9px] text-pixel-muted px-2 uppercase tracking-wider mb-1">
                DISPATCH CHANNELS
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onSelectTab) {
                        onSelectTab(item.id);
                      }
                      if (item.href && item.href !== pathname) {
                        router.push(item.href);
                      }
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-display tracking-wider border transition-all ${
                      active
                        ? "bg-pixel-orange-fiery/15 border-pixel-orange-fiery text-pixel-orange-bright font-bold shadow-[inset_2px_0_0_#f97316]"
                        : "bg-transparent border-transparent text-pixel-gray-400 hover:bg-pixel-navy/60 hover:text-pixel-cream hover:border-pixel-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? "text-pixel-orange-fiery" : "text-pixel-muted"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <PixelBadge variant={(item.badgeVariant as any) || (active ? "orange" : "dark")} size="sm">
                        {item.badge}
                      </PixelBadge>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Broadcast Network Status Card */}
            <div className="bg-[#050914] border border-cyan-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[9px] text-cyan-400">NETWORK NODE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-pixel-muted space-y-1">
                <div className="flex justify-between">
                  <span>WEB PORTAL:</span>
                  <span className="text-green-400 font-bold">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span>SMTP RELAY:</span>
                  <span className="text-green-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>PUSH DISPATCH:</span>
                  <span className="text-cyan-400 font-bold">STANDBY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-pixel-gray-800 bg-[#050914] text-[10px] text-pixel-muted font-pixel">
            <div className="flex justify-between items-center text-pixel-orange-bright mb-1">
              <span>SECURITY LEVEL</span>
              <span>LEVEL 03</span>
            </div>
            <p className="text-pixel-gray-500 text-[9px] font-sans">
              Communications authorization verified against tournament policy.
            </p>
          </div>
        </aside>

        {/* BACKDROP FOR MOBILE SIDEBAR */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm"
          />
        )}

        {/* MAIN COMMAND CENTER CONTENT */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* MOBILE STICKY BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0e1a] border-t-2 border-pixel-orange-fiery/40 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            onSelectTab?.("overview");
            if (pathname !== "/admin/communications") router.push("/admin/communications");
          }}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            currentTab === "overview" ? "text-pixel-orange-bright" : "text-pixel-muted"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="font-pixel text-[8px]">HUB</span>
        </button>
        <button
          onClick={() => {
            onSelectTab?.("announcements");
            if (pathname !== "/admin/communications/announcements") router.push("/admin/communications/announcements");
          }}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            currentTab === "announcements" ? "text-pixel-orange-bright" : "text-pixel-muted"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span className="font-pixel text-[8px]">LIVE</span>
        </button>
        {canCreate && (
          <button
            onClick={() => {
              if (onOpenCompose) {
                onOpenCompose();
              } else {
                router.push("/admin/communications/create");
              }
            }}
            className="flex flex-col items-center gap-0.5 p-1 text-pixel-orange-fiery font-bold"
          >
            <div className="w-8 h-8 rounded bg-pixel-orange-fiery text-black flex items-center justify-center -mt-4 shadow-lg border border-pixel-cream">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="font-pixel text-[8px]">COMPOSE</span>
          </button>
        )}
        <button
          onClick={() => {
            onSelectTab?.("scheduled");
            if (pathname !== "/admin/communications/scheduled") router.push("/admin/communications/scheduled");
          }}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            currentTab === "scheduled" ? "text-pixel-orange-bright" : "text-pixel-muted"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="font-pixel text-[8px]">QUEUE</span>
        </button>
        <button
          onClick={() => {
            onSelectTab?.("delivery");
            if (pathname !== "/admin/communications/delivery") router.push("/admin/communications/delivery");
          }}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            currentTab === "delivery" ? "text-pixel-orange-bright" : "text-pixel-muted"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span className="font-pixel text-[8px]">LOGS</span>
        </button>
      </nav>
    </div>
  );
};
