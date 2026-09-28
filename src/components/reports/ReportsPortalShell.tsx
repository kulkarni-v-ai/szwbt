"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Bookmark,
  RefreshCw,
  LogOut,
  User,
  Shield,
  Layers,
  Lock,
  ChevronDown,
  Menu,
  X,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useAuth } from "@/lib/rbac/useAuth";

export interface ReportsPortalShellProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  accessibleCategories: string[];
  hasFinanceAccess: boolean;
  hasAuditAccess: boolean;
  canExport: boolean;
  onRefresh?: () => void;
  onOpenReportBuilder: () => void;
  onOpenExportDialog: () => void;
  onOpenSavedReports: () => void;
  children: React.ReactNode;
}

const ALL_NAV_CATEGORIES = [
  { id: "REGISTRATION", label: "01 REGISTRATION", desc: "Desk & Team Flow" },
  { id: "PARTICIPANTS", label: "02 PARTICIPANTS", desc: "Athlete Roster" },
  { id: "TEAMS", label: "03 TEAMS", desc: "Institutions" },
  { id: "ACCOMMODATION", label: "04 ACCOMMODATION", desc: "Hostel Occupancy" },
  { id: "TRANSPORT", label: "05 TRANSPORT", desc: "Zero-Payment Fleet" },
  { id: "FINANCE", label: "06 FINANCE", desc: "Fee Reconciliation", requiresFinance: true },
  { id: "MATCHES", label: "07 MATCHES", desc: "Court Fixtures" },
  { id: "RESULTS", label: "08 RESULTS", desc: "Verified Scores" },
  { id: "OPERATIONS", label: "09 OPERATIONS", desc: "Tasks & Incidents" },
  { id: "SUPPORT", label: "10 SUPPORT", desc: "Ticket Resolution" },
  { id: "COMMUNICATIONS", label: "11 COMMUNICATIONS", desc: "Broadcast Alerts" },
  { id: "AUDIT", label: "12 AUDIT", desc: "Tamper Log", requiresAudit: true },
];

