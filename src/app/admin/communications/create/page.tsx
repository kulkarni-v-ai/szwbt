"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  Mail,
  Smartphone,
  Bell,
  Radio,
  Clock,
  Eye,
  Info,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelSelect } from "@/components/pixel/PixelSelect";

export default function CreateAnnouncementPage() {
  const router = useRouter();

  // Guided 6-Step Workflow State: 1 to 6
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Content
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [priority, setPriority] = useState("NORMAL");
  const [attachmentName, setAttachmentName] = useState("");

  // Step 2: Audience
  const [targetAudience, setTargetAudience] = useState("ALL");
  const [specificTeam, setSpecificTeam] = useState("");

  // Step 3: Channels
  const [channels, setChannels] = useState<string[]>(["IN_APP"]);

  // Step 4: Preview & Server-side Audience Count
  const [calculatingPreview, setCalculatingPreview] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [activePreviewChannel, setActivePreviewChannel] = useState<string>("IN_APP");

  // Step 5: Schedule / Publish
  const [dispatchType, setDispatchType] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Step 6: Confirmation & Submission
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Zero Transport Payment Rule Warning
  const isTransportPaymentViolated =
    `${title} ${content}`.toLowerCase().includes("transport") &&
    (`${title} ${content}`.toLowerCase().includes("fee") ||
      `${title} ${content}`.toLowerCase().includes("payment") ||
      `${title} ${content}`.toLowerCase().includes("upi") ||
      `${title} ${content}`.toLowerCase().includes("utr") ||
      `${title} ${content}`.toLowerCase().includes("balance") ||
      `${title} ${content}`.toLowerCase().includes("paid"));

  // Fetch Server-side Preview & Recipient Estimate
  const fetchRecipientEstimate = async () => {
    try {
      setCalculatingPreview(true);
      const res = await fetch("/api/admin/communications/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          targetAudience,
          channels: channels.join(","),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRecipientCount(data.estimatedRecipients);
        setPreviewData(data);
      } else {
        setRecipientCount(null);
        if (data.error) {
          setSubmissionError(data.error);
        }
      }
    } catch (err: any) {
      console.error(err);
      setRecipientCount(null);
    } finally {
      setCalculatingPreview(false);
    }
  };

  useEffect(() => {
    if (currentStep === 4) {
      fetchRecipientEstimate();
    }
  }, [currentStep]);

  // Handle Channel Selection
  const toggleChannel = (channel: string) => {
    if (channel === "SMS" || channel === "PUSH") {
      // Unconfigured channels cannot be enabled
      return;
    }
    if (channels.includes(channel)) {
      if (channels.length > 1) {
        setChannels(channels.filter((c) => c !== channel));
      }
    } else {
      setChannels([...channels, channel]);
    }
  };

  // Submit Broadcast / Announcement
  const handleFinalSubmit = async (asDraft = false) => {
    if (isTransportPaymentViolated) {
      alert("Charter Violation: Championship transport is university-provided and complimentary. Payment requests or fees cannot be sent.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionError(null);

      let canonicalScheduledTimestamp: string | undefined = undefined;
      if (!asDraft && dispatchType === "SCHEDULED") {
        if (!scheduledDate || !scheduledTime) {
          setSubmissionError("Date and Time must be selected for scheduled broadcast.");
          setSubmitting(false);
          return;
        }
        canonicalScheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}:00+05:30`).toISOString();
      }

      const status = asDraft
        ? "DRAFT"
        : dispatchType === "SCHEDULED"
        ? "SCHEDULED"
        : "PUBLISHED";

      const res = await fetch("/api/admin/communications/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category,
          priority,
          targetAudience,
          channels: channels.join(","),
          status,
          scheduledFor: canonicalScheduledTimestamp,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          relatedResource: specificTeam || undefined,
          emergencyConfirmed: priority === "EMERGENCY",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmissionError(data.error || "Failed to transmit broadcast.");
        return;
      }

      setSubmissionSuccess(true);
    } catch (err: any) {
      console.error(err);
      setSubmissionError(err.message || "Failed to submit broadcast.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "01 CONTENT" },
    { num: 2, label: "02 AUDIENCE" },
    { num: 3, label: "03 CHANNEL" },
    { num: 4, label: "04 PREVIEW" },
    { num: 5, label: "05 SCHEDULE / PUBLISH" },
    { num: 6, label: "06 CONFIRMATION" },
  ];

  return (
    <CommunicationsPortalShell currentTab="create">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* BREADCRUMB & HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-pixel-navy border-2 border-pixel-orange-fiery/40 p-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin/communications" className="font-pixel text-[10px] text-pixel-muted hover:text-pixel-orange-bright">
                COMMUNICATIONS
              </Link>
              <span className="text-pixel-muted text-xs">&gt;</span>
              <span className="font-pixel text-[10px] text-pixel-orange-fiery">COMPOSE BROADCAST</span>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
              CREATE ANNOUNCEMENT // 6-STEP WORKFLOW
            </h1>
          </div>
          <Link
            href="/admin/communications"
            className="self-start sm:self-center px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-xs text-pixel-gray-300 hover:text-pixel-cream hover:border-pixel-orange-fiery transition-all"
          >
            RETURN TO COMMAND CENTER
          </Link>
        </div>

        {/* STEP PROGRESS STRIP */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-[#050914] border border-pixel-gray-800 p-1.5">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => {
                  if (isCompleted || s.num <= currentStep + 1) {
                    setCurrentStep(s.num);
                  }
                }}
                className={`py-2 px-1 text-center font-pixel text-[10px] transition-all border ${
                  isActive
                    ? "bg-pixel-orange-fiery text-black border-pixel-orange-bright font-bold shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                    : isCompleted
                    ? "bg-pixel-navy/80 text-green-400 border-green-500/40"
                    : "bg-transparent text-pixel-gray-500 border-transparent hover:text-pixel-gray-300"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* TRANSPORT PAYMENT RULE ALERT */}
        {isTransportPaymentViolated && (
          <div className="p-3 bg-red-950/80 border-2 border-red-500 text-red-200 text-xs flex items-start gap-2 shadow-lg">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-pixel text-[10px] text-red-400 uppercase font-bold">
                CRITICAL VIOLATION: ZERO TRANSPORT PAYMENT POLICY
              </p>
              <p className="font-sans text-xs mt-0.5">
                Championship transport is university-provided and complimentary with NO PAYMENT. Communications must never request
                transport fees, UPI, UTR, or balances. Submission will be rejected by the server.
              </p>
            </div>
          </div>
        )}

        {/* SUBMISSION SUCCESS MODAL / BANNER */}
        {submissionSuccess && (
          <PixelCard headerTitle="TRANSMISSION CONFIRMED" headerBadge="SUCCESS" glow>
            <div className="p-6 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto animate-bounce" />
              <h2 className="font-display font-bold text-xl text-pixel-cream">
                COMMUNICATION DISPATCHED SUCCESSFULLY
              </h2>
              <p className="text-xs text-pixel-gray-300 max-w-md mx-auto leading-relaxed">
                Your announcement has been processed by the tournament communications pipeline and synchronized
                across active delivery channels.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href="/admin/communications"
                  className="px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright transition-all"
                >
                  VIEW COMMAND CENTER
                </Link>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setTitle("");
                    setContent("");
                    setSubmissionSuccess(false);
                    setConfirmed(false);
                  }}
                  className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-xs text-pixel-cream hover:border-pixel-orange-fiery transition-all"
                >
                  COMPOSE ANOTHER
                </button>
              </div>
            </div>
          </PixelCard>
        )}

        {/* WORKFLOW STEPS FORM */}
        {!submissionSuccess && (
          <PixelCard
            headerTitle={`DISPATCH STEP ${currentStep} OF 6: ${steps[currentStep - 1].label}`}
            headerBadge="BROADCAST HUD"
            glow
          >
            <div className="p-4 sm:p-6 space-y-6">
              {/* STEP 1: CONTENT */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-1 uppercase">
                      Announcement Title *
                    </label>
                    <PixelInput
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Schedule Update: Day 2 Quarter-Final Fixtures"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-1 uppercase">
                        Category
                      </label>
                      <PixelSelect
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={[
                          { label: "GENERAL ANNOUNCEMENT", value: "GENERAL" },
                          { label: "MATCH SCHEDULE UPDATE", value: "SCHEDULE" },
                          { label: "ACCOMMODATION & HOSTEL", value: "ACCOMMODATION" },
                          { label: "TRANSPORT SHUTTLE OPERATIONS", value: "TRANSPORT" },
                          { label: "REGISTRATION DESK NOTICE", value: "REGISTRATION" },
                          { label: "ARENA & VENUE CONTROL", value: "VENUE" },
                          { label: "EMERGENCY SAFETY NOTICE", value: "EMERGENCY" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-1 uppercase">
                        Priority Level
                      </label>
                      <PixelSelect
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        options={[
                          { label: "NORMAL (Standard Noticeboard)", value: "NORMAL" },
                          { label: "HIGH (Highlighted Bulletin)", value: "HIGH" },
                          { label: "URGENT (Top Sticky Alert)", value: "URGENT" },
                          { label: "EMERGENCY (Full Broadcast)", value: "EMERGENCY" },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-1 uppercase">
                      Message Content *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      placeholder="Enter official tournament announcement text..."
                      className="w-full bg-[#050914] border border-pixel-gray-700 p-3 text-xs text-pixel-cream font-sans focus:border-pixel-orange-fiery focus:outline-none placeholder:text-pixel-gray-500"
                      required
                    />
                    <div className="flex justify-between items-center text-[10px] text-pixel-muted font-mono mt-1">
                      <span>CHARACTERS: {content.length}</span>
                      <span>MAX RECOMMENDED: 1000</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-muted mb-1 uppercase">
                      Optional Document Attachment Note (PDF / Spec Sheet)
                    </label>
                    <PixelInput
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      placeholder="e.g. fixtures_schedule_round2.pdf (Stored securely in tournament private storage)"
                    />
                    <p className="text-[10px] text-pixel-gray-500 mt-1">
                      Attachments are validated, size-checked, and stored in private championship storage. Permanent public URLs are never exposed.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: AUDIENCE */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-2 uppercase">
                      Target Audience Matrix *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: "ALL", label: "ALL PARTICIPANTS & DELEGATES", desc: "Whole tournament broadcast network" },
                        { id: "PARTICIPANTS", label: "ATHLETES & PLAYERS ONLY", desc: "Registered badminton players" },
                        { id: "TEAM_MANAGERS", label: "TEAM MANAGERS & COACHES", desc: "Official university representatives" },
                        { id: "VOLUNTEERS", label: "VOLUNTEER BRIGADE", desc: "Field assistance & court crew" },
                        { id: "MATCH_OFFICIALS", label: "MATCH OFFICIALS & UMPIRES", desc: "Court umpires and ref staff" },
                        { id: "ORGANIZERS", label: "ORGANIZING COMMITTEE", desc: "Executive tournament staff" },
                        { id: "SUPPORT_STAFF", label: "SUPPORT DESK OPERATORS", desc: "Desk & help center staff" },
                        { id: "SPECIFIC_TEAM", label: "SPECIFIC UNIVERSITY TEAM", desc: "Targeted single institution squad" },
                      ].map((aud) => (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => setTargetAudience(aud.id)}
                          className={`p-3 text-left border transition-all ${
                            targetAudience === aud.id
                              ? "bg-pixel-orange-fiery/15 border-pixel-orange-fiery shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                              : "bg-[#050914] border-pixel-gray-800 hover:border-pixel-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-display font-bold text-xs text-pixel-cream">{aud.label}</span>
                            {targetAudience === aud.id && <CheckCircle2 className="w-4 h-4 text-pixel-orange-fiery" />}
                          </div>
                          <p className="text-[11px] text-pixel-muted mt-1">{aud.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {targetAudience === "SPECIFIC_TEAM" && (
                    <div className="p-3 bg-[#050914] border border-pixel-orange-fiery/40 space-y-2">
                      <label className="block font-pixel text-[11px] text-pixel-orange-bright uppercase">
                        University / Team ID
                      </label>
                      <PixelInput
                        value={specificTeam}
                        onChange={(e) => setSpecificTeam(e.target.value)}
                        placeholder="e.g. ANNA_UNIV_TEAM_A"
                      />
                    </div>
                  )}

                  <div className="p-3 bg-pixel-navy/60 border border-cyan-800/60 text-xs text-cyan-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Server-Side Audience Resolution: Recipient targeting is evaluated strictly server-side against authorized user records. Client IDs are never blindly accepted.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3: CHANNELS */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-2 uppercase">
                      Select Delivery Channels *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* IN-APP */}
                      <div
                        onClick={() => toggleChannel("IN_APP")}
                        className={`p-4 border cursor-pointer transition-all ${
                          channels.includes("IN_APP")
                            ? "bg-pixel-orange-fiery/15 border-pixel-orange-fiery"
                            : "bg-[#050914] border-pixel-gray-800 hover:border-pixel-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-pixel-orange-fiery" />
                            <span className="font-display font-bold text-xs text-pixel-cream">IN-APP NOTICEBOARD</span>
                          </div>
                          <PixelBadge variant="green" size="sm">
                            CONFIGURED
                          </PixelBadge>
                        </div>
                        <p className="text-[11px] text-pixel-muted mt-2">
                          Synchronized live dashboard announcement feed for authenticated portal users.
                        </p>
                      </div>

                      {/* EMAIL */}
                      <div
                        onClick={() => toggleChannel("EMAIL")}
                        className={`p-4 border cursor-pointer transition-all ${
                          channels.includes("EMAIL")
                            ? "bg-pixel-orange-fiery/15 border-pixel-orange-fiery"
                            : "bg-[#050914] border-pixel-gray-800 hover:border-pixel-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-cyan-400" />
                            <span className="font-display font-bold text-xs text-pixel-cream">TOURNAMENT EMAIL RELAY</span>
                          </div>
                          <PixelBadge variant="cyan" size="sm">
                            CONFIGURED
                          </PixelBadge>
                        </div>
                        <p className="text-[11px] text-pixel-muted mt-2">
                          Official SMTP broadcast to verified recipient university emails.
                        </p>
                      </div>

                      {/* SMS (NOT CONFIGURED) */}
                      <div className="p-4 border border-pixel-gray-800 bg-[#050914]/60 opacity-60 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-pixel-muted" />
                            <span className="font-display font-bold text-xs text-pixel-gray-400">SMS GATEWAY</span>
                          </div>
                          <PixelBadge variant="red" size="sm">
                            NOT CONFIGURED
                          </PixelBadge>
                        </div>
                        <p className="text-[11px] text-pixel-gray-500 mt-2">
                          SMS gateway provider not configured on backend. Sending via SMS is disabled.
                        </p>
                      </div>

                      {/* PUSH (NOT CONFIGURED) */}
                      <div className="p-4 border border-pixel-gray-800 bg-[#050914]/60 opacity-60 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-pixel-muted" />
                            <span className="font-display font-bold text-xs text-pixel-gray-400">PUSH NOTIFICATIONS</span>
                          </div>
                          <PixelBadge variant="red" size="sm">
                            NOT CONFIGURED
                          </PixelBadge>
                        </div>
                        <p className="text-[11px] text-pixel-gray-500 mt-2">
                          WebPush APNs/FCM provider not active. Push dispatch is disabled.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: PREVIEW */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  {/* Recipient estimate strip */}
                  <div className="bg-pixel-navy border-2 border-pixel-orange-fiery/40 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div>
                      <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">
                        RECIPIENT PREVIEW // AUDIENCE AUDIT
                      </span>
                      <p className="font-display font-bold text-lg text-pixel-cream">
                        Targeting: <span className="text-pixel-orange-fiery">{targetAudience}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-pixel text-[10px] text-pixel-muted">ESTIMATED RECIPIENT COUNT</span>
                      <p className="font-display font-bold text-2xl text-green-400">
                        {calculatingPreview ? (
                          <span className="text-xs text-pixel-muted animate-pulse">CALCULATING AUDIENCE...</span>
                        ) : recipientCount !== null ? (
                          `${recipientCount} RECIPIENTS`
                        ) : (
                          "COUNT UNAVAILABLE"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Channel-aware preview selector */}
                  <div className="flex gap-2 border-b border-pixel-gray-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setActivePreviewChannel("IN_APP")}
                      className={`px-3 py-1.5 text-xs font-pixel ${
                        activePreviewChannel === "IN_APP"
                          ? "bg-pixel-orange-fiery text-black font-bold"
                          : "text-pixel-gray-400 hover:text-pixel-cream"
                      }`}
                    >
                      IN-APP PREVIEW
                    </button>
                    {channels.includes("EMAIL") && (
                      <button
                        type="button"
                        onClick={() => setActivePreviewChannel("EMAIL")}
                        className={`px-3 py-1.5 text-xs font-pixel ${
                          activePreviewChannel === "EMAIL"
                            ? "bg-cyan-500 text-black font-bold"
                            : "text-pixel-gray-400 hover:text-pixel-cream"
                        }`}
                      >
                        EMAIL PREVIEW
                      </button>
                    )}
                  </div>

                  {/* IN-APP PREVIEW */}
                  {activePreviewChannel === "IN_APP" && (
                    <div className="bg-[#050914] border-2 border-pixel-orange-fiery/40 p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-pixel-orange-fiery animate-pulse" />
                          <span className="font-pixel text-xs text-pixel-orange-bright">TOURNAMENT NOTICEBOARD FEED</span>
                        </div>
                        <PixelBadge variant={priority === "EMERGENCY" ? "red" : "orange"} size="sm">
                          {priority}
                        </PixelBadge>
                      </div>
                      <h3 className="font-display font-bold text-base text-pixel-cream">{title || "Announcement Title"}</h3>
                      <p className="text-xs text-pixel-gray-300 leading-relaxed whitespace-pre-wrap">
                        {content || "Message text will appear here..."}
                      </p>
                      <div className="pt-2 flex justify-between text-[10px] text-pixel-muted font-pixel">
                        <span>AUDIENCE: {targetAudience}</span>
                        <span>CHANNELS: {channels.join(", ")}</span>
                      </div>
                    </div>
                  )}

                  {/* EMAIL PREVIEW */}
                  {activePreviewChannel === "EMAIL" && (
                    <div className="bg-[#050914] border-2 border-cyan-500/40 p-4 space-y-3 font-sans">
                      <div className="border-b border-pixel-gray-800 pb-2 text-xs space-y-1">
                        <div>
                          <span className="text-pixel-muted font-bold font-mono">FROM: </span>
                          <span className="text-pixel-cream">South Zone Badminton 2026 &lt;noreply@szwbt2026.edu&gt;</span>
                        </div>
                        <div>
                          <span className="text-pixel-muted font-bold font-mono">TO: </span>
                          <span className="text-pixel-cream">&lt;{targetAudience.toLowerCase()}@tournament-directory.edu&gt;</span>
                        </div>
                        <div>
                          <span className="text-pixel-muted font-bold font-mono">SUBJECT: </span>
                          <span className="text-cyan-400 font-bold">[SZWBT 2026] {title || "Tournament Notice"}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-black/60 border border-pixel-gray-800 text-xs text-pixel-cream leading-relaxed whitespace-pre-wrap">
                        {content || "Email message body..."}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: SCHEDULE / PUBLISH */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-orange-bright mb-2 uppercase">
                      Dispatch Schedule Mode *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setDispatchType("IMMEDIATE")}
                        className={`p-4 text-left border transition-all ${
                          dispatchType === "IMMEDIATE"
                            ? "bg-pixel-orange-fiery/15 border-pixel-orange-fiery shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                            : "bg-[#050914] border-pixel-gray-800 hover:border-pixel-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-xs text-pixel-cream">PUBLISH IMMEDIATELY</span>
                          <Send className="w-4 h-4 text-pixel-orange-fiery" />
                        </div>
                        <p className="text-[11px] text-pixel-muted mt-2">
                          Broadcast starts immediately upon confirmation. Notifications queued into live dispatch pipeline.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDispatchType("SCHEDULED")}
                        className={`p-4 text-left border transition-all ${
                          dispatchType === "SCHEDULED"
                            ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                            : "bg-[#050914] border-pixel-gray-800 hover:border-pixel-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-xs text-pixel-cream">SCHEDULE FOR LATER</span>
                          <Calendar className="w-4 h-4 text-cyan-400" />
                        </div>
                        <p className="text-[11px] text-pixel-muted mt-2">
                          Queue announcement for authoritative automated transmission at a designated date and time.
                        </p>
                      </button>
                    </div>
                  </div>

                  {dispatchType === "SCHEDULED" && (
                    <div className="p-4 bg-pixel-navy border-2 border-cyan-500/40 space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400 font-pixel text-xs">
                        <Clock className="w-4 h-4" />
                        <span>SCHEDULED TRANSMISSION WINDOW</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-pixel text-[10px] text-pixel-muted mb-1">DATE (YYYY-MM-DD)</label>
                          <PixelInput
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-pixel text-[10px] text-pixel-muted mb-1">TIME (24-HOUR IST)</label>
                          <PixelInput
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-cyan-300 font-mono">
                        TIMEZONE: Asia/Kolkata (IST). Canonical timestamp will be evaluated authoritatively by backend queues.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block font-pixel text-[11px] text-pixel-muted mb-1 uppercase">
                      Optional Expiry Timestamp
                    </label>
                    <PixelInput
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <p className="text-[10px] text-pixel-gray-500 mt-1">
                      Announcements marked expired will be hidden from active public feeds while remaining preserved in the audit log.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 6: CONFIRMATION */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="bg-pixel-navy border-2 border-pixel-orange-fiery p-4 space-y-3">
                    <h3 className="font-display font-bold text-base text-pixel-orange-bright">
                      PUBLISH COMMUNICATION // VERIFICATION CHECKLIST
                    </h3>
                    <div className="text-xs space-y-2 font-mono">
                      <div className="flex justify-between border-b border-pixel-gray-800 pb-1">
                        <span className="text-pixel-muted">TITLE:</span>
                        <span className="text-pixel-cream font-bold">{title}</span>
                      </div>
                      <div className="flex justify-between border-b border-pixel-gray-800 pb-1">
                        <span className="text-pixel-muted">AUDIENCE:</span>
                        <span className="text-pixel-orange-bright">{targetAudience}</span>
                      </div>
                      <div className="flex justify-between border-b border-pixel-gray-800 pb-1">
                        <span className="text-pixel-muted">CHANNELS:</span>
                        <span className="text-cyan-400">{channels.join(", ")}</span>
                      </div>
                      <div className="flex justify-between border-b border-pixel-gray-800 pb-1">
                        <span className="text-pixel-muted">DISPATCH MODE:</span>
                        <span className={dispatchType === "IMMEDIATE" ? "text-green-400" : "text-cyan-400"}>
                          {dispatchType === "IMMEDIATE" ? "IMMEDIATE BROADCAST" : `SCHEDULED (${scheduledDate} ${scheduledTime} IST)`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pixel-muted">ESTIMATED RECIPIENTS:</span>
                        <span className="text-green-400 font-bold">
                          {recipientCount !== null ? `${recipientCount} RECIPIENTS` : "SERVER EVALUATED"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-3 bg-[#050914] border border-pixel-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 accent-pixel-orange-fiery"
                    />
                    <span className="text-xs text-pixel-gray-300 leading-relaxed">
                      I confirm that this announcement has been reviewed, targets the authorized tournament audience,
                      does not contain transport fee or payment requests, and is ready for broadcast.
                    </span>
                  </label>

                  {submissionError && (
                    <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs">
                      {submissionError}
                    </div>
                  )}
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-pixel-gray-800">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-4 py-2 bg-pixel-navy border border-pixel-gray-700 text-xs text-pixel-cream hover:border-pixel-orange-fiery flex items-center gap-1 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      PREVIOUS STEP
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Save Draft Action */}
                  <button
                    type="button"
                    onClick={() => handleFinalSubmit(true)}
                    disabled={submitting || !title.trim() || !content.trim()}
                    className="px-3 py-2 bg-[#050914] border border-yellow-500/60 text-yellow-400 hover:bg-yellow-950/40 text-xs font-display transition-all disabled:opacity-50"
                  >
                    SAVE DRAFT
                  </button>

                  {currentStep < 6 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep === 1 && (!title.trim() || !content.trim())) {
                          alert("Please enter a title and message content before proceeding.");
                          return;
                        }
                        setCurrentStep(currentStep + 1);
                      }}
                      className="px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase hover:bg-pixel-orange-bright flex items-center gap-1 transition-all"
                    >
                      CONTINUE
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFinalSubmit(false)}
                      disabled={submitting || !confirmed || isTransportPaymentViolated}
                      className="px-5 py-2.5 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-bright shadow-[0_0_12px_rgba(249,115,22,0.5)] transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>{dispatchType === "IMMEDIATE" ? "PUBLISH NOW" : "SCHEDULE BROADCAST"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </PixelCard>
        )}
      </div>
    </CommunicationsPortalShell>
  );
}
