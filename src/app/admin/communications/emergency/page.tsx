"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AlertCircle,
  Flame,
  ShieldAlert,
  Send,
  Radio,
  Mail,
  Smartphone,
  Eye,
  CheckCircle2,
  Clock,
  Info,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelSelect } from "@/components/pixel/PixelSelect";

export default function EmergencyBroadcastPage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("ALL");
  const [relatedResource, setRelatedResource] = useState("ALL_ARENAS");
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sentNotice, setSentNotice] = useState<any>(null);

  // Preview Mode
  const [previewOpen, setPreviewOpen] = useState(false);

  // STRICT ZERO TRANSPORT PAYMENT RULE
  const isTransportPaymentViolated =
    `${title} ${content}`.toLowerCase().includes("transport") &&
    (`${title} ${content}`.toLowerCase().includes("fee") ||
      `${title} ${content}`.toLowerCase().includes("payment") ||
      `${title} ${content}`.toLowerCase().includes("upi") ||
      `${title} ${content}`.toLowerCase().includes("utr") ||
      `${title} ${content}`.toLowerCase().includes("balance") ||
      `${title} ${content}`.toLowerCase().includes("paid"));

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (!emergencyConfirmed) {
      alert("You must explicitly verify and check the confirmation box before broadcasting an emergency notice.");
      return;
    }

    if (isTransportPaymentViolated) {
      alert("Charter Violation: Championship transport is university-provided and complimentary. Payment requests cannot be sent.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/admin/communications/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          targetAudience,
          channels: "IN_APP,EMAIL",
          emergencyConfirmed: true,
          relatedResource,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to broadcast emergency communication.");
        return;
      }

      setSentNotice(data.announcement);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network error broadcasting emergency.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CommunicationsPortalShell currentTab="emergency">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* EMERGENCY CHANNEL DISTINCT BANNER */}
        <div className="bg-gradient-to-r from-[#1b0d2b] via-[#2a0b14] to-[#1b0d2b] border-2 border-red-600 p-4 sm:p-6 shadow-[0_0_20px_rgba(220,38,38,0.3)] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[10px] text-red-400 uppercase tracking-widest">
                  CRITICAL PRIORITY CHANNEL
                </span>
                <PixelBadge variant="red" size="sm">
                  EMERGENCY CHANNEL
                </PixelBadge>
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-red-100 tracking-wide flex items-center gap-2">
                <Flame className="w-6 h-6 text-red-500 animate-pulse" />
                EMERGENCY COMMUNICATIONS CONTROL
              </h1>
              <p className="text-xs text-red-200/90 leading-relaxed max-w-2xl font-sans">
                Authoritative emergency broadcasting for venue safety events, severe weather/schedule disruptions,
                or critical tournament executive instructions.
              </p>
            </div>
            <Link
              href="/admin/communications"
              className="self-start sm:self-center px-3 py-1.5 bg-[#050914] border border-red-800 text-xs text-red-300 hover:text-white hover:border-red-500 transition-all font-display"
            >
              RETURN TO HUB
            </Link>
          </div>
        </div>

        {/* DELIBERATE WARNING BOX (MANDATORY REQUIREMENT 22) */}
        <div className="p-4 bg-red-950/80 border-2 border-red-500 text-red-200 space-y-1.5 shadow-lg">
          <div className="flex items-center gap-2 font-pixel text-xs text-red-400 uppercase font-bold">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>OPERATIONAL WARNING: AUTHORITATIVE BROADCAST</span>
          </div>
          <p className="text-xs font-sans text-red-100 leading-relaxed font-semibold">
            &ldquo;This communication will be sent to the selected audience through the selected configured channels.&rdquo;
          </p>
          <p className="text-[11px] text-red-300 font-sans leading-relaxed">
            Emergency transmissions immediately take precedence over standard noticeboards, appear as top sticky
            alerts across player & team manager dashboards, and log an immutable high-priority audit event.
          </p>
        </div>

        {/* ZERO TRANSPORT PAYMENT WARNING */}
        {isTransportPaymentViolated && (
          <div className="p-3 bg-red-950 border-2 border-red-500 text-red-200 text-xs flex items-start gap-2 shadow-lg">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-pixel text-[10px] text-red-400 uppercase font-bold">
                POLICY VIOLATION DETECTED
              </p>
              <p className="text-xs mt-0.5">
                Championship transport is university-provided and complimentary with NO PAYMENT. Emergency messages cannot request fees, UPI, or UTR payments.
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {success && (
          <PixelCard headerTitle="EMERGENCY TRANSMISSION COMPLETE" headerBadge="ALERT DISPATCHED" glow>
            <div className="p-6 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto animate-bounce" />
              <h2 className="font-display font-bold text-xl text-pixel-cream">
                EMERGENCY NOTICE BROADCASTED ACROSS ACTIVE CHANNELS
              </h2>
              <div className="bg-[#050914] p-4 border border-red-800 text-xs text-left max-w-md mx-auto space-y-2 font-mono">
                <p className="text-red-400 font-bold">{sentNotice?.title}</p>
                <p className="text-pixel-gray-300">{sentNotice?.content}</p>
                <div className="flex justify-between pt-2 border-t border-pixel-gray-800 text-[10px] text-pixel-muted">
                  <span>AUDIENCE: {sentNotice?.targetAudience}</span>
                  <span>CHANNELS: {sentNotice?.channels}</span>
                </div>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href="/admin/communications"
                  className="px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all"
                >
                  VIEW COMMAND CENTER
                </Link>
                <button
                  onClick={() => {
                    setTitle("");
                    setContent("");
                    setEmergencyConfirmed(false);
                    setSuccess(false);
                  }}
                  className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-xs text-pixel-cream hover:border-pixel-orange-fiery transition-all"
                >
                  NEW BROADCAST
                </button>
              </div>
            </div>
          </PixelCard>
        )}

        {/* EMERGENCY COMPOSER FORM */}
        {!success && (
          <form onSubmit={handleBroadcast}>
            <PixelCard headerTitle="EMERGENCY BROADCAST COMPOSER" headerBadge="LEVEL 03 CLEARANCE" glow>
              <div className="p-4 sm:p-6 space-y-5">
                {error && (
                  <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block font-pixel text-[11px] text-red-400 mb-1 uppercase">
                    Emergency Notice Title *
                  </label>
                  <PixelInput
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. URGENT: Hall B Court 4 Power Surge - Match 14 Temporarily Suspended"
                    required
                  />
                  <p className="text-[10px] text-pixel-gray-500 mt-1">
                    Prefix [EMERGENCY] will be appended automatically if omitted.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-pixel text-[11px] text-red-400 mb-1 uppercase">
                      Target Audience *
                    </label>
                    <PixelSelect
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      options={[
                        { label: "ALL TOURNAMENT DELEGATES", value: "ALL" },
                        { label: "PLAYERS & ATHLETES ONLY", value: "PARTICIPANTS" },
                        { label: "TEAM MANAGERS ONLY", value: "TEAM_MANAGERS" },
                        { label: "MATCH OFFICIALS & UMPIRES", value: "MATCH_OFFICIALS" },
                        { label: "VOLUNTEER FORCE", value: "VOLUNTEERS" },
                        { label: "ORGANIZING COMMITTEE", value: "ORGANIZERS" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block font-pixel text-[11px] text-red-400 mb-1 uppercase">
                      Affected Arena / Sector
                    </label>
                    <PixelSelect
                      value={relatedResource}
                      onChange={(e) => setRelatedResource(e.target.value)}
                      options={[
                        { label: "ALL INDOOR STADIUM ARENAS", value: "ALL_ARENAS" },
                        { label: "MAIN ARENA (COURTS 1-4)", value: "COURTS_1_4" },
                        { label: "PRACTICE ARENA (COURTS 5-8)", value: "COURTS_5_8" },
                        { label: "UNIVERSITY ATHLETE VILLAGE", value: "HOSTELS" },
                        { label: "SHUTTLE FLEET TERMINAL", value: "TRANSPORT_TERMINAL" },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-pixel text-[11px] text-red-400 mb-1 uppercase">
                    Emergency Broadcast Instructions *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    placeholder="Detail the urgent situation, immediate actions required by athletes/teams, safety protocols, and estimated resumption time..."
                    className="w-full bg-[#050914] border-2 border-red-900/80 p-3 text-xs text-pixel-cream font-sans focus:border-red-500 focus:outline-none placeholder:text-pixel-gray-500"
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] text-pixel-muted font-mono mt-1">
                    <span>CHARACTERS: {content.length}</span>
                    <span className="text-red-400 font-bold">HIGH PRIORITY DISPATCH</span>
                  </div>
                </div>

                {/* ACTIVE DELIVERY CHANNELS SUMMARY */}
                <div className="p-3 bg-[#050914] border border-pixel-gray-800 space-y-2">
                  <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">
                    ACTIVE TRANSMISSION PIPELINES
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-green-400 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>IN-APP NOTICEBOARD</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SMTP EMAIL RELAY</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-pixel-gray-500 font-mono">
                      <span className="w-2 h-2 rounded-full bg-pixel-gray-600" />
                      <span>SMS (NOT CONFIGURED)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-pixel-gray-500 font-mono">
                      <span className="w-2 h-2 rounded-full bg-pixel-gray-600" />
                      <span>PUSH (NOT CONFIGURED)</span>
                    </div>
                  </div>
                </div>

                {/* MANDATORY DELIBERATE CONFIRMATION CHECKBOX */}
                <div className="p-4 bg-red-950/60 border-2 border-red-600 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emergencyConfirmed}
                      onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                      className="mt-1 accent-red-600 w-4 h-4 shrink-0"
                      required
                    />
                    <span className="text-xs text-red-100 leading-relaxed font-sans">
                      <strong>AUTHORITATIVE EMERGENCY CONFIRMATION:</strong> I confirm that this emergency notice is authorized by tournament administration, accurately addresses safety or severe schedule disruptions, and should be broadcasted immediately across all active notification channels.
                    </span>
                  </label>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-pixel-gray-800">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(!previewOpen)}
                    className="px-3 py-2 bg-[#050914] border border-pixel-gray-700 text-xs text-pixel-cream hover:border-red-500 flex items-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{previewOpen ? "HIDE PREVIEW" : "PREVIEW NOTICE"}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || !emergencyConfirmed || !title.trim() || !content.trim() || isTransportPaymentViolated}
                    className="px-6 py-2.5 bg-red-700 hover:bg-red-600 text-white font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all disabled:opacity-40 flex items-center gap-2 active:scale-95"
                  >
                    <Flame className="w-4 h-4 animate-pulse" />
                    <span>{submitting ? "TRANSMITTING..." : "BROADCAST EMERGENCY NOTICE"}</span>
                  </button>
                </div>

                {/* LIVE PREVIEW IF TOGGLED */}
                {previewOpen && (
                  <div className="mt-4 p-4 bg-[#050914] border-2 border-red-500 space-y-2">
                    <div className="flex items-center justify-between border-b border-red-900 pb-2">
                      <span className="font-pixel text-xs text-red-400 uppercase">
                        IN-APP EMERGENCY ALERT BANNER PREVIEW
                      </span>
                      <PixelBadge variant="red" size="sm">
                        TOP STICKY ALERT
                      </PixelBadge>
                    </div>
                    <h3 className="font-display font-bold text-sm text-red-200">
                      [EMERGENCY] {title || "Urgent Announcement"}
                    </h3>
                    <p className="text-xs text-pixel-gray-200 leading-relaxed whitespace-pre-wrap">
                      {content || "Emergency instructions will appear here..."}
                    </p>
                  </div>
                )}
              </div>
            </PixelCard>
          </form>
        )}
      </div>
    </CommunicationsPortalShell>
  );
}
