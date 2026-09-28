"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import {
  Trophy,
  Flame,
  Activity,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Users,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Clock,
  RefreshCw,
} from "lucide-react";

interface OverviewData {
  tournament: {
    name: string;
    edition: string;
    venue: string;
    dates: string;
    status: string;
    publicVisibility: string;
    isScheduleLocked: boolean;
    lockedBy?: string | null;
    lockedAt?: string | null;
  };
  metrics: {
    categories: number;
    events: number;
    courts: number;
    totalMatches: number;
    liveMatches: number;
    upcomingMatches: number;
    completedMatches: number;
    pausedMatches: number;
    missingCourts: number;
    missingOfficials: number;
    participants: number;
    teams: number;
  };
  readiness: Record<
    string,
    {
      status: string;
      label: string;
      detail: string;
      hasPayment?: boolean;
    }
  >;
  alerts: Array<{
    id: string;
    severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
    source: string;
    title: string;
    description: string;
    actionUrl: string;
    timestamp: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    category: string;
    targetDate: string;
    completedAt?: string | null;
    status: string;
    description?: string | null;
    sequence: number;
  }>;
  courts: Array<{
    id: string;
    courtNumber: string;
    status: string;
    venue?: string | null;
    umpire?: string | null;
  }>;
}

export default function TournamentCommandCenterPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOverview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tournament/overview");
      if (!res.ok) {
        throw new Error(`Failed to load tournament overview (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load tournament data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <TournamentAdminShell>
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-[#ff5500] border-t-transparent animate-spin rounded-full" />
          <p className="font-bold text-sm tracking-widest text-[#ff5500]">
            LOADING TOURNAMENT COMMAND TELEMETRY...
          </p>
        </div>
      </TournamentAdminShell>
    );
  }

  if (error || !data) {
    return (
      <TournamentAdminShell>
        <div className="p-6 bg-rose-950/40 border-2 border-rose-500/60 text-rose-300 space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <h2 className="text-base font-bold uppercase tracking-wider">
              TELEMETRY CONNECTION FAILURE
            </h2>
          </div>
          <p className="text-sm">{error || "Unable to retrieve tournament telemetry."}</p>
          <button
            onClick={fetchOverview}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider uppercase transition-colors"
          >
            Retry Diagnostics
          </button>
        </div>
      </TournamentAdminShell>
    );
  }

  const { tournament, metrics, readiness, alerts, milestones, courts } = data;

  return (
    <TournamentAdminShell activeTab="overview">
      {/* 1. TOP STATUS INDICATOR STRIP */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#ff5500]" />
            <span>OPERATIONAL READINESS STATUS MATRIX</span>
          </h2>
          <button
            onClick={fetchOverview}
            className="text-[11px] text-[#ff5500] hover:text-white flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>REFRESH</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(readiness).map(([key, item]) => {
            const isReady = item.status === "READY";
            const isWarning = item.status === "WARNING";
            const isConfigured = item.status !== "NOT CONFIGURED";
            return (
              <div
                key={key}
                className={`p-2.5 bg-black/60 border ${
                  isReady
                    ? "border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                    : isWarning
                    ? "border-amber-500/50 shadow-[0_0_8px_rgba(245,166,35,0.15)]"
                    : "border-zinc-700"
                } relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                    {item.label}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isReady ? "bg-emerald-400" : isWarning ? "bg-amber-400" : "bg-zinc-500"
                    }`}
                  />
                </div>
                <div
                  className={`text-xs font-bold tracking-wide ${
                    isReady ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-zinc-400"
                  }`}
                >
                  {item.status}
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. TOURNAMENT OVERVIEW & CORE INFO BANNER */}
      <section className="mb-6 p-4 sm:p-6 bg-[#0b0c10] border-2 border-[#ff5500]/50 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 bg-[#ff5500] text-black font-extrabold tracking-widest text-[10px] uppercase">
                {tournament.edition}
              </span>
              <span className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-400/50 text-cyan-300 text-[10px] font-bold">
                {tournament.status}
              </span>
              <span className="px-2 py-0.5 bg-purple-950/60 border border-purple-400/50 text-purple-300 text-[10px] font-bold">
                {tournament.publicVisibility}
              </span>
              {tournament.isScheduleLocked && (
                <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-400/50 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>SCHEDULE LOCKED</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-wider text-white">
              {tournament.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300 pt-1">
              <span className="flex items-center gap-1 text-[#f5e6ca]">
                <MapPin className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>{tournament.venue}</span>
              </span>
              <span className="flex items-center gap-1 text-[#f5e6ca]">
                <Calendar className="w-3.5 h-3.5 text-[#f5a623]" />
                <span>{tournament.dates}</span>
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/tournament/schedule"
              className="px-3 py-2 bg-[#ff5500] hover:bg-[#d94e16] text-black font-bold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Manage Schedule</span>
            </Link>
            <Link
              href="/admin/tournament/courts"
              className="px-3 py-2 bg-black/80 hover:bg-black text-[#f5e6ca] border border-[#ff5500]/60 font-bold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1"
            >
              <MapPin className="w-3.5 h-3.5 text-[#f5a623]" />
              <span>Arena Courts</span>
            </Link>
            <Link
              href="/admin/tournament/readiness"
              className="px-3 py-2 bg-black/80 hover:bg-black text-cyan-300 border border-cyan-500/60 font-bold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Readiness</span>
            </Link>
          </div>
        </div>

        {/* Key Metrics Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-4 border-t border-[#1b0d2b]">
          <div className="p-3 bg-black/60 border border-[#2a2a3a]">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Total Fixtures</div>
            <div className="text-xl font-extrabold text-[#f5a623]">{metrics.totalMatches}</div>
            <div className="text-[10px] text-zinc-400">{metrics.upcomingMatches} Upcoming</div>
          </div>
          <div className="p-3 bg-black/60 border border-[#2a2a3a]">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Live On Court</div>
            <div className="text-xl font-extrabold text-[#ff5500] flex items-center gap-1.5">
              <span>{metrics.liveMatches}</span>
              {metrics.liveMatches > 0 && <span className="w-2 h-2 rounded-full bg-[#ff5500] animate-ping" />}
            </div>
            <div className="text-[10px] text-zinc-400">{metrics.courts} Registered Courts</div>
          </div>
          <div className="p-3 bg-black/60 border border-[#2a2a3a]">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Completed</div>
            <div className="text-xl font-extrabold text-emerald-400">{metrics.completedMatches}</div>
            <div className="text-[10px] text-zinc-400">Validated Results</div>
          </div>
          <div className="p-3 bg-black/60 border border-[#2a2a3a]">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Athletes</div>
            <div className="text-xl font-extrabold text-white">{metrics.participants}</div>
            <div className="text-[10px] text-zinc-400">{metrics.teams} University Teams</div>
          </div>
          <div className="p-3 bg-black/60 border border-[#2a2a3a]">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Categories</div>
            <div className="text-xl font-extrabold text-cyan-400">{metrics.categories}</div>
            <div className="text-[10px] text-zinc-400">{metrics.events} Active Events</div>
          </div>
          <div className="p-3 bg-black/60 border border-[#2a2a3a]">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Schedule Issues</div>
            <div className={`text-xl font-extrabold ${metrics.missingCourts > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {metrics.missingCourts}
            </div>
            <div className="text-[10px] text-zinc-400">Missing Courts</div>
          </div>
        </div>
      </section>

      {/* 3. CRITICAL ALERTS ACTION CENTER */}
      {alerts.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>CRITICAL ALERTS & ATTENTION ITEMS ({alerts.length})</span>
            </h2>
            <Link
              href="/admin/tournament/conflicts"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View Conflict Center</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => {
              const isHigh = alert.severity === "HIGH" || alert.severity === "CRITICAL";
              return (
                <div
                  key={alert.id}
                  className={`p-3.5 bg-black/70 border ${
                    isHigh ? "border-rose-500/60" : "border-amber-500/50"
                  } flex flex-col justify-between space-y-2`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 uppercase ${
                            isHigh ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          }`}
                        >
                          {alert.severity} // {alert.source}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white pt-1">{alert.title}</h4>
                      <p className="text-[11px] text-zinc-400">{alert.description}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#2a2a3a] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-zinc-500">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link
                      href={alert.actionUrl}
                      className="text-[#ff5500] hover:text-white font-bold flex items-center space-x-1"
                    >
                      <span>Resolve</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. 8-COURT ARENA STATUS MATRIX & TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 8-Court Matrix */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>8-COURT INDOOR ARENA MATRIX</span>
            </h2>
            <Link
              href="/admin/tournament/courts"
              className="text-[11px] text-[#ff5500] hover:text-white flex items-center space-x-1"
            >
              <span>Manage Courts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {courts.map((court) => {
              const isLive = court.status === "LIVE";
              const isReady = court.status === "READY";
              const isBreak = court.status === "BREAK";
              const isMaintenance = court.status === "MAINTENANCE";
              return (
                <div
                  key={court.id}
                  className={`p-3 bg-black/60 border ${
                    isLive
                      ? "border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.3)]"
                      : isReady
                      ? "border-emerald-500/50"
                      : isMaintenance
                      ? "border-rose-500/50"
                      : "border-amber-500/50"
                  } flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">{court.courtNumber}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 ${
                        isLive
                          ? "bg-[#ff5500] text-black animate-pulse"
                          : isReady
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                          : isMaintenance
                          ? "bg-rose-950/60 text-rose-400 border border-rose-500/40"
                          : "bg-amber-950/60 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {court.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px] text-zinc-400">
                    <p className="truncate">
                      Umpire: <span className="text-zinc-200">{court.umpire || "Not Assigned"}</span>
                    </p>
                    <p className="text-zinc-500 text-[9px]">{court.venue || "KLE Tech Arena"}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Cross-Module Action Links */}
          <div className="p-4 bg-black/50 border border-[#2a2a3a] space-y-2 mt-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Operational Coordination Links
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Link
                href="/admin/registrations"
                className="p-2 bg-[#0b0c10] border border-[#2a2a3a] text-zinc-300 hover:text-white hover:border-[#ff5500]/50 flex items-center justify-between"
              >
                <span>Registrations</span>
                <ExternalLink className="w-3 h-3 text-[#ff5500]" />
              </Link>
              <Link
                href="/admin/accommodation"
                className="p-2 bg-[#0b0c10] border border-[#2a2a3a] text-zinc-300 hover:text-white hover:border-[#ff5500]/50 flex items-center justify-between"
              >
                <span>Accommodation</span>
                <ExternalLink className="w-3 h-3 text-[#ff5500]" />
              </Link>
              <Link
                href="/admin/transport"
                className="p-2 bg-[#0b0c10] border border-[#2a2a3a] text-zinc-300 hover:text-white hover:border-[#ff5500]/50 flex items-center justify-between"
              >
                <span>Transport (Free)</span>
                <ExternalLink className="w-3 h-3 text-[#ff5500]" />
              </Link>
              <Link
                href="/official"
                className="p-2 bg-[#0b0c10] border border-[#2a2a3a] text-zinc-300 hover:text-white hover:border-[#ff5500]/50 flex items-center justify-between"
              >
                <span>Officials Desk</span>
                <ExternalLink className="w-3 h-3 text-[#ff5500]" />
              </Link>
            </div>
          </div>
        </section>

        {/* Right 1 Col: Tournament Timeline & Milestones */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#f5a623] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#f5a623]" />
              <span>TOURNAMENT TIMELINE</span>
            </h2>
            <span className="text-[10px] text-zinc-500">{milestones.length} MILESTONES</span>
          </div>

          <div className="p-4 bg-black/60 border border-[#2a2a3a] space-y-4">
            {milestones.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No milestones configured.</p>
            ) : (
              <div className="relative border-l-2 border-[#1b0d2b] ml-2 space-y-4">
                {milestones.map((m) => {
                  const isDone = m.status === "COMPLETED";
                  const isCurrent = m.status === "IN_PROGRESS";
                  return (
                    <div key={m.id} className="relative pl-4">
                      {/* Node point */}
                      <span
                        className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                          isDone
                            ? "bg-emerald-500 border-black"
                            : isCurrent
                            ? "bg-[#ff5500] border-black animate-ping"
                            : "bg-[#0b0c10] border-zinc-600"
                        }`}
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-bold px-1 py-0.2 uppercase ${
                              isDone
                                ? "bg-emerald-950/60 text-emerald-400"
                                : isCurrent
                                ? "bg-[#ff5500]/20 text-[#ff5500]"
                                : "text-zinc-500"
                            }`}
                          >
                            {m.status}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(m.targetDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{m.title}</h4>
                        {m.description && (
                          <p className="text-[10px] text-zinc-400 leading-tight">{m.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </TournamentAdminShell>
  );
}