export const ReportsPortalShell: React.FC<ReportsPortalShellProps> = ({
  currentCategory,
  onSelectCategory,
  accessibleCategories,
  hasFinanceAccess,
  hasAuditAccess,
  canExport,
  onRefresh,
  onOpenReportBuilder,
  onOpenExportDialog,
  onOpenSavedReports,
  children,
}) => {
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
      {/* ── TOP HUD HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#0b0c10]/95 backdrop-blur border-b-2 border-[#1f2430]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Terminal Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#f5a623] hover:text-white border border-[#2d3748] rounded bg-[#0b0c10]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/admin/reports" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-[#1b0d2b] border-2 border-[#ff5500] flex items-center justify-center text-[#ff5500] shadow-[0_0_12px_rgba(255,85,0,0.35)] group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-pixel text-xs sm:text-sm tracking-wider text-white">
                    REPORTS <span className="text-[#ff5500]">//</span> ANALYTICS
                  </h1>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 bg-[#ff5500]/20 border border-[#ff5500]/50 text-[#ff5500] font-pixel text-[9px] uppercase">
                    DATA STREAM
                  </span>
                </div>
                <p className="hidden md:block font-pixel text-[9px] text-[#f5a623]/80">
                  ONE TOURNAMENT. ONE OPERATIONAL VIEW.
                </p>
              </div>
            </Link>
          </div>

          {/* Quick HUD Metrics & Clock */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#060608] border border-[#2d3748] font-pixel text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-400">LIVE SNAPSHOT</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#060608] border border-[#2d3748] font-pixel text-[10px]">
              <Clock className="w-3.5 h-3.5 text-[#f5a623]" />
              <span className="text-[#f5a623]">{currentTime || "00:00:00 IST"}</span>
            </div>
          </div>

          {/* Action Strip & Profile */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenReportBuilder}
              className="px-2.5 sm:px-3 py-1.5 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-[10px] sm:text-xs flex items-center gap-1.5 transition-colors border border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.4)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">BUILD REPORT</span>
              <span className="sm:hidden">BUILD</span>
            </button>

            {canExport && (
              <button
                onClick={onOpenExportDialog}
                className="px-2.5 sm:px-3 py-1.5 bg-[#1b0d2b] hover:bg-[#2b1742] text-[#f5a623] border border-[#f5a623]/50 font-pixel text-[10px] sm:text-xs flex items-center gap-1.5 transition-colors"
                title="Export Filtered Dataset"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">EXPORT</span>
              </button>
            )}

            <button
              onClick={onOpenSavedReports}
              className="px-2.5 sm:px-3 py-1.5 bg-[#0b0c10] hover:bg-[#1a202c] text-[#f5e6ca] border border-[#2d3748] font-pixel text-[10px] sm:text-xs flex items-center gap-1.5 transition-colors"
              title="Saved Reports Matrix"
            >
              <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">SAVED</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 bg-[#0b0c10] hover:bg-[#1a202c] text-[#f5e6ca] border border-[#2d3748] transition-colors"
                title="Refresh Live Analytics"
                aria-label="Refresh Data"
              >
                <RefreshCw className="w-4 h-4 hover:rotate-180 transition-transform duration-500" />
              </button>
            )}

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 bg-[#060608] border border-[#2d3748] hover:border-[#ff5500] text-xs transition-colors"
              >
                <div className="w-6 h-6 bg-[#ff5500]/20 border border-[#ff5500] flex items-center justify-center font-pixel text-[10px] text-[#ff5500]">
                  {user?.name ? user.name[0].toUpperCase() : "R"}
                </div>
                <ChevronDown className="w-3 h-3 text-[#f5a623]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0b0c10] border-2 border-[#ff5500] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-50">
                  <div className="border-b border-[#2d3748] pb-2 mb-2">
                    <p className="font-pixel text-[11px] text-white truncate">{user?.name || "Reports Lead"}</p>
                    <p className="text-[10px] text-[#f5a623] truncate">{user?.email || "reports@szwbt2026.edu"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-[#ff5500]/20 text-[#ff5500] font-pixel text-[8px]">
                        ANALYTICS COMMAND
                      </span>
                      {hasFinanceAccess && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-pixel text-[8px]">
                          FINANCE CLEARANCE
                        </span>
                      )}
                      {hasAuditAccess && (
                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 font-pixel text-[8px]">
                          AUDIT CLEARANCE
                        </span>
                      )}
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

        {/* Horizontal Category Nav Strip (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto px-6 py-1.5 bg-[#060608] border-t border-[#1f2430] no-scrollbar">
          {ALL_NAV_CATEGORIES.map((cat) => {
            const isSelected = currentCategory.toUpperCase() === cat.id;
            const isAccessible =
              accessibleCategories.includes(cat.id) ||
              (cat.requiresFinance && hasFinanceAccess) ||
              (cat.requiresAudit && hasAuditAccess) ||
              (!cat.requiresFinance && !cat.requiresAudit);

            return (
              <button
                key={cat.id}
                onClick={() => isAccessible && onSelectCategory(cat.id)}
                disabled={!isAccessible}
                className={`px-3 py-1 font-pixel text-[10px] uppercase whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-[#ff5500] text-white border-[#ff5500] shadow-[0_0_8px_rgba(255,85,0,0.4)]"
                    : isAccessible
                    ? "bg-[#0b0c10] text-[#f5e6ca] border-[#2d3748] hover:border-[#f5a623] hover:text-[#f5a623]"
                    : "bg-[#0b0c10]/40 text-gray-600 border-gray-800 cursor-not-allowed opacity-60"
                }`}
              >
                {!isAccessible && <Lock className="w-2.5 h-2.5 text-gray-500" />}
                {cat.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0b0c10] border-r-2 border-[#ff5500] p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
                <span className="font-pixel text-xs text-white">SELECT REPORT</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1">
                {ALL_NAV_CATEGORIES.map((cat) => {
                  const isSelected = currentCategory.toUpperCase() === cat.id;
                  const isAccessible =
                    accessibleCategories.includes(cat.id) ||
                    (cat.requiresFinance && hasFinanceAccess) ||
                    (cat.requiresAudit && hasAuditAccess) ||
                    (!cat.requiresFinance && !cat.requiresAudit);

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (isAccessible) {
                          onSelectCategory(cat.id);
                          setMobileMenuOpen(false);
                        }
                      }}
                      disabled={!isAccessible}
                      className={`w-full text-left px-3 py-2 font-pixel text-xs flex items-center justify-between border transition-all ${
                        isSelected
                          ? "bg-[#ff5500] text-white border-[#ff5500]"
                          : isAccessible
                          ? "bg-[#060608] text-[#f5e6ca] border-[#2d3748] hover:border-[#f5a623]"
                          : "bg-black/40 text-gray-600 border-gray-800 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {!isAccessible && <Lock className="w-3 h-3 text-gray-500" />}
                        <span>{cat.label}</span>
                      </div>
                      <span className="text-[9px] opacity-70">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 border-t border-[#2d3748]">
              <div className="font-pixel text-[10px] text-gray-400 mb-2">SYSTEM CLEARANCE</div>
              <div className="p-2 bg-[#060608] border border-[#2d3748] text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>Finance Clearance:</span>
                  <span className={hasFinanceAccess ? "text-emerald-400" : "text-gray-500"}>
                    {hasFinanceAccess ? "AUTHORIZED" : "LOCKED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Audit Clearance:</span>
                  <span className={hasAuditAccess ? "text-cyan-400" : "text-gray-500"}>
                    {hasAuditAccess ? "AUTHORIZED" : "LOCKED"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Workspace Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 mb-14 md:mb-6">{children}</main>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0c10] border-t-2 border-[#1f2430] p-2 flex items-center justify-around">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Layers className="w-4 h-4 text-[#ff5500]" />
          <span className="font-pixel text-[8px]">REPORTS</span>
        </button>
        <button
          onClick={onOpenReportBuilder}
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Sparkles className="w-4 h-4 text-[#f5a623]" />
          <span className="font-pixel text-[8px]">BUILD</span>
        </button>
        {canExport && (
          <button
            onClick={onOpenExportDialog}
            className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="font-pixel text-[8px]">EXPORT</span>
          </button>
        )}
        <button
          onClick={onOpenSavedReports}
          className="flex flex-col items-center gap-0.5 text-xs text-[#f5e6ca]"
        >
          <Bookmark className="w-4 h-4 text-cyan-400" />
          <span className="font-pixel text-[8px]">SAVED</span>
        </button>
      </div>
    </div>
  );
};
