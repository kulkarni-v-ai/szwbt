"use client";

import React, { useState, useEffect } from "react";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { MapPin, Plus, Flame, Activity, CheckCircle2, AlertTriangle, X, ShieldAlert } from "lucide-react";

interface CourtItem {
  id: string;
  courtNumber: string;
  status: string;
  venue?: string | null;
  umpire?: string | null;
  notes?: string | null;
  isActive: boolean;
  currentMatch?: {
    id: string;
    matchNumber: string;
    playerA: string;
    playerB: string;
    scoreA?: string | null;
    scoreB?: string | null;
  } | null;
}

export default function TournamentCourtsPage() {
  const [courts, setCourts] = useState<CourtItem[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    courtNumber: "",
    venue: "KLE Tech Indoor Stadium, Hubballi",
    status: "READY",
    umpire: "",
    notes: "",
  });

  async function loadCourts() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/courts");
      if (res.ok) {
        const json = await res.json();
        setCourts(json.courts || []);
        setCanManage(json.canManage ?? true);
      }
    } catch (err) {
      console.error("Failed to load courts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourts();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tournament/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to provision court");
      }
      setMessage({ type: "success", text: `${form.courtNumber} provisioned successfully.` });
      setModalOpen(false);
      setForm({ courtNumber: "", venue: "KLE Tech Indoor Stadium, Hubballi", status: "READY", umpire: "", notes: "" });
      loadCourts();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to provision court." });
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(courtId: string, status: string) {
    try {
      const res = await fetch(`/api/tournament/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadCourts();
      }
    } catch (err) {
      console.error("Failed to update court status:", err);
    }
  }

  return (
    <TournamentAdminShell activeTab="courts">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#ff5500]" />
              <span>ARENA COURTS & PLAYING MATS ({courts.length})</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Indoor badminton arena court allocation, technical status, and umpire assignments.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-[#ff5500] hover:bg-[#d94e16] text-black font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Court</span>
            </button>
          )}
        </div>

        {message && (
          <div
            className={`p-3 border text-xs flex items-center space-x-2 ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/60 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400">LOADING COURTS...</div>
        ) : courts.length === 0 ? (
          <div className="p-8 text-center bg-black/40 border border-[#2a2a3a] text-zinc-400 text-xs">
            No arena courts configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courts.map((court) => {
              const isLive = court.status === "LIVE";
              const isReady = court.status === "READY";
              const isMaintenance = court.status === "MAINTENANCE";
              const isBreak = court.status === "BREAK";
              return (
                <div
                  key={court.id}
                  className={`p-4 bg-[#0b0c10] border-2 ${
                    isLive
                      ? "border-[#ff5500] shadow-[0_0_12px_rgba(255,85,0,0.3)]"
                      : isReady
                      ? "border-emerald-500/60"
                      : isMaintenance
                      ? "border-rose-500/60"
                      : "border-amber-500/60"
                  } flex flex-col justify-between space-y-3`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{court.courtNumber}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 ${
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

                    <div className="space-y-1 text-xs">
                      <p className="text-zinc-400 text-[11px]">
                        Umpire: <strong className="text-zinc-200">{court.umpire || "Not Assigned"}</strong>
                      </p>
                      <p className="text-zinc-500 text-[10px]">{court.venue || "KLE Tech Arena"}</p>
                      {court.notes && <p className="text-zinc-400 text-[10px] italic">{court.notes}</p>}
                    </div>

                    {/* Live Match Mini HUD if currently active */}
                    {court.currentMatch && (
                      <div className="p-2 bg-black/80 border border-[#ff5500]/40 space-y-1">
                        <div className="text-[9px] text-[#ff5500] font-bold flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 animate-bounce" />
                          <span>LIVE: {court.currentMatch.matchNumber}</span>
                        </div>
                        <p className="text-[10px] text-white truncate font-medium">
                          {court.currentMatch.playerA} vs {court.currentMatch.playerB}
                        </p>
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="pt-2 border-t border-[#1b0d2b] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-zinc-500">STATUS:</span>
                      <select
                        value={court.status}
                        onChange={(e) => updateStatus(court.id, e.target.value)}
                        className="px-2 py-1 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                      >
                        <option value="READY">READY</option>
                        <option value="LIVE">LIVE</option>
                        <option value="BREAK">BREAK</option>
                        <option value="DELAYED">DELAYED</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="UNAVAILABLE">UNAVAILABLE</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Court Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-md w-full p-6 space-y-4 relative shadow-[0_0_24px_rgba(255,85,0,0.3)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a3a]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Provision Arena Court
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Court Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Court 09"
                    value={form.courtNumber}
                    onChange={(e) => setForm({ ...form, courtNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Venue</label>
                  <input
                    type="text"
                    required
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Default Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  >
                    <option value="READY">READY</option>
                    <option value="BREAK">BREAK</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Assigned Umpire</label>
                  <input
                    type="text"
                    placeholder="e.g. BWF Technical Official"
                    value={form.umpire}
                    onChange={(e) => setForm({ ...form, umpire: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Notes / Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. BWF Approved Synthetic Matting"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-[#2a2a3a] text-zinc-300 text-xs font-bold hover:bg-white/5"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-[#ff5500] text-black font-extrabold text-xs tracking-wider uppercase hover:bg-[#d94e16] disabled:opacity-50"
                  >
                    {creating ? "PROVISIONING..." : "PROVISION COURT"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </TournamentAdminShell>
  );
}
