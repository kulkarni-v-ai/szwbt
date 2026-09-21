"use client";

import React, { useState } from "react";
import Link from "next/link";
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

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentRole,
  children,
}) => {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream flex flex-col font-sans">
      {/* HUD Header Topbar */}
      <PixelHUD
        currentRoleTitle={currentRole.roleName}
        badge={currentRole.badge}
        showRoleSwitcher={true}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-64 bg-pixel-dark border-r-2 border-pixel-gray-800 p-4 shrink-0">
          <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-wider">
              OPERATIONAL ROLES
            </span>
            <PixelBadge variant="orange">Matrix</PixelBadge>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
            {ROLE_MATRIX.map((r) => {
              const isActive = pathname === r.path;
              return (
                <Link
                  key={r.roleId}
                  href={r.path}
                  className={`p-2.5 border transition-all flex items-center justify-between group ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border-black font-bold shadow-pixel-sm"
                      : "bg-pixel-black/60 text-pixel-gray-400 border-pixel-gray-800 hover:border-pixel-orange-fiery hover:text-pixel-cream"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? "text-black" : "text-pixel-orange-bright"}>
                      {iconMap[r.icon] || <Zap className="w-4 h-4" />}
                    </span>
                    <span className="font-pixel text-[10px] truncate">{r.roleName}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-black" : "text-pixel-gray-600 group-hover:text-pixel-orange-bright"}`} />
                </Link>
              );
            })}
          </div>

          {/* User Account Quick Info */}
          <div className="border-t border-pixel-gray-800 pt-3 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery flex items-center justify-center font-pixel text-xs text-pixel-orange-bright">
                OP
              </div>
              <div>
                <p className="font-pixel text-[10px] text-pixel-cream">OPERATOR ACTIVE</p>
                <p className="font-sans text-[9px] text-pixel-green">ONLINE</p>
              </div>
            </div>
            <Link href="/login" title="Logout Session">
              <LogOut className="w-4 h-4 text-pixel-gray-500 hover:text-pixel-red transition-colors" />
            </Link>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Role Header Banner */}
          <div className="mb-6 bg-pixel-dark border-2 border-pixel-gray-800 p-4 shadow-pixel flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-pixel-orange-fiery">{iconMap[currentRole.icon]}</span>
                <h1 className="font-display text-xl sm:text-2xl text-pixel-cream font-bold tracking-tight">
                  {currentRole.roleName} Dashboard
                </h1>
              </div>
              <p className="font-sans text-xs text-pixel-gray-400">
                {currentRole.description}
              </p>
            </div>

            {/* Quick Actions & Notifications Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 bg-pixel-black border border-pixel-gray-700 text-pixel-gray-300 hover:text-pixel-orange-bright cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pixel-orange-fiery rounded-full" />
              </button>
              <PixelBadge variant="orange">{currentRole.badge}</PixelBadge>
            </div>
          </div>

          {/* Notifications Drawer */}
          {notificationsOpen && (
            <div className="mb-6 p-4 bg-pixel-black border-2 border-pixel-amber shadow-pixel">
              <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2 mb-2">
                <span className="font-pixel text-[10px] text-pixel-amber uppercase">
                  OPERATIONAL ALERTS
                </span>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="font-pixel text-[10px] text-pixel-gray-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <ul className="space-y-1 font-sans text-xs text-pixel-gray-300">
                <li className="p-2 bg-pixel-dark border-l-2 border-pixel-orange-fiery">
                  <span className="font-pixel text-[9px] text-pixel-orange-bright">SYSTEM:</span> SMTP Email & OTP Server Transporter Active.
                </li>
                <li className="p-2 bg-pixel-dark border-l-2 border-pixel-green">
                  <span className="font-pixel text-[9px] text-pixel-green">HOSTELS:</span> Shalmala & Vindhya Hostels 4-Bed Room Allocation Active.
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
