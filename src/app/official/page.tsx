"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Shield,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Activity,
  Zap,
  Plus,
  RefreshCw,
  X,
  User,
  Users,
  Eye,
  Check,
  Flag,
  Wifi,
  WifiOff,
  HelpCircle,
  FileText,
  Radio,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/rbac/useAuth";
import { ScoringConfig } from "@/lib/scoring/rules";

interface OfficialMatchItem {
  id: string;
  dayId: string;
  time: string;
  category: string;
  court: string;
  matchNumber: string;
  playerA: string;
  institutionA: string;
  playerB: string;
  institutionB: string;
  scoreA: string | null;
  scoreB: string | null;
  status: string; // "UPCOMING" | "READY" | "LIVE" | "PAUSED" | "COMPLETED"
  winner: string | null;
  assignedOfficialId: string | null;
  interruptionReason?: string | null;
  interruptionNotes?: string | null;
  courtStatus?: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  events?: any[];
  day?: { id: string; date: string; dayNumber: string; stage: string };
}

interface MatchDetailResponse {
  match: OfficialMatchItem;
  court: any;
  events: any[];
  scoringConfig: ScoringConfig;
  readiness: {
    matchAssigned: boolean;
    courtAssigned: boolean;
    courtName: string;
    participantsConfigured: boolean;
    officialAssigned: boolean;
    scoringConfigured: boolean;
    readyToStart: boolean;
    issues: string[];
  };
  serverTime: string;
}

