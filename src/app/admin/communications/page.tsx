"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Radio,
  Megaphone,
  FileText,
  Calendar,
  History,
  Bell,
  LayoutTemplate,
  PlusCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Trash2,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Shield,
  User,
  Users,
  Building,
  Mail,
  Smartphone,
  Info,
  X,
  Flame,
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
  relatedResource?: string | null;
  deliveryStatus: string;
  failureReason?: string | null;
  retryCount: number;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
  deliveries?: NotificationDelivery[];
}

interface NotificationDelivery {
  id: string;
  announcementId: string;
  channel: string;
  recipient: string;
  status: string;
  errorMessage?: string | null;
  attemptCount: number;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  announcement?: {
    id: string;
    title: string;
    category: string;
    priority: string;
  };
}

interface Template {
  id: string;
  name: string;
  code: string;
  category: string;
  priority: string;
  audience: string;
  channels: string;
  subject: string;
  bodyTemplate: string;
  description?: string | null;
}

interface ActivityItem {
  id: string;
  action: string;
  actorEmail: string;
  resourceId?: string | null;
  metadata?: any;
  timestamp: string;
}

interface ChannelStat {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}

export default function CommunicationsAdminPage() {
  const [currentTab, setCurrentTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Telemetry data
  const [summary, setSummary] = useState({
    totalAnnouncements: 0,
    publishedCount: 0,
    draftCount: 0,
    scheduledCount: 0,
    failedDeliveriesCount: 0,
    urgentCount: 0,
    publishedTodayCount: 0,
    activeDeliveriesCount: 0,
    emergencyMessagesCount: 0,
  });
  const [permissions, setPermissions] = useState({
    canCreate: true,
    canPublish: true,
    canEmergency: true,
  });
  const [activeUrgentAnnouncements, setActiveUrgentAnnouncements] = useState<Announcement[]>([]);
  const [upcomingScheduled, setUpcomingScheduled] = useState<Announcement[]>([]);
  const [recentDrafts, setRecentDrafts] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStat>>({});
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Announcements list tab data & filters
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Deliveries list tab data
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  // Target resources
  const [targetResources, setTargetResources] = useState<{
    teams: Array<{ label: string; value: string }>;
    courts: Array<{ label: string; value: string }>;
    hostels: Array<{ label: string; value: string }>;
    venues: Array<{ label: string; value: string }>;
  }>({ teams: [], courts: [], hostels: [], venues: [] });

  // Modal states
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [detailActivity, setDetailActivity] = useState<ActivityItem[]>([]);

  // Composer form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("GENERAL");
  const [formPriority, setFormPriority] = useState("NORMAL");
  const [formAudience, setFormAudience] = useState("ALL");
  const [formChannels, setFormChannels] = useState<string[]>(["IN_APP"]);
  const [formStatus, setFormStatus] = useState("PUBLISHED"); // "PUBLISHED", "DRAFT", "SCHEDULED"
  const [formScheduledFor, setFormScheduledFor] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formRelatedResource, setFormRelatedResource] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Emergency form state
  const [emergencyTitle, setEmergencyTitle] = useState("");
  const [emergencyContent, setEmergencyContent] = useState("");
  const [emergencyAudience, setEmergencyAudience] = useState("ALL");
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false);
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);

  // Fetch overview telemetry
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/communications");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.status === 403) {
          setError("403 Forbidden: Clearance level does not allow access to Communications Center.");
          setLoading(false);
          return;
        }
        throw new Error(`Failed to load communications telemetry: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setPermissions(data.permissions);
        setActiveUrgentAnnouncements(data.activeUrgentAnnouncements || []);
        setUpcomingScheduled(data.upcomingScheduled || []);
        setRecentDrafts(data.recentDrafts || []);
        setTemplates(data.templates || []);
        setChannelStats(data.channelStats || {});
        setRecentActivity(data.recentActivity || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load communications data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch announcements list
  const fetchAnnouncements = useCallback(async () => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (audienceFilter !== "ALL") params.append("audience", audienceFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/communications/announcements?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnnouncements(data.announcements || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, audienceFilter, searchQuery]);

  // Fetch deliveries
  const fetchDeliveries = useCallback(async () => {
    try {
      setDeliveriesLoading(true);
      const res = await fetch("/api/admin/communications/deliveries");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDeliveries(data.deliveries || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeliveriesLoading(false);
    }
  }, []);

  // Fetch target resources for composer
  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/communications/resources");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTargetResources(data.resources || { teams: [], courts: [], hostels: [], venues: [] });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchResources();
  }, [fetchOverview, fetchResources]);

  useEffect(() => {
    if (currentTab === "announcements" || currentTab === "drafts" || currentTab === "scheduled" || currentTab === "history") {
      fetchAnnouncements();
    }
    if (currentTab === "notifications") {
      fetchDeliveries();
    }
  }, [currentTab, fetchAnnouncements, fetchDeliveries]);

  // Sync tab with statusFilter if specific tab clicked
  const handleTabSelect = (tab: string) => {
    setCurrentTab(tab);
    if (tab === "drafts") {
      setStatusFilter("DRAFT");
    } else if (tab === "scheduled") {
      setStatusFilter("SCHEDULED");
    } else if (tab === "announcements") {
      setStatusFilter("PUBLISHED");
    } else if (tab === "history") {
      setStatusFilter("ALL");
    } else if (tab === "create") {
      resetComposeForm();
      setComposeModalOpen(true);
    }
  };

  // Reset form
  const resetComposeForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("GENERAL");
    setFormPriority("NORMAL");
    setFormAudience("ALL");
    setFormChannels(["IN_APP"]);
    setFormStatus("PUBLISHED");
    setFormScheduledFor("");
    setFormExpiresAt("");
    setFormRelatedResource("");
    setPreviewMode(false);
  };

  // Submit announcement
  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    try {
      setFormSubmitting(true);
      const res = await fetch("/api/admin/communications/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
          priority: formPriority,
          targetAudience: formAudience,
          channels: formChannels.join(","),
          status: formStatus,
          scheduledFor: formStatus === "SCHEDULED" ? formScheduledFor : undefined,
          expiresAt: formExpiresAt || undefined,
          relatedResource: formRelatedResource || undefined,
          emergencyConfirmed: formPriority === "EMERGENCY",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to create announcement.");
        return;
      }

      setComposeModalOpen(false);
      resetComposeForm();
      fetchOverview();
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || "Network error submitting announcement.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit emergency notice
  const handleSendEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyTitle.trim() || !emergencyContent.trim()) return;
    if (!emergencyConfirmed) {
      alert("You must verify and check the confirmation box to broadcast an emergency notice.");
      return;
    }

    try {
      setEmergencySubmitting(true);
      const res = await fetch("/api/admin/communications/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: emergencyTitle,
          content: emergencyContent,
          category: "EMERGENCY",
          priority: "EMERGENCY",
          targetAudience: emergencyAudience,
          channels: "IN_APP,EMAIL,SMS",
          status: "PUBLISHED",
          emergencyConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to send emergency broadcast.");
        return;
      }

      setEmergencyModalOpen(false);
      setEmergencyTitle("");
      setEmergencyContent("");
      setEmergencyConfirmed(false);
      fetchOverview();
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || "Failed to transmit emergency broadcast.");
    } finally {
      setEmergencySubmitting(false);
    }
  };

  // Inspect detail
  const handleOpenDetail = async (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/admin/communications/announcements/${ann.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedAnnouncement(data.announcement);
          setDetailActivity(data.activity || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Patch action (PUBLISH, CANCEL, EXPIRE, DELETE)
  const handleAnnouncementAction = async (id: string, action: string) => {
    if (action === "DELETE") {
      if (!confirm("Are you sure you want to permanently delete this announcement?")) return;
      try {
        const res = await fetch(`/api/admin/communications/announcements/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || "Failed to delete announcement.");
          return;
        }
        setDetailModalOpen(false);
        fetchOverview();
        fetchAnnouncements();
      } catch (err: any) {
        alert(err.message || "Delete error.");
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
      setDetailModalOpen(false);
      fetchOverview();
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    }
  };

  // Retry delivery
  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      const res = await fetch("/api/admin/communications/deliveries/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Retry failed.");
        return;
      }
      alert("Notification re-transmitted successfully!");
      fetchOverview();
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || "Retry error.");
    }
  };

  // Apply template to compose form
  const handleApplyTemplate = (tpl: Template) => {
    setFormTitle(tpl.subject);
    setFormContent(tpl.bodyTemplate);
    setFormCategory(tpl.category);
    setFormPriority(tpl.priority);
    setFormAudience(tpl.audience);
    setFormChannels(tpl.channels.split(","));
    setFormStatus("PUBLISHED");
    setComposeModalOpen(true);
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
      currentTab={currentTab}
      onSelectTab={handleTabSelect}
      publishedCount={summary.publishedCount}
      draftCount={summary.draftCount}
      scheduledCount={summary.scheduledCount}
      failedDeliveriesCount={summary.failedDeliveriesCount}
      urgentCount={summary.urgentCount}
      canCreate={permissions.canCreate}
      canPublish={permissions.canPublish}
      canEmergency={permissions.canEmergency}
      onRefresh={() => {
        fetchOverview();
        fetchAnnouncements();
        fetchDeliveries();
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenCompose={() => {
        resetComposeForm();
        setComposeModalOpen(true);
      }}
      onOpenEmergency={() => {
        setEmergencyTitle("");
        setEmergencyContent("");
        setEmergencyConfirmed(false);
        setEmergencyModalOpen(true);
      }}
    >
      {/* ERROR STATE */}
      {error && (
        <PixelCard headerTitle="COMMUNICATIONS SIGNAL ERROR" headerBadge="ALERT" glow>
          <div className="p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto animate-bounce" />
            <h2 className="font-display text-lg text-pixel-cream">{error}</h2>
            <p className="text-xs text-pixel-gray-400">
              COMMUNICATION LINK LOST. Verify network connectivity and session clearance.
            </p>
            <PixelButton
              variant="primary"
              size="sm"
              onClick={() => {
                fetchOverview();
                fetchAnnouncements();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              RETRY CONNECTION
            </PixelButton>
          </div>
        </PixelCard>
      )}

      {/* OVERVIEW TAB */}
      {currentTab === "overview" && !error && (
        <div className="space-y-6">
          {/* COMMAND CENTER HERO */}
          <div className="bg-gradient-to-r from-pixel-navy via-[#0d162a] to-pixel-black border-2 border-pixel-orange-fiery/40 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-pixel-orange-fiery/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-wider">
                    BROADCAST HUD
                  </span>
                  <PixelBadge variant="orange" size="sm">
                    COMMUNICATIONS // COMMAND
                  </PixelBadge>
                </div>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
                  COMMUNICATIONS // COMMAND CENTER
                </h2>
                <p className="font-pixel text-xs text-pixel-orange-bright tracking-wider">
                  &ldquo;ONE MESSAGE. THE RIGHT PEOPLE. THE RIGHT TIME.&rdquo;
                </p>
                <p className="text-xs text-pixel-gray-300 max-w-2xl leading-relaxed">
                  Real-time broadcast dispatcher for participants, university institutions, tournament officials,
                  and field volunteers. Synchronized delivery via In-App Noticeboards, SMTP relays, and emergency telemetry.
                </p>
              </div>

              {/* Top Action buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  href="/admin/communications/create"
                  className="px-3.5 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-2 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>CREATE ANNOUNCEMENT</span>
                </Link>

                <Link
                  href="/admin/communications/scheduled"
                  className="px-3.5 py-2 bg-pixel-navy border border-cyan-500/80 text-cyan-300 font-display font-bold text-xs uppercase tracking-wider hover:bg-cyan-950/60 hover:text-white transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] flex items-center gap-2 active:scale-95"
                >
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>SCHEDULE MESSAGE</span>
                </Link>

                <Link
                  href="/admin/communications/templates"
                  className="px-3.5 py-2 bg-pixel-navy border border-pixel-orange-fiery/60 text-pixel-cream font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-fiery/20 hover:text-pixel-orange-bright transition-all flex items-center gap-2 active:scale-95"
                >
                  <LayoutTemplate className="w-4 h-4 text-pixel-orange-fiery" />
                  <span>TEMPLATES</span>
                </Link>

                <Link
                  href="/admin/communications/history"
                  className="px-3.5 py-2 bg-pixel-navy border border-pixel-gray-700 text-pixel-gray-300 font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-navy/80 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                >
                  <History className="w-4 h-4 text-pixel-muted" />
                  <span>HISTORY</span>
                </Link>
              </div>
            </div>
          </div>

          {/* MAIN KPI STRIP (REAL BACKEND DATA ONLY) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Drafts */}
            <Link
              href="/admin/communications?tab=drafts"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleTabSelect("drafts");
              }}
              className="text-left bg-pixel-navy/80 border-2 border-yellow-500/50 hover:border-yellow-400 p-3.5 transition-all group"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-pixel text-[9px] text-yellow-400 uppercase">DRAFTS</span>
                <FileText className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                {summary.draftCount !== undefined ? summary.draftCount : "NO DATA"}
              </p>
              <p className="text-[10px] text-pixel-muted mt-0.5 truncate">Pending composition</p>
            </Link>

            {/* Scheduled */}
            <Link
              href="/admin/communications/scheduled"
              className="text-left bg-pixel-navy/80 border-2 border-cyan-500/50 hover:border-cyan-400 p-3.5 transition-all group"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-pixel text-[9px] text-cyan-400 uppercase">SCHEDULED</span>
                <Calendar className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                {summary.scheduledCount !== undefined ? summary.scheduledCount : "NO DATA"}
              </p>
              <p className="text-[10px] text-pixel-muted mt-0.5 truncate">Queued broadcasts</p>
            </Link>

            {/* Published Today */}
            <Link
              href="/admin/communications/announcements"
              className="text-left bg-pixel-navy/80 border-2 border-green-500/50 hover:border-green-400 p-3.5 transition-all group"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-pixel text-[9px] text-green-400 uppercase">PUBLISHED TODAY</span>
                <Megaphone className="w-3.5 h-3.5 text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                {summary.publishedTodayCount !== undefined ? summary.publishedTodayCount : "NO DATA"}
              </p>
              <p className="text-[10px] text-pixel-muted mt-0.5 truncate">Live broadcasts today</p>
            </Link>

            {/* Active Deliveries */}
            <Link
              href="/admin/communications/delivery"
              className="text-left bg-pixel-navy/80 border-2 border-pixel-orange-fiery/50 hover:border-pixel-orange-fiery p-3.5 transition-all group"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-pixel text-[9px] text-pixel-orange-fiery uppercase">ACTIVE DELIVERIES</span>
                <Radio className="w-3.5 h-3.5 text-pixel-orange-fiery group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                {summary.activeDeliveriesCount !== undefined ? summary.activeDeliveriesCount : "NO DATA"}
              </p>
              <p className="text-[10px] text-pixel-muted mt-0.5 truncate">Processing in queue</p>
            </Link>

            {/* Failed Deliveries */}
            <Link
              href="/admin/communications/delivery?filter=FAILED"
              className="text-left bg-pixel-navy/80 border-2 border-red-500/50 hover:border-red-400 p-3.5 transition-all group"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-pixel text-[9px] text-red-400 uppercase">FAILED DELIVERIES</span>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                {summary.failedDeliveriesCount !== undefined ? summary.failedDeliveriesCount : "NO DATA"}
              </p>
              <p className="text-[10px] text-pixel-muted mt-0.5 truncate">Requires retry/audit</p>
            </Link>

            {/* Emergency Messages */}
            <Link
              href="/admin/communications/emergency"
              className="text-left bg-pixel-navy/80 border-2 border-red-600/70 hover:border-red-500 p-3.5 transition-all group"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-pixel text-[9px] text-red-400 uppercase">EMERGENCY MSGS</span>
                <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream">
                {summary.emergencyMessagesCount !== undefined ? summary.emergencyMessagesCount : "NO DATA"}
              </p>
              <p className="text-[10px] text-pixel-muted mt-0.5 truncate">Priority transmissions</p>
            </Link>
          </div>

          {/* ACTIVE URGENT ANNOUNCEMENTS & CHANNEL STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Urgent Broadcasts Feed (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <PixelCard
                headerTitle="CRITICAL & URGENT BROADCASTS"
                headerBadge={summary.urgentCount > 0 ? `${summary.urgentCount} ACTIVE` : "NORMAL"}
                glow={summary.urgentCount > 0}
              >
                {activeUrgentAnnouncements.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-pixel-green mx-auto opacity-70" />
                    <p className="font-display text-sm text-pixel-cream">NO ACTIVE URGENT ANNOUNCEMENTS</p>
                    <p className="text-xs text-pixel-muted">
                      No unresolved safety, emergency, or high-priority bulletins currently require attention.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-pixel-gray-800">
                    {activeUrgentAnnouncements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-4 hover:bg-pixel-navy/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <PixelBadge variant={getPriorityBadgeVariant(ann.priority)} size="sm">
                              {ann.priority}
                            </PixelBadge>
                            <span className="font-pixel text-[9px] text-pixel-muted uppercase">
                              [{ann.category}]
                            </span>
                            <span className="text-[11px] text-cyan-400 font-mono">
                              AUDIENCE: {ann.targetAudience}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-sm text-pixel-cream">
                            {ann.title}
                          </h3>
                          <p className="text-xs text-pixel-gray-300 line-clamp-2 leading-relaxed">
                            {ann.content}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-pixel-muted font-mono pt-1">
                            <span>CHANNELS: {ann.channels}</span>
                            <span>•</span>
                            <span>{new Date(ann.createdAt).toLocaleTimeString("en-IN")} IST</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenDetail(ann)}
                          className="px-2.5 py-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream hover:border-pixel-orange-fiery hover:text-pixel-orange-fiery text-xs font-pixel self-end sm:self-center flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>INSPECT</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </PixelCard>

              {/* UPCOMING SCHEDULED BROADCASTS */}
              <PixelCard
                headerTitle="QUEUED SCHEDULED BROADCASTS"
                headerBadge={`${upcomingScheduled.length} QUEUED`}
              >
                {upcomingScheduled.length === 0 ? (
                  <div className="p-6 text-center space-y-1 text-pixel-muted text-xs">
                    <p className="font-display text-pixel-cream">NO SCHEDULED COMMUNICATIONS</p>
                    <p>No automated broadcasts are queued for future transmission.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-pixel-gray-800">
                    {upcomingScheduled.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 hover:bg-pixel-navy/30 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-[9px] text-cyan-400">
                              TRIGGER:{" "}
                              {item.scheduledFor
                                ? new Date(item.scheduledFor).toLocaleString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "PENDING"}
                            </span>
                            <PixelBadge variant="cyan" size="sm">
                              {item.targetAudience}
                            </PixelBadge>
                          </div>
                          <h4 className="font-display font-bold text-xs text-pixel-cream truncate max-w-md">
                            {item.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAnnouncementAction(item.id, "PUBLISH")}
                            className="px-2 py-1 bg-green-950/80 border border-green-700 text-green-300 text-[10px] font-pixel hover:bg-green-700 hover:text-white transition-colors"
                          >
                            DISPATCH NOW
                          </button>
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="p-1 text-pixel-muted hover:text-pixel-cream"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PixelCard>
            </div>

            {/* Right Column: Channel Telemetry & Quick Templates */}
            <div className="space-y-4">
              {/* Channel Delivery Matrix */}
              <PixelCard headerTitle="DELIVERY CHANNEL STATUS" headerBadge="MATRIX">
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    {/* IN-APP */}
                    <div className="bg-[#050914] p-2.5 border border-pixel-gray-800 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-pixel text-[10px] text-pixel-cream flex items-center gap-1.5">
                          <Megaphone className="w-3.5 h-3.5 text-pixel-orange-fiery" />
                          IN-APP BULLETIN
                        </span>
                        <span className="text-green-400 font-bold font-mono text-[10px]">
                          {channelStats.IN_APP?.delivered || 0} / {channelStats.IN_APP?.total || 0}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-pixel-navy overflow-hidden">
                        <div
                          className="h-full bg-pixel-green"
                          style={{
                            width: `${
                              channelStats.IN_APP?.total
                                ? Math.min(100, Math.round((channelStats.IN_APP.delivered / channelStats.IN_APP.total) * 100))
                                : 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div className="bg-[#050914] p-2.5 border border-pixel-gray-800 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-pixel text-[10px] text-pixel-cream flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-400" />
                          SMTP EMAIL RELAY
                        </span>
                        <span className="text-cyan-400 font-bold font-mono text-[10px]">
                          {channelStats.EMAIL?.delivered || 0} / {channelStats.EMAIL?.total || 0}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-pixel-navy overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{
                            width: `${
                              channelStats.EMAIL?.total
                                ? Math.min(100, Math.round((channelStats.EMAIL.delivered / channelStats.EMAIL.total) * 100))
                                : 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* SMS */}
                    <div className="bg-[#050914] p-2.5 border border-pixel-gray-800 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-pixel text-[10px] text-pixel-cream flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                          SMS GATEWAY
                        </span>
                        <span className="text-amber-400 font-bold font-mono text-[10px]">
                          {channelStats.SMS?.delivered || 0} / {channelStats.SMS?.total || 0}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-pixel-navy overflow-hidden">
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${
                              channelStats.SMS?.total
                                ? Math.min(100, Math.round((channelStats.SMS.delivered / channelStats.SMS.total) * 100))
                                : 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-pixel-muted font-sans italic">
                    Push notifications stand by for live match events and emergency weather notices.
                  </p>
                </div>
              </PixelCard>

              {/* QUICK MESSAGE TEMPLATES */}
              <PixelCard headerTitle="DISPATCH TEMPLATES" headerBadge="PRESETS">
                <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
                  {templates.slice(0, 4).map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-2.5 bg-[#050914] border border-pixel-gray-800 hover:border-pixel-orange-fiery/60 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <p className="font-display font-bold text-xs text-pixel-cream truncate">
                          {tpl.name}
                        </p>
                        <p className="text-[10px] text-pixel-muted truncate max-w-[180px]">
                          {tpl.subject}
                        </p>
                      </div>
                      <button
                        onClick={() => handleApplyTemplate(tpl)}
                        className="px-2 py-1 bg-pixel-navy border border-pixel-orange-fiery text-pixel-orange-bright text-[10px] font-pixel hover:bg-pixel-orange-fiery hover:text-black transition-colors whitespace-nowrap"
                      >
                        USE
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleTabSelect("templates")}
                    className="w-full text-center py-1.5 text-xs text-pixel-orange-bright hover:underline font-pixel"
                  >
                    VIEW ALL TEMPLATES ({templates.length}) →
                  </button>
                </div>
              </PixelCard>

              {/* AUDIT ACTIVITY FEED */}
              <PixelCard headerTitle="COMMUNICATION ACTIVITY" headerBadge="AUDIT">
                <div className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-pixel-muted text-center py-4">No recent activity logged.</p>
                  ) : (
                    recentActivity.slice(0, 6).map((log) => (
                      <div key={log.id} className="text-xs border-b border-pixel-gray-800/80 pb-2">
                        <div className="flex justify-between items-center text-[10px] text-pixel-muted">
                          <span className="font-pixel text-pixel-orange-bright">{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString("en-IN")}</span>
                        </div>
                        <p className="text-[11px] text-pixel-cream truncate mt-0.5">
                          {log.metadata?.title || log.actorEmail}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PixelCard>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS / DRAFTS / SCHEDULED / HISTORY TAB */}
      {(currentTab === "announcements" ||
        currentTab === "drafts" ||
        currentTab === "scheduled" ||
        currentTab === "history") &&
        !error && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-[#0a0e1a] border border-pixel-orange-fiery/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-pixel-orange-fiery" />
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-pixel-cream">
                    FILTER BROADCAST STREAM
                  </span>
                </div>
                {permissions.canCreate && (
                  <button
                    onClick={() => {
                      resetComposeForm();
                      setComposeModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>NEW BROADCAST</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  <option value="GENERAL">GENERAL</option>
                  <option value="TOURNAMENT">TOURNAMENT</option>
                  <option value="MATCH">MATCH</option>
                  <option value="REGISTRATION">REGISTRATION</option>
                  <option value="ACCOMMODATION">ACCOMMODATION</option>
                  <option value="TRANSPORT">TRANSPORT</option>
                  <option value="VENUE">VENUE</option>
                  <option value="VOLUNTEER">VOLUNTEER</option>
                  <option value="SAFETY">SAFETY</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL PRIORITIES</option>
                  <option value="LOW">LOW</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                </select>

                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value)}
                  className="bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL AUDIENCES</option>
                  <option value="PARTICIPANTS">PARTICIPANTS</option>
                  <option value="TEAMS">TEAM MANAGERS</option>
                  <option value="OFFICIALS">MATCH OFFICIALS</option>
                  <option value="VOLUNTEERS">VOLUNTEERS</option>
                  <option value="OPERATIONS_STAFF">OPERATIONS STAFF</option>
                </select>
              </div>
            </div>

            {/* List */}
            {listLoading ? (
              <div className="p-12 text-center text-pixel-muted font-pixel text-xs animate-pulse">
                RETRIEVING BROADCAST STREAM...
              </div>
            ) : announcements.length === 0 ? (
              <PixelCard headerTitle="ANNOUNCEMENTS STREAM">
                <div className="p-12 text-center space-y-2">
                  <Megaphone className="w-10 h-10 text-pixel-muted mx-auto opacity-50" />
                  <p className="font-display text-sm text-pixel-cream">NO ANNOUNCEMENTS FOUND</p>
                  <p className="text-xs text-pixel-muted">
                    No broadcasts match the selected filter criteria or query.
                  </p>
                </div>
              </PixelCard>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-[#0a0e1a] border border-pixel-gray-800 hover:border-pixel-orange-fiery/80 p-4 transition-all space-y-3 shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PixelBadge variant={getStatusBadgeVariant(ann.status)} size="sm">
                          {ann.status}
                        </PixelBadge>
                        <PixelBadge variant={getPriorityBadgeVariant(ann.priority)} size="sm">
                          {ann.priority}
                        </PixelBadge>
                        <span className="font-pixel text-[10px] text-cyan-400">
                          AUDIENCE: {ann.targetAudience}
                        </span>
                        <span className="text-[10px] text-pixel-muted font-mono">
                          [{ann.category}]
                        </span>
                        {ann.relatedResource && (
                          <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.5 border border-amber-800">
                            TARGET: {ann.relatedResource}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-pixel-muted font-mono">
                        {ann.publishedAt
                          ? `PUBLISHED: ${new Date(ann.publishedAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ann.scheduledFor
                          ? `SCHEDULED: ${new Date(ann.scheduledFor).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : `UPDATED: ${new Date(ann.updatedAt).toLocaleDateString("en-IN")}`}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-sm sm:text-base text-pixel-cream">
                        {ann.title}
                      </h3>
                      <p className="text-xs text-pixel-gray-300 mt-1 leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-pixel-gray-800/80">
                      <div className="flex items-center gap-4 text-[10px] text-pixel-muted font-mono">
                        <span>CHANNELS: {ann.channels}</span>
                        <span>•</span>
                        <span>DELIVERY: {ann.deliveryStatus}</span>
                        {ann.recipientCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{ann.recipientCount} RECIPIENTS</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ann.status === "DRAFT" && permissions.canPublish && (
                          <button
                            onClick={() => handleAnnouncementAction(ann.id, "PUBLISH")}
                            className="px-2.5 py-1 bg-green-950 border border-green-600 text-green-300 text-[10px] font-pixel hover:bg-green-700 hover:text-white transition-colors"
                          >
                            PUBLISH NOW
                          </button>
                        )}
                        {ann.status === "SCHEDULED" && (
                          <button
                            onClick={() => handleAnnouncementAction(ann.id, "CANCEL")}
                            className="px-2.5 py-1 bg-red-950 border border-red-700 text-red-300 text-[10px] font-pixel hover:bg-red-800 hover:text-white transition-colors"
                          >
                            CANCEL
                          </button>
                        )}
                        {ann.status === "PUBLISHED" && (
                          <button
                            onClick={() => handleAnnouncementAction(ann.id, "EXPIRE")}
                            className="px-2.5 py-1 bg-pixel-navy border border-pixel-gray-700 text-pixel-gray-400 text-[10px] font-pixel hover:border-pixel-orange-fiery hover:text-pixel-cream transition-colors"
                          >
                            MARK EXPIRED
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDetail(ann)}
                          className="px-3 py-1 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery text-pixel-orange-bright text-[10px] font-pixel hover:bg-pixel-orange-fiery hover:text-black transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>DETAILS</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* DELIVERY NOTIFICATIONS / LOGS TAB */}
      {currentTab === "notifications" && !error && (
        <div className="space-y-6">
          <PixelCard headerTitle="DELIVERY MONITORING & RETRY WORKSPACE" headerBadge="RELAY TELEMETRY">
            <div className="p-4 sm:p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-pixel-cream">
                  NOTIFICATION TRANSMISSION LOGS
                </h3>
                <p className="text-xs text-pixel-muted max-w-3xl">
                  Inspect outbound messages dispatched through In-App bulletins, SMTP mail servers, and carrier SMS
                  gateways. Track failures, timeout reasons, and trigger controlled retries.
                </p>
              </div>

              {deliveriesLoading ? (
                <div className="p-8 text-center text-pixel-muted font-pixel text-xs animate-pulse">
                  LOADING DELIVERY AUDIT LOGS...
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center text-pixel-muted text-xs">
                  <CheckCircle2 className="w-8 h-8 text-pixel-green mx-auto mb-2 opacity-70" />
                  <p className="font-display text-pixel-cream">NO FAILED OR PENDING DELIVERIES</p>
                  <p>All notification dispatch queues are clear.</p>
                </div>
              ) : (
                <div className="divide-y divide-pixel-gray-800 border border-pixel-gray-800">
                  {deliveries.map((del) => (
                    <div
                      key={del.id}
                      className="p-3.5 hover:bg-pixel-navy/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PixelBadge
                            variant={
                              del.status === "DELIVERED" || del.status === "SENT"
                                ? "green"
                                : del.status === "FAILED"
                                ? "red"
                                : "yellow"
                            }
                            size="sm"
                          >
                            {del.status}
                          </PixelBadge>
                          <span className="font-pixel text-[10px] text-cyan-400">{del.channel}</span>
                          <span className="text-pixel-muted text-[10px] font-mono">
                            TARGET: {del.recipient}
                          </span>
                        </div>
                        <p className="font-display font-bold text-pixel-cream">
                          {del.announcement?.title || "Tournament Bulletin"}
                        </p>
                        {del.errorMessage && (
                          <p className="text-[11px] text-red-400 font-mono bg-red-950/40 p-1.5 border border-red-900">
                            ERROR: {del.errorMessage}
                          </p>
                        )}
                        <p className="text-[10px] text-pixel-muted font-mono">
                          Attempts: {del.attemptCount} • Dispatched:{" "}
                          {del.sentAt ? new Date(del.sentAt).toLocaleTimeString("en-IN") : "Pending"}
                        </p>
                      </div>

                      {del.status === "FAILED" && permissions.canPublish && (
                        <button
                          onClick={() => handleRetryDelivery(del.id)}
                          className="px-3 py-1.5 bg-red-900 border border-red-500 text-red-100 text-xs font-pixel hover:bg-red-700 transition-colors self-end sm:self-center flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>RETRY BROADCAST</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PixelCard>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {currentTab === "templates" && !error && (
        <div className="space-y-6">
          <PixelCard headerTitle="TOURNAMENT COMMUNICATION TEMPLATES" headerBadge="PRESET DIRECTORY">
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-base text-pixel-cream">
                    STANDARD OPERATIONAL TEMPLATES
                  </h3>
                  <p className="text-xs text-pixel-muted">
                    Pre-configured message formats with standard tournament placeholders for rapid field dissemination.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-[#050914] border border-pixel-gray-800 p-4 space-y-3 hover:border-pixel-orange-fiery/60 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <PixelBadge variant={getPriorityBadgeVariant(tpl.priority)} size="sm">
                          {tpl.priority}
                        </PixelBadge>
                        <span className="font-pixel text-[10px] text-cyan-400">[{tpl.category}]</span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-pixel-cream">{tpl.name}</h4>
                      <p className="text-xs text-pixel-orange-bright font-mono">
                        SUBJECT: {tpl.subject}
                      </p>
                      <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed line-clamp-3 bg-pixel-black/50 p-2 border border-pixel-gray-800">
                        {tpl.bodyTemplate}
                      </p>
                      <div className="text-[10px] text-pixel-muted font-mono flex items-center gap-2">
                        <span>AUDIENCE: {tpl.audience}</span>
                        <span>•</span>
                        <span>CHANNELS: {tpl.channels}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="w-full mt-2 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>USE TEMPLATE IN COMPOSER</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </PixelCard>
        </div>
      )}

      {/* PROFILE TAB */}
      {currentTab === "profile" && !error && (
        <div className="max-w-2xl mx-auto space-y-6">
          <PixelCard headerTitle="OPERATOR COMMUNICATIONS PROFILE" headerBadge="LEVEL 03 CLEARANCE">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 border-b border-pixel-gray-800 pb-4">
                <div className="w-14 h-14 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center text-pixel-orange-fiery font-bold text-xl">
                  C
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-pixel-cream">
                    KLE Tech Arena Communications Controller
                  </h3>
                  <p className="text-xs text-pixel-orange-bright font-pixel">comm@szwbt2026.edu</p>
                  <p className="text-xs text-pixel-muted">Badge: BROADCAST HUD • Clearance: Level 03</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-pixel text-[11px] text-pixel-orange-bright">ASSIGNED RBAC CLEARANCES</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-[#050914] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ announcement:read
                  </div>
                  <div className="bg-[#050914] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ announcement:create
                  </div>
                  <div className="bg-[#050914] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ announcement:update
                  </div>
                  <div className="bg-[#050914] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ announcement:publish
                  </div>
                  <div className="bg-[#050914] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ reports:read
                  </div>
                  <div className="bg-[#050914] p-2 border border-pixel-gray-800 text-red-400">
                    ✗ finance:modify (RESTRICTED)
                  </div>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-300">
                <p className="font-bold">Operational Scope:</p>
                <p className="text-[11px] mt-0.5">
                  Authority to draft, schedule, and broadcast official championship bulletins across venue noticeboards,
                  university portal feeds, and athlete notifications.
                </p>
              </div>
            </div>
          </PixelCard>
        </div>
      )}

      {/* COMPOSE / EDIT ANNOUNCEMENT MODAL */}
      {composeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0a0e1a] border-2 border-pixel-orange-fiery shadow-2xl p-4 sm:p-6 my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-pixel-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-pixel-orange-fiery" />
                <h3 className="font-display font-bold text-sm sm:text-base text-pixel-cream uppercase">
                  {previewMode ? "PREVIEW BROADCAST" : "ANNOUNCEMENT & BROADCAST COMPOSER"}
                </h3>
              </div>
              <button
                onClick={() => setComposeModalOpen(false)}
                className="text-pixel-muted hover:text-pixel-cream p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewMode ? (
              /* PREVIEW SCREEN */
              <div className="space-y-4">
                <div className="p-3 bg-amber-950/40 border border-amber-500/80 text-amber-200 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    THIS IS A PREVIEW. Verify message accuracy and audience targeting before transmitting.
                  </span>
                </div>

                <div className="bg-[#050914] border-2 border-pixel-orange-fiery/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PixelBadge variant={getPriorityBadgeVariant(formPriority)} size="sm">
                      {formPriority}
                    </PixelBadge>
                    <PixelBadge variant="orange" size="sm">
                      {formCategory}
                    </PixelBadge>
                    <span className="text-xs font-mono text-cyan-400">AUDIENCE: {formAudience}</span>
                    <span className="text-xs font-mono text-pixel-muted">
                      CHANNELS: {formChannels.join(", ")}
                    </span>
                  </div>

                  <h2 className="font-display font-bold text-base text-pixel-cream">{formTitle}</h2>
                  <p className="text-xs text-pixel-gray-200 whitespace-pre-line leading-relaxed">
                    {formContent}
                  </p>

                  {formRelatedResource && (
                    <div className="text-xs text-amber-400 font-mono pt-2 border-t border-pixel-gray-800">
                      RESOURCE TARGET: {formRelatedResource}
                    </div>
                  )}

                  <div className="text-[10px] text-pixel-muted font-mono pt-2 border-t border-pixel-gray-800 flex justify-between">
                    <span>MODE: {formStatus}</span>
                    {formStatus === "SCHEDULED" && <span>TRIGGER: {formScheduledFor}</span>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-pixel-gray-800">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream text-xs font-pixel hover:border-pixel-orange-fiery"
                  >
                    BACK TO EDIT
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAnnouncement}
                    disabled={formSubmitting}
                    className="px-5 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] disabled:opacity-50"
                  >
                    {formSubmitting
                      ? "TRANSMITTING..."
                      : formStatus === "PUBLISHED"
                      ? "CONFIRM & TRANSMIT NOW"
                      : formStatus === "SCHEDULED"
                      ? "CONFIRM SCHEDULE"
                      : "CONFIRM SAVE DRAFT"}
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT FORM */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPreviewMode(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-pixel text-pixel-orange-bright uppercase mb-1">
                    ANNOUNCEMENT TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Schedule Update for Court 03 / Warmup Notice"
                    className="w-full bg-[#050914] text-xs text-pixel-cream p-2.5 border border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                      CATEGORY
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                    >
                      <option value="GENERAL">GENERAL</option>
                      <option value="TOURNAMENT">TOURNAMENT</option>
                      <option value="MATCH">MATCH</option>
                      <option value="REGISTRATION">REGISTRATION</option>
                      <option value="ACCOMMODATION">ACCOMMODATION</option>
                      <option value="TRANSPORT">TRANSPORT</option>
                      <option value="VENUE">VENUE</option>
                      <option value="VOLUNTEER">VOLUNTEER</option>
                      <option value="STAFF">STAFF</option>
                      <option value="SAFETY">SAFETY</option>
                      <option value="EMERGENCY">EMERGENCY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                      PRIORITY
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                    >
                      <option value="LOW">LOW</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                      TARGET AUDIENCE
                    </label>
                    <select
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value)}
                      className="w-full bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                    >
                      <option value="ALL">ALL (BROADCAST)</option>
                      <option value="PARTICIPANTS">ATHLETES / PARTICIPANTS</option>
                      <option value="TEAMS">TEAM MANAGERS</option>
                      <option value="OFFICIALS">MATCH OFFICIALS</option>
                      <option value="VOLUNTEERS">VOLUNTEERS</option>
                      <option value="OPERATIONS_STAFF">OPERATIONS STAFF</option>
                      <option value="REGISTRATION_STAFF">REGISTRATION DESK</option>
                      <option value="ACCOMMODATION_STAFF">ACCOMMODATION DESK</option>
                      <option value="TRANSPORT_STAFF">TRANSPORT STAFF</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Channels */}
                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    DELIVERY CHANNELS
                  </label>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.includes("IN_APP")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormChannels([...formChannels, "IN_APP"]);
                          } else if (formChannels.length > 1) {
                            setFormChannels(formChannels.filter((c) => c !== "IN_APP"));
                          }
                        }}
                      />
                      <span>IN-APP NOTICEBOARD</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.includes("EMAIL")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormChannels([...formChannels, "EMAIL"]);
                          } else {
                            setFormChannels(formChannels.filter((c) => c !== "EMAIL"));
                          }
                        }}
                      />
                      <span>SMTP EMAIL RELAY</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.includes("SMS")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormChannels([...formChannels, "SMS"]);
                          } else {
                            setFormChannels(formChannels.filter((c) => c !== "SMS"));
                          }
                        }}
                      />
                      <span>CARRIER SMS</span>
                    </label>
                  </div>
                </div>

                {/* Resource Targeting */}
                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    TARGET SPECIFIC RESOURCE (OPTIONAL)
                  </label>
                  <select
                    value={formRelatedResource}
                    onChange={(e) => setFormRelatedResource(e.target.value)}
                    className="w-full bg-[#050914] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                  >
                    <option value="">NO SPECIFIC RESOURCE (GENERAL)</option>
                    <optgroup label="COURTS">
                      {targetResources.courts.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="TEAMS">
                      {targetResources.teams.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="HOSTELS">
                      {targetResources.hostels.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="VENUE AREAS">
                      {targetResources.venues.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-[11px] font-pixel text-pixel-orange-bright uppercase mb-1">
                    MESSAGE CONTENT *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Type official broadcast instructions..."
                    className="w-full bg-[#050914] text-xs text-pixel-cream p-3 border border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none font-sans"
                  />
                </div>

                {/* Publish Mode: Now, Draft, Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#050914] p-3 border border-pixel-gray-800">
                  <div>
                    <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                      PUBLISHING MODE
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-[#0a0e1a] text-xs text-pixel-cream p-2 border border-pixel-gray-700"
                    >
                      <option value="PUBLISHED">PUBLISH IMMEDIATELY</option>
                      <option value="DRAFT">SAVE AS DRAFT</option>
                      <option value="SCHEDULED">SCHEDULE FOR LATER</option>
                    </select>
                  </div>

                  {formStatus === "SCHEDULED" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-pixel text-cyan-400 uppercase mb-1">
                        TRIGGER DATE & TIME (IST) *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formScheduledFor}
                        onChange={(e) => setFormScheduledFor(e.target.value)}
                        className="w-full bg-[#0a0e1a] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                      />
                    </div>
                  )}

                  {formStatus === "PUBLISHED" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                        EXPIRATION DATE & TIME (OPTIONAL)
                      </label>
                      <input
                        type="datetime-local"
                        value={formExpiresAt}
                        onChange={(e) => setFormExpiresAt(e.target.value)}
                        className="w-full bg-[#0a0e1a] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-pixel-gray-800">
                  <button
                    type="button"
                    onClick={() => setComposeModalOpen(false)}
                    className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream text-xs font-pixel hover:border-pixel-orange-fiery"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>PREVIEW BEFORE TRANSMIT</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EMERGENCY SAFETY BROADCAST MODAL */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-red-950/60 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0a0e1a] border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] p-4 sm:p-6 my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-red-900 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                <h3 className="font-display font-bold text-base text-red-300 uppercase tracking-wide">
                  EMERGENCY BROADCAST TRANSMISSION
                </h3>
              </div>
              <button
                onClick={() => setEmergencyModalOpen(false)}
                className="text-red-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-950/60 border border-red-700 text-red-200 text-xs">
              <p className="font-bold">MANDATORY EMERGENCY PROTOCOL:</p>
              <p className="text-[11px] mt-1 leading-relaxed">
                Emergency notices override normal notification throttle filters and broadcast across In-App,
                registered participant emails, and SMS alerts simultaneously.
              </p>
            </div>

            <form onSubmit={handleSendEmergency} className="space-y-4">
              <div>
                <label className="block text-[11px] font-pixel text-red-400 uppercase mb-1">
                  EMERGENCY TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={emergencyTitle}
                  onChange={(e) => setEmergencyTitle(e.target.value)}
                  placeholder="e.g. URGENT SAFETY ADVISORY: COURT 04 EVACUATION"
                  className="w-full bg-[#050914] text-xs text-red-100 p-2.5 border border-red-800 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                  BROADCAST TARGET AUDIENCE
                </label>
                <select
                  value={emergencyAudience}
                  onChange={(e) => setEmergencyAudience(e.target.value)}
                  className="w-full bg-[#050914] text-xs text-pixel-cream p-2 border border-red-800"
                >
                  <option value="ALL">ALL PARTICIPANTS & ARENA PERSONNEL</option>
                  <option value="TEAMS">TEAM MANAGERS & ATHLETES</option>
                  <option value="VOLUNTEERS">FIELD VOLUNTEERS</option>
                  <option value="OFFICIALS">MATCH OFFICIALS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-pixel text-red-400 uppercase mb-1">
                  EMERGENCY DIRECTIVE / INSTRUCTIONS *
                </label>
                <textarea
                  required
                  rows={4}
                  value={emergencyContent}
                  onChange={(e) => setEmergencyContent(e.target.value)}
                  placeholder="Provide precise safety instructions and assembly directions..."
                  className="w-full bg-[#050914] text-xs text-red-100 p-3 border border-red-800 focus:border-red-500 focus:outline-none font-sans"
                />
              </div>

              <div className="p-3 bg-[#050914] border border-red-700/60">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyConfirmed}
                    onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-red-300 font-sans leading-tight">
                    I solemnly confirm that this is a critical tournament safety bulletin and authorize
                    immediate championship-wide push transmission.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-red-900">
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(false)}
                  className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream text-xs font-pixel hover:border-red-500"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  disabled={emergencySubmitting || !emergencyConfirmed}
                  className="px-5 py-2 bg-red-600 text-white font-display font-bold text-xs uppercase hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(239,68,68,0.6)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{emergencySubmitting ? "BROADCASTING..." : "CONFIRM & TRANSMIT EMERGENCY"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT DETAIL MODAL */}
      {detailModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0a0e1a] border-2 border-pixel-orange-fiery shadow-2xl p-4 sm:p-6 my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-pixel-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-pixel-orange-fiery" />
                <h3 className="font-display font-bold text-sm sm:text-base text-pixel-cream uppercase">
                  BROADCAST TELEMETRY SPECIFICATION
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-pixel-muted hover:text-pixel-cream p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <PixelBadge variant={getStatusBadgeVariant(selectedAnnouncement.status)} size="sm">
                  {selectedAnnouncement.status}
                </PixelBadge>
                <PixelBadge variant={getPriorityBadgeVariant(selectedAnnouncement.priority)} size="sm">
                  {selectedAnnouncement.priority}
                </PixelBadge>
                <span className="font-pixel text-[10px] text-cyan-400">
                  CATEGORY: {selectedAnnouncement.category}
                </span>
                <span className="font-mono text-[10px] text-pixel-muted">
                  ID: {selectedAnnouncement.id}
                </span>
              </div>

              <div>
                <h2 className="font-display font-bold text-lg text-pixel-cream">
                  {selectedAnnouncement.title}
                </h2>
                <div className="mt-2 p-3 bg-[#050914] border border-pixel-gray-800 text-xs text-pixel-gray-200 whitespace-pre-line leading-relaxed">
                  {selectedAnnouncement.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#050914] p-3 border border-pixel-gray-800 font-mono">
                <div>
                  <span className="text-pixel-muted">TARGET AUDIENCE:</span>{" "}
                  <span className="text-pixel-cream font-bold">{selectedAnnouncement.targetAudience}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">CHANNELS:</span>{" "}
                  <span className="text-pixel-cream font-bold">{selectedAnnouncement.channels}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">DELIVERY STATUS:</span>{" "}
                  <span className="text-pixel-cream font-bold">{selectedAnnouncement.deliveryStatus}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">RECIPIENTS REACHED:</span>{" "}
                  <span className="text-pixel-cream font-bold">{selectedAnnouncement.recipientCount}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">CREATED BY:</span>{" "}
                  <span className="text-pixel-cream">{selectedAnnouncement.authorEmail}</span>
                </div>
                <div>
                  <span className="text-pixel-muted">TIMESTAMP:</span>{" "}
                  <span className="text-pixel-cream">
                    {new Date(selectedAnnouncement.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Delivery logs sub-table */}
              {selectedAnnouncement.deliveries && selectedAnnouncement.deliveries.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-pixel text-[10px] text-pixel-orange-bright uppercase">
                    CHANNEL DELIVERY STATUS
                  </h4>
                  <div className="divide-y divide-pixel-gray-800 border border-pixel-gray-800 text-xs">
                    {selectedAnnouncement.deliveries.map((del) => (
                      <div key={del.id} className="p-2 flex justify-between items-center">
                        <span className="font-mono text-cyan-400">{del.channel}</span>
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

              {/* Action Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-pixel-gray-800">
                <div className="flex items-center gap-2">
                  {selectedAnnouncement.status === "DRAFT" && permissions.canPublish && (
                    <button
                      onClick={() => handleAnnouncementAction(selectedAnnouncement.id, "PUBLISH")}
                      className="px-3 py-1.5 bg-green-950 border border-green-600 text-green-300 text-xs font-pixel hover:bg-green-700 hover:text-white transition-colors"
                    >
                      PUBLISH NOW
                    </button>
                  )}
                  {selectedAnnouncement.status === "SCHEDULED" && (
                    <button
                      onClick={() => handleAnnouncementAction(selectedAnnouncement.id, "CANCEL")}
                      className="px-3 py-1.5 bg-red-950 border border-red-700 text-red-300 text-xs font-pixel hover:bg-red-800 hover:text-white transition-colors"
                    >
                      CANCEL BROADCAST
                    </button>
                  )}
                  {selectedAnnouncement.status === "PUBLISHED" && (
                    <button
                      onClick={() => handleAnnouncementAction(selectedAnnouncement.id, "EXPIRE")}
                      className="px-3 py-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-muted text-xs font-pixel hover:text-pixel-cream"
                    >
                      EXPIRE NOTICE
                    </button>
                  )}
                  <button
                    onClick={() => handleAnnouncementAction(selectedAnnouncement.id, "DELETE")}
                    className="px-3 py-1.5 bg-red-950/40 border border-red-800 text-red-400 text-xs font-pixel hover:bg-red-900 hover:text-white transition-colors"
                  >
                    DELETE
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-1.5 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream text-xs font-pixel"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CommunicationsPortalShell>
  );
}
