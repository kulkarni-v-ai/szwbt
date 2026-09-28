"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Inbox,
  UserCheck,
  HelpCircle,
  AlertTriangle,
  BookOpen,
  History,
  User,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Headphones,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Send,
  MessageSquare,
  Lock,
  Eye,
  AlertCircle,
  ChevronRight,
  Share2,
  Building,
  Users,
  RotateCcw,
  Check,
  X,
  FileText,
} from "lucide-react";
import { SupportPortalShell } from "@/components/support/SupportPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  requesterEmail: string;
  requesterName?: string | null;
  requesterType: string;
  category: string;
  subcategory?: string | null;
  priority: string;
  status: string;
  assignedAgentEmail?: string | null;
  assignedAgentName?: string | null;
  relatedResourceType?: string | null;
  relatedResourceId?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  escalations?: Escalation[];
}

interface Message {
  id: string;
  ticketId: string;
  senderEmail: string;
  senderName: string;
  senderType: string;
  messageType: string; // "PUBLIC" or "INTERNAL_NOTE"
  content: string;
  createdAt: string;
}

interface Escalation {
  id: string;
  ticketId: string;
  targetDepartment: string;
  escalationReason: string;
  priority: string;
  escalatedBy: string;
  status: string;
  resolutionNotes?: string | null;
  createdAt: string;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  viewCount: number;
}

interface ActivityItem {
  id: string;
  action: string;
  actorEmail: string;
  resourceId?: string | null;
  metadata?: any;
  timestamp: string;
}

interface Agent {
  id: string;
  email: string;
  name: string;
  badge?: string | null;
}

