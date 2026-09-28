"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  Search,
  Filter,
  Eye,
  PlusCircle,
  RefreshCw,
  Trash2,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelSelect } from "@/components/pixel/PixelSelect";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  targetAudience: string;
  channels: string;
  status: string;
  isPublished: boolean;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  authorEmail: string;
  authorName?: string | null;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AnnouncementsListPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (audienceFilter !== "ALL") params.append("audience", audienceFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/communications/announcements?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) window.location.href = "/login";
        if (res.status === 403) setError("403 Forbidden: Insufficient clearance to view announcements.");
        throw new Error(`Error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, audienceFilter, searchQuery]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleAction = async (id: string, action: string) => {
    if (action === "DELETE") {
      if (!confirm("Are you sure you want to permanently delete this announcement?")) return;
      try {
        const res = await fetch(`/api/admin/communications/announcements/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || "Failed to delete.");
          return;
        }
        setSelectedAnnouncement(null);
        fetchAnnouncements();
      } catch (err: any) {
        alert(err.message || "Delete failed.");
      }
      return;
    }

    try {
      const res = await fetch(`/api/admin/communications/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || `Failed to perform ${action}.`);
        return;
      }
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "EMERGENCY": return "red";
      case "URGENT": return "orange";
      case "HIGH": return "yellow";
      case "NORMAL": return "cyan";
      default: return "gray";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "green";
      case "SCHEDULED": return "cyan";
      case "DRAFT": return "yellow";
      case "EXPIRED": return "dark";
      case "CANCELLED": return "red";
      default: return "gray";
    }
  };

  return (
    <CommunicationsPortalShell currentTab="announcements">
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pixel-navy border-2 border-pixel-orange-fiery/40 p-4 sm:p-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">BROADCAST ARCHIVE</span>
              <PixelBadge variant="orange" size="sm">
                ANNOUNCEMENT REPOSITORY
              </PixelBadge>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
              TOURNAMENT ANNOUNCEMENTS MANAGEMENT
            </h1>
            <p className="text-xs text-pixel-gray-300 max-w-xl mt-1">
              Manage draft, scheduled, and published tournament communications across all official channels.
            </p>
          </div>
          <Link
            href="/admin/communications/create"
            className="self-start sm:self-center px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>CREATE ANNOUNCEMENT</span>
          </Link>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-[#050914] border-2 border-pixel-gray-800 p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-pixel-muted absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search announcements by title, content, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-pixel-navy border border-pixel-gray-700 py-2 pl-9 pr-3 text-xs text-pixel-cream focus:border-pixel-orange-fiery focus:outline-none placeholder:text-pixel-gray-500 font-sans"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <PixelSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: "ALL STATUSES", value: "ALL" },
                  { label: "PUBLISHED", value: "PUBLISHED" },
                  { label: "DRAFT", value: "DRAFT" },
                  { label: "SCHEDULED", value: "SCHEDULED" },
                  { label: "EXPIRED", value: "EXPIRED" },
                  { label: "CANCELLED", value: "CANCELLED" },
                ]}
              />
              <PixelSelect
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { label: "ALL PRIORITIES", value: "ALL" },
                  { label: "NORMAL", value: "NORMAL" },
                  { label: "HIGH", value: "HIGH" },
                  { label: "URGENT", value: "URGENT" },
                  { label: "EMERGENCY", value: "EMERGENCY" },
                ]}
              />
              <PixelSelect
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                options={[
                  { label: "ALL AUDIENCES", value: "ALL" },
                  { label: "PARTICIPANTS", value: "PARTICIPANTS" },
                  { label: "TEAM MANAGERS", value: "TEAM_MANAGERS" },
                  { label: "VOLUNTEERS", value: "VOLUNTEERS" },
                  { label: "MATCH OFFICIALS", value: "MATCH_OFFICIALS" },
                  { label: "ORGANIZERS", value: "ORGANIZERS" },
                  { label: "SUPPORT STAFF", value: "SUPPORT_STAFF" },
                ]}
              />
              <PixelButton variant="secondary" size="sm" onClick={() => fetchAnnouncements()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                REFRESH
              </PixelButton>
            </div>
          </div>
        </div>

        {/* ANNOUNCEMENT LISTING */}
        {loading ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800">
            <RefreshCw className="w-8 h-8 text-pixel-orange-fiery animate-spin mx-auto mb-2" />
            <p className="font-pixel text-xs text-pixel-orange-bright">LOADING COMMUNICATIONS...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/60 border border-red-500 text-center text-xs text-red-200">
            {error}
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800 space-y-2">
            <Megaphone className="w-8 h-8 text-pixel-muted mx-auto" />
            <p className="font-pixel text-xs text-pixel-gray-300">No matching messages.</p>
            <p className="text-[11px] text-pixel-muted">Adjust your filter criteria or compose a new announcement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="bg-pixel-navy/80 border-2 border-pixel-gray-800 hover:border-pixel-orange-fiery/60 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PixelBadge variant={getStatusBadgeVariant(item.status) as any} size="sm">
                      {item.status}
                    </PixelBadge>
                    <PixelBadge variant={getPriorityBadgeVariant(item.priority) as any} size="sm">
                      {item.priority}
                    </PixelBadge>
                    <span className="font-pixel text-[10px] text-pixel-orange-bright">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-pixel-muted font-mono">
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
                    <span>CREATED: {new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                    <span>BY: {item.authorName || item.authorEmail}</span>
                    {item.scheduledFor && (
                      <span className="text-cyan-400">
                        SCHEDULED FOR: {new Date(item.scheduledFor).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    )}
                    {item.publishedAt && (
                      <span className="text-green-400">
                        PUBLISHED: {new Date(item.publishedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedAnnouncement(item)}
                    className="px-2.5 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-cream hover:border-pixel-orange-fiery text-xs font-display flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>VIEW</span>
                  </button>

                  {item.status === "DRAFT" && (
                    <>
                      <button
                        onClick={() => handleAction(item.id, "PUBLISH")}
                        className="px-2.5 py-1.5 bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright text-xs font-display font-bold flex items-center gap-1 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>PUBLISH</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "DELETE")}
                        className="p-1.5 bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-800 hover:text-white transition-all text-xs"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {item.status === "SCHEDULED" && (
                    <button
                      onClick={() => handleAction(item.id, "CANCEL")}
                      className="px-2.5 py-1.5 bg-red-950/80 border border-red-500 text-red-300 hover:bg-red-800 hover:text-white text-xs font-display transition-all"
                    >
                      CANCEL
                    </button>
                  )}

                  {item.status === "PUBLISHED" && (
                    <button
                      onClick={() => handleAction(item.id, "EXPIRE")}
                      className="px-2.5 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-muted hover:text-pixel-cream text-xs font-display transition-all"
                    >
                      EXPIRE
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DETAIL MODAL */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0e1a] border-2 border-pixel-orange-fiery w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-pixel-gray-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PixelBadge variant={getStatusBadgeVariant(selectedAnnouncement.status) as any} size="sm">
                      {selectedAnnouncement.status}
                    </PixelBadge>
                    <PixelBadge variant={getPriorityBadgeVariant(selectedAnnouncement.priority) as any} size="sm">
                      {selectedAnnouncement.priority}
                    </PixelBadge>
                  </div>
                  <h2 className="font-display font-bold text-lg text-pixel-cream">{selectedAnnouncement.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-1 text-pixel-muted hover:text-pixel-cream"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#050914] p-4 border border-pixel-gray-800 space-y-2 text-xs">
                <p className="text-pixel-cream leading-relaxed whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-pixel-navy p-3 border border-pixel-gray-800">
                <div>
                  <span className="text-pixel-muted">CATEGORY:</span>{" "}
                  <span className="text-pixel-cream">{selectedAnnouncement.category}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">AUDIENCE:</span>{" "}
                  <span className="text-pixel-orange-bright">{selectedAnnouncement.targetAudience}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">CHANNELS:</span>{" "}
                  <span className="text-cyan-400">{selectedAnnouncement.channels}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">AUTHOR:</span>{" "}
                  <span className="text-pixel-cream">{selectedAnnouncement.authorEmail}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <PixelButton variant="secondary" size="sm" onClick={() => setSelectedAnnouncement(null)}>
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
