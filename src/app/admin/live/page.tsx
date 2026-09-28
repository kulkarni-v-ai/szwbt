"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  X,
  User,
  Users,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Tv,
  Activity,
  Check,
  Award,
  Zap,
  Layers,
  Calendar,
  Building,
  Flag,
} from "lucide-react";

// Types
interface CourtLiveItem {
  id: string;
  courtNumber: string;
  status: string; // "LIVE" | "READY" | "PAUSED" | "BREAK" | "MAINTENANCE" | "UNAVAILABLE"
  umpire: string | null;
  currentMatch: {
    id: string;
    matchNumber: string;
    category: string;
    time: string;
    playerA: string;
    institutionA: string;
    playerB: string;
    institutionB: string;
    scoreA: string;
    scoreB: string;
    status: string;
    interruptionReason?: string | null;
    interruptionNotes?: string | null;
    assignedOfficial?: { id: string; name: string; email?: string } | null;
    events?: any[];
  } | null;
  nextMatch: {
    id: string;
    matchNumber: string;
    category: string;
    time: string;
    playerA: string;
    institutionA: string;
    playerB: string;
    institutionB: string;
    status: string;
  } | null;
}

interface MatchItem {
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
  status: string;
  winner: string | null;
  assignedOfficialId: string | null;
  interruptionReason?: string | null;
  interruptionNotes?: string | null;
  isPublished?: boolean;
  events?: any[];
  day?: { id: string; date: string; dayNumber: string; stage: string };
}

interface LiveOverviewKPIs {
  liveNow: number;
  upcoming: number;
  completed: number;
  delayed: number;
  courtsActive: number;
  courtsAvailable: number;
  unassignedCourts: number;
  issuesCount: number;
  totalCourts: number;
}

interface AlertItem {
  id: string;
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message: string;
  matchId?: string;
  court?: string;
  timestamp: string;
}

interface OfficialItem {
  id: string;
  name: string;
  email: string;
  officialId: string | null;
  badge: string | null;
}