export default function SupportDeskPage() {
  const [currentTab, setCurrentTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview stats & telemetry
  const [summary, setSummary] = useState({
    totalTickets: 0,
    openTickets: 0,
    unassignedTickets: 0,
    inProgressTickets: 0,
    waitingTickets: 0,
    escalatedTickets: 0,
    resolvedToday: 0,
    closedToday: 0,
  });
  const [permissions, setPermissions] = useState({
    canCreate: true,
    canUpdate: true,
    canAssign: true,
    canResolve: true,
    canClose: true,
    canEscalate: true,
    canComment: true,
  });
  const [priorityQueue, setPriorityQueue] = useState<Ticket[]>([]);
  const [myAssignedTickets, setMyAssignedTickets] = useState<Ticket[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [supportAgents, setSupportAgents] = useState<Agent[]>([]);

  // Queue tab list & filters
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Resource picker state
  const [targetResources, setTargetResources] = useState<{
    participants: Array<{ label: string; value: string; email: string; name: string }>;
    teams: Array<{ label: string; value: string }>;
    courts: Array<{ label: string; value: string }>;
    hostels: Array<{ label: string; value: string }>;
  }>({ participants: [], teams: [], courts: [], hostels: [] });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Active selected ticket
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketActivity, setTicketActivity] = useState<ActivityItem[]>([]);

  // Response composer inside detail modal
  const [replyContent, setReplyContent] = useState("");
  const [replyType, setReplyType] = useState<"PUBLIC" | "INTERNAL_NOTE">("PUBLIC");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Create Ticket form state
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRequesterEmail, setFormRequesterEmail] = useState("");
  const [formRequesterName, setFormRequesterName] = useState("");
  const [formRequesterType, setFormRequesterType] = useState("PARTICIPANT");
  const [formCategory, setFormCategory] = useState("GENERAL");
  const [formPriority, setFormPriority] = useState("NORMAL");
  const [formRelatedType, setFormRelatedType] = useState("");
  const [formRelatedId, setFormRelatedId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Escalation form state
  const [escalateDept, setEscalateDept] = useState("REGISTRATION");
  const [escalateReason, setEscalateReason] = useState("");
  const [escalatePriority, setEscalatePriority] = useState("HIGH");
  const [escalateSubmitting, setEscalateSubmitting] = useState(false);

  // Resolve form state
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  // Assign agent form state
  const [selectedAgentEmail, setSelectedAgentEmail] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Fetch overview telemetry
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/support");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.status === 403) {
          setError("403 Forbidden: Insufficient clearance for Support Command Center.");
          setLoading(false);
          return;
        }
        throw new Error(`Failed to load support telemetry: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setPermissions(data.permissions);
        setPriorityQueue(data.priorityQueue || []);
        setMyAssignedTickets(data.myAssignedTickets || []);
        setRecentActivity(data.recentActivity || []);
        setKnowledgeArticles(data.knowledgeArticles || []);
        setSupportAgents(data.supportAgents || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load support telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tickets list
  const fetchTickets = useCallback(async () => {
    try {
      setQueueLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (assignedFilter !== "ALL") params.append("assigned", assignedFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTickets(data.tickets || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQueueLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, assignedFilter, searchQuery]);

  // Fetch context resources
  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/support/resources");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTargetResources(data.resources || { participants: [], teams: [], courts: [], hostels: [] });
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
    if (
      currentTab === "queue" ||
      currentTab === "my_tickets" ||
      currentTab === "unassigned" ||
      currentTab === "escalations"
    ) {
      fetchTickets();
    }
  }, [currentTab, fetchTickets]);

  const handleTabSelect = (tab: string) => {
    setCurrentTab(tab);
    if (tab === "my_tickets") {
      setAssignedFilter("ME");
      setStatusFilter("ALL");
    } else if (tab === "unassigned") {
      setAssignedFilter("UNASSIGNED");
      setStatusFilter("OPEN");
    } else if (tab === "escalations") {
      setStatusFilter("ESCALATED");
      setAssignedFilter("ALL");
    } else if (tab === "queue") {
      setStatusFilter("ALL");
      setAssignedFilter("ALL");
    }
  };

  // Open ticket detail
  const handleOpenTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedTicket(data.ticket);
          setTicketActivity(data.activity || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit response or internal note
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedTicket) return;

    try {
      setReplySubmitting(true);
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent.trim(),
          messageType: replyType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to send response.");
        return;
      }

      setReplyContent("");
      // Refresh ticket details
      const refreshRes = await fetch(`/api/support/tickets/${selectedTicket.id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setSelectedTicket(refreshData.ticket);
        }
      }
      fetchOverview();
      fetchTickets();
    } catch (err: any) {
      alert(err.message || "Network error submitting message.");
    } finally {
      setReplySubmitting(false);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formDescription.trim()) return;

    try {
      setFormSubmitting(true);
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formSubject.trim(),
          description: formDescription.trim(),
          requesterEmail: formRequesterEmail.trim(),
          requesterName: formRequesterName.trim(),
          requesterType: formRequesterType,
          category: formCategory,
          priority: formPriority,
          relatedResourceType: formRelatedType || undefined,
          relatedResourceId: formRelatedId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to open support ticket.");
        return;
      }

      setCreateModalOpen(false);
      setFormSubject("");
      setFormDescription("");
      setFormRequesterEmail("");
      setFormRequesterName("");
      fetchOverview();
      fetchTickets();
    } catch (err: any) {
      alert(err.message || "Failed to create ticket.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Escalate ticket
  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !escalateReason.trim()) return;

    try {
      setEscalateSubmitting(true);
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDepartment: escalateDept,
          escalationReason: escalateReason.trim(),
          priority: escalatePriority,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to escalate ticket.");
        return;
      }

      setEscalateModalOpen(false);
      setEscalateReason("");
      handleOpenTicket(data.ticket);
      fetchOverview();
      fetchTickets();
    } catch (err: any) {
      alert(err.message || "Escalation error.");
    } finally {
      setEscalateSubmitting(false);
    }
  };

  // Resolve ticket
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !resolutionNotes.trim()) return;

    try {
      setResolveSubmitting(true);
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESOLVE",
          resolutionNotes: resolutionNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to resolve ticket.");
        return;
      }

      setResolveModalOpen(false);
      setResolutionNotes("");
      handleOpenTicket(data.ticket);
      fetchOverview();
      fetchTickets();
    } catch (err: any) {
      alert(err.message || "Resolution error.");
    } finally {
      setResolveSubmitting(false);
    }
  };

  // Assign ticket
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !selectedAgentEmail) return;

    try {
      setAssignSubmitting(true);
      const agent = supportAgents.find((a) => a.email === selectedAgentEmail);
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN",
          assignedAgentEmail: selectedAgentEmail,
          assignedAgentName: agent?.name || selectedAgentEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to assign ticket.");
        return;
      }

      setAssignModalOpen(false);
      handleOpenTicket(data.ticket);
      fetchOverview();
      fetchTickets();
    } catch (err: any) {
      alert(err.message || "Assignment error.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Reopen or Close ticket
  const handleTicketStatusAction = async (action: "REOPEN" | "CLOSE") => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || `Failed to perform ${action}.`);
        return;
      }
      handleOpenTicket(data.ticket);
      fetchOverview();
      fetchTickets();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "red";
      case "HIGH":
        return "orange";
      case "NORMAL":
        return "cyan";
      default:
        return "gray";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "OPEN":
        return "yellow";
      case "ASSIGNED":
        return "cyan";
      case "IN_PROGRESS":
        return "orange";
      case "WAITING_FOR_REQUESTER":
        return "dark";
      case "ESCALATED":
        return "red";
      case "RESOLVED":
        return "green";
      case "CLOSED":
        return "gray";
      default:
        return "dark";
    }
  };

  return (
    <SupportPortalShell
      currentTab={currentTab}
      onSelectTab={handleTabSelect}
      openCount={summary.openTickets}
      urgentCount={summary.escalatedTickets}
      unassignedCount={summary.unassignedTickets}
      myTicketsCount={myAssignedTickets.length}
      canCreate={permissions.canCreate}
      onRefresh={() => {
        fetchOverview();
        fetchTickets();
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenCreateTicket={() => setCreateModalOpen(true)}
    >
      {/* ERROR STATE */}
      {error && (
        <PixelCard headerTitle="HELP DESK SIGNAL LOST" headerBadge="ALERT" glow>
          <div className="p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto animate-bounce" />
            <h2 className="font-display text-lg text-pixel-cream">{error}</h2>
            <p className="text-xs text-pixel-gray-400">
              Support telemetry could not be loaded. Please verify operational role credentials.
            </p>
            <button
              onClick={() => {
                fetchOverview();
                fetchTickets();
              }}
              className="px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase"
            >
              RETRY CONNECTION
            </button>
          </div>
        </PixelCard>
      )}

      {/* OVERVIEW TAB */}
      {currentTab === "overview" && !error && (
        <div className="space-y-6">
          {/* COMMAND CENTER HERO */}
          <div className="bg-gradient-to-r from-[#0b0c10] via-[#1b0d2b] to-[#060608] border-2 border-pixel-orange-fiery/40 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-pixel-orange-fiery/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-wider">
                    CENTRALIZED HELP DESK WORKSPACE
                  </span>
                  <PixelBadge variant="orange" size="sm">
                    OPERATIONAL DESK
                  </PixelBadge>
                </div>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
                  SUPPORT / HELP DESK
                </h2>
                <p className="text-xs text-pixel-gray-300 font-pixel tracking-wide text-pixel-orange-bright/90">
                  "ASSIST PARTICIPANTS. RESOLVE ISSUES. KEEP THE TOURNAMENT MOVING."
                </p>
                <p className="text-xs text-pixel-muted max-w-2xl leading-relaxed pt-1">
                  Coordinating inquiries, credential discrepancies, accessibility accommodations, and rapid
                  cross-module escalations for athletes, managers, officials, and field volunteers.
                </p>
              </div>

              {/* Quick Actions Strip */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {permissions.canCreate && (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-2 active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>CREATE CASE</span>
                  </button>
                )}
                <button
                  onClick={() => handleTabSelect("escalations")}
                  className="px-4 py-2 bg-red-950 border border-red-500 text-red-200 font-display font-bold text-xs uppercase tracking-wider hover:bg-red-800 hover:text-white transition-all shadow-[0_0_12px_rgba(239,68,68,0.4)] flex items-center gap-2 active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>ESCALATIONS ({summary.escalatedTickets})</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI STATS MATRIX */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <button
              onClick={() => handleTabSelect("queue")}
              className="text-left bg-[#0b0c10] border border-pixel-orange-fiery/40 p-3 hover:border-pixel-orange-fiery transition-all"
            >
              <span className="font-pixel text-[9px] text-pixel-orange-bright uppercase block">OPEN CASES</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.openTickets}
              </p>
              <span className="text-[10px] text-pixel-muted">Active queue</span>
            </button>

            <button
              onClick={() => handleTabSelect("unassigned")}
              className="text-left bg-[#0b0c10] border border-yellow-500/40 p-3 hover:border-yellow-400 transition-all"
            >
              <span className="font-pixel text-[9px] text-yellow-400 uppercase block">UNASSIGNED</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.unassignedTickets}
              </p>
              <span className="text-[10px] text-pixel-muted">Awaiting responder</span>
            </button>

            <div className="bg-[#0b0c10] border border-cyan-500/40 p-3">
              <span className="font-pixel text-[9px] text-cyan-400 uppercase block">IN PROGRESS</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.inProgressTickets}
              </p>
              <span className="text-[10px] text-pixel-muted">Under investigation</span>
            </div>

            <div className="bg-[#0b0c10] border border-purple-500/40 p-3">
              <span className="font-pixel text-[9px] text-purple-400 uppercase block">WAITING USER</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.waitingTickets}
              </p>
              <span className="text-[10px] text-pixel-muted">Awaiting reply</span>
            </div>

            <button
              onClick={() => handleTabSelect("escalations")}
              className="text-left bg-[#0b0c10] border border-red-500/40 p-3 hover:border-red-400 transition-all"
            >
              <span className="font-pixel text-[9px] text-red-400 uppercase block">ESCALATED</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.escalatedTickets}
              </p>
              <span className="text-[10px] text-pixel-muted">Dept handoff</span>
            </button>

            <div className="bg-[#0b0c10] border border-green-500/40 p-3">
              <span className="font-pixel text-[9px] text-green-400 uppercase block">RESOLVED TODAY</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.resolvedToday}
              </p>
              <span className="text-[10px] text-pixel-muted">Concluded</span>
            </div>

            <div className="bg-[#0b0c10] border border-pixel-gray-700 p-3">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">CLOSED TODAY</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-pixel-cream mt-0.5">
                {summary.closedToday}
              </p>
              <span className="text-[10px] text-pixel-muted">Archived</span>
            </div>
          </div>

          {/* PRIORITY QUEUE & MY ASSIGNED TICKETS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Queue (Urgent & High) */}
            <PixelCard
              headerTitle="HIGH & URGENT PRIORITY CASES"
              headerBadge={`${priorityQueue.length} CRITICAL`}
              glow={priorityQueue.length > 0}
            >
              {priorityQueue.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-pixel-green mx-auto opacity-70" />
                  <p className="font-display text-sm text-pixel-cream">PRIORITY QUEUE CLEAR</p>
                  <p className="text-xs text-pixel-muted">No high or urgent cases currently require intervention.</p>
                </div>
              ) : (
                <div className="divide-y divide-pixel-gray-800">
                  {priorityQueue.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3.5 hover:bg-[#1b0d2b]/40 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-pixel-amber font-bold">{ticket.ticketNumber}</span>
                          <PixelBadge variant={getPriorityBadgeVariant(ticket.priority)} size="sm">
                            {ticket.priority}
                          </PixelBadge>
                          <PixelBadge variant={getStatusBadgeVariant(ticket.status)} size="sm">
                            {ticket.status}
                          </PixelBadge>
                          <span className="text-[10px] text-cyan-400 font-mono">[{ticket.category}]</span>
                        </div>
                        <h4 className="font-display font-bold text-pixel-cream">{ticket.subject}</h4>
                        <p className="text-[11px] text-pixel-muted font-sans line-clamp-1">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-pixel-gray-400 font-mono pt-0.5">
                          <span>Requester: {ticket.requesterName || ticket.requesterEmail}</span>
                          <span>•</span>
                          <span>
                            Agent: {ticket.assignedAgentName || "UNASSIGNED"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenTicket(ticket)}
                        className="px-2.5 py-1.5 bg-[#0b0c10] border border-pixel-orange-fiery/60 text-pixel-orange-bright hover:bg-pixel-orange-fiery hover:text-black text-xs font-pixel self-center whitespace-nowrap transition-colors"
                      >
                        OPEN CASE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </PixelCard>

            {/* My Assigned Queue */}
            <PixelCard
              headerTitle="MY ASSIGNED TICKETS"
              headerBadge={`${myAssignedTickets.length} ACTIVE`}
            >
              {myAssignedTickets.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <UserCheck className="w-8 h-8 text-cyan-400 mx-auto opacity-70" />
                  <p className="font-display text-sm text-pixel-cream">NO CASES CURRENTLY ASSIGNED</p>
                  <p className="text-xs text-pixel-muted">
                    Pick an open ticket from the Unassigned Pool or Ticket Queue to begin resolution.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-pixel-gray-800">
                  {myAssignedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3.5 hover:bg-[#1b0d2b]/40 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold">{ticket.ticketNumber}</span>
                          <PixelBadge variant={getStatusBadgeVariant(ticket.status)} size="sm">
                            {ticket.status}
                          </PixelBadge>
                          <PixelBadge variant={getPriorityBadgeVariant(ticket.priority)} size="sm">
                            {ticket.priority}
                          </PixelBadge>
                          <span className="text-[10px] text-pixel-muted font-mono">[{ticket.category}]</span>
                        </div>
                        <h4 className="font-display font-bold text-pixel-cream">{ticket.subject}</h4>
                        <div className="text-[10px] text-pixel-muted font-mono">
                          Requester: {ticket.requesterName || ticket.requesterEmail} • Updated:{" "}
                          {new Date(ticket.updatedAt).toLocaleTimeString("en-IN")}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenTicket(ticket)}
                        className="px-2.5 py-1.5 bg-[#0b0c10] border border-cyan-500/60 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-pixel self-center whitespace-nowrap transition-colors"
                      >
                        RESPOND
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </PixelCard>
          </div>

          {/* KNOWLEDGE CONTENT & RECENT ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Knowledge Base Fast References (2 cols) */}
            <div className="lg:col-span-2">
              <PixelCard headerTitle="APPROVED KNOWLEDGE DIRECTORY" headerBadge="FAST ANSWERS">
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {knowledgeArticles.map((art) => (
                      <div
                        key={art.id}
                        className="bg-[#060608] border border-pixel-gray-800 p-3 space-y-1.5 hover:border-pixel-orange-fiery/60 transition-colors"
                      >
                        <div className="flex justify-between items-center text-[10px] text-pixel-muted">
                          <span className="font-pixel text-pixel-orange-bright">[{art.category}]</span>
                          <span className="font-mono">{art.viewCount} views</span>
                        </div>
                        <h4 className="font-display font-bold text-xs text-pixel-cream">{art.title}</h4>
                        <p className="text-[11px] text-pixel-gray-300 line-clamp-3 leading-relaxed">
                          {art.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PixelCard>
            </div>

            {/* Audit Feed */}
            <div>
              <PixelCard headerTitle="SUPPORT DESK ACTIVITY" headerBadge="AUDIT FEED">
                <div className="p-3 space-y-2.5 max-h-[340px] overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-pixel-muted text-center py-4">No recent activity recorded.</p>
                  ) : (
                    recentActivity.map((log) => (
                      <div key={log.id} className="text-xs border-b border-pixel-gray-800/80 pb-2">
                        <div className="flex justify-between items-center text-[10px] text-pixel-muted font-mono">
                          <span className="font-pixel text-pixel-orange-bright">{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString("en-IN")}</span>
                        </div>
                        <p className="text-[11px] text-pixel-cream truncate mt-0.5">
                          {log.metadata?.ticketNumber ? `${log.metadata.ticketNumber}: ` : ""}
                          {log.metadata?.subject || log.actorEmail}
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

      {/* QUEUE / MY TICKETS / UNASSIGNED / ESCALATIONS TAB */}
      {(currentTab === "queue" ||
        currentTab === "my_tickets" ||
        currentTab === "unassigned" ||
        currentTab === "escalations") &&
        !error && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-[#0b0c10] border border-pixel-orange-fiery/40 p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-pixel-orange-fiery" />
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-pixel-cream">
                    FILTER SUPPORT CASES
                  </span>
                </div>
                {permissions.canCreate && (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-3 py-1.5 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>CREATE NEW CASE</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="WAITING_FOR_REQUESTER">WAITING FOR REQUESTER</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL PRIORITIES</option>
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="LOW">LOW</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  <option value="REGISTRATION">REGISTRATION</option>
                  <option value="DOCUMENTS">DOCUMENTS</option>
                  <option value="ACCOMMODATION">ACCOMMODATION</option>
                  <option value="TRANSPORT">TRANSPORT</option>
                  <option value="MATCHES">MATCHES</option>
                  <option value="RESULTS">RESULTS</option>
                  <option value="TEAM">TEAM</option>
                  <option value="PARTICIPANT">PARTICIPANT</option>
                  <option value="PAYMENT">PAYMENT (REG/ACCOMM ONLY)</option>
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="GENERAL">GENERAL</option>
                </select>

                <select
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value)}
                  className="bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                >
                  <option value="ALL">ALL ASSIGNEES</option>
                  <option value="ME">ASSIGNED TO ME</option>
                  <option value="UNASSIGNED">UNASSIGNED</option>
                  {supportAgents.map((ag) => (
                    <option key={ag.id} value={ag.email}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            {queueLoading ? (
              <div className="p-12 text-center text-pixel-muted font-pixel text-xs animate-pulse">
                RETRIEVING SUPPORT QUEUE TELEMETRY...
              </div>
            ) : tickets.length === 0 ? (
              <PixelCard headerTitle="DISPATCH QUEUE">
                <div className="p-12 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-pixel-muted mx-auto opacity-50" />
                  <p className="font-display text-sm text-pixel-cream">NO TICKETS MATCHING FILTER</p>
                  <p className="text-xs text-pixel-muted">
                    No active support requests found under the specified criteria.
                  </p>
                </div>
              </PixelCard>
            ) : (
              <div className="space-y-3">
                {tickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="bg-[#0b0c10] border border-pixel-gray-800 hover:border-pixel-orange-fiery/80 p-4 transition-all space-y-3 shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-pixel-orange-bright font-bold text-xs">
                          {tkt.ticketNumber}
                        </span>
                        <PixelBadge variant={getStatusBadgeVariant(tkt.status)} size="sm">
                          {tkt.status}
                        </PixelBadge>
                        <PixelBadge variant={getPriorityBadgeVariant(tkt.priority)} size="sm">
                          {tkt.priority}
                        </PixelBadge>
                        <span className="text-[10px] text-cyan-400 font-mono">[{tkt.category}]</span>
                        {tkt.relatedResourceId && (
                          <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.5 border border-amber-800">
                            REF: {tkt.relatedResourceId}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-pixel-muted font-mono">
                        {new Date(tkt.createdAt).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-sm sm:text-base text-pixel-cream">
                        {tkt.subject}
                      </h3>
                      <p className="text-xs text-pixel-gray-300 mt-1 leading-relaxed line-clamp-2">
                        {tkt.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-pixel-gray-800">
                      <div className="flex items-center gap-3 text-[10px] text-pixel-muted font-mono">
                        <span>Requester: {tkt.requesterName || tkt.requesterEmail} ({tkt.requesterType})</span>
                        <span>•</span>
                        <span>
                          Agent:{" "}
                          <strong className="text-pixel-cream">
                            {tkt.assignedAgentName || "UNASSIGNED"}
                          </strong>
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenTicket(tkt)}
                        className="px-3 py-1.5 bg-pixel-navy border border-pixel-orange-fiery text-pixel-orange-bright text-xs font-pixel hover:bg-pixel-orange-fiery hover:text-black transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>OPEN CASE WORKSPACE</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* KNOWLEDGE BASE TAB */}
      {currentTab === "knowledge" && !error && (
        <div className="space-y-6">
          <PixelCard headerTitle="TOURNAMENT HELP DIRECTORY" headerBadge="VERIFIED PROTOCOLS">
            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-base text-pixel-cream">
                  OFFICIAL KNOWLEDGE BASE ARTICLES
                </h3>
                <p className="text-xs text-pixel-muted">
                  Standard operating procedures and approved tournament answers for the South Zone Championship.
                </p>
              </div>

              <div className="space-y-3">
                {knowledgeArticles.map((art) => (
                  <div
                    key={art.id}
                    className="bg-[#060608] border border-pixel-gray-800 p-4 space-y-2 hover:border-pixel-orange-fiery/60 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-pixel text-[10px] text-pixel-orange-bright">[{art.category}]</span>
                      <span className="font-mono text-xs text-pixel-muted">{art.viewCount} views</span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-pixel-cream">{art.title}</h4>
                    <p className="text-xs text-pixel-gray-300 leading-relaxed font-sans whitespace-pre-line">
                      {art.content}
                    </p>
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
          <PixelCard headerTitle="SUPPORT DESK SPECIALIST CLEARANCE" headerBadge="LEVEL 02">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 border-b border-pixel-gray-800 pb-4">
                <div className="w-14 h-14 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center text-pixel-orange-fiery font-bold text-xl">
                  S
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-pixel-cream">
                    KLE Tech Arena Support Desk Lead
                  </h3>
                  <p className="text-xs text-pixel-orange-bright font-pixel">support@szwbt2026.edu</p>
                  <p className="text-xs text-pixel-muted">Badge: SUPPORT COMMAND • Clearance: Level 02</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-pixel text-[11px] text-pixel-orange-bright">AUTHORIZED ACTIONS</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ support:read
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ support:create
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ support:assign
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ support:resolve
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ support:escalate
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-green-400">
                    ✓ support:comment
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-red-400">
                    ✗ finance:modify (RESTRICTED)
                  </div>
                  <div className="bg-[#060608] p-2 border border-pixel-gray-800 text-red-400">
                    ✗ scoring:official (RESTRICTED)
                  </div>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-300">
                <p className="font-bold">Privacy & Scoping Notice:</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  Support staff have access to participant and team verification records for resolution purposes,
                  but are strictly restricted from private documents, banking ledgers, and match scoring.
                </p>
              </div>
            </div>
          </PixelCard>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0b0c10] border-2 border-pixel-orange-fiery shadow-2xl p-4 sm:p-6 my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-pixel-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-pixel-orange-fiery" />
                <h3 className="font-display font-bold text-sm sm:text-base text-pixel-cream uppercase">
                  OPEN SUPPORT CASE
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-pixel-muted hover:text-pixel-cream p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[11px] font-pixel text-pixel-orange-bright uppercase mb-1">
                  CASE SUBJECT *
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. Accreditation Name Correction or Ground Floor Room Request"
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-2.5 border border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    CATEGORY *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                  >
                    <option value="REGISTRATION">REGISTRATION</option>
                    <option value="DOCUMENTS">DOCUMENTS</option>
                    <option value="ACCOMMODATION">ACCOMMODATION</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="MATCHES">MATCHES</option>
                    <option value="RESULTS">RESULTS</option>
                    <option value="TEAM">TEAM</option>
                    <option value="PARTICIPANT">PARTICIPANT</option>
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    PRIORITY
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    REQUESTER TYPE
                  </label>
                  <select
                    value={formRequesterType}
                    onChange={(e) => setFormRequesterType(e.target.value)}
                    className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                  >
                    <option value="PARTICIPANT">ATHLETE / PARTICIPANT</option>
                    <option value="TEAM_MANAGER">TEAM MANAGER</option>
                    <option value="VOLUNTEER">VOLUNTEER</option>
                    <option value="OFFICIAL">MATCH OFFICIAL</option>
                    <option value="STAFF">TOURNAMENT STAFF</option>
                  </select>
                </div>
              </div>

              {/* Requester Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    REQUESTER EMAIL *
                  </label>
                  <input
                    type="email"
                    required
                    value={formRequesterEmail}
                    onChange={(e) => setFormRequesterEmail(e.target.value)}
                    placeholder="e.g. player@szwbt2026.edu"
                    className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                    REQUESTER NAME
                  </label>
                  <input
                    type="text"
                    value={formRequesterName}
                    onChange={(e) => setFormRequesterName(e.target.value)}
                    placeholder="e.g. Full Name"
                    className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700 focus:border-pixel-orange-fiery"
                  />
                </div>
              </div>

              {/* Related Resource */}
              <div>
                <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                  LINK CONTEXTUAL TOURNAMENT RESOURCE (OPTIONAL)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={formRelatedType}
                    onChange={(e) => setFormRelatedType(e.target.value)}
                    className="bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700"
                  >
                    <option value="">NO RESOURCE LINK</option>
                    <option value="PARTICIPANT">ATHLETE</option>
                    <option value="TEAM">TEAM</option>
                    <option value="ACCOMMODATION">HOSTEL</option>
                    <option value="MATCH">COURT</option>
                  </select>

                  <select
                    value={formRelatedId}
                    onChange={(e) => setFormRelatedId(e.target.value)}
                    className="bg-[#060608] text-xs text-pixel-cream p-2 border border-pixel-gray-700"
                  >
                    <option value="">SELECT REFERENCE</option>
                    {formRelatedType === "PARTICIPANT" &&
                      targetResources.participants.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    {formRelatedType === "TEAM" &&
                      targetResources.teams.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    {formRelatedType === "ACCOMMODATION" &&
                      targetResources.hostels.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    {formRelatedType === "MATCH" &&
                      targetResources.courts.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Case Description */}
              <div>
                <label className="block text-[11px] font-pixel text-pixel-orange-bright uppercase mb-1">
                  CASE INQUIRY & DESCRIPTION *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail the issue reported by the requester..."
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-3 border border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-pixel-cream text-xs font-pixel"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] disabled:opacity-50"
                >
                  {formSubmitting ? "RECORDING..." : "DISPATCH TICKET"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET DETAIL WORKSPACE MODAL */}
      {detailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-[#0b0c10] border-2 border-pixel-orange-fiery shadow-2xl p-4 sm:p-6 my-6 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-pixel-gray-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-pixel-orange-fiery" />
                <h3 className="font-display font-bold text-sm sm:text-base text-pixel-cream uppercase">
                  CASE WORKSPACE // {selectedTicket.ticketNumber}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-pixel-muted hover:text-pixel-cream p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
              {/* Left / Main: Subject, Description, Timeline, Reply composer (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#060608] border border-pixel-gray-800 p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <PixelBadge variant={getStatusBadgeVariant(selectedTicket.status)} size="sm">
                      {selectedTicket.status}
                    </PixelBadge>
                    <PixelBadge variant={getPriorityBadgeVariant(selectedTicket.priority)} size="sm">
                      {selectedTicket.priority}
                    </PixelBadge>
                    <span className="font-pixel text-[10px] text-cyan-400">[{selectedTicket.category}]</span>
                    {selectedTicket.relatedResourceId && (
                      <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.5 border border-amber-800">
                        LINKED RESOURCE: {selectedTicket.relatedResourceId}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-pixel-cream">
                    {selectedTicket.subject}
                  </h2>
                  <p className="text-xs text-pixel-gray-200 leading-relaxed font-sans whitespace-pre-line bg-[#0b0c10] p-3 border border-pixel-gray-800">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Escalation Alert Banner if escalated */}
                {selectedTicket.escalations && selectedTicket.escalations.length > 0 && (
                  <div className="bg-red-950/50 border border-red-500/80 p-3 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-red-300 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>ESCALATED TO {selectedTicket.escalations[0].targetDepartment}</span>
                    </div>
                    <p className="text-[11px] text-red-200">
                      Reason: {selectedTicket.escalations[0].escalationReason}
                    </p>
                  </div>
                )}

                {/* Resolution Banner if resolved */}
                {selectedTicket.resolutionNotes && (
                  <div className="bg-green-950/50 border border-green-500/80 p-3 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-green-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span>CASE RESOLUTION RECORD</span>
                    </div>
                    <p className="text-[11px] text-green-200 font-sans">
                      {selectedTicket.resolutionNotes}
                    </p>
                  </div>
                )}

                {/* Chronological Conversation Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-wider">
                      CONVERSATION TIMELINE & AUDIT LOG
                    </span>
                    <span className="text-[10px] text-pixel-muted font-mono">
                      {selectedTicket.messages?.length || 0} entries
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {selectedTicket.messages?.map((msg) => {
                      const isInternal = msg.messageType === "INTERNAL_NOTE";
                      const isAgent = msg.senderType === "SUPPORT_AGENT";

                      return (
                        <div
                          key={msg.id}
                          className={`p-3 border text-xs space-y-1 ${
                            isInternal
                              ? "bg-amber-950/30 border-amber-600/60 text-amber-200"
                              : isAgent
                              ? "bg-[#1b0d2b]/40 border-purple-800 text-pixel-cream"
                              : "bg-[#060608] border-pixel-gray-800 text-pixel-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-1.5 font-bold">
                              {isInternal ? (
                                <>
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span className="text-amber-400 font-pixel">INTERNAL NOTE (STAFF ONLY)</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-pixel text-pixel-orange-bright">
                                    {msg.senderName}
                                  </span>
                                  <span className="text-pixel-muted">({msg.senderType})</span>
                                </>
                              )}
                            </div>
                            <span className="text-pixel-muted font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString("en-IN")} IST
                            </span>
                          </div>
                          <p className="font-sans leading-relaxed whitespace-pre-line text-[11px]">
                            {msg.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reply Composer */}
                {selectedTicket.status !== "CLOSED" && (
                  <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-pixel-gray-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-pixel text-[10px] text-pixel-cream">ADD CASE RESPONSE</span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="replyType"
                            checked={replyType === "PUBLIC"}
                            onChange={() => setReplyType("PUBLIC")}
                          />
                          <span>PUBLIC REPLY</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-amber-400">
                          <input
                            type="radio"
                            name="replyType"
                            checked={replyType === "INTERNAL_NOTE"}
                            onChange={() => setReplyType("INTERNAL_NOTE")}
                          />
                          <span>STAFF NOTE (INTERNAL)</span>
                        </label>
                      </div>
                    </div>

                    <textarea
                      required
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={
                        replyType === "INTERNAL_NOTE"
                          ? "Write private staff note (hidden from athlete/manager)..."
                          : "Type reply to requester..."
                      }
                      className={`w-full text-xs p-2.5 border focus:outline-none font-sans ${
                        replyType === "INTERNAL_NOTE"
                          ? "bg-amber-950/20 border-amber-800 text-amber-100 placeholder:text-amber-600 focus:border-amber-500"
                          : "bg-[#060608] border-pixel-gray-700 text-pixel-cream placeholder:text-pixel-gray-500 focus:border-pixel-orange-fiery"
                      }`}
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={replySubmitting || !replyContent.trim()}
                        className="px-4 py-1.5 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{replySubmitting ? "POSTING..." : "POST UPDATE"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column: Requester metadata, Assignment, Actions */}
              <div className="space-y-4">
                {/* Requester Info */}
                <div className="bg-[#060608] border border-pixel-gray-800 p-3 space-y-2 text-xs">
                  <h4 className="font-pixel text-[10px] text-pixel-orange-bright uppercase">
                    REQUESTER METADATA
                  </h4>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div>
                      <span className="text-pixel-muted">NAME:</span>{" "}
                      <span className="text-pixel-cream font-bold">
                        {selectedTicket.requesterName || "Athlete"}
                      </span>
                    </div>
                    <div>
                      <span className="text-pixel-muted">EMAIL:</span>{" "}
                      <span className="text-pixel-cream truncate block">{selectedTicket.requesterEmail}</span>
                    </div>
                    <div>
                      <span className="text-pixel-muted">ROLE:</span>{" "}
                      <span className="text-cyan-400">{selectedTicket.requesterType}</span>
                    </div>
                    <div>
                      <span className="text-pixel-muted">CREATED:</span>{" "}
                      <span className="text-pixel-cream">
                        {new Date(selectedTicket.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assignment Info */}
                <div className="bg-[#060608] border border-pixel-gray-800 p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="font-pixel text-[10px] text-cyan-400 uppercase">RESPONDER ASSIGNMENT</h4>
                    <button
                      onClick={() => {
                        setSelectedAgentEmail(selectedTicket.assignedAgentEmail || "");
                        setAssignModalOpen(true);
                      }}
                      className="text-[10px] text-pixel-orange-bright hover:underline font-pixel"
                    >
                      {selectedTicket.assignedAgentEmail ? "REASSIGN" : "ASSIGN"}
                    </button>
                  </div>
                  <div className="font-mono text-[11px]">
                    <span className="text-pixel-muted">AGENT:</span>{" "}
                    <span className="text-pixel-cream font-bold">
                      {selectedTicket.assignedAgentName || "UNASSIGNED"}
                    </span>
                  </div>
                </div>

                {/* Case Actions Palette */}
                <div className="bg-[#060608] border border-pixel-gray-800 p-3 space-y-2 text-xs">
                  <h4 className="font-pixel text-[10px] text-pixel-cream uppercase">CASE ACTIONS</h4>
                  <div className="space-y-2">
                    {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                      <button
                        onClick={() => {
                          setResolutionNotes("");
                          setResolveModalOpen(true);
                        }}
                        className="w-full py-2 bg-green-950 border border-green-600 text-green-300 font-display font-bold text-xs uppercase hover:bg-green-700 hover:text-white transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>RESOLVE CASE</span>
                      </button>
                    )}

                    {selectedTicket.status !== "ESCALATED" && selectedTicket.status !== "CLOSED" && (
                      <button
                        onClick={() => {
                          setEscalateReason("");
                          setEscalateModalOpen(true);
                        }}
                        className="w-full py-2 bg-red-950 border border-red-700 text-red-300 font-display font-bold text-xs uppercase hover:bg-red-800 hover:text-white transition-all flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ESCALATE TO DEPARTMENT</span>
                      </button>
                    )}

                    {selectedTicket.status === "RESOLVED" && (
                      <>
                        <button
                          onClick={() => handleTicketStatusAction("REOPEN")}
                          className="w-full py-2 bg-amber-950 border border-amber-600 text-amber-300 font-display font-bold text-xs uppercase hover:bg-amber-700 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>REOPEN CASE</span>
                        </button>
                        <button
                          onClick={() => handleTicketStatusAction("CLOSE")}
                          className="w-full py-2 bg-[#0b0c10] border border-pixel-gray-700 text-pixel-muted font-display font-bold text-xs uppercase hover:text-pixel-cream transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ARCHIVE & CLOSE</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Audit Log Snippet */}
                {ticketActivity.length > 0 && (
                  <div className="bg-[#060608] border border-pixel-gray-800 p-3 space-y-1.5 text-xs">
                    <h4 className="font-pixel text-[10px] text-pixel-muted uppercase">AUDIT TRAIL</h4>
                    <div className="space-y-1 font-mono text-[10px]">
                      {ticketActivity.slice(0, 4).map((act) => (
                        <div key={act.id} className="flex justify-between text-pixel-muted">
                          <span className="text-pixel-orange-bright">{act.action}</span>
                          <span>{new Date(act.timestamp).toLocaleTimeString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE MODAL */}
      {escalateModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0b0c10] border-2 border-red-500 shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-red-900 pb-2">
              <h3 className="font-display font-bold text-sm text-red-300 uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>ESCALATE CASE TO DEPARTMENT</span>
              </h3>
              <button onClick={() => setEscalateModalOpen(false)} className="text-pixel-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEscalate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-pixel text-pixel-cream uppercase mb-1">
                  TARGET DEPARTMENT *
                </label>
                <select
                  value={escalateDept}
                  onChange={(e) => setEscalateDept(e.target.value)}
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-red-800"
                >
                  <option value="REGISTRATION">REGISTRATION & ACCREDITATION</option>
                  <option value="ACCOMMODATION">HOSTEL & ACCOMMODATION</option>
                  <option value="TRANSPORT">UNIVERSITY TRANSPORT FLEET</option>
                  <option value="FINANCE">FINANCE & TREASURY</option>
                  <option value="MATCH_OPERATIONS">MATCH & COURT OPERATIONS</option>
                  <option value="TOURNAMENT_ADMIN">TOURNAMENT DIRECTORS</option>
                  <option value="SYSTEM_ADMIN">INFRASTRUCTURE ENGINEERING</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-pixel text-pixel-cream uppercase mb-1">
                  ESCALATION PRIORITY
                </label>
                <select
                  value={escalatePriority}
                  onChange={(e) => setEscalatePriority(e.target.value)}
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-2 border border-red-800"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-pixel text-pixel-cream uppercase mb-1">
                  ESCALATION JUSTIFICATION *
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Explain why central department intervention is required..."
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-2.5 border border-red-800 focus:outline-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-red-950">
                <button
                  type="button"
                  onClick={() => setEscalateModalOpen(false)}
                  className="px-3 py-1.5 bg-pixel-navy text-xs font-pixel"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={escalateSubmitting}
                  className="px-4 py-1.5 bg-red-600 text-white font-display font-bold text-xs uppercase hover:bg-red-500"
                >
                  {escalateSubmitting ? "ROUTING..." : "DISPATCH ESCALATION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {resolveModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0b0c10] border-2 border-green-500 shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-green-900 pb-2">
              <h3 className="font-display font-bold text-sm text-green-300 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>RESOLVE CASE</span>
              </h3>
              <button onClick={() => setResolveModalOpen(false)} className="text-pixel-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="block text-[10px] font-pixel text-pixel-cream uppercase mb-1">
                  RESOLUTION SUMMARY *
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Summarize the action taken to resolve this participant/team issue..."
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-2.5 border border-green-800 focus:outline-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-green-950">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-3 py-1.5 bg-pixel-navy text-xs font-pixel"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={resolveSubmitting}
                  className="px-4 py-1.5 bg-green-600 text-black font-display font-bold text-xs uppercase hover:bg-green-500"
                >
                  {resolveSubmitting ? "RECORDING..." : "CONFIRM RESOLUTION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {assignModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0b0c10] border-2 border-pixel-orange-fiery shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-pixel-gray-800 pb-2">
              <h3 className="font-display font-bold text-sm text-pixel-cream uppercase flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-pixel-orange-fiery" />
                <span>ASSIGN RESPONDER</span>
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-pixel-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-[10px] font-pixel text-pixel-muted uppercase mb-1">
                  AUTHORIZED SUPPORT RESPONDER *
                </label>
                <select
                  required
                  value={selectedAgentEmail}
                  onChange={(e) => setSelectedAgentEmail(e.target.value)}
                  className="w-full bg-[#060608] text-xs text-pixel-cream p-2.5 border border-pixel-gray-700"
                >
                  <option value="">SELECT AGENT</option>
                  {supportAgents.map((ag) => (
                    <option key={ag.id} value={ag.email}>
                      {ag.name} ({ag.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-3 py-1.5 bg-pixel-navy text-xs font-pixel"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting || !selectedAgentEmail}
                  className="px-4 py-1.5 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase"
                >
                  {assignSubmitting ? "ASSIGNING..." : "CONFIRM ASSIGNMENT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SupportPortalShell>
  );
}
