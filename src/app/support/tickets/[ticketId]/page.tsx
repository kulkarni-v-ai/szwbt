"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Lock,
  Send,
  User,
  X,
} from "lucide-react";
import { SupportPortalShell } from "@/components/support/SupportPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";

interface TicketDetail {
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
  messages?: Array<{
    id: string;
    senderEmail: string;
    senderName: string;
    senderType: string;
    messageType: string;
    content: string;
    createdAt: string;
  }>;
  escalations?: Array<{
    id: string;
    targetDepartment: string;
    escalationReason: string;
    priority: string;
    escalatedBy: string;
    status: string;
    createdAt: string;
  }>;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.ticketId as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyContent, setReplyContent] = useState("");
  const [replyType, setReplyType] = useState<"PUBLIC" | "INTERNAL_NOTE">("PUBLIC");
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!ticketId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/support/tickets/${ticketId}`);
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          if (res.status === 403) {
            setError("403 Forbidden: Insufficient clearance to view this support ticket.");
            return;
          }
          if (res.status === 404) {
            setError("404 Not Found: Support ticket does not exist.");
            return;
          }
          throw new Error(`Failed to load case: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.success) {
          setTicket(data.ticket);
          setActivity(data.activity || []);
        } else {
          setError(data.error || "Failed to load ticket.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to retrieve case details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [ticketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyContent.trim()) return;

    try {
      setReplySubmitting(true);
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
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
      // Reload
      const refreshRes = await fetch(`/api/support/tickets/${ticket.id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setTicket(refreshData.ticket);
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplySubmitting(false);
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
      currentTab="queue"
      onSelectTab={(tab) => router.push(`/support?tab=${tab}`)}
      openCount={0}
      urgentCount={0}
      unassignedCount={0}
      myTicketsCount={0}
      canCreate={true}
      searchQuery=""
      onSearchChange={() => {}}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/support"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b0c10] border border-pixel-gray-700 text-pixel-cream text-xs font-pixel hover:border-pixel-orange-fiery hover:text-pixel-orange-bright transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO SUPPORT COMMAND CENTER</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-16 text-center text-pixel-muted font-pixel text-xs animate-pulse">
            LOADING CASE WORKSPACE...
          </div>
        ) : error ? (
          <PixelCard headerTitle="ACCESS ERROR" headerBadge="ALERT">
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="font-display text-base text-pixel-cream">{error}</h3>
              <Link
                href="/support"
                className="inline-block mt-2 px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase"
              >
                RETURN TO SUPPORT DESK
              </Link>
            </div>
          </PixelCard>
        ) : ticket ? (
          <div className="space-y-6">
            <PixelCard
              headerTitle={`CASE // ${ticket.ticketNumber}`}
              headerBadge={ticket.status}
              glow={ticket.priority === "URGENT"}
            >
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pixel-gray-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PixelBadge variant={getStatusBadgeVariant(ticket.status)} size="md">
                      {ticket.status}
                    </PixelBadge>
                    <PixelBadge variant={getPriorityBadgeVariant(ticket.priority)} size="md">
                      {ticket.priority}
                    </PixelBadge>
                    <span className="font-pixel text-xs text-cyan-400">[{ticket.category}]</span>
                    {ticket.relatedResourceId && (
                      <span className="text-xs text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 border border-amber-800">
                        LINKED RESOURCE: {ticket.relatedResourceId}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-pixel-muted">{ticket.ticketNumber}</span>
                </div>

                <div>
                  <h1 className="font-display font-bold text-lg sm:text-xl text-pixel-cream">
                    {ticket.subject}
                  </h1>
                  <div className="mt-3 p-4 bg-[#060608] border border-pixel-gray-800 text-xs text-pixel-gray-200 whitespace-pre-line leading-relaxed">
                    {ticket.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#060608] p-3 border border-pixel-gray-800 font-mono text-xs">
                  <div>
                    <span className="text-pixel-muted block text-[10px]">REQUESTER</span>
                    <span className="text-pixel-cream font-bold">{ticket.requesterName || "Athlete"}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">EMAIL</span>
                    <span className="text-pixel-cream truncate block">{ticket.requesterEmail}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">ASSIGNED AGENT</span>
                    <span className="text-cyan-400 font-bold">{ticket.assignedAgentName || "UNASSIGNED"}</span>
                  </div>
                  <div>
                    <span className="text-pixel-muted block text-[10px]">SUBMITTED</span>
                    <span className="text-pixel-cream">
                      {new Date(ticket.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Conversation Timeline */}
                <div className="space-y-3 pt-3">
                  <h3 className="font-pixel text-[11px] text-pixel-orange-bright uppercase tracking-wider">
                    CONVERSATION TIMELINE
                  </h3>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto">
                    {ticket.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 border text-xs space-y-1 ${
                          msg.messageType === "INTERNAL_NOTE"
                            ? "bg-amber-950/30 border-amber-700/60 text-amber-200"
                            : msg.senderType === "SUPPORT_AGENT"
                            ? "bg-[#1b0d2b]/40 border-purple-800 text-pixel-cream"
                            : "bg-[#060608] border-pixel-gray-800 text-pixel-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-pixel text-pixel-orange-bright">
                            {msg.messageType === "INTERNAL_NOTE" ? "[INTERNAL STAFF NOTE]" : msg.senderName}
                          </span>
                          <span className="text-pixel-muted font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString("en-IN")} IST
                          </span>
                        </div>
                        <p className="font-sans leading-relaxed whitespace-pre-line text-[11px]">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response Composer */}
                {ticket.status !== "CLOSED" && (
                  <form onSubmit={handleSendReply} className="space-y-2 pt-3 border-t border-pixel-gray-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-pixel text-[10px] text-pixel-cream">ADD RESPONSE</span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="detailReplyType"
                            checked={replyType === "PUBLIC"}
                            onChange={() => setReplyType("PUBLIC")}
                          />
                          <span>PUBLIC REPLY</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-amber-400">
                          <input
                            type="radio"
                            name="detailReplyType"
                            checked={replyType === "INTERNAL_NOTE"}
                            onChange={() => setReplyType("INTERNAL_NOTE")}
                          />
                          <span>INTERNAL NOTE</span>
                        </label>
                      </div>
                    </div>

                    <textarea
                      required
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write response..."
                      className="w-full bg-[#060608] text-xs text-pixel-cream p-2.5 border border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none"
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
            </PixelCard>
          </div>
        ) : null}
      </div>
    </SupportPortalShell>
  );
}
