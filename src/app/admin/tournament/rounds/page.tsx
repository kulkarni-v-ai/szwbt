"use client";

import React, { useState, useEffect } from "react";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { Layers, CheckCircle2, AlertTriangle, Play, Check } from "lucide-react";

interface RoundItem {
  id: string;
  name: string;
  code: string;
  sequence: number;
  status: string;
  matchCount: number;
  event: {
    id: string;
    name: string;
    code: string;
  };
}

export default function TournamentRoundsPage() {
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [loading, setLoading] = useState(true);

  async function loadRounds() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/rounds");
      if (res.ok) {
        const json = await res.json();
        setRounds(json.rounds || []);
        setCanManage(json.canManage ?? true);
      }
    } catch (err) {
      console.error("Failed to load rounds:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRounds();
  }, []);

  async function updateStatus(roundId: string, status: string) {
    try {
      const res = await fetch(`/api/tournament/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadRounds();
      }
    } catch (err) {
      console.error("Failed to update round status:", err);
    }
  }

  // Group rounds by Event
  const grouped: Record<string, RoundItem[]> = {};
  for (const r of rounds) {
    const eventName = r.event?.name || "General";
    if (!grouped[eventName]) grouped[eventName] = [];
    grouped[eventName].push(r);
  }

  return (
    <TournamentAdminShell activeTab="rounds">
      <div className="space-y-6">
        <div className="pb-4 border-b border-[#2a2a3a]">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#ff5500]" />
            <span>COMPETITION ROUNDS HIERARCHY</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Tournament event progression: Qualification, Knockout Rounds, Quarter-Finals, Semi-Finals, and Championship Finals.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400">LOADING ROUNDS...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center bg-black/40 border border-[#2a2a3a] text-zinc-400 text-xs">
            No competition rounds configured.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([eventName, eventRounds]) => (
              <div key={eventName} className="p-4 bg-[#0b0c10] border border-[#2a2a3a] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#1b0d2b]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ff5500]" />
                    <span>{eventName}</span>
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-bold">
                    {eventRounds.length} Sequenced Rounds
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {eventRounds.map((r) => {
                    const isCompleted = r.status === "COMPLETED";
                    const isInProgress = r.status === "IN_PROGRESS";
                    const isScheduled = r.status === "SCHEDULED";
                    return (
                      <div
                        key={r.id}
                        className={`p-3 bg-black/60 border ${
                          isCompleted
                            ? "border-emerald-500/50"
                            : isInProgress
                            ? "border-[#ff5500]"
                            : isScheduled
                            ? "border-cyan-500/40"
                            : "border-zinc-800"
                        } flex flex-col justify-between space-y-2`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#ff5500] font-extrabold">
                            STEP {r.sequence} // {r.code}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 ${
                              isCompleted
                                ? "bg-emerald-950/60 text-emerald-400"
                                : isInProgress
                                ? "bg-[#ff5500] text-black"
                                : isScheduled
                                ? "bg-cyan-950/60 text-cyan-400"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white">{r.name}</h4>
                          <p className="text-[10px] text-zinc-400">
                            Fixture Capacity: <strong className="text-zinc-200">{r.matchCount} Matches</strong>
                          </p>
                        </div>

                        {canManage && (
                          <div className="pt-2 border-t border-[#1b0d2b] flex items-center justify-between text-xs">
                            <span className="text-[10px] text-zinc-500">SET STATE:</span>
                            <select
                              value={r.status}
                              onChange={(e) => updateStatus(r.id, e.target.value)}
                              className="px-1.5 py-0.5 bg-black border border-[#2a2a3a] text-white text-[10px] focus:border-[#ff5500] outline-none"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TournamentAdminShell>
  );
}
