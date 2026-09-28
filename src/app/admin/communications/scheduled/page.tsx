"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  X,
  RefreshCw,
  PlusCircle,
  Radio,
  FileText,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  targetAudience: string;
  channels: string;
  status: string;
  scheduledFor?: string | null;
  authorEmail: string;
  authorName?: string | null;
  createdAt: string;
}

export default function ScheduledCommunicationsPage() {
  const [scheduledList, setScheduledList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);

  const fetchScheduled = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/communications/announcements?status=SCHEDULED");
      if (!res.ok) {
        if (res.status === 401) window.location.href = "/login";
        if (res.status === 403) setError("403 Forbidden: Insufficient clearance to view scheduled messages.");
        throw new Error(res.statusText);
      }
      const data = await res.json();
      if (data.success) {
        setScheduledList(data.announcements || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load scheduled messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled broadcast? This action will be audited.")) return;

    try {
      const res = await fetch(`/api/admin/communications/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to cancel scheduled broadcast.");
        return;
      }
      alert("Scheduled broadcast cancelled successfully.");
      setSelectedItem(null);
      fetchScheduled();
    } catch (err: any) {
      alert(err.message || "Network error cancelling broadcast.");
    }
  };

  return (
    <CommunicationsPortalShell currentTab="scheduled">
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pixel-navy border-2 border-cyan-500/40 p-4 sm:p-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[10px] text-cyan-400 uppercase">QUEUE CONTROL</span>
              <PixelBadge variant="cyan" size="sm">
                AUTOMATED DISPATCH ENGINE
              </PixelBadge>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
              SCHEDULED BROADCASTS // MESSAGE QUEUE
            </h1>
            <p className="text-xs text-pixel-gray-300 max-w-xl mt-1">
              Authoritative scheduled queue. Messages will be automatically broadcast at canonical IST timestamps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PixelButton variant="secondary" size="sm" onClick={() => fetchScheduled()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              REFRESH
            </PixelButton>
            <Link
              href="/admin/communications/create"
              className="px-3.5 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>SCHEDULE NEW</span>
            </Link>
          </div>
        </div>

        {/* SCHEDULED QUEUE TABLE / CARDS */}
        {loading ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
            <p className="font-pixel text-xs text-cyan-300">LOADING SCHEDULED COMMUNICATIONS...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/60 border border-red-500 text-center text-xs text-red-200">
            {error}
          </div>
        ) : scheduledList.length === 0 ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800 space-y-2">
            <Calendar className="w-8 h-8 text-pixel-muted mx-auto" />
            <p className="font-pixel text-xs text-pixel-gray-300">No scheduled communications.</p>
            <p className="text-[11px] text-pixel-muted">Use the composer to schedule messages for future transmission.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {scheduledList.map((item) => (
              <div
                key={item.id}
                className="bg-pixel-navy/80 border-2 border-cyan-500/40 hover:border-cyan-400 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PixelBadge variant="cyan" size="sm">
                      SCHEDULED
                    </PixelBadge>
                    <PixelBadge variant="orange" size="sm">
                      {item.priority}
                    </PixelBadge>
                    <span className="font-pixel text-[10px] text-cyan-300">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-pixel-muted font-mono">
                      AUDIENCE: {item.targetAudience}
                    </span>
                    <span className="text-[10px] text-pixel-orange-bright font-mono">
                      CHANNELS: {item.channels}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-pixel-cream">{item.title}</h3>
                  <p className="text-xs text-pixel-gray-300 line-clamp-2 max-w-2xl leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold bg-cyan-950/60 px-2.5 py-1 border border-cyan-800/80">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        SCHEDULED FOR:{" "}
                        {item.scheduledFor
                          ? new Date(item.scheduledFor).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
                          : "PENDING"}
                      </span>
                    </div>
                    <span className="text-[11px] text-pixel-muted">
                      CREATED BY: {item.authorName || item.authorEmail}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-cream hover:border-cyan-400 text-xs font-display flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>VIEW</span>
                  </button>
                  <button
                    onClick={() => handleCancel(item.id)}
                    className="px-3 py-1.5 bg-red-950/80 border border-red-500 text-red-300 hover:bg-red-800 hover:text-white text-xs font-display transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW MODAL */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0e1a] border-2 border-cyan-500 w-full max-w-xl p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-pixel-gray-800 pb-3">
                <div>
                  <PixelBadge variant="cyan" size="sm">
                    SCHEDULED QUEUE ITEM
                  </PixelBadge>
                  <h2 className="font-display font-bold text-lg text-pixel-cream mt-1">{selectedItem.title}</h2>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-1 text-pixel-muted hover:text-pixel-cream">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-[#050914] border border-pixel-gray-800 text-xs text-pixel-cream whitespace-pre-wrap leading-relaxed">
                {selectedItem.content}
              </div>

              <div className="p-3 bg-pixel-navy border border-cyan-800 text-xs font-mono space-y-1.5 text-pixel-gray-300">
                <div className="flex justify-between">
                  <span className="text-pixel-muted">SCHEDULED TIME:</span>
                  <span className="text-cyan-400 font-bold">
                    {selectedItem.scheduledFor
                      ? new Date(selectedItem.scheduledFor).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-muted">TARGET AUDIENCE:</span>
                  <span className="text-pixel-orange-bright">{selectedItem.targetAudience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-muted">CHANNELS:</span>
                  <span className="text-pixel-cream">{selectedItem.channels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-muted">OPERATOR:</span>
                  <span className="text-pixel-cream">{selectedItem.authorEmail}</span>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => handleCancel(selectedItem.id)}
                  className="px-3 py-1.5 bg-red-950 border border-red-500 text-red-300 hover:bg-red-800 hover:text-white text-xs font-display transition-all"
                >
                  CANCEL SCHEDULED DISPATCH
                </button>
                <PixelButton variant="secondary" size="sm" onClick={() => setSelectedItem(null)}>
                  CLOSE
                </PixelButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </CommunicationsPortalShell>
  );
}
