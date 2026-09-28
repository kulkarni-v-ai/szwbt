"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Radio,
  Eye,
  Megaphone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Clock,
  Shield,
  Send,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";

interface AnnouncementDetail {
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
  relatedResource?: string | null;
  deliveryStatus: string;
  failureReason?: string | null;
  retryCount: number;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
  deliveries?: Array<{
    id: string;
    channel: string;
    recipient: string;
    status: string;
    errorMessage?: string | null;
    attemptCount: number;
    sentAt?: string | null;
    deliveredAt?: string | null;
  }>;
}

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const announcementId = params?.announcementId as string;

  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!announcementId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/communications/announcements/${announcementId}`);
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          if (res.status === 403) {
            setError("403 Forbidden: Insufficient clearance to view this announcement.");
            return;
          }
          if (res.status === 404) {
            setError("404 Not Found: Announcement record does not exist.");
            return;
          }
          throw new Error(`Failed to load announcement: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.success) {
          setAnnouncement(data.announcement);
          setActivity(data.activity || []);
        } else {
          setError(data.error || "Failed to load announcement.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to retrieve announcement details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [announcementId]);

  const handleAction = async (action: string) => {
    if (!announcement) return;
    if (action === "DELETE") {
      if (!confirm("Are you sure you want to delete this announcement?")) return;
      try {
        const res = await fetch(`/api/admin/communications/announcements/${announcement.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          router.push("/admin/communications");
        } else {
          alert(data.error || "Failed to delete announcement.");
        }
      } catch (err: any) {
        alert(err.message);
      }
      return;
    }

    try {
      const res = await fetch(`/api/admin/communications/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnnouncement(data.announcement);
      } else {
        alert(data.error || `Failed to perform ${action}.`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "EMERGENCY":
        return "red";
      case "URGENT":
        return "orange";
      case "HIGH":
        return "yellow";
      case "NORMAL":
        return "cyan";
      default:
        return "gray";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "green";
      case "SCHEDULED":
        return "cyan";
      case "DRAFT":
        return "yellow";
      case "EXPIRED":
        return "dark";
      case "CANCELLED":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <CommunicationsPortalShell
      currentTab="announcements"
      onSelectTab={(tab) => {
        router.push(`/admin/communications?tab=${tab}`);
      }}
      publishedCount={0}
      draftCount={0}
      scheduledCount={0}
      failedDeliveriesCount={0}
      urgentCount={0}
      canCreate={true}
      canPublish={true}
      canEmergency={true}
      searchQuery=""
      onSearchChange={() => {}}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/communications"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream text-xs font-pixel hover:border-pixel-orange-fiery hover:text-pixel-orange-bright transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO COMMUNICATIONS CENTER</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-16 text-center text-pixel-muted font-pixel text-xs animate-pulse">
            LOADING BROADCAST TELEMETRY SPECIFICATION...
          </div>
        ) : error ? (
          <PixelCard headerTitle="ACCESS ERROR" headerBadge="ALERT">
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="font-display text-base text-pixel-cream">{error}</h3>
              <Link
                href="/admin/communications"
                className="inline-block mt-2 px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase"
              >
                RETURN TO COMMUNICATIONS HUB
              </Link>
            </div>
          </PixelCard>
        ) : announcement ? (
          <div className="space-y-6">
            <PixelCard
              headerTitle="BROADCAST SPECIFICATION"
              headerBadge={announcement.status}
              glow={announcement.priority === "EMERGENCY"}
            >
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pixel-gray-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PixelBadge variant={getStatusBadgeVariant(announcement.status)} size="md">
                      {announcement.status}
                    </PixelBadge>
                    <PixelBadge variant={getPriorityBadgeVariant(announcement.priority)} size="md">
                      {announcement.priority}
                    </PixelBadge>
                    <span className="font-pixel text-xs text-cyan-400">[{announcement.category}]</span>
                    {announcement.relatedResource && (
                      <span className="text-xs text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 border border-amber-800">
                        TARGET: {announcement.relatedResource}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-xs text-pixel-muted">ID: {announcement.id}</span>
                </div>

                <div>
                  <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                    {announcement.title}
                  </h1>
                  <div className="mt-4 p-4 bg-[#050914] border border-pixel-gray-800 text-sm text-pixel-gray-200 whitespace-pre-line leading-relaxed">
                    {announcement.content}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#050914] p-4 border border-pixel-gray-800 font-mono text-xs">
                  <div>
                    <span className="text-pixel-muted block text-[10px]">TARGET AUDIENCE</span>
                    <span className="text-pixel-cream font-bold">{announcement.targetAudience}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">CHANNELS</span>
                    <span className="text-pixel-cream font-bold">{announcement.channels}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">DELIVERY STATE</span>
                    <span className="text-pixel-cream font-bold">{announcement.deliveryStatus}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">RECIPIENTS REACHED</span>
                    <span className="text-pixel-cream font-bold">{announcement.recipientCount}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">AUTHOR</span>
                    <span className="text-pixel-cream truncate block">{announcement.authorEmail}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">CREATED AT</span>
                    <span className="text-pixel-cream">
                      {new Date(announcement.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">PUBLISHED AT</span>
                    <span className="text-pixel-cream">
                      {announcement.publishedAt
                        ? new Date(announcement.publishedAt).toLocaleString("en-IN")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">SCHEDULED FOR</span>
                    <span className="text-pixel-cream">
                      {announcement.scheduledFor
                        ? new Date(announcement.scheduledFor).toLocaleString("en-IN")
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Delivery Logs */}
                {announcement.deliveries && announcement.deliveries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-pixel text-[11px] text-pixel-orange-bright uppercase">
                      CHANNEL DELIVERY AUDIT
                    </h3>
                    <div className="divide-y divide-pixel-gray-800 border border-pixel-gray-800 text-xs">
                      {announcement.deliveries.map((del) => (
                        <div key={del.id} className="p-3 flex justify-between items-center">
                          <div>
                            <span className="font-mono text-cyan-400 font-bold">{del.channel}</span>
                            <span className="text-pixel-muted ml-2 font-mono">Target: {del.recipient}</span>
                            {del.errorMessage && (
                              <p className="text-[11px] text-red-400 font-mono mt-1">
                                {del.errorMessage}
                              </p>
                            )}
                          </div>
                          <PixelBadge
                            variant={del.status === "DELIVERED" ? "green" : del.status === "FAILED" ? "red" : "yellow"}
                            size="sm"
                          >
                            {del.status}
                          </PixelBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit trail */}
                {activity.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-pixel text-[11px] text-pixel-orange-bright uppercase">
                      ACTIVITY LOG
                    </h3>
                    <div className="divide-y divide-pixel-gray-800 border border-pixel-gray-800 text-xs">
                      {activity.map((act) => (
                        <div key={act.id} className="p-2.5 flex justify-between items-center font-mono text-[11px]">
                          <div>
                            <span className="text-pixel-orange-bright">{act.action}</span>
                            <span className="text-pixel-muted ml-2">by {act.actorEmail}</span>
                          </div>
                          <span className="text-pixel-muted">
                            {new Date(act.timestamp).toLocaleTimeString("en-IN")} IST
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lifecycle action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-pixel-gray-800">
                  <div className="flex items-center gap-2">
                    {announcement.status === "DRAFT" && (
                      <button
                        onClick={() => handleAction("PUBLISH")}
                        className="px-4 py-2 bg-green-950 border border-green-600 text-green-300 text-xs font-pixel hover:bg-green-700 hover:text-white transition-colors"
                      >
                        PUBLISH BROADCAST NOW
                      </button>
                    )}
                    {announcement.status === "SCHEDULED" && (
                      <button
                        onClick={() => handleAction("CANCEL")}
                        className="px-4 py-2 bg-red-950 border border-red-700 text-red-300 text-xs font-pixel hover:bg-red-800 hover:text-white transition-colors"
                      >
                        CANCEL SCHEDULED BROADCAST
                      </button>
                    )}
                    {announcement.status === "PUBLISHED" && (
                      <button
                        onClick={() => handleAction("EXPIRE")}
                        className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-pixel-muted text-xs font-pixel hover:text-pixel-cream"
                      >
                        MARK AS EXPIRED
                      </button>
                    )}
                    <button
                      onClick={() => handleAction("DELETE")}
                      className="px-4 py-2 bg-red-950/40 border border-red-800 text-red-400 text-xs font-pixel hover:bg-red-900 hover:text-white transition-colors"
                    >
                      DELETE ANNOUNCEMENT
                    </button>
                  </div>
                </div>
              </div>
            </PixelCard>
          </div>
        ) : null}
      </div>
    </CommunicationsPortalShell>
  );
}
