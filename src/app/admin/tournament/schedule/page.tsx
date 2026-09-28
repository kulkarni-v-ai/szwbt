"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  ArrowRight,
  Flame,
} from "lucide-react";

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
  scoreA?: string | null;
  scoreB?: string | null;
  status: string;
  assignedOfficialId?: string | null;
}

export default function TournamentSchedulePage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [courts, setCourts] = useState<Array<{ id: string; courtNumber: string }>>([]);
  const [days, setDays] = useState<Array<{ id: string; dayNumber: string; date: string }>>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [canManage, setCanManage] = useState(true);
  const [canLockSchedule, setCanLockSchedule] = useState(true);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dayFilter, setDayFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modals & States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [rescheduleMatch, setRescheduleMatch] = useState<MatchItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Match Form
  const [form, setForm] = useState({
    dayId: "OCT18",
    time: "09:00 IST",
    category: "Women's Singles",
    court: "Court 01",
    matchNumber: "",
    playerA: "",
    institutionA: "",
    playerB: "",
    institutionB: "",
  });

  async function loadSchedule() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dayFilter) params.append("dayId", dayFilter);
      if (courtFilter) params.append("court", courtFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/tournament/schedule?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMatches(json.matches || []);
        setCourts(json.courts || []);
        setDays(json.days || []);
        setIsLocked(Boolean(json.isLocked));
        setCanManage(json.canManage ?? true);
        setCanLockSchedule(json.canLockSchedule ?? true);
      }
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, [dayFilter, courtFilter, statusFilter]);

  async function toggleLock() {
    const nextState = !isLocked;
    const confirmAction = confirm(
      nextState
        ? "Lock tournament schedule? When locked, fixtures cannot be added or modified."
        : "Unlock tournament schedule to permit modifications?"
    );
    if (!confirmAction) return;

    try {
      const res = await fetch("/api/tournament/schedule/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: nextState, reason: "Administrative controller action" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsLocked(nextState);
        setMessage({
          type: "success",
          text: nextState ? "Tournament schedule is now LOCKED." : "Schedule UNLOCKED for administrative changes.",
        });
      } else {
        setMessage({ type: "error", text: json.error || "Failed to update lock state." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to toggle schedule lock." });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tournament/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to schedule match");
      }
      setMessage({ type: "success", text: `Match ${form.matchNumber} scheduled successfully.` });
      setAddModalOpen(false);
      setForm({
        dayId: "OCT18",
        time: "09:00 IST",
        category: "Women's Singles",
        court: "Court 01",
        matchNumber: "",
        playerA: "",
        institutionA: "",
        playerB: "",
        institutionB: "",
      });
      loadSchedule();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to schedule fixture." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleMatch) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/tournament/schedule/${rescheduleMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: rescheduleMatch.court,
          time: rescheduleMatch.time,
          dayId: rescheduleMatch.dayId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to reschedule match");
      }
      setMessage({ type: "success", text: `Match ${rescheduleMatch.matchNumber} successfully rescheduled.` });
      setRescheduleMatch(null);
      loadSchedule();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Rescheduling failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TournamentAdminShell activeTab="schedule">
      <div className="space-y-6">
        {/* Header & Lock Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#ff5500]" />
              <span>FIXTURES & SCHEDULE CONTROL ({matches.length})</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Manage court timings, fixture assignments, and schedule lock state.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canLockSchedule && (
              <button
                onClick={toggleLock}
                className={`px-3 py-2 font-bold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1.5 border ${
                  isLocked
                    ? "bg-amber-950/80 border-amber-500 text-amber-300 hover:bg-amber-900"
                    : "bg-black/60 border-zinc-700 text-zinc-300 hover:border-amber-500"
                }`}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? "UNLOCK SCHEDULE" : "LOCK SCHEDULE"}</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => setAddModalOpen(true)}
                disabled={isLocked}
                className="px-4 py-2 bg-[#ff5500] hover:bg-[#d94e16] disabled:opacity-50 text-black font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Match</span>
              </button>
            )}
          </div>
        </div>

        {/* Lock Warning Notice */}
        {isLocked && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/60 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>SCHEDULE IS LOCKED:</strong> Modifying or creating fixtures is prohibited until unlocked by an authorized Tournament Controller.
              </span>
            </div>
            <Link
              href="/admin/tournament/conflicts"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1 font-bold whitespace-nowrap ml-4"
            >
              <span>Check Conflicts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

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

        {/* Search & Filters Toolbar */}
        <div className="p-4 bg-[#0b0c10] border border-[#2a2a3a] space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search match #, player name, institution..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSchedule()}
                className="w-full pl-9 pr-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
              />
            </div>
            <button
              onClick={loadSchedule}
              className="px-4 py-2 bg-black border border-[#ff5500]/60 text-[#ff5500] font-bold text-xs uppercase hover:bg-[#ff5500]/10 transition-colors"
            >
              SEARCH
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="px-2 py-1 bg-black border border-[#2a2a3a] text-zinc-300 text-xs focus:border-[#ff5500] outline-none"
            >
              <option value="">ALL TOURNAMENT DAYS</option>
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dayNumber} ({d.date})
                </option>
              ))}
            </select>

            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="px-2 py-1 bg-black border border-[#2a2a3a] text-zinc-300 text-xs focus:border-[#ff5500] outline-none"
            >
              <option value="">ALL COURTS</option>
              {courts.map((c) => (
                <option key={c.id} value={c.courtNumber}>
                  {c.courtNumber}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 bg-black border border-[#2a2a3a] text-zinc-300 text-xs focus:border-[#ff5500] outline-none"
            >
              <option value="">ALL STATUSES</option>
              <option value="LIVE">LIVE</option>
              <option value="UPCOMING">UPCOMING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PAUSED">PAUSED</option>
            </select>
          </div>
        </div>

        {/* Schedule Fixtures Table */}
        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400">LOADING FIXTURES...</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center bg-black/40 border border-[#2a2a3a] text-zinc-400 text-xs">
            No fixtures match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#2a2a3a]">
            <table className="w-full text-left text-xs bg-[#0b0c10]">
              <thead className="bg-black/90 border-b border-[#2a2a3a] text-zinc-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">MATCH ID</th>
                  <th className="p-3">DAY / TIME</th>
                  <th className="p-3">COURT</th>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3">PLAYER A</th>
                  <th className="p-3">PLAYER B</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b0d2b]">
                {matches.map((m) => {
                  const isLive = m.status === "LIVE";
                  const isCompleted = m.status === "COMPLETED";
                  return (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-bold text-[#ff5500]">{m.matchNumber}</td>
                      <td className="p-3 text-zinc-300">
                        <div>{m.dayId}</div>
                        <div className="text-[10px] text-zinc-500">{m.time}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-1.5 py-0.5 text-[11px] ${
                            !m.court || m.court === "TBA"
                              ? "bg-rose-950/60 text-rose-400 border border-rose-500/40"
                              : "bg-black border border-[#2a2a3a] text-cyan-300"
                          }`}
                        >
                          {m.court || "TBA"}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">{m.category}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{m.playerA}</div>
                        <div className="text-[10px] text-zinc-500">{m.institutionA}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white">{m.playerB}</div>
                        <div className="text-[10px] text-zinc-500">{m.institutionB}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 ${
                            isLive
                              ? "bg-[#ff5500] text-black animate-pulse"
                              : isCompleted
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {canManage && (
                          <button
                            disabled={isLocked}
                            onClick={() => setRescheduleMatch(m)}
                            className="text-[11px] text-[#ff5500] hover:text-white disabled:opacity-40 font-bold uppercase"
                          >
                            Reschedule
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Schedule Match Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-lg w-full p-6 space-y-4 relative shadow-[0_0_24px_rgba(255,85,0,0.3)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a3a]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Schedule New Match
                </h3>
                <button onClick={() => setAddModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Match ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. R2 - Match 14"
                      value={form.matchNumber}
                      onChange={(e) => setForm({ ...form, matchNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    >
                      <option value="Women's Singles">Women's Singles</option>
                      <option value="Women's Doubles">Women's Doubles</option>
                      <option value="Institution Teams">Institution Teams</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Day</label>
                    <select
                      value={form.dayId}
                      onChange={(e) => setForm({ ...form, dayId: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    >
                      {days.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.dayNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Time</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10:30 IST"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Court</label>
                    <select
                      value={form.court}
                      onChange={(e) => setForm({ ...form, court: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    >
                      {courts.map((c) => (
                        <option key={c.id} value={c.courtNumber}>
                          {c.courtNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1b0d2b]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white uppercase">Player / Team A</label>
                    <input
                      type="text"
                      required
                      placeholder="Player A"
                      value={form.playerA}
                      onChange={(e) => setForm({ ...form, playerA: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="University A"
                      value={form.institutionA}
                      onChange={(e) => setForm({ ...form, institutionA: e.target.value })}
                      className="w-full px-3 py-1.5 bg-black border border-[#2a2a3a] text-zinc-400 text-xs focus:border-[#ff5500] outline-none mt-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white uppercase">Player / Team B</label>
                    <input
                      type="text"
                      required
                      placeholder="Player B"
                      value={form.playerB}
                      onChange={(e) => setForm({ ...form, playerB: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="University B"
                      value={form.institutionB}
                      onChange={(e) => setForm({ ...form, institutionB: e.target.value })}
                      className="w-full px-3 py-1.5 bg-black border border-[#2a2a3a] text-zinc-400 text-xs focus:border-[#ff5500] outline-none mt-1"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 border border-[#2a2a3a] text-zinc-300 text-xs font-bold hover:bg-white/5"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#ff5500] text-black font-extrabold text-xs tracking-wider uppercase hover:bg-[#d94e16] disabled:opacity-50"
                  >
                    {submitting ? "SCHEDULING..." : "SCHEDULE MATCH"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reschedule Match Modal */}
        {rescheduleMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-md w-full p-6 space-y-4 relative shadow-[0_0_24px_rgba(255,85,0,0.3)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a3a]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Reschedule {rescheduleMatch.matchNumber}
                </h3>
                <button onClick={() => setRescheduleMatch(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReschedule} className="space-y-4">
                <div className="p-3 bg-black/60 border border-[#2a2a3a] text-xs text-zinc-300 space-y-1">
                  <div className="font-bold text-white">
                    {rescheduleMatch.playerA} vs {rescheduleMatch.playerB}
                  </div>
                  <div className="text-[11px] text-zinc-500">{rescheduleMatch.category}</div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Day</label>
                  <select
                    value={rescheduleMatch.dayId}
                    onChange={(e) => setRescheduleMatch({ ...rescheduleMatch, dayId: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.dayNumber} ({d.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Time</label>
                  <input
                    type="text"
                    required
                    value={rescheduleMatch.time}
                    onChange={(e) => setRescheduleMatch({ ...rescheduleMatch, time: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Court</label>
                  <select
                    value={rescheduleMatch.court}
                    onChange={(e) => setRescheduleMatch({ ...rescheduleMatch, court: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  >
                    {courts.map((c) => (
                      <option key={c.id} value={c.courtNumber}>
                        {c.courtNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleMatch(null)}
                    className="px-4 py-2 border border-[#2a2a3a] text-zinc-300 text-xs font-bold hover:bg-white/5"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#ff5500] text-black font-extrabold text-xs tracking-wider uppercase hover:bg-[#d94e16] disabled:opacity-50"
                  >
                    {submitting ? "RESCHEDULING..." : "UPDATE FIXTURE"}
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
