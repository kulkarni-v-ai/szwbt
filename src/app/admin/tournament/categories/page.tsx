"use client";

import React, { useState, useEffect } from "react";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { Layers, Plus, Archive, CheckCircle2, AlertTriangle, X, Trophy } from "lucide-react";

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  format: string;
  eligibility?: string | null;
  eventsCount: number;
  events: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>;
}

export default function TournamentCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    format: "KNOCKOUT",
    eligibility: "",
  });

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/categories");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.categories || []);
        setCanManage(json.canManage ?? true);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tournament/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create category");
      }
      setMessage({ type: "success", text: `Category '${form.name}' created successfully.` });
      setModalOpen(false);
      setForm({ name: "", code: "", description: "", format: "KNOCKOUT", eligibility: "" });
      loadCategories();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create category." });
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(cat: Category) {
    const nextStatus = cat.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    const confirmAction = confirm(
      `Are you sure you want to mark category '${cat.name}' as ${nextStatus}?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/tournament/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadCategories();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  }

  return (
    <TournamentAdminShell activeTab="categories">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#ff5500]" />
              <span>COMPETITION CATEGORIES ({categories.length})</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Manage database-driven championship categories, eligibility criteria, and event groupings.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-[#ff5500] hover:bg-[#d94e16] text-black font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category</span>
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
          <div className="text-center py-16 text-xs text-zinc-400">LOADING CATEGORIES...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center bg-black/40 border border-[#2a2a3a] text-zinc-400 text-xs">
            No categories configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const isActive = cat.status === "ACTIVE";
              return (
                <div
                  key={cat.id}
                  className={`p-4 bg-[#0b0c10] border ${
                    isActive ? "border-[#2a2a3a] hover:border-[#ff5500]/60" : "border-zinc-800 opacity-60"
                  } flex flex-col justify-between space-y-3 transition-colors`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40">
                        {cat.code}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 ${
                          isActive
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {cat.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                    <p className="text-xs text-zinc-400">{cat.description || "No description provided."}</p>
                    <div className="text-[11px] text-zinc-500 pt-1 space-y-0.5">
                      <p>
                        Format: <span className="text-zinc-300 font-bold">{cat.format}</span>
                      </p>
                      {cat.eligibility && (
                        <p className="text-[10px] text-zinc-400 italic">Eligibility: {cat.eligibility}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1b0d2b] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-bold">
                      <Trophy className="w-3 h-3" />
                      <span>{cat.eventsCount} Events</span>
                    </span>
                    {canManage && (
                      <button
                        onClick={() => toggleStatus(cat)}
                        className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold"
                      >
                        {isActive ? "Archive" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Category Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-md w-full p-6 space-y-4 relative shadow-[0_0_24px_rgba(255,85,0,0.3)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a3a]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Create Tournament Category
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Women's Singles"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WS"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Format</label>
                  <select
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  >
                    <option value="KNOCKOUT">KNOCKOUT</option>
                    <option value="LEAGUE">LEAGUE</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Description</label>
                  <input
                    type="text"
                    placeholder="Description / notes"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase">Eligibility Rule</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Bona fide female university students"
                    value={form.eligibility}
                    onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
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
                    {creating ? "CREATING..." : "CREATE"}
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
