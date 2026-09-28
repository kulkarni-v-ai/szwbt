"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Calendar,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Radio,
  Mail,
  User,
  X,
  FileText,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelSelect } from "@/components/pixel/PixelSelect";
import { PixelInput } from "@/components/pixel/PixelInput";

interface HistoryItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  targetAudience: string;
  channels: string;
  status: string;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  authorEmail: string;
  authorName?: string | null;
  recipientCount: number;
  deliveryStatus: string;
  createdAt: string;
  deliveries?: Array<{
    id: string;
    channel: string;
    recipient: string;
    status: string;
    sentAt?: string | null;
    deliveredAt?: string | null;
  }>;
}

export default function CommunicationsHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters (Server-side evaluated)
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [audience, setAudience] = useState("ALL");
  const [creator, setCreator] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (channel !== "ALL") params.append("channel", channel);
      if (status !== "ALL") params.append("status", status);
      if (audience !== "ALL") params.append("audience", audience);
      if (creator.trim()) params.append("creator", creator.trim());
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      params.append("page", String(page));
      params.append("limit", "15");

      const res = await fetch(`/api/admin/communications/history?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) window.location.href = "/login";
        if (res.status === 403) setError("403 Forbidden: Insufficient clearance to view broadcast history.");
        throw new Error(res.statusText);
      }

      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load communications history.");
    } finally {
      setLoading(false);
    }
  }, [search, channel, status, audience, creator, fromDate, toDate, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <CommunicationsPortalShell currentTab="history">
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pixel-navy border-2 border-pixel-orange-fiery/40 p-4 sm:p-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">TRANSMISSION ARCHIVE</span>
              <PixelBadge variant="orange" size="sm">
                IMMUTABLE AUDIT LOG
              </PixelBadge>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
              HISTORICAL COMMUNICATIONS LOG // DISPATCH LEDGER
            </h1>
            <p className="text-xs text-pixel-gray-300 max-w-xl mt-1">
              Server-side indexed records of all broadcast activities, audience deliveries, timestamps, and dispatch origins.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PixelButton variant="secondary" size="sm" onClick={() => fetchHistory()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              REFRESH
            </PixelButton>
          </div>
        </div>

        {/* SERVER-SIDE FILTERS PANEL */}
        <div className="bg-[#050914] border-2 border-pixel-gray-800 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">GLOBAL SEARCH</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-pixel-muted absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="ID, title, content, or author..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-pixel-navy border border-pixel-gray-700 py-1.5 pl-8 pr-3 text-xs text-pixel-cream focus:border-pixel-orange-fiery focus:outline-none placeholder:text-pixel-gray-500 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">CHANNEL</label>
              <PixelSelect
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: "ALL CHANNELS", value: "ALL" },
                  { label: "IN-APP", value: "IN_APP" },
                  { label: "EMAIL", value: "EMAIL" },
                ]}
              />
            </div>

            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">STATUS</label>
              <PixelSelect
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: "ALL STATUSES", value: "ALL" },
                  { label: "PUBLISHED", value: "PUBLISHED" },
                  { label: "SCHEDULED", value: "SCHEDULED" },
                  { label: "DRAFT", value: "DRAFT" },
                  { label: "CANCELLED", value: "CANCELLED" },
                  { label: "EXPIRED", value: "EXPIRED" },
                ]}
              />
            </div>

            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">AUDIENCE</label>
              <PixelSelect
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: "ALL AUDIENCES", value: "ALL" },
                  { label: "PARTICIPANTS", value: "PARTICIPANTS" },
                  { label: "TEAM MANAGERS", value: "TEAM_MANAGERS" },
                  { label: "VOLUNTEERS", value: "VOLUNTEERS" },
                  { label: "MATCH OFFICIALS", value: "MATCH_OFFICIALS" },
                  { label: "ORGANIZERS", value: "ORGANIZERS" },
                ]}
              />
            </div>
          </div>

          {/* Secondary Row: Date Range & Creator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-pixel-gray-800">
            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">FROM DATE</label>
              <PixelInput
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">TO DATE</label>
              <PixelInput
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="block font-pixel text-[9px] text-pixel-muted mb-1">CREATOR / AUTHOR EMAIL</label>
              <PixelInput
                value={creator}
                onChange={(e) => {
                  setCreator(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. comm@szwbt2026.edu"
              />
            </div>
          </div>
        </div>

        {/* RESULTS COUNT & PAGINATION STRIP */}
        <div className="flex justify-between items-center text-xs font-mono text-pixel-muted px-1">
          <span>FOUND {totalCount} ARCHIVED TRANSMISSIONS</span>
          <span>PAGE {page} OF {totalPages}</span>
        </div>

        {/* HISTORY LIST */}
        {loading ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800">
            <RefreshCw className="w-8 h-8 text-pixel-orange-fiery animate-spin mx-auto mb-2" />
            <p className="font-pixel text-xs text-pixel-orange-bright">QUERYING HISTORICAL LEDGER...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/60 border border-red-500 text-center text-xs text-red-200">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800 space-y-2">
            <History className="w-8 h-8 text-pixel-muted mx-auto" />
            <p className="font-pixel text-xs text-pixel-gray-300">No communication history found.</p>
            <p className="text-[11px] text-pixel-muted">Try clearing some filter criteria or search parameters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-pixel-navy/80 border-2 border-pixel-gray-800 hover:border-pixel-orange-fiery/60 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-pixel-muted">ID: {item.id.slice(0, 8)}...</span>
                    <PixelBadge
                      variant={
                        item.status === "PUBLISHED"
                          ? "green"
                          : item.status === "SCHEDULED"
                          ? "cyan"
                          : item.status === "DRAFT"
                          ? "yellow"
                          : "dark"
                      }
                      size="sm"
                    >
                      {item.status}
                    </PixelBadge>
                    <PixelBadge variant={item.priority === "EMERGENCY" ? "red" : "orange"} size="sm">
                      {item.priority}
                    </PixelBadge>
                    <span className="text-[10px] text-pixel-orange-bright font-mono">
                      AUDIENCE: {item.targetAudience}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      CHANNELS: {item.channels}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-pixel-cream">{item.title}</h3>
                  <p className="text-xs text-pixel-gray-300 line-clamp-2 max-w-3xl leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-pixel-muted font-mono pt-1">
                    <span>DISPATCHED: {new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                    <span>AUTHOR: {item.authorEmail}</span>
                    <span>RECIPIENTS: {item.recipientCount}</span>
                    <span className={item.deliveryStatus === "SENT" || item.deliveryStatus === "DELIVERED" ? "text-green-400" : "text-yellow-400"}>
                      DELIVERY: {item.deliveryStatus}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-cream hover:border-pixel-orange-fiery text-xs font-display flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>INSPECT</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-pixel-cream px-3 py-1 bg-[#050914] border border-pixel-gray-800">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* INSPECT MODAL */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0e1a] border-2 border-pixel-orange-fiery w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-pixel-gray-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-pixel-muted">ID: {selectedItem.id}</span>
                    <PixelBadge variant="orange" size="sm">
                      {selectedItem.priority}
                    </PixelBadge>
                  </div>
                  <h2 className="font-display font-bold text-lg text-pixel-cream">{selectedItem.title}</h2>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-1 text-pixel-muted hover:text-pixel-cream">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-[#050914] border border-pixel-gray-800 text-xs text-pixel-cream whitespace-pre-wrap leading-relaxed">
                {selectedItem.content}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-pixel-navy p-3 border border-pixel-gray-800">
                <div>
                  <span className="text-pixel-muted">TARGET AUDIENCE:</span>{" "}
                  <span className="text-pixel-orange-bright">{selectedItem.targetAudience}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">CHANNELS:</span>{" "}
                  <span className="text-cyan-400">{selectedItem.channels}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">TIMESTAMP:</span>{" "}
                  <span className="text-pixel-cream">
                    {new Date(selectedItem.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
                <div>
                  <span className="text-pixel-muted">OPERATOR:</span>{" "}
                  <span className="text-pixel-cream">{selectedItem.authorEmail}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
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
