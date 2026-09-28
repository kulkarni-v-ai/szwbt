"use client";

import React, { useState, useEffect } from "react";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { Trophy, Plus, CheckCircle2, AlertTriangle, X, Lock } from "lucide-react";

interface EventItem {
  id: string;
  name: string;
  code: string;
  status: string;
  format: string;
  maxEntries?: number | null;
  seedCount?: number | null;
  category: {
    id: string;
    name: string;
    code: string;
  };
  rounds: Array<{
    id: string;
    name: string;
    code: string;
    sequence: number;
    status: string;
  }>;
}

export default function TournamentEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [canManage, setCanManage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    categoryId: "",
    name: "",
    code: "",
    format: "KNOCKOUT",
    maxEntries: 64,
    seedCount: 8,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [eventsRes, catsRes] = await Promise.all([
        fetch("/api/tournament/events"),
        fetch("/api/tournament/categories"),
      ]);
      if (eventsRes.ok) {
        const json = await eventsRes.json();
        setEvents(json.events || []);
        setCanManage(json.canManage ?? true);
      }
      if (catsRes.ok) {
        const json = await catsRes.json();
        setCategories(json.categories || []);
        if (json.categories?.length > 0 && !form.categoryId) {
          setForm((prev) => ({ ...prev, categoryId: json.categories[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load events data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tournament/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create event");
      }
      setMessage({ type: "success", text: `Event '${form.name}' created successfully.` });
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create event." });
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(eventId: string, nextStatus: string) {
    try {
      const res = await fetch(`/api/tournament/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to update event status:", err);
    }
  }

  return (
    <TournamentAdminShell activeTab="events">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#ff5500]" />
              <span>COMPETITIVE EVENTS ({events.length})</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Championship tournament competitive draws, seed structures, and event statuses.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-[#ff5500] hover:bg-[#d94e16] text-black font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
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
          <div className="text-center py-16 text-xs text-zinc-400">LOADING EVENTS...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center bg-black/40 border border-[#2a2a3a] text-zinc-400 text-xs">
            No events configured.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const isOpen = ev.status === "OPEN";
              const isLocked = ev.status === "LOCKED";
              const isLive = ev.status === "LIVE";
              return (
                <div
                  key={ev.id}
                  className="p-4 bg-[#0b0c10] border border-[#2a2a3a] hover:border-[#ff5500]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40">
                        {ev.code}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {ev.category?.name || "General"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 ${
                          isLive
                            ? "bg-[#ff5500] text-black"
                            : isLocked
                            ? "bg-amber-950/60 text-amber-400 border border-amber-500/40"
                            : isOpen
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{ev.name}</h3>
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-400 pt-1">
                      <span>Format: <strong className="text-zinc-200">{ev.format}</strong></span>
                      <span>Max Entries: <strong className="text-zinc-200">{ev.maxEntries || 64}</strong></span>
                      <span>Seeds: <strong className="text-zinc-200">{ev.seedCount || 8}</strong></span>
                      <span>Rounds: <strong className="text-cyan-400">{ev.rounds.length}</strong></span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center space-x-2 self-end md:self-auto text-xs">
                      <span className="text-[10px] text-zinc-500">SET STATUS:</span>
                      <select
                        value={ev.status}
                        onChange={(e) => changeStatus(ev.id, e.target.value)}
                        className="px-2 py-1 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="OPEN">OPEN</option>
                        <option value="LOCKED">LOCKED</option>
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="LIVE">LIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Event Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-md w-full p-6 space-y-4 relative shadow-[0_0_24px_rgba(255,85,0,0.3)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a3a]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Create Competitive Event
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Parent Category</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Event Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Women's Singles Championship"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Event Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WS_MAIN"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Max Entries</label>
                    <input
                      type="number"
                      value={form.maxEntries}
                      onChange={(e) => setForm({ ...form, maxEntries: parseInt(e.target.value, 10) || 64 })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Seeds Count</label>
                    <input
                      type="number"
                      value={form.seedCount}
                      onChange={(e) => setForm({ ...form, seedCount: parseInt(e.target.value, 10) || 8 })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    />
                  </div>
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
                    {creating ? "CREATING..." : "CREATE EVENT"}
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
