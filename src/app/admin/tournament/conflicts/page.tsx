"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, RefreshCw } from "lucide-react";

interface ConflictItem {
  id: string;
  type: string;
  severity: "HIGH" | "WARNING" | "CRITICAL";
  affectedResource: string;
  affectedMatches: Array<{
    id: string;
    matchNumber: string;
    time: string;
    dayId: string;
    court: string;
    playerA: string;
    playerB: string;
  }>;
  description: string;
  recommendation: string;
  timestamp: string;
}

export default function TournamentConflictsPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadConflicts() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/conflicts");
      if (res.ok) {
        const json = await res.json();
        setConflicts(json.conflicts || []);
      }
    } catch (err) {
      console.error("Failed to load conflicts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConflicts();
  }, []);

  return (
    <TournamentAdminShell activeTab="conflicts">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>SCHEDULE CONFLICT CENTER ({conflicts.length})</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Automated clash detection across arena court double-bookings, unassigned officials, and maintenance constraints.
            </p>
          </div>
          <button
            onClick={loadConflicts}
            className="px-3 py-1.5 bg-black border border-[#2a2a3a] text-zinc-300 hover:text-white text-xs font-bold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Schedule</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400">SCANNING ARENA FIXTURES FOR CLASHES...</div>
        ) : conflicts.length === 0 ? (
          <div className="p-12 text-center bg-black/40 border border-emerald-500/40 text-emerald-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-sm uppercase tracking-wider">ALL ARENA SCHEDULES ARE SYNCHRONIZED</h3>
            <p className="text-xs text-zinc-400">
              No conflicts detected. No court double-bookings, maintenance clashes, or missing arena allocations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conflicts.map((c) => {
              const isCritical = c.severity === "CRITICAL";
              const isHigh = c.severity === "HIGH";
              return (
                <div
                  key={c.id}
                  className={`p-4 bg-[#0b0c10] border-2 ${
                    isCritical
                      ? "border-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                      : isHigh
                      ? "border-rose-500/60"
                      : "border-amber-500/60"
                  } space-y-3`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1b0d2b]">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 uppercase ${
                          isCritical
                            ? "bg-rose-500 text-black animate-pulse"
                            : isHigh
                            ? "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {c.severity} // {c.type}
                      </span>
                      <span className="text-xs font-bold text-white">
                        Resource: <span className="text-cyan-400">{c.affectedResource}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Detected: {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-200 font-medium">{c.description}</p>

                  {/* Affected Matches mini cards */}
                  {c.affectedMatches.length > 0 && (
                    <div className="p-3 bg-black/60 border border-[#2a2a3a] space-y-2">
                      <div className="text-[10px] text-zinc-400 font-bold uppercase">
                        Affected Fixtures ({c.affectedMatches.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {c.affectedMatches.map((m) => (
                          <div key={m.id} className="p-2 bg-black border border-zinc-800 text-[11px] space-y-0.5">
                            <div className="flex justify-between font-bold text-[#ff5500]">
                              <span>{m.matchNumber}</span>
                              <span className="text-zinc-400">{m.court} • {m.time}</span>
                            </div>
                            <div className="text-white truncate">
                              {m.playerA} vs {m.playerB}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <p className="text-[11px] text-amber-300/90 italic">
                      Recommendation: {c.recommendation}
                    </p>
                    <Link
                      href="/admin/tournament/schedule"
                      className="px-3 py-1.5 bg-[#ff5500] hover:bg-[#d94e16] text-black font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1 shrink-0"
                    >
                      <span>Resolve in Schedule</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TournamentAdminShell>
  );
}