export default function MatchOfficialWorkspace() {
  const { user, isAuthenticated, isLoading: authLoading, hasRole } = useAuth();
  const isSuperAdmin = hasRole("SUPER_ADMIN");

  // Tab State: "WORKSPACE" (current match) | "UPCOMING" | "HISTORY"
  const [activeTab, setActiveTab] = useState<"WORKSPACE" | "UPCOMING" | "HISTORY">("WORKSPACE");

  // Telemetry & Match States
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<OfficialMatchItem | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<OfficialMatchItem[]>([]);
  const [completedMatches, setCompletedMatches] = useState<OfficialMatchItem[]>([]);
  const [matchDetail, setMatchDetail] = useState<MatchDetailResponse | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Sync & Connection Status
  const [connectionStatus, setConnectionStatus] = useState<"CONNECTED" | "SYNCING" | "SYNC_DELAYED" | "DISCONNECTED">("CONNECTED");
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [bannerAlert, setBannerAlert] = useState<{ type: "ERROR" | "WARNING" | "INFO"; message: string } | null>(null);

  // Operational Clock
  const [currentTime, setCurrentTime] = useState<string>("");

  // Modals
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("Medical Hold");
  const [pauseNotes, setPauseNotes] = useState("");

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState("COURT");
  const [issueDesc, setIssueDesc] = useState("");

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<"PLAYER_A" | "PLAYER_B">("PLAYER_A");

  // Keep Clock Updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Assigned Matches Roster
  const fetchAssignedMatches = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setConnectionStatus("SYNCING");

    try {
      const res = await fetch("/api/official/matches", {
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setBannerAlert({
            type: "ERROR",
            message: "403 Forbidden: You do not have Match Official operational clearance.",
          });
        }
        setConnectionStatus("DISCONNECTED");
        return;
      }

      const json = await res.json();
      if (json.success) {
        setCurrentMatch(json.data.currentMatch);
        setUpcomingMatches(json.data.upcomingMatches || []);
        setCompletedMatches(json.data.completedMatches || []);
        setConnectionStatus("CONNECTED");
        setLastSyncTime(new Date().toLocaleTimeString());

        // Default selected match to currentMatch if none set
        if (!selectedMatchId && json.data.currentMatch) {
          setSelectedMatchId(json.data.currentMatch.id);
        }
      }
    } catch (err) {
      console.error("Failed to load assigned matches:", err);
      setConnectionStatus("DISCONNECTED");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedMatchId]);

  // Fetch Detailed Match Telemetry for Selected Match
  const fetchMatchDetail = useCallback(async (matchId: string, quiet = false) => {
    if (!matchId) return;
    if (!quiet) setActionPending(true);

    try {
      const res = await fetch(`/api/official/matches/${matchId}`, {
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.status === 403) {
        setBannerAlert({
          type: "WARNING",
          message: "MATCH ASSIGNMENT CHANGED: You are no longer assigned to this match.",
        });
        setSelectedMatchId(null);
        setMatchDetail(null);
        fetchAssignedMatches(true);
        return;
      }

      const json = await res.json();
      if (json.success) {
        setMatchDetail(json.data);
        setLastSyncTime(new Date().toLocaleTimeString());
      } else {
        setBannerAlert({ type: "ERROR", message: json.error || "Unable to load match details." });
      }
    } catch (err) {
      console.error("Failed to load match detail:", err);
      setBannerAlert({ type: "ERROR", message: "Network error loading match details." });
    } finally {
      if (!quiet) setActionPending(false);
    }
  }, [fetchAssignedMatches]);

  // Initial Load & Polling (Every 10 seconds for real-time court-side synchronization)
  useEffect(() => {
    fetchAssignedMatches();
    const interval = setInterval(() => {
      fetchAssignedMatches(true);
      if (selectedMatchId) {
        fetchMatchDetail(selectedMatchId, true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAssignedMatches, fetchMatchDetail, selectedMatchId]);

  // When selectedMatchId changes, fetch details
  useEffect(() => {
    if (selectedMatchId) {
      fetchMatchDetail(selectedMatchId);
    }
  }, [selectedMatchId, fetchMatchDetail]);

  // Operational Action Handler
  const handleAction = async (action: string, payload: any = {}) => {
    if (!selectedMatchId || actionPending) return;
    setActionPending(true);
    setBannerAlert(null);

    try {
      const clientRequestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const res = await fetch(`/api/official/matches/${selectedMatchId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          clientRequestId,
          ...payload,
        }),
      });

      const json = await res.json();

      if (res.status === 409) {
        setBannerAlert({
          type: "WARNING",
          message: "MATCH UPDATED ELSEWHERE: The match state changed. Your screen has been synchronized.",
        });
        await fetchMatchDetail(selectedMatchId, true);
        await fetchAssignedMatches(true);
        return;
      }

      if (res.status === 403) {
        setBannerAlert({
          type: "ERROR",
          message: "MATCH ASSIGNMENT CHANGED: You are no longer assigned to officiate this match.",
        });
        setSelectedMatchId(null);
        setMatchDetail(null);
        await fetchAssignedMatches(true);
        return;
      }

      if (!res.ok || !json.success) {
        setBannerAlert({
          type: "ERROR",
          message: json.error || `Action ${action} failed.`,
        });
        return;
      }

      // Success: Refresh state immediately
      await fetchMatchDetail(selectedMatchId, true);
      await fetchAssignedMatches(true);

      // Close modals if open
      setPauseModalOpen(false);
      setIssueModalOpen(false);
      setCompleteModalOpen(false);
    } catch (err: any) {
      console.error(`Error executing ${action}:`, err);
      setBannerAlert({
        type: "ERROR",
        message: "Network error. Please check your connection and retry.",
      });
    } finally {
      setActionPending(false);
    }
  };

  const activeMatch = matchDetail?.match || currentMatch;

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col font-sans selection:bg-[#FF5A16] selection:text-white">
      {/* ── TOP OPERATIONAL COMMAND HEADER ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#070D1F]/95 backdrop-blur border-b border-cyan-900/40 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Official Badge & Mode */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-2 py-1 bg-cyan-950/60 border border-cyan-800/50 rounded text-cyan-400 hover:text-cyan-300 transition text-xs font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXIT</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                  ● OFFICIAL MODE
                </span>
                <h1 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase font-mono">
                  MATCH OFFICIAL CONSOLE
                </h1>
              </div>
            </div>
          </div>

          {/* Center: Live Clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded font-mono text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-bold tracking-widest">{currentTime || "—:—:—"}</span>
          </div>

          {/* Right: Sync Status & Official Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/70 border border-slate-800 rounded text-[11px] font-mono">
              {connectionStatus === "CONNECTED" && (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 hidden sm:inline">SYNCED</span>
                </>
              )}
              {connectionStatus === "SYNCING" && (
                <>
                  <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span className="text-cyan-400 hidden sm:inline">SYNCING</span>
                </>
              )}
              {connectionStatus === "DISCONNECTED" && (
                <>
                  <WifiOff className="w-3 h-3 text-rose-500" />
                  <span className="text-rose-500 font-bold">OFFLINE</span>
                </>
              )}
            </div>

            <button
              onClick={() => {
                fetchAssignedMatches();
                if (selectedMatchId) fetchMatchDetail(selectedMatchId);
              }}
              disabled={actionPending}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition border border-slate-700"
              title="Manual Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionPending ? "animate-spin text-cyan-400" : ""}`} />
            </button>

            {/* Official Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-xs text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "O"}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">
                  {user?.name || "Official"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {user?.officialId || "UMPIRE"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── BANNER ALERTS (Conflicts, Reassignments, Errors) ──────────────── */}
      {bannerAlert && (
        <div
          className={`px-4 py-2 text-xs font-mono flex items-center justify-between ${
            bannerAlert.type === "ERROR"
              ? "bg-rose-950/90 text-rose-200 border-b border-rose-800"
              : bannerAlert.type === "WARNING"
              ? "bg-amber-950/90 text-amber-200 border-b border-amber-800"
              : "bg-cyan-950/90 text-cyan-200 border-b border-cyan-800"
          }`}
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{bannerAlert.message}</span>
            <button
              onClick={() => setBannerAlert(null)}
              className="ml-auto p-1 hover:bg-black/30 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── SUB-NAV TAB BAR (COURT-SIDE TABS) ─────────────────────────────── */}
      <nav className="bg-[#091124] border-b border-slate-800 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("WORKSPACE")}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold flex items-center gap-2 transition ${
              activeTab === "WORKSPACE"
                ? "bg-[#FF5A16] text-white shadow-[0_0_12px_rgba(255,90,22,0.4)]"
                : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>CURRENT MATCH</span>
            {activeMatch && (
              <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px]">
                {activeMatch.matchNumber}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("UPCOMING")}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold flex items-center gap-2 transition ${
              activeTab === "UPCOMING"
                ? "bg-[#FF5A16] text-white shadow-[0_0_12px_rgba(255,90,22,0.4)]"
                : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>UPCOMING ASSIGNMENTS</span>
            <span className="px-1.5 py-0.2 bg-slate-800 rounded text-[10px] text-cyan-400 font-bold">
              {upcomingMatches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold flex items-center gap-2 transition ${
              activeTab === "HISTORY"
                ? "bg-[#FF5A16] text-white shadow-[0_0_12px_rgba(255,90,22,0.4)]"
                : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>MATCH HISTORY</span>
            <span className="px-1.5 py-0.2 bg-slate-800 rounded text-[10px] text-slate-300">
              {completedMatches.length}
            </span>
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-6">
        {/* LOADING SKELETON */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 animate-pulse">
            <div className="h-28 bg-slate-900/60 border border-slate-800 rounded-lg" />
            <div className="h-64 bg-slate-900/60 border border-slate-800 rounded-lg" />
            <div className="h-32 bg-slate-900/60 border border-slate-800 rounded-lg" />
          </div>
        )}

        {!loading && (
          <>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 1: WORKSPACE (CURRENT ASSIGNED MATCH)                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "WORKSPACE" && (
              <>
                {!activeMatch ? (
                  /* EMPTY STATE: NO ASSIGNED MATCH */
                  <div className="p-8 sm:p-12 text-center bg-[#091124]/60 border border-dashed border-slate-800 rounded-xl space-y-4 max-w-xl mx-auto my-12">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-600 border border-slate-800">
                      <Shield className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                      NO MATCH ASSIGNED
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      You currently have no matches assigned to your official badge. Matches assigned by
                      Tournament Live Operations will appear here automatically.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => fetchAssignedMatches()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700 transition"
                      >
                        REFRESH ASSIGNMENTS
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* MATCH HEADER HUD */}
                    <div className="bg-gradient-to-r from-[#0C152E] via-[#091124] to-[#0C152E] border border-cyan-900/40 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/50 text-[#FF5A16] font-mono text-[11px] font-bold rounded">
                            {activeMatch.court || "COURT UNASSIGNED"}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {activeMatch.matchNumber}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-cyan-300 font-medium">
                            {activeMatch.category}
                          </span>
                        </div>

                        {/* Match Status Badge */}
                        <div className="flex items-center gap-2">
                          {activeMatch.status === "LIVE" && (
                            <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-600 text-emerald-400 text-xs font-mono font-black rounded flex items-center gap-1.5 shadow-[0_0_8px_#10B981]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              LIVE MATCH
                            </span>
                          )}
                          {activeMatch.status === "PAUSED" && (
                            <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-600 text-amber-400 text-xs font-mono font-black rounded flex items-center gap-1.5 shadow-[0_0_8px_#F59E0B]">
                              <Pause className="w-3 h-3" />
                              PAUSED ({activeMatch.interruptionReason || "Hold"})
                            </span>
                          )}
                          {activeMatch.status === "UPCOMING" && (
                            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold rounded">
                              UPCOMING
                            </span>
                          )}
                          {activeMatch.status === "READY" && (
                            <span className="px-2.5 py-1 bg-cyan-950 border border-cyan-600 text-cyan-300 text-xs font-mono font-bold rounded">
                              READY TO START
                            </span>
                          )}
                          {activeMatch.status === "COMPLETED" && (
                            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-mono font-bold rounded">
                              ✓ COMPLETED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Participants Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        {/* Player A */}
                        <div className="flex items-center justify-between p-3 bg-[#050914]/80 border border-slate-800 rounded-lg">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                              PLAYER / TEAM A
                            </span>
                            <span className="text-sm sm:text-base font-black text-white block">
                              {activeMatch.playerA}
                            </span>
                            <span className="text-xs text-slate-400">
                              {activeMatch.institutionA || "Independent"}
                            </span>
                          </div>
                          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400 px-3">
                            {activeMatch.scoreA || "0"}
                          </div>
                        </div>

                        {/* Player B */}
                        <div className="flex items-center justify-between p-3 bg-[#050914]/80 border border-slate-800 rounded-lg">
                          <div>
                            <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider block">
                              PLAYER / TEAM B
                            </span>
                            <span className="text-sm sm:text-base font-black text-white block">
                              {activeMatch.playerB}
                            </span>
                            <span className="text-xs text-slate-400">
                              {activeMatch.institutionB || "Independent"}
                            </span>
                          </div>
                          <div className="text-2xl sm:text-3xl font-black font-mono text-orange-400 px-3">
                            {activeMatch.scoreB || "0"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── STATE A: MATCH PRE-CHECK & READINESS (IF NOT STARTED) ── */}
                    {activeMatch.status !== "LIVE" &&
                      activeMatch.status !== "PAUSED" &&
                      activeMatch.status !== "COMPLETED" && (
                        <div className="bg-[#091124] border border-cyan-900/40 rounded-xl p-5 space-y-5">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                                COURT-SIDE MATCH PRE-CHECK & READINESS
                              </h3>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              BWF 21-PT RALLY FORMAT
                            </span>
                          </div>

                          {/* Readiness Checklist */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-3 bg-[#050914] border border-slate-800 rounded flex items-center gap-3">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-white block">Match Assigned</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {activeMatch.matchNumber}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-[#050914] border border-slate-800 rounded flex items-center gap-3">
                              {activeMatch.court && activeMatch.court !== "TBA" ? (
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                              <div>
                                <span className="text-xs font-bold text-white block">Court Assigned</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {activeMatch.court || "TBA"}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-[#050914] border border-slate-800 rounded flex items-center gap-3">
                              {activeMatch.playerA && activeMatch.playerB ? (
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                              <div>
                                <span className="text-xs font-bold text-white block">Players Verified</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  A & B Confirmed
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-[#050914] border border-slate-800 rounded flex items-center gap-3">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-white block">Scoring Configured</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Best of 3 (21 Pts)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Pre-check Warning if Any */}
                          {matchDetail?.readiness?.issues && matchDetail.readiness.issues.length > 0 && (
                            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-xs font-mono">
                              <span className="font-bold block mb-1">⚠ READINESS WARNINGS:</span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {matchDetail.readiness.issues.map((iss, idx) => (
                                  <li key={idx}>{iss}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* START MATCH ACTION BUTTON */}
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleAction("START")}
                              disabled={actionPending || (matchDetail?.readiness && !matchDetail.readiness.courtAssigned)}
                              className="w-full sm:w-auto px-6 py-3 bg-[#FF5A16] hover:bg-[#e04f14] disabled:opacity-50 text-white font-mono font-bold text-sm rounded shadow-[0_0_15px_rgba(255,90,22,0.4)] flex items-center justify-center gap-2 transition"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>START MATCH ON {activeMatch.court}</span>
                            </button>
                          </div>
                        </div>
                      )}

                    {/* ── STATE B: LIVE SCORING WORKSPACE (TOUCH-FIRST HIGH CONTRAST) ── */}
                    {(activeMatch.status === "LIVE" || activeMatch.status === "PAUSED") && (
                      <div className="space-y-4">
                        {/* BIG SCOREBOARD CONTROLS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* PLAYER A SCORING ZONE */}
                          <div className="bg-gradient-to-b from-[#09152B] to-[#060D1E] border-2 border-cyan-600/50 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.15)] relative">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono text-[11px] font-bold rounded">
                                  PLAYER A
                                </span>
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">
                                  {activeMatch.institutionA}
                                </span>
                              </div>
                              <h2 className="text-lg sm:text-xl font-black text-white">
                                {activeMatch.playerA}
                              </h2>
                            </div>

                            {/* GIANT SCORE */}
                            <div className="py-6 sm:py-8 text-center">
                              <span className="text-7xl sm:text-8xl font-black font-mono text-cyan-400 tracking-tight drop-shadow-[0_0_20px_rgba(24,216,208,0.4)]">
                                {activeMatch.scoreA || "0"}
                              </span>
                            </div>

                            {/* BIG TOUCH POINT BUTTON */}
                            <button
                              onClick={() => handleAction("SCORE", { pointTo: "PLAYER_A" })}
                              disabled={actionPending || activeMatch.status === "PAUSED"}
                              className="w-full py-4 sm:py-5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 text-white font-mono font-black text-base sm:text-lg rounded-lg shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] select-none"
                            >
                              <Plus className="w-5 h-5 stroke-[3]" />
                              <span>+1 POINT ({activeMatch.playerA.split(" ")[0]})</span>
                            </button>
                          </div>

                          {/* PLAYER B SCORING ZONE */}
                          <div className="bg-gradient-to-b from-[#1C0F08] to-[#0A0503] border-2 border-orange-600/50 rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(255,90,22,0.15)] relative">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 bg-orange-950 border border-orange-700 text-orange-300 font-mono text-[11px] font-bold rounded">
                                  PLAYER B
                                </span>
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">
                                  {activeMatch.institutionB}
                                </span>
                              </div>
                              <h2 className="text-lg sm:text-xl font-black text-white">
                                {activeMatch.playerB}
                              </h2>
                            </div>

                            {/* GIANT SCORE */}
                            <div className="py-6 sm:py-8 text-center">
                              <span className="text-7xl sm:text-8xl font-black font-mono text-orange-400 tracking-tight drop-shadow-[0_0_20px_rgba(255,90,22,0.4)]">
                                {activeMatch.scoreB || "0"}
                              </span>
                            </div>

                            {/* BIG TOUCH POINT BUTTON */}
                            <button
                              onClick={() => handleAction("SCORE", { pointTo: "PLAYER_B" })}
                              disabled={actionPending || activeMatch.status === "PAUSED"}
                              className="w-full py-4 sm:py-5 bg-[#FF5A16] hover:bg-[#e04f14] active:bg-[#c9420e] disabled:opacity-40 text-white font-mono font-black text-base sm:text-lg rounded-lg shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] select-none"
                            >
                              <Plus className="w-5 h-5 stroke-[3]" />
                              <span>+1 POINT ({activeMatch.playerB.split(" ")[0]})</span>
                            </button>
                          </div>
                        </div>

                        {/* COURT-SIDE ACTION BAR: UNDO, PAUSE/RESUME, REPORT ISSUE, COMPLETE */}
                        <div className="bg-[#091124] border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
                          {/* Left: Undo */}
                          <button
                            onClick={() => handleAction("UNDO")}
                            disabled={actionPending}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded border border-slate-700 flex items-center gap-2 transition active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>UNDO LAST POINT</span>
                          </button>

                          {/* Middle: Pause / Resume & Report Issue */}
                          <div className="flex items-center gap-2">
                            {activeMatch.status === "LIVE" ? (
                              <button
                                onClick={() => setPauseModalOpen(true)}
                                disabled={actionPending}
                                className="px-4 py-2.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 font-mono text-xs font-bold rounded border border-amber-800/80 flex items-center gap-2 transition"
                              >
                                <Pause className="w-3.5 h-3.5" />
                                <span>PAUSE MATCH</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction("RESUME")}
                                disabled={actionPending}
                                className="px-4 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-mono text-xs font-bold rounded border border-emerald-700 flex items-center gap-2 transition"
                              >
                                <Play className="w-3.5 h-3.5 fill-emerald-300" />
                                <span>RESUME MATCH</span>
                              </button>
                            )}

                            <button
                              onClick={() => setIssueModalOpen(true)}
                              disabled={actionPending}
                              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-medium rounded border border-slate-800 flex items-center gap-1.5 transition"
                            >
                              <Flag className="w-3.5 h-3.5 text-rose-400" />
                              <span className="hidden sm:inline">REPORT ISSUE</span>
                            </button>
                          </div>

                          {/* Right: Complete Match */}
                          <button
                            onClick={() => {
                              // Pre-select leader as winner
                              const a = parseInt(activeMatch.scoreA || "0", 10);
                              const b = parseInt(activeMatch.scoreB || "0", 10);
                              setSelectedWinner(a >= b ? "PLAYER_A" : "PLAYER_B");
                              setCompleteModalOpen(true);
                            }}
                            disabled={actionPending}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black rounded shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-2 transition"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>COMPLETE & SUBMIT RESULT</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── STATE C: COMPLETED MATCH VIEW ─────────────────────────── */}
                    {activeMatch.status === "COMPLETED" && (
                      <div className="bg-[#091124] border border-emerald-900/50 rounded-xl p-5 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-950 flex items-center justify-center mx-auto text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold font-mono text-emerald-400 uppercase tracking-wider">
                          MATCH OFFICIALLY COMPLETED & RESULT SUBMITTED
                        </h3>
                        <p className="text-xs text-slate-300 font-mono">
                          Winner:{" "}
                          <span className="text-white font-black">
                            {activeMatch.winner === "PLAYER_A" ? activeMatch.playerA : activeMatch.playerB}
                          </span>{" "}
                          ({activeMatch.scoreA} - {activeMatch.scoreB})
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          The result has been submitted to the Tournament Control Center. Public portal
                          display is governed by tournament referee review.
                        </p>
                      </div>
                    )}

                    {/* ── MATCH EVENT TIMELINE ─────────────────────────────────── */}
                    <div className="bg-[#091124] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          MATCH EVENT LOG
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          PERSISTED AUDIT STREAM
                        </span>
                      </div>

                      {matchDetail?.events && matchDetail.events.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {matchDetail.events
                            .slice()
                            .reverse()
                            .map((ev, idx) => (
                              <div
                                key={ev.id || idx}
                                className="flex items-center justify-between text-xs font-mono p-2 bg-[#050914] border border-slate-900 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(ev.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      ev.eventType === "POINT"
                                        ? "bg-cyan-950 text-cyan-300"
                                        : ev.eventType === "UNDO"
                                        ? "bg-amber-950 text-amber-300"
                                        : ev.eventType === "START"
                                        ? "bg-emerald-950 text-emerald-300"
                                        : ev.eventType === "PAUSE"
                                        ? "bg-amber-950 text-amber-300"
                                        : "bg-slate-800 text-slate-300"
                                    }`}
                                  >
                                    {ev.eventType}
                                  </span>
                                  <span className="text-slate-300">
                                    {ev.pointTo ? `Point to ${ev.pointTo}` : ev.eventType}
                                  </span>
                                </div>
                                <span className="font-bold text-white">
                                  {ev.scoreA} - {ev.scoreB}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-mono text-center py-4">
                          No score events recorded yet. Start match to begin.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 2: UPCOMING ASSIGNMENTS                                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "UPCOMING" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    MY UPCOMING MATCH ASSIGNMENTS ({upcomingMatches.length})
                  </h2>
                </div>

                {upcomingMatches.length === 0 ? (
                  <div className="p-8 text-center bg-[#091124]/40 border border-dashed border-slate-800 rounded-xl space-y-2">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-mono text-slate-400">NO UPCOMING MATCHES</p>
                    <p className="text-[11px] text-slate-500">
                      You have no additional matches scheduled in queue right now.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {upcomingMatches.map((m) => (
                      <div
                        key={m.id}
                        className="bg-[#091124] border border-slate-800 rounded-lg p-4 space-y-3 hover:border-cyan-800/60 transition"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="px-2 py-0.5 bg-slate-800 text-cyan-400 rounded font-bold">
                            {m.court || "Court TBA"}
                          </span>
                          <span className="text-slate-400">{m.time}</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            {m.category} • {m.matchNumber}
                          </span>
                          <div className="text-sm font-bold text-white mt-1">
                            {m.playerA} <span className="text-slate-500 font-normal">vs</span> {m.playerB}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {m.institutionA} vs {m.institutionB}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            STATUS: {m.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedMatchId(m.id);
                              setActiveTab("WORKSPACE");
                            }}
                            className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-mono text-xs rounded transition flex items-center gap-1"
                          >
                            <span>OPEN WORKSPACE</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 3: MATCH HISTORY                                           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "HISTORY" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    MY COMPLETED MATCHES ({completedMatches.length})
                  </h2>
                </div>

                {completedMatches.length === 0 ? (
                  <div className="p-8 text-center bg-[#091124]/40 border border-dashed border-slate-800 rounded-xl space-y-2">
                    <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-mono text-slate-400">NO MATCH HISTORY</p>
                    <p className="text-[11px] text-slate-500">
                      Matches you officiate and complete will be recorded in this permanent log.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {completedMatches.map((m) => (
                      <div
                        key={m.id}
                        className="bg-[#091124] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded font-bold">
                            ✓ {m.court}
                          </span>
                          <div>
                            <span className="font-bold text-white block">
                              {m.matchNumber}: {m.playerA} vs {m.playerB}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {m.category} • Winner:{" "}
                              <strong className="text-emerald-300">
                                {m.winner === "PLAYER_A" ? m.playerA : m.playerB}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white font-mono px-3 py-1 bg-[#050914] border border-slate-800 rounded">
                            {m.scoreA} - {m.scoreB}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedMatchId(m.id);
                              setActiveTab("WORKSPACE");
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                            title="Inspect Match"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODAL: PAUSE MATCH ────────────────────────────────────────────── */}
      {pauseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091124] border border-amber-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-mono font-bold text-amber-400 flex items-center gap-2">
                <Pause className="w-4 h-4" />
                PAUSE CURRENT MATCH
              </span>
              <button onClick={() => setPauseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">INTERRUPTION REASON</label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full bg-[#050914] border border-slate-700 rounded px-3 py-2 text-white"
                >
                  <option value="Medical Hold">Medical Hold / Injury Evaluation</option>
                  <option value="Court Issue">Court Maintenance / Moisture</option>
                  <option value="Equipment Issue">Shuttle / Equipment Replacement</option>
                  <option value="Facility Issue">Facility / Lighting / Net Problem</option>
                  <option value="Referee Consultation">Referee Operational Consultation</option>
                  <option value="Other">Other Operational Hold</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">OPERATIONAL NOTES (OPTIONAL)</label>
                <textarea
                  value={pauseNotes}
                  onChange={(e) => setPauseNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. 3-minute medical evaluation for player ankle"
                  className="w-full bg-[#050914] border border-slate-700 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPauseModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleAction("PAUSE", { reason: pauseReason, notes: pauseNotes })}
                disabled={actionPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-mono text-xs font-bold"
              >
                CONFIRM PAUSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT ISSUE ───────────────────────────────────────────── */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091124] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-mono font-bold text-rose-400 flex items-center gap-2">
                <Flag className="w-4 h-4" />
                REPORT OPERATIONAL ISSUE
              </span>
              <button onClick={() => setIssueModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">ISSUE CATEGORY</label>
                <select
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value)}
                  className="w-full bg-[#050914] border border-slate-700 rounded px-3 py-2 text-white"
                >
                  <option value="COURT">Court Surface / Line Markings</option>
                  <option value="EQUIPMENT">Net / Post / Shuttles</option>
                  <option value="PARTICIPANT">Player Conduct / Uniform</option>
                  <option value="TECHNICAL">Scoreboard / Electrical</option>
                  <option value="OTHER">Other Operational Issue</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">DESCRIPTION</label>
                <textarea
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe the operational incident or required assistance..."
                  className="w-full bg-[#050914] border border-slate-700 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIssueModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={() =>
                  handleAction("REPORT_ISSUE", { issueCategory, description: issueDesc })
                }
                disabled={actionPending || !issueDesc.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold"
              >
                SUBMIT ISSUE REPORT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COMPLETE MATCH & SUBMIT RESULT ─────────────────────────── */}
      {completeModalOpen && activeMatch && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091124] border border-emerald-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                VERIFY & SUBMIT FINAL RESULT
              </span>
              <button onClick={() => setCompleteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-[#050914] border border-slate-800 rounded text-center">
                <span className="text-slate-400 text-[10px] uppercase block mb-1">
                  FINAL RECORDED SCORE
                </span>
                <span className="text-2xl font-black text-white">
                  {activeMatch.scoreA || "0"} — {activeMatch.scoreB || "0"}
                </span>
              </div>

              <div>
                <label className="text-slate-300 block mb-2 font-bold">
                  CONFIRM MATCH WINNER:
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer transition ${
                      selectedWinner === "PLAYER_A"
                        ? "bg-cyan-950/60 border-cyan-500 text-white"
                        : "bg-[#050914] border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="winner"
                        checked={selectedWinner === "PLAYER_A"}
                        onChange={() => setSelectedWinner("PLAYER_A")}
                        className="accent-[#FF5A16]"
                      />
                      <span className="font-bold">{activeMatch.playerA}</span>
                    </div>
                    <span className="text-cyan-400 font-bold">{activeMatch.scoreA} pts</span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer transition ${
                      selectedWinner === "PLAYER_B"
                        ? "bg-orange-950/60 border-orange-500 text-white"
                        : "bg-[#050914] border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="winner"
                        checked={selectedWinner === "PLAYER_B"}
                        onChange={() => setSelectedWinner("PLAYER_B")}
                        className="accent-[#FF5A16]"
                      />
                      <span className="font-bold">{activeMatch.playerB}</span>
                    </div>
                    <span className="text-orange-400 font-bold">{activeMatch.scoreB} pts</span>
                  </label>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                By submitting this result, you certify that the score and winner are verified under
                official tournament regulations. Court {activeMatch.court} will be released.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setCompleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleAction("COMPLETE", { winner: selectedWinner })}
                disabled={actionPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-xs font-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                SUBMIT FINAL RESULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
