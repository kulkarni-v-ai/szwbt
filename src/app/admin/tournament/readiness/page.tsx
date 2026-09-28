"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";

interface ReadinessSector {
  sector: string;
  name: string;
  status: "READY" | "WARNING" | "BLOCKED" | "NOT_CONFIGURED";
  summary: string;
  metrics: Record<string, any>;
  actionUrl: string;
  checklist: Array<{ label: string; ok: boolean; detail: string }>;
}

export default function TournamentReadinessPage() {
  const [sectors, setSectors] = useState<ReadinessSector[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>("READY");
  const [loading, setLoading] = useState(true);

  async function loadReadiness() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/readiness");
      if (res.ok) {
        const json = await res.json();
        setSectors(json.sectors || []);
        setOverallStatus(json.overallStatus || "READY");
      }
    } catch (err) {
      console.error("Failed to load readiness:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReadiness();
  }, []);

  return (
    <TournamentAdminShell activeTab="readiness">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>12-SECTOR TOURNAMENT READINESS CHECKLIST</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Live operational verification across all championship systems, logistics, and competition engines.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-black border border-[#2a2a3a] text-xs">
              <span className="text-zinc-400">OVERALL:</span>
              <span
                className={`font-bold ${
                  overallStatus === "READY"
                    ? "text-emerald-400"
                    : overallStatus === "WARNING"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {overallStatus}
              </span>
            </div>
            <button
              onClick={loadReadiness}
              className="p-2 bg-black border border-[#2a2a3a] text-[#ff5500] hover:text-white transition-colors"
              title="Refresh Readiness State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400">CALCULATING REAL-TIME SYSTEM READINESS...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((sec) => {
              const isReady = sec.status === "READY";
              const isWarning = sec.status === "WARNING";
              const isBlocked = sec.status === "BLOCKED";
              return (
                <div
                  key={sec.sector}
                  className={`p-4 bg-[#0b0c10] border-2 ${
                    isReady
                      ? "border-emerald-500/50"
                      : isWarning
                      ? "border-amber-500/60"
                      : isBlocked
                      ? "border-rose-500/70"
                      : "border-zinc-800"
                  } flex flex-col justify-between space-y-4`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 tracking-wider">
                        {sec.sector}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 uppercase ${
                          isReady
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                            : isWarning
                            ? "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                            : isBlocked
                            ? "bg-rose-950/80 text-rose-400 border border-rose-500/40 animate-pulse"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {sec.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{sec.name}</h3>
                    <p className="text-xs text-zinc-300">{sec.summary}</p>

                    {/* Sector Checklist Breakdown */}
                    <div className="pt-2 border-t border-[#1b0d2b] space-y-1.5">
                      {sec.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5 text-zinc-300">
                            {item.ok ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span>{item.label}</span>
                          </div>
                          <span className="text-zinc-500 text-[10px] ml-2 shrink-0">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1b0d2b] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-zinc-500">
                      {sec.metrics.hasPayment === false ? "Complimentary (No Fee)" : "Verified Live"}
                    </span>
                    <Link
                      href={sec.actionUrl}
                      className="text-[#ff5500] hover:text-white font-bold flex items-center space-x-1 uppercase text-[11px]"
                    >
                      <span>Inspect Desk</span>
                      <ExternalLink className="w-3 h-3" />
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