export default function LiveOperationsDashboard() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "live_ops")!;
  const { user, hasPermission } = useAuth();

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<
    "COURTS" | "LIVE" | "QUEUE" | "COMPLETED" | "ALERTS" | "AUDIT"
  >("COURTS");

  // Telemetry States
  const [kpis, setKpis] = useState<LiveOverviewKPIs | null>(null);
  const [courts, setCourts] = useState<CourtLiveItem[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchItem[]>([]);
  const [queueMatches, setQueueMatches] = useState<MatchItem[]>([]);
  const [delayedMatches, setDelayedMatches] = useState<MatchItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [officials, setOfficials] = useState<OfficialItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Operational Clock
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals & Panels
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [showMatchPanel, setShowMatchPanel] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("Medical");
  const [pauseNotes, setPauseNotes] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeWinner, setCompleteWinner] = useState<"PLAYER_A" | "PLAYER_B">("PLAYER_A");
  const [showAssignCourtModal, setShowAssignCourtModal] = useState(false);
  const [assignCourtTarget, setAssignCourtTarget] = useState("");
  const [showAssignOfficialModal, setShowAssignOfficialModal] = useState(false);
  const [assignOfficialTarget, setAssignOfficialTarget] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Schedule Match Form State
  const [scheduleDayId, setScheduleDayId] = useState("OCT18");
  const [scheduleTime, setScheduleTime] = useState("09:00 IST");
  const [scheduleCategory, setScheduleCategory] = useState("Women's Singles");
  const [scheduleCourt, setScheduleCourt] = useState("Court 01");
  const [scheduleMatchNumber, setScheduleMatchNumber] = useState("");
  const [schedulePlayerA, setSchedulePlayerA] = useState("");
  const [scheduleInstA, setScheduleInstA] = useState("");
  const [schedulePlayerB, setSchedulePlayerB] = useState("");
  const [scheduleInstB, setScheduleInstB] = useState("");
  const [scheduleOfficialId, setScheduleOfficialId] = useState("");

  // New Court Form State
  const [newCourtNumber, setNewCourtNumber] = useState("");
  const [newCourtUmpire, setNewCourtUmpire] = useState("");

  // Score Override Form State
  const [overrideScoreA, setOverrideScoreA] = useState("");
  const [overrideScoreB, setOverrideScoreB] = useState("");

  // ── Fetch Telemetry Data ───────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/live/overview");
      if (!res.ok) {
        throw new Error(`Failed to load live overview (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setKpis(json.data.kpis);
        setCourts(json.data.courts || []);
        setLiveMatches(json.data.liveMatches || []);
        setQueueMatches(json.data.queueMatches || []);
        setDelayedMatches(json.data.delayedMatches || []);
        setAlerts(json.data.alerts || []);
        setOfficials(json.data.officials || []);
        setRecentEvents(json.data.recentEvents || []);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      console.error("fetchOverview error:", err);
      setErrorMsg(err.message || "Failed to synchronize live tournament telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll overview every 10 seconds for near-real-time updates
  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // ── Open Match Control Panel ───────────────────────────────────────
  const openMatchControl = async (match: any) => {
    setSelectedMatch(match);
    setOverrideScoreA(match.scoreA || "0");
    setOverrideScoreB(match.scoreB || "0");
    setShowMatchPanel(true);
    setConflictWarning(null);

    // Fetch full events
    try {
      const res = await fetch(`/api/admin/live/matches/${match.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSelectedMatch(json.data.match);
        }
      }
    } catch (err) {
      console.error("Error loading match detail:", err);
    }
  };

  // ── Execute Match Transition Action ────────────────────────────────
  const executeMatchAction = async (action: string, payload: Record<string, any> = {}) => {
    if (!selectedMatch) return;
    setActionSubmitting(true);
    setConflictWarning(null);

    try {
      const res = await fetch(`/api/admin/live/matches/${selectedMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 409) {
          setConflictWarning(json.error || "COURT CONFLICT: Court is currently occupied by another match.");
        } else {
          alert(`Action Failed: ${json.error || "Operation error"}`);
        }
        setActionSubmitting(false);
        return;
      }

      // Refresh overview
      await fetchOverview();

      // Update selected match local state
      if (json.data) {
        setSelectedMatch(json.data);
      }

      // Close submodals
      setShowPauseModal(false);
      setShowCompleteModal(false);
      setShowAssignCourtModal(false);
      setShowAssignOfficialModal(false);
    } catch (err: any) {
      alert(`Network Error: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  // ── Create Scheduled Match ─────────────────────────────────────────
  const handleScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSubmitting(true);
    setConflictWarning(null);

    try {
      const res = await fetch("/api/admin/live/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayId: scheduleDayId,
          time: scheduleTime,
          category: scheduleCategory,
          court: scheduleCourt,
          matchNumber: scheduleMatchNumber.trim() || undefined,
          playerA: schedulePlayerA.trim(),
          institutionA: scheduleInstA.trim(),
          playerB: schedulePlayerB.trim(),
          institutionB: scheduleInstB.trim(),
          assignedOfficialId: scheduleOfficialId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 409) {
          setConflictWarning(json.error || "COURT CONFLICT: Court is occupied.");
        } else {
          alert(`Schedule Error: ${json.error || "Failed to schedule match."}`);
        }
        setActionSubmitting(false);
        return;
      }

      // Reset form & reload
      setSchedulePlayerA("");
      setScheduleInstA("");
      setSchedulePlayerB("");
      setScheduleInstB("");
      setScheduleMatchNumber("");
      setShowScheduleModal(false);
      await fetchOverview();
    } catch (err: any) {
      alert(`Network Error: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  // ── Create New Court ───────────────────────────────────────────────
  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourtNumber.trim()) return;
    setActionSubmitting(true);

    try {
      const res = await fetch("/api/admin/live/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtNumber: newCourtNumber.trim(),
          umpire: newCourtUmpire.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(`Error: ${json.error || "Failed to add court."}`);
        setActionSubmitting(false);
        return;
      }

      setNewCourtNumber("");
      setNewCourtUmpire("");
      setShowAddCourtModal(false);
      await fetchOverview();
    } catch (err: any) {
      alert(`Network Error: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  // ── Filtered Matches for Queue ─────────────────────────────────────
  const filteredQueue = useMemo(() => {
    return queueMatches.filter((m) => {
      if (courtFilter !== "ALL" && m.court !== courtFilter) return false;
      if (categoryFilter !== "ALL" && m.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.matchNumber.toLowerCase().includes(q) ||
          m.playerA.toLowerCase().includes(q) ||
          m.institutionA.toLowerCase().includes(q) ||
          m.playerB.toLowerCase().includes(q) ||
          m.institutionB.toLowerCase().includes(q) ||
          m.court.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [queueMatches, courtFilter, categoryFilter, searchQuery]);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 pb-20 font-mono text-xs">
        {/* ═══ TOP COMMAND BAR (MISSION CONTROL HUD) ═══ */}
        <div className="p-4 bg-[#07101D] border-2 border-[#FF5A16] shadow-[0_0_20px_rgba(255,90,22,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#FF5A16]/10 border border-[#FF5A16] flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-[#FF5A16] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-xs text-[#FF5A16] font-bold tracking-wider uppercase">
                  ● LIVE
                </span>
                <span className="font-pixel text-xs text-white font-bold tracking-wider uppercase">
                  TOURNAMENT LIVE OPERATIONS MATRIX
                </span>
                <span className="text-[9px] font-pixel px-1.5 py-0.5 bg-[#FF5A16]/20 text-[#FF5A16] border border-[#FF5A16]/40">
                  SOUTH ZONE 2026
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-[#91A0AE] mt-1">
                <span>
                  CLOCK: <strong className="text-white">{currentTime || "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  STATUS: <strong className="text-emerald-400">● CONNECTED</strong>
                </span>
                <span>•</span>
                <span>
                  LAST SYNC: <strong className="text-[#18D8D0]">{lastSyncTime || "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  OPERATOR: <strong className="text-white">{user?.name || "Controller"}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchOverview()}
              disabled={loading}
              className="px-3 py-1.5 bg-[#0D1929] hover:bg-[#16273D] border border-white/20 text-white font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>SYNC TELEMETRY</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(255,90,22,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SCHEDULE MATCH</span>
            </button>
            <button
              onClick={() => setShowAddCourtModal(true)}
              className="px-3 py-1.5 bg-[#0D1929] hover:bg-[#16273D] border border-[#18D8D0]/40 text-[#18D8D0] font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CONFIGURE COURT</span>
            </button>
          </div>
        </div>

        {/* Conflict Warning Banner */}
        {conflictWarning && (
          <div className="p-3 bg-rose-950/80 border-2 border-rose-500 text-rose-300 font-mono text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
            <button
              onClick={() => setConflictWarning(null)}
              className="text-white hover:underline font-pixel text-[9px] cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* ═══ PRIMARY DYNAMIC KPI STRIP ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-3 bg-[#07101D] border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.1)]">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">LIVE NOW</span>
            <div className="font-pixel text-xl text-red-500 font-bold mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              <span>{kpis?.liveNow || 0}</span>
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">UPCOMING</span>
            <div className="font-pixel text-xl text-[#18D8D0] font-bold mt-0.5">
              {kpis?.upcoming || 0}
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">COMPLETED</span>
            <div className="font-pixel text-xl text-emerald-400 font-bold mt-0.5">
              {kpis?.completed || 0}
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">DELAYED</span>
            <div className="font-pixel text-xl text-amber-400 font-bold mt-0.5">
              {kpis?.delayed || 0}
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">COURTS ACTIVE</span>
            <div className="font-pixel text-xl text-[#FF5A16] font-bold mt-0.5">
              {kpis?.courtsActive || 0}
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">COURTS READY</span>
            <div className="font-pixel text-xl text-emerald-400 font-bold mt-0.5">
              {kpis?.courtsAvailable || 0}
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">UNASSIGNED</span>
            <div className="font-pixel text-xl text-white font-bold mt-0.5">
              {kpis?.unassignedCourts || 0}
            </div>
          </div>

          <div className="p-3 bg-[#07101D] border border-white/10">
            <span className="font-pixel text-[8px] text-[#91A0AE] uppercase">ALERTS</span>
            <div className="font-pixel text-xl text-amber-400 font-bold mt-0.5">
              {kpis?.issuesCount || 0}
            </div>
          </div>
        </div>

        {/* ═══ NAVIGATION TABS ═══ */}
        <div className="border-b-2 border-[#16273D] flex items-center gap-1 overflow-x-auto pb-0">
          {(
            [
              { id: "COURTS", label: "8-COURT MATRIX", count: courts.length },
              { id: "LIVE", label: "LIVE MATCHES", count: liveMatches.length },
              { id: "QUEUE", label: "MATCH QUEUE", count: queueMatches.length },
              { id: "COMPLETED", label: "COMPLETED RESULTS", count: kpis?.completed || 0 },
              { id: "ALERTS", label: "ALERTS & INTERVENTIONS", count: alerts.length },
              { id: "AUDIT", label: "ACTIVITY STREAM", count: null },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 font-pixel text-xs tracking-wider uppercase transition-all whitespace-nowrap border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "border-[#FF5A16] text-[#FF5A16] bg-[#07101D] font-bold shadow-[0_4px_12px_rgba(255,90,22,0.15)]"
                    : "border-transparent text-[#91A0AE] hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded ${
                      isActive ? "bg-[#FF5A16]/20 text-[#FF5A16]" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB 1: 8-COURT MISSION CONTROL MATRIX ═══ */}
        {activeTab === "COURTS" && (
          <div className="space-y-6">
            {courts.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border-2 border-dashed border-white/20 space-y-4">
                <Radio className="w-8 h-8 text-[#91A0AE] mx-auto animate-pulse" />
                <div className="font-pixel text-sm text-white font-bold">
                  NO COURTS CONFIGURED IN TOURNAMENT DATABASE
                </div>
                <p className="text-[#91A0AE] text-xs max-w-md mx-auto">
                  Configure venue courts in PostgreSQL to start live court monitoring and match officiating.
                </p>
                <button
                  onClick={() => setShowAddCourtModal(true)}
                  className="px-4 py-2 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  + CONFIGURE COURT 01
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {courts.map((court) => {
                  const m = court.currentMatch;
                  const isLive = court.status === "LIVE";
                  const isPaused = court.status === "PAUSED";
                  const isReady = court.status === "READY";

                  return (
                    <div
                      key={court.id}
                      className={`p-4 bg-[#07101D] border-2 transition-all flex flex-col justify-between ${
                        isLive
                          ? "border-[#FF5A16] shadow-[0_0_20px_rgba(255,90,22,0.15)]"
                          : isPaused
                          ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {/* Court Card Header */}
                      <div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                          <span className="font-pixel text-xs text-white font-bold">
                            {court.courtNumber}
                          </span>
                          <span
                            className={`font-pixel text-[9px] px-2 py-0.5 border ${
                              isLive
                                ? "bg-red-950 text-red-400 border-red-500 animate-pulse"
                                : isPaused
                                ? "bg-amber-950 text-amber-300 border-amber-500"
                                : "bg-emerald-950 text-emerald-300 border-emerald-500"
                            }`}
                          >
                            {court.status}
                          </span>
                        </div>

                        {/* Match Body */}
                        {m ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#18D8D0] font-bold">{m.matchNumber}</span>
                              <span className="text-[#91A0AE]">{m.category}</span>
                            </div>

                            {/* Competitor Matchup */}
                            <div className="p-2.5 bg-[#0D1929] border border-white/10 space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="truncate pr-2">
                                  <div className="font-bold text-white text-xs truncate">
                                    {m.playerA}
                                  </div>
                                  <div className="text-[9px] text-[#91A0AE] truncate">
                                    {m.institutionA}
                                  </div>
                                </div>
                                <span className="font-pixel text-sm text-emerald-400 font-bold px-2 py-0.5 bg-black/40 border border-white/10">
                                  {m.scoreA}
                                </span>
                              </div>

                              <div className="text-center font-pixel text-[8px] text-[#91A0AE]">
                                VS
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="truncate pr-2">
                                  <div className="font-bold text-white text-xs truncate">
                                    {m.playerB}
                                  </div>
                                  <div className="text-[9px] text-[#91A0AE] truncate">
                                    {m.institutionB}
                                  </div>
                                </div>
                                <span className="font-pixel text-sm text-emerald-400 font-bold px-2 py-0.5 bg-black/40 border border-white/10">
                                  {m.scoreB}
                                </span>
                              </div>
                            </div>

                            {/* Interruption Notice if Paused */}
                            {isPaused && (
                              <div className="p-2 bg-amber-950/60 border border-amber-500 text-[10px] text-amber-300">
                                <strong>PAUSED:</strong> {m.interruptionReason || "Operational hold"}
                              </div>
                            )}

                            {/* Official Assignment Stamp */}
                            <div className="text-[10px] text-[#91A0AE] flex justify-between items-center">
                              <span>Umpire:</span>
                              <span className="text-white font-bold truncate max-w-[120px]">
                                {m.assignedOfficial?.name || court.umpire || "Unassigned"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Empty / Available State */
                          <div className="py-6 text-center space-y-2">
                            <div className="font-pixel text-[10px] text-emerald-400">
                              AVAILABLE FOR PLAY
                            </div>
                            {court.nextMatch ? (
                              <div className="p-2 bg-[#0D1929] border border-white/5 text-[10px] text-left">
                                <div className="text-[#91A0AE] text-[8px]">NEXT MATCH:</div>
                                <div className="text-white font-bold truncate">
                                  {court.nextMatch.playerA} vs {court.nextMatch.playerB}
                                </div>
                                <div className="text-[9px] text-[#18D8D0]">
                                  {court.nextMatch.matchNumber} ({court.nextMatch.time})
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-[#91A0AE]">
                                No matches queued for this court.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Action Bar */}
                      <div className="pt-3 border-t border-white/10 mt-3 flex gap-2">
                        {m ? (
                          <>
                            <button
                              onClick={() => openMatchControl(m)}
                              className="flex-1 py-1.5 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-[9px] uppercase transition-all cursor-pointer text-center"
                            >
                              CONTROL
                            </button>
                            {isLive && (
                              <button
                                onClick={() => {
                                  setSelectedMatch(m as any);
                                  setShowPauseModal(true);
                                }}
                                className="px-2 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-500 text-amber-300 font-pixel text-[9px] uppercase cursor-pointer"
                              >
                                <Pause className="w-3 h-3" />
                              </button>
                            )}
                            {isPaused && (
                              <button
                                onClick={() => {
                                  setSelectedMatch(m as any);
                                  executeMatchAction("RESUME");
                                }}
                                className="px-2 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-300 font-pixel text-[9px] uppercase cursor-pointer"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setScheduleCourt(court.courtNumber);
                              setShowScheduleModal(true);
                            }}
                            className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-pixel text-[9px] uppercase transition-all cursor-pointer text-center"
                          >
                            + ASSIGN MATCH
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 2: LIVE MATCHES ═══ */}
        {activeTab === "LIVE" && (
          <div className="space-y-4">
            <div className="p-3 bg-[#07101D] border border-white/10 font-pixel text-xs text-white">
              ACTIVE COURTS ON-GROUND ({liveMatches.length} MATCHES IN PLAY)
            </div>

            {liveMatches.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-white/10 text-[#91A0AE]">
                No matches are currently active. Open the [ MATCH QUEUE ] tab to start upcoming matches.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 bg-[#07101D] border-2 border-[#FF5A16] shadow-[0_0_20px_rgba(255,90,22,0.15)] space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs text-[#FF5A16] font-bold">
                          {m.court}
                        </span>
                        <span className="text-[10px] text-[#91A0AE]">•</span>
                        <span className="text-white font-bold">{m.matchNumber}</span>
                      </div>
                      <span
                        className={`font-pixel text-[9px] px-2 py-0.5 border ${
                          m.status === "LIVE"
                            ? "bg-red-950 text-red-300 border-red-500 animate-pulse"
                            : "bg-amber-950 text-amber-300 border-amber-500"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="p-3 bg-[#0D1929] border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-bold text-sm">{m.playerA}</div>
                          <div className="text-[#91A0AE] text-[10px]">{m.institutionA}</div>
                        </div>
                        <div className="font-pixel text-xl text-emerald-400 px-3 py-1 bg-black/60 border border-white/10 font-bold">
                          {m.scoreA || "0"}
                        </div>
                      </div>

                      <div className="text-center font-pixel text-[9px] text-[#91A0AE]">VS</div>

                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-bold text-sm">{m.playerB}</div>
                          <div className="text-[#91A0AE] text-[10px]">{m.institutionB}</div>
                        </div>
                        <div className="font-pixel text-xl text-emerald-400 px-3 py-1 bg-black/60 border border-white/10 font-bold">
                          {m.scoreB || "0"}
                        </div>
                      </div>
                    </div>

                    {m.interruptionReason && (
                      <div className="p-2 bg-amber-950/60 border border-amber-500 text-[10px] text-amber-300">
                        <strong>INTERRUPTED:</strong> {m.interruptionReason}
                        {m.interruptionNotes ? ` (${m.interruptionNotes})` : ""}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => openMatchControl(m)}
                        className="flex-1 py-2 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-xs uppercase cursor-pointer"
                      >
                        OPEN CONTROL PANEL
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMatch(m);
                          setShowCompleteModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-pixel text-xs uppercase cursor-pointer"
                      >
                        RECORD WINNER
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 3: MATCH QUEUE ═══ */}
        {activeTab === "QUEUE" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-[#07101D] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#91A0AE]" />
                  <input
                    type="text"
                    placeholder="Search queue by athlete, institution, court, match #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0D1929] border border-white/10 focus:border-[#FF5A16] text-white outline-none text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">COURT:</span>
                  <select
                    value={courtFilter}
                    onChange={(e) => setCourtFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#0D1929] border border-white/10 text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL COURTS</option>
                    {courts.map((c) => (
                      <option key={c.id} value={c.courtNumber}>
                        {c.courtNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="font-pixel text-xs text-[#18D8D0]">
                QUEUED MATCHES: {filteredQueue.length}
              </div>
            </div>

            {/* Queue Table */}
            <div className="bg-[#07101D] border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-[#0A1324] border-b border-white/10 text-[#91A0AE] font-pixel text-[9px] uppercase">
                      <th className="p-3">MATCH #</th>
                      <th className="p-3">SCHEDULED TIME</th>
                      <th className="p-3">CATEGORY</th>
                      <th className="p-3">PLAYER / TEAM A</th>
                      <th className="p-3">PLAYER / TEAM B</th>
                      <th className="p-3">COURT</th>
                      <th className="p-3">OFFICIAL</th>
                      <th className="p-3 text-right">OPERATIONAL ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredQueue.map((m) => (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">{m.matchNumber}</td>
                        <td className="p-3 text-[#18D8D0]">{m.time}</td>
                        <td className="p-3 text-[#91A0AE]">{m.category}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{m.playerA}</div>
                          <div className="text-[10px] text-[#91A0AE]">{m.institutionA}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{m.playerB}</div>
                          <div className="text-[10px] text-[#91A0AE]">{m.institutionB}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-pixel text-[9px] px-1.5 py-0.5 border ${
                              m.court && m.court !== "TBA"
                                ? "bg-white/5 text-white border-white/20"
                                : "bg-amber-950 text-amber-300 border-amber-500"
                            }`}
                          >
                            {m.court || "TBA"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-white text-[11px]">
                            {m.assignedOfficialId ? "Assigned" : "— Unassigned"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedMatch(m);
                                setAssignCourtTarget(m.court || "Court 01");
                                setShowAssignCourtModal(true);
                              }}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/20 text-[#18D8D0] font-pixel text-[9px] uppercase cursor-pointer"
                            >
                              COURT
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMatch(m);
                                executeMatchAction("START");
                              }}
                              className="px-2.5 py-1 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-[9px] uppercase cursor-pointer"
                            >
                              START
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredQueue.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[#91A0AE]">
                          No matches in queue matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 5: ALERTS & INTERVENTIONS ═══ */}
        {activeTab === "ALERTS" && (
          <div className="space-y-4">
            <div className="p-3 bg-[#07101D] border border-white/10 font-pixel text-xs text-white">
              SYSTEM ALERTS & ON-GROUND INTERVENTIONS ({alerts.length} ITEMS)
            </div>

            <div className="space-y-2">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-4 bg-[#07101D] border-l-4 flex items-start justify-between gap-3 ${
                    al.severity === "CRITICAL"
                      ? "border-red-500 bg-red-950/20"
                      : al.severity === "WARNING"
                      ? "border-amber-500 bg-amber-950/20"
                      : "border-[#18D8D0] bg-cyan-950/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        al.severity === "CRITICAL"
                          ? "text-red-500"
                          : al.severity === "WARNING"
                          ? "text-amber-400"
                          : "text-[#18D8D0]"
                      }`}
                    />
                    <div>
                      <div className="font-pixel text-xs text-white font-bold">{al.type}</div>
                      <p className="text-white text-xs mt-0.5">{al.message}</p>
                      <div className="text-[10px] text-[#91A0AE] mt-1 font-mono">
                        Triggered: {new Date(al.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {al.matchId && (
                    <button
                      onClick={() => {
                        const m = liveMatches.find((x) => x.id === al.matchId) || queueMatches.find((x) => x.id === al.matchId);
                        if (m) openMatchControl(m);
                      }}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-pixel text-[9px] uppercase cursor-pointer shrink-0"
                    >
                      RESOLVE
                    </button>
                  )}
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="p-12 text-center bg-[#07101D] border border-white/10 text-emerald-400 font-pixel text-xs">
                  ✓ NO ACTIVE OPERATIONAL ALERTS. ALL COURTS AND MATCHES NOMINAL.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB 6: ACTIVITY STREAM (AUDIT) ═══ */}
        {activeTab === "AUDIT" && (
          <div className="space-y-4">
            <div className="p-3 bg-[#07101D] border border-white/10 font-pixel text-xs text-white">
              LIVE EVENT CHRONICLE & AUDIT TRAIL
            </div>

            <div className="bg-[#07101D] border border-white/10 p-4 space-y-2">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 bg-[#0D1929] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-[#18D8D0] shrink-0" />
                    <div>
                      <span className="font-pixel text-[10px] text-[#FF5A16] font-bold mr-2">
                        {evt.action}
                      </span>
                      <span className="text-white">{evt.actorEmail}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#91A0AE]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {recentEvents.length === 0 && (
                <div className="p-8 text-center text-[#91A0AE]">
                  No operational activities recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ MODAL: LIVE MATCH CONTROL PANEL ═══ */}
        {showMatchPanel && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="bg-[#07101D] border-2 border-[#FF5A16] shadow-[0_0_35px_rgba(255,90,22,0.25)] w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-5">
              <button
                onClick={() => setShowMatchPanel(false)}
                className="absolute top-4 right-4 text-[#91A0AE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Radio className="w-5 h-5 text-[#FF5A16] animate-pulse" />
                <h3 className="font-pixel text-sm text-white font-bold uppercase">
                  MATCH CONTROL • {selectedMatch.matchNumber} ({selectedMatch.court})
                </h3>
              </div>

              {/* Match Header Strip */}
              <div className="p-3 bg-[#0D1929] border border-white/10 flex flex-wrap justify-between gap-2 text-xs">
                <div>
                  <span className="text-[#91A0AE]">CATEGORY:</span>{" "}
                  <span className="text-white font-bold">{selectedMatch.category}</span>
                </div>
                <div>
                  <span className="text-[#91A0AE]">SCHEDULED:</span>{" "}
                  <span className="text-[#18D8D0]">{selectedMatch.time}</span>
                </div>
                <div>
                  <span className="text-[#91A0AE]">STATUS:</span>{" "}
                  <span
                    className={`font-pixel text-[10px] px-2 py-0.5 border ${
                      selectedMatch.status === "LIVE"
                        ? "bg-red-950 text-red-300 border-red-500 animate-pulse"
                        : selectedMatch.status === "PAUSED"
                        ? "bg-amber-950 text-amber-300 border-amber-500"
                        : "bg-white/10 text-white border-white/20"
                    }`}
                  >
                    {selectedMatch.status}
                  </span>
                </div>
              </div>

              {/* Competitors & Live Score Board */}
              <div className="p-4 bg-[#0A1324] border-2 border-white/10 space-y-3">
                <div className="grid grid-cols-5 gap-2 items-center text-center">
                  <div className="col-span-2 text-left">
                    <div className="font-bold text-white text-sm">{selectedMatch.playerA}</div>
                    <div className="text-[10px] text-[#91A0AE]">{selectedMatch.institutionA}</div>
                  </div>
                  <div className="col-span-1">
                    <div className="font-pixel text-2xl text-emerald-400 font-bold">
                      {selectedMatch.scoreA || "0"} : {selectedMatch.scoreB || "0"}
                    </div>
                    <div className="text-[9px] text-[#91A0AE]">CURRENT SCORE</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="font-bold text-white text-sm">{selectedMatch.playerB}</div>
                    <div className="text-[10px] text-[#91A0AE]">{selectedMatch.institutionB}</div>
                  </div>
                </div>

                {/* Score Override Intervention */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="text-[10px] text-[#91A0AE]">SCORE INTERVENTION:</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={overrideScoreA}
                      onChange={(e) => setOverrideScoreA(e.target.value)}
                      placeholder="Score A"
                      className="w-16 p-1 bg-[#07101D] border border-white/20 text-center text-white font-bold text-xs"
                    />
                    <span className="text-white">-</span>
                    <input
                      type="text"
                      value={overrideScoreB}
                      onChange={(e) => setOverrideScoreB(e.target.value)}
                      placeholder="Score B"
                      className="w-16 p-1 bg-[#07101D] border border-white/20 text-center text-white font-bold text-xs"
                    />
                    <button
                      onClick={() =>
                        executeMatchAction("UPDATE_SCORE", {
                          scoreA: overrideScoreA,
                          scoreB: overrideScoreB,
                        })
                      }
                      disabled={actionSubmitting}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-pixel text-[9px] uppercase cursor-pointer"
                    >
                      COMMIT SCORE
                    </button>
                  </div>
                </div>
              </div>

              {/* State Machine Operational Actions */}
              <div className="space-y-2">
                <div className="font-pixel text-[10px] text-[#91A0AE] uppercase">
                  OPERATIONAL LIFECYCLE CONTROLS
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedMatch.status === "UPCOMING" && (
                    <button
                      onClick={() => executeMatchAction("START")}
                      disabled={actionSubmitting}
                      className="py-2.5 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>START MATCH</span>
                    </button>
                  )}

                  {selectedMatch.status === "LIVE" && (
                    <button
                      onClick={() => setShowPauseModal(true)}
                      disabled={actionSubmitting}
                      className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-pixel text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>PAUSE MATCH</span>
                    </button>
                  )}

                  {selectedMatch.status === "PAUSED" && (
                    <button
                      onClick={() => executeMatchAction("RESUME")}
                      disabled={actionSubmitting}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-pixel text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>RESUME MATCH</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowCompleteModal(true)}
                    disabled={actionSubmitting || selectedMatch.status === "COMPLETED"}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-pixel text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>MARK COMPLETE</span>
                  </button>

                  <button
                    onClick={() => {
                      setAssignCourtTarget(selectedMatch.court || "Court 01");
                      setShowAssignCourtModal(true);
                    }}
                    className="py-2.5 bg-[#0D1929] hover:bg-[#16273D] border border-white/20 text-[#18D8D0] font-pixel text-[10px] uppercase cursor-pointer"
                  >
                    REASSIGN COURT
                  </button>

                  <button
                    onClick={() => {
                      setAssignOfficialTarget(selectedMatch.assignedOfficialId || "");
                      setShowAssignOfficialModal(true);
                    }}
                    className="py-2.5 bg-[#0D1929] hover:bg-[#16273D] border border-white/20 text-white font-pixel text-[10px] uppercase cursor-pointer"
                  >
                    ASSIGN UMPIRE
                  </button>

                  <button
                    onClick={() => executeMatchAction("PUBLISH_RESULT")}
                    className="py-2.5 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-500 text-cyan-300 font-pixel text-[10px] uppercase cursor-pointer"
                  >
                    PUBLISH RESULT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBMODAL: PAUSE INTERRUPTION ═══ */}
        {showPauseModal && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="bg-[#07101D] border-2 border-amber-500 p-6 max-w-md w-full space-y-4">
              <div className="font-pixel text-xs text-amber-400 font-bold uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>INTERRUPTION ON {selectedMatch.court}</span>
              </div>
              <p className="text-white text-xs">
                Select reason for match pause. This will be recorded on the official tournament audit trail.
              </p>
              <div>
                <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">REASON</label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full p-2 bg-[#0D1929] border border-white/20 text-white outline-none cursor-pointer"
                >
                  <option value="Medical">Medical / Injury Hold</option>
                  <option value="Court issue">Court Issue / Floor Moisture</option>
                  <option value="Equipment issue">Equipment / Net / Shuttle Issue</option>
                  <option value="Facility">Arena Facility / Lighting Hold</option>
                  <option value="Other">Referee Discretionary Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">OPERATOR NOTES</label>
                <input
                  type="text"
                  placeholder="Optional brief notes..."
                  value={pauseNotes}
                  onChange={(e) => setPauseNotes(e.target.value)}
                  className="w-full p-2 bg-[#0D1929] border border-white/20 text-white outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => executeMatchAction("PAUSE", { reason: pauseReason, notes: pauseNotes })}
                  disabled={actionSubmitting}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  CONFIRM PAUSE
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBMODAL: COMPLETE MATCH & RECORD WINNER ═══ */}
        {showCompleteModal && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="bg-[#07101D] border-2 border-emerald-500 p-6 max-w-md w-full space-y-4">
              <div className="font-pixel text-xs text-emerald-400 font-bold uppercase flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>RECORD MATCH COMPLETION</span>
              </div>
              <p className="text-white text-xs">
                Select verified winner for {selectedMatch.matchNumber} ({selectedMatch.court}). The court will be released back to READY.
              </p>
              <div className="space-y-2">
                <label
                  onClick={() => setCompleteWinner("PLAYER_A")}
                  className={`p-3 border flex items-center justify-between cursor-pointer transition-all ${
                    completeWinner === "PLAYER_A"
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold"
                      : "bg-[#0D1929] border-white/10 text-white"
                  }`}
                >
                  <span>{selectedMatch.playerA} ({selectedMatch.institutionA})</span>
                  {completeWinner === "PLAYER_A" && <Check className="w-4 h-4 text-emerald-400" />}
                </label>
                <label
                  onClick={() => setCompleteWinner("PLAYER_B")}
                  className={`p-3 border flex items-center justify-between cursor-pointer transition-all ${
                    completeWinner === "PLAYER_B"
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold"
                      : "bg-[#0D1929] border-white/10 text-white"
                  }`}
                >
                  <span>{selectedMatch.playerB} ({selectedMatch.institutionB})</span>
                  {completeWinner === "PLAYER_B" && <Check className="w-4 h-4 text-emerald-400" />}
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => executeMatchAction("COMPLETE", { winner: completeWinner })}
                  disabled={actionSubmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  CONFIRM RESULT & FREE COURT
                </button>
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBMODAL: ASSIGN COURT ═══ */}
        {showAssignCourtModal && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="bg-[#07101D] border-2 border-[#18D8D0] p-6 max-w-md w-full space-y-4">
              <div className="font-pixel text-xs text-[#18D8D0] font-bold uppercase flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#18D8D0]" />
                <span>ASSIGN COURT TO {selectedMatch.matchNumber}</span>
              </div>
              <div>
                <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">SELECT COURT</label>
                <select
                  value={assignCourtTarget}
                  onChange={(e) => setAssignCourtTarget(e.target.value)}
                  className="w-full p-2 bg-[#0D1929] border border-white/20 text-white outline-none cursor-pointer"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.courtNumber}>
                      {c.courtNumber} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => executeMatchAction("ASSIGN_COURT", { courtNumber: assignCourtTarget })}
                  disabled={actionSubmitting}
                  className="flex-1 py-2 bg-[#18D8D0] hover:bg-[#12b3ac] text-black font-pixel text-xs uppercase font-bold cursor-pointer"
                >
                  CONFIRM ASSIGNMENT
                </button>
                <button
                  onClick={() => setShowAssignCourtModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBMODAL: ASSIGN OFFICIAL ═══ */}
        {showAssignOfficialModal && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="bg-[#07101D] border-2 border-white/20 p-6 max-w-md w-full space-y-4">
              <div className="font-pixel text-xs text-white font-bold uppercase flex items-center gap-2">
                <User className="w-4 h-4 text-[#18D8D0]" />
                <span>DESIGNATE MATCH OFFICIAL</span>
              </div>
              <div>
                <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">
                  OFFICIAL (VERIFIED UMPIRES)
                </label>
                <select
                  value={assignOfficialTarget}
                  onChange={(e) => setAssignOfficialTarget(e.target.value)}
                  className="w-full p-2 bg-[#0D1929] border border-white/20 text-white outline-none cursor-pointer"
                >
                  <option value="">Select Match Official...</option>
                  {officials.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name} ({off.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => executeMatchAction("ASSIGN_OFFICIAL", { officialId: assignOfficialTarget })}
                  disabled={actionSubmitting || !assignOfficialTarget}
                  className="flex-1 py-2 bg-[#FF5A16] hover:bg-[#E04808] disabled:opacity-40 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  ASSIGN UMPIRE
                </button>
                <button
                  onClick={() => setShowAssignOfficialModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-pixel text-xs uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODAL: SCHEDULE NEW MATCH ═══ */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="bg-[#07101D] border-2 border-[#FF5A16] w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="absolute top-4 right-4 text-[#91A0AE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-[#FF5A16]" />
                <h3 className="font-pixel text-sm text-white font-bold uppercase">
                  SCHEDULE TOURNAMENT MATCH
                </h3>
              </div>

              <form onSubmit={handleScheduleMatch} className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">STAGE / DAY</label>
                    <select
                      value={scheduleDayId}
                      onChange={(e) => setScheduleDayId(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    >
                      <option value="OCT18">OCT 18 (Day 1 - Round 1)</option>
                      <option value="OCT19">OCT 19 (Day 2 - Round 2 & QF)</option>
                      <option value="OCT20">OCT 20 (Day 3 - Semi-Finals)</option>
                      <option value="OCT21">OCT 21 (Day 4 - Grand Finals)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">SCHEDULED TIME</label>
                    <input
                      type="text"
                      required
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      placeholder="e.g. 10:30 IST"
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">CATEGORY</label>
                    <select
                      value={scheduleCategory}
                      onChange={(e) => setScheduleCategory(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    >
                      <option value="Women's Singles">Women's Singles</option>
                      <option value="Women's Doubles">Women's Doubles</option>
                      <option value="Institution Teams">Institution Teams</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">ASSIGNED COURT</label>
                    <select
                      value={scheduleCourt}
                      onChange={(e) => setScheduleCourt(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    >
                      <option value="TBA">TBA / Unassigned</option>
                      {courts.map((c) => (
                        <option key={c.id} value={c.courtNumber}>
                          {c.courtNumber} ({c.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Player A & Institution A */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">PLAYER / TEAM A</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Athlete / Team A"
                      value={schedulePlayerA}
                      onChange={(e) => setSchedulePlayerA(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">INSTITUTION A</label>
                    <input
                      type="text"
                      placeholder="e.g. KLE Tech Hubballi"
                      value={scheduleInstA}
                      onChange={(e) => setScheduleInstA(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    />
                  </div>
                </div>

                {/* Player B & Institution B */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">PLAYER / TEAM B</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kavya Sundaram"
                      value={schedulePlayerB}
                      onChange={(e) => setSchedulePlayerB(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">INSTITUTION B</label>
                    <input
                      type="text"
                      placeholder="e.g. Anna University"
                      value={scheduleInstB}
                      onChange={(e) => setScheduleInstB(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">
                    MATCH NUMBER (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank (e.g. R1 - Match 5)"
                    value={scheduleMatchNumber}
                    onChange={(e) => setScheduleMatchNumber(e.target.value)}
                    className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="w-full py-2.5 bg-[#FF5A16] hover:bg-[#E04808] disabled:opacity-50 text-white font-pixel text-xs uppercase cursor-pointer"
                  >
                    {actionSubmitting ? "SCHEDULING MATCH..." : "COMMIT TO TOURNAMENT SCHEDULE"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ MODAL: CONFIGURE COURT ═══ */}
        {showAddCourtModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="bg-[#07101D] border-2 border-[#18D8D0] w-full max-w-sm p-6 relative">
              <button
                onClick={() => setShowAddCourtModal(false)}
                className="absolute top-4 right-4 text-[#91A0AE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-[#18D8D0]" />
                <h3 className="font-pixel text-xs text-white font-bold uppercase">
                  ADD ARENA COURT
                </h3>
              </div>

              <form onSubmit={handleAddCourt} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">COURT NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Court 09"
                    value={newCourtNumber}
                    onChange={(e) => setNewCourtNumber(e.target.value)}
                    className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#91A0AE] uppercase mb-1">
                    DESIGNATED UMPIRE (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BWF Technical Official"
                    value={newCourtUmpire}
                    onChange={(e) => setNewCourtUmpire(e.target.value)}
                    className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="w-full py-2 bg-[#18D8D0] hover:bg-[#13b5ae] text-black font-pixel text-xs uppercase font-bold cursor-pointer"
                  >
                    {actionSubmitting ? "ADDING..." : "ADD TO ARENA MATRIX"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
