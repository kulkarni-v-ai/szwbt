"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Trophy,
  UserCheck,
  Home,
  Bus,
  CreditCard,
  Briefcase,
  User,
  Users,
  Zap,
  Activity,
  QrCode,
  Megaphone,
  HelpCircle,
  Radio,
  BarChart3,
  Server,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { PixelHUD } from "@/components/pixel/PixelHUD";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { ROLE_MATRIX, RoleInfo } from "@/data/dashboard";

interface DashboardShellProps {
  currentRole: RoleInfo;
  children: React.ReactNode;
}

const iconMap: Record<string, React.ReactNode> = {
  ShieldAlert: <ShieldAlert className="w-4 h-4" />,
  Trophy: <Trophy className="w-4 h-4" />,
  UserCheck: <UserCheck className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  Bus: <Bus className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  User: <User className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  QrCode: <QrCode className="w-4 h-4" />,
  Megaphone: <Megaphone className="w-4 h-4" />,
  HelpCircle: <HelpCircle className="w-4 h-4" />,
  Radio: <Radio className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
  Server: <Server className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
};

import { useAuth } from "@/lib/rbac/useAuth";

function isRoleAuthorized(
  roleId: string,
  hasPermission: (p: string) => boolean,
  hasRole: (r: string) => boolean,
  roles: string[]
): boolean {
  if (roles.includes("SUPER_ADMIN")) return true;
  switch (roleId) {
    case "super_admin":
      return roles.includes("SUPER_ADMIN");
    case "registration_admin":
      return hasRole("REGISTRATION_STAFF") || hasPermission("registration:read") || hasPermission("registration:create");
    case "accommodation_admin":
      return hasRole("ACCOMMODATION_STAFF") || hasPermission("accommodation:read") || hasPermission("accommodation:allocate");
    case "transport_admin":
      return hasRole("TRANSPORT_STAFF") || hasPermission("transport:read") || hasPermission("transport:boarding");
    case "finance_admin":
      return hasRole("FINANCE_STAFF") || hasPermission("finance:read") || hasPermission("payment:read");
    case "tournament_admin":
      return hasRole("TOURNAMENT_ADMIN") || hasPermission("match:create");
    case "official":
      return hasRole("MATCH_OFFICIAL") || hasPermission("scoring:update");
    case "team_manager":
      return hasRole("TEAM_MANAGER") || hasPermission("team:update");
    case "participant":
      return hasRole("PARTICIPANT") || hasPermission("participant:read");
    case "volunteer":
      return hasRole("VOLUNTEER");
    case "organizer":
      return hasRole("ORGANIZER");
    case "system_health":
      return roles.includes("SUPER_ADMIN") || hasPermission("system:read");
    case "reports":
      return hasPermission("reports:read");
    case "communications":
      return hasPermission("announcement:publish");
    case "support":
      return hasRole("SUPPORT_STAFF");
    default:
      return true;
  }
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentRole,
  children,
}) => {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isLight = theme === "light";

  const { user, roles, permissions, hasPermission, hasRole, logout } = useAuth();

  // Portals explicitly excluded from dashboard clearance portals
  const EXCLUDED_PORTAL_ROLES = [
    "finance_admin",
    "participant",
    "operations",
    "live_ops",
  ];

  // Filter visible portals according to authentic RBAC permissions
  const visibleRoles = ROLE_MATRIX.filter((r) => {
    // Exclude unwanted redirections/portals requested by user
    if (EXCLUDED_PORTAL_ROLES.includes(r.roleId)) return false;
    // If auth is still loading, or current page role, keep visible to prevent layout shift
    if (r.roleId === currentRole.roleId) return true;
    if (roles.length === 0) return true; // fallback preview
    return isRoleAuthorized(r.roleId, hasPermission, hasRole, roles);
  });

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isLight
          ? "dashboard-light bg-[#F8FAFC] text-slate-900"
          : "bg-pixel-black text-pixel-cream"
      }`}
    >
      {/* HUD Header Topbar */}
      <PixelHUD
        currentRoleTitle={currentRole.roleName}
        badge={user?.badge || currentRole.badge}
        showRoleSwitcher={false}
        theme={theme}
        onToggleTheme={() => setTheme(isLight ? "dark" : "light")}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar Navigation */}
        <aside
          className={`hidden lg:flex flex-col w-64 border-r p-4 shrink-0 transition-colors ${
            isLight
              ? "bg-white border-slate-200"
              : "bg-pixel-dark border-pixel-gray-800"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-3 mb-4 ${
              isLight ? "border-slate-100" : "border-pixel-gray-800"
            }`}
          >
            <span
              className={`text-xs uppercase tracking-wider font-bold ${
                isLight ? "text-slate-400" : "text-pixel-orange-bright"
              }`}
            >
              Clearance Portals
            </span>
            <span className="text-[10px] font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
              {visibleRoles.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
            {visibleRoles.map((r) => {
              const isActive = pathname === r.path;
              return (
                <Link
                  key={r.roleId}
                  href={r.path}
                  prefetch={false}
                  className={`px-3 py-2 rounded-lg border transition-all flex items-center justify-between group ${
                    isActive
                      ? "bg-orange-500 text-white border-orange-500 font-semibold shadow-xs"
                      : isLight
                      ? "bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                      : "bg-pixel-black/60 text-pixel-gray-400 border-pixel-gray-800 hover:border-pixel-orange-fiery hover:text-pixel-cream"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={
                        isActive
                          ? "text-white"
                          : isLight
                          ? "text-slate-400 group-hover:text-orange-500"
                          : "text-pixel-orange-bright"
                      }
                    >
                      {iconMap[r.icon] || <Zap className="w-4 h-4" />}
                    </span>
                    <span className="text-xs truncate font-medium">{r.roleName}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isActive
                        ? "text-white"
                        : isLight
                        ? "text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5"
                        : "text-pixel-gray-600 group-hover:text-pixel-orange-bright"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* User Account Quick Info */}
          <div
            className={`border-t pt-3 mt-4 flex items-center justify-between ${
              isLight ? "border-slate-100" : "border-pixel-gray-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isLight
                    ? "bg-orange-50 border border-orange-200 text-orange-600"
                    : "bg-pixel-orange-fiery/20 border border-pixel-orange-fiery text-pixel-orange-bright"
                }`}
              >
                OP
              </div>
              <div>
                <p
                  className={`text-xs font-semibold ${
                    isLight ? "text-slate-800" : "text-pixel-cream"
                  }`}
                >
                  Operator Active
                </p>
                <p
                  className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    isLight ? "text-emerald-600" : "text-pixel-green"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout Session"
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
            >
              <LogOut
                className={`w-4 h-4 transition-colors ${
                  isLight
                    ? "text-slate-400 hover:text-rose-600"
                    : "text-pixel-gray-500 hover:text-pixel-red"
                }`}
              />
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main
          className={`flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto ${
            isLight ? "bg-[#F8FAFC]" : ""
          }`}
        >
          {/* ═══ MASTER TOURNAMENT DASHBOARD HERO BANNER (COLLEGE CAMPUS PIXEL ART) ═══ */}
          <div
            className={`relative mb-6 rounded-2xl overflow-hidden border transition-all ${
              isLight
                ? "bg-white border-slate-200 shadow-sm"
                : "border border-[#FF5A16]/30 shadow-xl bg-[#07101D]"
            }`}
          >
            {/* Background image: KLE Tech Heritage Campus pixel art backdrop */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/college-campus-pixel.jpg"
                alt="KLE Tech University Heritage Campus"
                fill
                priority
                className={`object-cover object-center filter contrast-125 saturate-110 ${
                  isLight ? "opacity-15" : "opacity-30 sm:opacity-40"
                }`}
                style={{ imageRendering: "pixelated" }}
              />
              {isLight ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-orange-50/50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050914] via-[#050914]/85 to-[#050914]/40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07101D] via-transparent to-black/50" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                </>
              )}
            </div>

            {/* Banner Inner Content */}
            <div className="relative z-10 p-5 sm:p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-3xl">
                {/* Micro Badges & Venue Metadata */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-xs ${
                      isLight
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-[#FF5A16]/20 text-[#FF5A16] border-[#FF5A16]/40"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A16] animate-pulse" />
                    OPERATIONAL HUB &bull; {currentRole.badge}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono tracking-wider px-2.5 py-0.5 rounded border ${
                      isLight
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-[#18D8D0]/10 text-[#18D8D0] border-[#18D8D0]/30"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-slate-500" : "bg-[#18D8D0]"}`} />
                    KLE TECH CAMPUS &bull; HUBBALLI
                  </span>
                  <span className={`hidden sm:inline-block text-[11px] font-mono ${isLight ? "text-slate-400" : "text-[#91A0AE]"}`}>
                    OCT 18–21, 2026
                  </span>
                </div>

                {/* Role Title & Icon */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF5A16] to-[#d94e16] p-0.5 shadow-lg shadow-orange-500/20 flex items-center justify-center text-white shrink-0 mt-0.5 sm:mt-0">
                    <div
                      className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                        isLight ? "bg-white text-orange-600" : "bg-[#07101D] text-[#FF5A16]"
                      }`}
                    >
                      {iconMap[currentRole.icon] || <Zap className="w-5 h-5" />}
                    </div>
                  </div>
                  <div>
                    <h1
                      className={`text-2xl sm:text-3xl font-display font-bold tracking-tight flex flex-wrap items-center gap-2.5 ${
                        isLight ? "text-slate-900" : "text-[#F4E6CE]"
                      }`}
                    >
                      {currentRole.roleName} Dashboard
                      <span
                        className={`text-xs font-sans font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          isLight
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        ACTIVE CONSOLE
                      </span>
                    </h1>
                    <p className={`text-xs sm:text-sm font-sans mt-1 ${isLight ? "text-slate-500" : "text-[#91A0AE]"}`}>
                      {currentRole.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Notifications Trigger */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
                <Link
                  href="/tournament"
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                    isLight
                      ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900"
                      : "bg-black/50 hover:bg-black/80 border-white/10 hover:border-[#18D8D0]/50 text-[#18D8D0] backdrop-blur-md"
                  }`}
                  title="View Public Tournament"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">LIVE VIEW</span>
                </Link>

                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`relative p-2.5 rounded-lg border cursor-pointer transition-all shadow-xs ${
                    isLight
                      ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-[#FF5A16]"
                      : "border-white/10 bg-black/50 hover:bg-black/80 text-[#91A0AE] hover:text-[#FF5A16] backdrop-blur-md"
                  }`}
                  title="Command Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF5A16] rounded-full shadow-[0_0_8px_#FF5A16]" />
                </button>

                <div className="px-3 py-1.5 rounded-lg bg-[#FF5A16] text-white font-bold text-xs shadow-xs tracking-wider uppercase">
                  {currentRole.badge}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Drawer */}
          {notificationsOpen && (
            <div
              className={`mb-6 p-4 border rounded-xl ${
                isLight
                  ? "bg-amber-50/90 border-amber-200 text-slate-800 shadow-xs"
                  : "bg-pixel-black border-pixel-amber text-pixel-gray-300 shadow-pixel"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-2 mb-2 ${
                  isLight ? "border-amber-200" : "border-pixel-gray-800"
                }`}
              >
                <span
                  className={`text-xs uppercase font-bold tracking-wider ${
                    isLight ? "text-amber-800" : "text-pixel-amber"
                  }`}
                >
                  Operational Alerts
                </span>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className={`p-1 rounded-md text-xs ${
                    isLight
                      ? "text-slate-400 hover:text-slate-700"
                      : "text-pixel-gray-500 hover:text-white"
                  }`}
                >
                  ✕
                </button>
              </div>
              <ul className="space-y-1.5 text-xs">
                <li
                  className={`p-2.5 border-l-4 rounded-r-lg ${
                    isLight
                      ? "bg-white border-orange-500 text-slate-700 shadow-xs"
                      : "bg-pixel-dark border-pixel-orange-fiery text-pixel-gray-300"
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isLight ? "text-orange-600" : "text-pixel-orange-bright"
                    }`}
                  >
                    SYSTEM:
                  </span>{" "}
                  SMTP Email & OTP Server Transporter Active.
                </li>
                <li
                  className={`p-2.5 border-l-4 rounded-r-lg ${
                    isLight
                      ? "bg-white border-emerald-500 text-slate-700 shadow-xs"
                      : "bg-pixel-dark border-pixel-green text-pixel-gray-300"
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isLight ? "text-emerald-700" : "text-pixel-green"
                    }`}
                  >
                    HOSTELS:
                  </span>{" "}
                  Shalmala & Vindhya Hostels 5-Bed Room Allocation Active.
                </li>
              </ul>
            </div>
          )}

          {/* Dashboard Children Page View */}
          {children}
        </main>
      </div>
    </div>
  );
};
