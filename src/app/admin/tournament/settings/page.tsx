"use client";

import React, { useState, useEffect } from "react";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import { Settings, Save, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface SettingsState {
  name: string;
  shortName: string;
  edition: string;
  dates: string;
  venue: string;
  description: string;
  status: string;
  publicVisibility: string;
  registrationStatus: string;
}

export default function TournamentSettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    name: "",
    shortName: "",
    edition: "",
    dates: "",
    venue: "",
    description: "",
    status: "LIVE",
    publicVisibility: "PUBLISHED",
    registrationStatus: "CLOSED",
  });
  const [canConfigure, setCanConfigure] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/tournament/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            setSettings(json.settings);
            setCanConfigure(json.canConfigure ?? true);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canConfigure) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tournament/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update settings");
      }
      setMessage({ type: "success", text: "Tournament settings successfully saved and audited." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <TournamentAdminShell activeTab="settings">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-[#ff5500] border-t-transparent animate-spin rounded-full" />
          <p className="text-xs text-[#ff5500] font-bold tracking-widest">LOADING SETTINGS...</p>
        </div>
      </TournamentAdminShell>
    );
  }

  return (
    <TournamentAdminShell activeTab="settings">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#2a2a3a]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#ff5500]" />
              <span>TOURNAMENT // OPERATIONAL SETTINGS</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Configure championship metadata, lifecycle stages, and public visibility.
            </p>
          </div>
          {!canConfigure && (
            <span className="text-[10px] px-2 py-1 bg-amber-950/60 border border-amber-500/50 text-amber-400 font-bold">
              READ-ONLY MODE
            </span>
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

        <form onSubmit={handleSubmit} className="space-y-6 bg-[#0b0c10] border border-[#2a2a3a] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Full Tournament Name
              </label>
              <input
                type="text"
                disabled={!canConfigure}
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Short Name / Code
              </label>
              <input
                type="text"
                disabled={!canConfigure}
                value={settings.shortName}
                onChange={(e) => setSettings({ ...settings, shortName: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Edition / Season
              </label>
              <input
                type="text"
                disabled={!canConfigure}
                value={settings.edition}
                onChange={(e) => setSettings({ ...settings, edition: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Competition Dates
              </label>
              <input
                type="text"
                disabled={!canConfigure}
                value={settings.dates}
                onChange={(e) => setSettings({ ...settings, dates: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Official Stadium Venue
              </label>
              <input
                type="text"
                disabled={!canConfigure}
                value={settings.venue}
                onChange={(e) => setSettings({ ...settings, venue: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Tournament Description
              </label>
              <textarea
                rows={3}
                disabled={!canConfigure}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#2a2a3a] text-white text-xs focus:border-[#ff5500] outline-none"
              />
            </div>
          </div>

          {/* Lifecycle & Gate Controls */}
          <div className="pt-4 border-t border-[#1b0d2b] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#ff5500] uppercase tracking-wider">
                Lifecycle Status
              </label>
              <select
                disabled={!canConfigure}
                value={settings.status}
                onChange={(e) => setSettings({ ...settings, status: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-[#ff5500]/50 text-white text-xs focus:border-[#ff5500] outline-none font-bold"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PREPARATION">PREPARATION</option>
                <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
                <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="LIVE">LIVE (Tournament In Progress)</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Public Portal Visibility
              </label>
              <select
                disabled={!canConfigure}
                value={settings.publicVisibility}
                onChange={(e) => setSettings({ ...settings, publicVisibility: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-purple-500/50 text-white text-xs focus:border-purple-400 outline-none"
              >
                <option value="DRAFT">DRAFT (Hidden from Public)</option>
                <option value="PUBLISHED">PUBLISHED (Live Public Access)</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Registration Gate
              </label>
              <select
                disabled={!canConfigure}
                value={settings.registrationStatus}
                onChange={(e) => setSettings({ ...settings, registrationStatus: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-cyan-500/50 text-white text-xs focus:border-cyan-400 outline-none"
              >
                <option value="OPEN">OPEN (Accepting Submissions)</option>
                <option value="CLOSED">CLOSED (Rosters Locked)</option>
                <option value="INVITATION_ONLY">INVITATION_ONLY</option>
              </select>
            </div>
          </div>

          {canConfigure && (
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#ff5500] hover:bg-[#d94e16] disabled:opacity-50 text-black font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center space-x-1.5 shadow-[0_0_12px_rgba(255,85,0,0.3)]"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "SAVING SETTINGS..." : "SAVE TOURNAMENT SETTINGS"}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </TournamentAdminShell>
  );
}
