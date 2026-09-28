"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  User,
  Users,
  CheckCircle2,
  FileText,
  CreditCard,
  Home,
  Bus,
  Trophy,
  Activity,
  QrCode,
  Megaphone,
  HelpCircle,
  Settings,
  Flame,
  Zap,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Shield,
  Phone,
  Mail,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Info,
} from "lucide-react";
import {
  ParticipantPortalShell,
  ParticipantHudIndicators,
} from "@/components/participant/ParticipantPortalShell";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelQR } from "@/components/team/PixelQR";

function ParticipantDashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";

  const [currentTab, setCurrentTab] = useState<string>(initialTab);

  // Synchronize tab with search params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setCurrentTab(tabParam);
    }
  }, [searchParams]);

  // Main state models
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overviewData, setOverviewData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [documentsData, setDocumentsData] = useState<any>(null);
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [accommodationData, setAccommodationData] = useState<any>(null);
  const [transportData, setTransportData] = useState<any>(null);
  const [matchesData, setMatchesData] = useState<any>(null);
  const [resultsData, setResultsData] = useState<any>(null);
  const [passData, setPassData] = useState<any>(null);
  const [announcementsData, setAnnouncementsData] = useState<any[]>([]);
  const [supportData, setSupportData] = useState<any>(null);

  // Support form state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("REGISTRATION");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);

  // Fetch overview & HUD data initially
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/participant");
        if (res.status === 401 || res.status === 403) {
          setError(
            res.status === 403
              ? "403 Forbidden: Only authenticated participants or tournament administrators can access the athlete portal."
              : "Authentication required. Please sign in."
          );
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success) {
          setOverviewData(data);
          if (data.participant) {
            setPassData({
              qrToken: data.participant.qrCode,
              fullName: data.participant.name,
              playerId: data.participant.playerId,
              institution: data.participant.institution,
              teamName: data.participant.team?.name || "Independent Contingent",
              role: data.participant.team?.role || "PLAYER",
              category: data.participant.category,
              accreditationStatus: data.participant.status,
            });
          }
        } else {
          setError(data.error || "Failed to load athlete profile.");
        }
      } catch (err: any) {
        setError(err.message || "Network error loading athlete data.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    async function loadTabData() {
      try {
        if (currentTab === "profile" && !profileData) {
          const res = await fetch("/api/participant/profile");
          const data = await res.json();
          if (data.success) setProfileData(data.profile);
        } else if (currentTab === "team" && !teamData) {
          const res = await fetch("/api/participant/team");
          const data = await res.json();
          if (data.success) setTeamData(data.team);
        } else if (currentTab === "registration" && !registrationData) {
          const res = await fetch("/api/participant/registration");
          const data = await res.json();
          if (data.success) setRegistrationData(data.registration);
        } else if (currentTab === "documents" && !documentsData) {
          const res = await fetch("/api/participant/documents");
          const data = await res.json();
          if (data.success) setDocumentsData(data);
        } else if (currentTab === "payments" && !paymentsData) {
          const res = await fetch("/api/participant/payments");
          const data = await res.json();
          if (data.success) setPaymentsData(data);
        } else if (currentTab === "accommodation" && !accommodationData) {
          const res = await fetch("/api/participant/accommodation");
          const data = await res.json();
          if (data.success) setAccommodationData(data);
        } else if (currentTab === "transport" && !transportData) {
          const res = await fetch("/api/participant/transport");
          const data = await res.json();
          if (data.success) setTransportData(data);
        } else if (currentTab === "matches" && !matchesData) {
          const res = await fetch("/api/participant/matches");
          const data = await res.json();
          if (data.success) setMatchesData(data);
        } else if (currentTab === "results" && !resultsData) {
          const res = await fetch("/api/participant/results");
          const data = await res.json();
          if (data.success) setResultsData(data);
        } else if (currentTab === "pass" && !passData) {
          const res = await fetch("/api/participant/qr");
          const data = await res.json();
          if (data.success) setPassData(data.pass);
        } else if (currentTab === "announcements" && announcementsData.length === 0) {
          const res = await fetch("/api/participant/announcements");
          const data = await res.json();
          if (data.success) setAnnouncementsData(data.announcements);
        } else if (currentTab === "support" && !supportData) {
          const res = await fetch("/api/participant/support");
          const data = await res.json();
          if (data.success) setSupportData(data);
        }
      } catch (e) {
        console.error("Error loading tab data:", e);
      }
    }

    loadTabData();
  }, [
    currentTab,
    profileData,
    teamData,
    registrationData,
    documentsData,
    paymentsData,
    accommodationData,
    transportData,
    matchesData,
    resultsData,
    passData,
    announcementsData.length,
    supportData,
  ]);

  // Handle support ticket submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    try {
      setSubmittingTicket(true);
      setTicketSuccess(null);
      const res = await fetch("/api/participant/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          category: ticketCategory,
          message: ticketMessage.trim(),
          priority: "NORMAL",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketSuccess(`Support request ${data.ticket.id} submitted successfully to helpdesk.`);
        setTicketSubject("");
        setTicketMessage("");
        // Refresh tickets
        const updatedRes = await fetch("/api/participant/support");
        const updated = await updatedRes.json();
        if (updated.success) setSupportData(updated);
      }
    } catch (err) {
      console.error("Failed to submit ticket:", err);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "APPROVED":
      case "SETTLED":
      case "READY":
      case "BOARDED":
      case "WON":
        return "green";
      case "PENDING_VERIFICATION":
      case "PENDING":
      case "IN_PROGRESS":
      case "SCHEDULED":
      case "ASSIGNED":
        return "yellow";
      case "ACTION_REQUIRED":
      case "ACTION REQUIRED":
      case "FAILED":
      case "RETAKE_REQUIRED":
      case "RETAKE REQUIRED":
      case "REJECTED":
      case "LOST":
        return "red";
      case "LIVE":
        return "orange";
      default:
        return "dark";
    }
  };

  // Derive indicators from overviewData
  const indicators: ParticipantHudIndicators = {
    registration: overviewData?.kpis?.registrationStatus || "CHECKING",
    accommodation: overviewData?.kpis?.accommodationStatus ? "ALLOCATED" : "PENDING",
    transport: overviewData?.kpis?.transportStatus ? "ASSIGNED" : "PENDING",
    matchReady:
      overviewData?.nextMatch || overviewData?.liveMatch ? "READY" : "NO FIXTURES",
  };

  // Error boundary view
  if (error) {
    return (
      <div className="min-h-screen bg-pixel-black text-pixel-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-pixel-dark border-2 border-pixel-red text-center space-y-4 shadow-pixel">
          <div className="w-12 h-12 mx-auto bg-pixel-red/20 border-2 border-pixel-red flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-pixel-red" />
          </div>
          <h2 className="font-pixel text-sm text-pixel-cream tracking-wide">
            ATHLETE ACCESS RESTRICTED
          </h2>
          <p className="text-xs text-pixel-gray-400 font-sans leading-relaxed">{error}</p>
          <div className="pt-2">
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-pixel-orange-fiery text-black font-pixel text-xs hover:bg-pixel-orange-bright transition-colors"
            >
              Sign In to Athlete Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Initial loading skeleton
  if (loading && !overviewData) {
    return (
      <div className="min-h-screen bg-pixel-black text-pixel-cream flex flex-col">
        <div className="h-14 bg-pixel-dark border-b-2 border-pixel-orange-fiery animate-pulse" />
        <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="h-32 bg-pixel-dark border border-pixel-gray-800 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-pixel-dark border border-pixel-gray-800 animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-pixel-dark border border-pixel-gray-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const participant = overviewData?.participant;
  const kpis = overviewData?.kpis || {};
  const nextMatch = overviewData?.nextMatch;
  const liveMatch = overviewData?.liveMatch;
  const readiness = overviewData?.readiness || [];
  const recentAnnouncements = overviewData?.recentAnnouncements || [];

  return (
    <ParticipantPortalShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      participantName={participant?.name || "Athlete"}
      playerId={participant?.playerId || "SZ-2026"}
      teamName={participant?.team?.name || "Independent Contingent"}
      institution={participant?.institution || "SZWBT 2026"}
      participantStatus={participant?.status || "PENDING"}
      indicators={indicators}
      unreadCount={recentAnnouncements.length}
      announcements={recentAnnouncements}
    >
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: OVERVIEW TAB (ATHLETE COMMAND CENTER)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "overview" && (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* 7. PARTICIPANT HERO: ATHLETE CONTROL CENTER */}
          <div className="relative overflow-hidden bg-pixel-dark border-2 border-pixel-orange-fiery p-5 sm:p-7 shadow-pixel-orange">
            {/* Background arcade grid details */}
            <div className="absolute inset-0 bg-[radial-gradient(#18D8D0_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-pixel-orange-fiery/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-pixel-orange-fiery animate-pulse" />
                  <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest">
                    ATHLETE CONTROL CENTER &bull; SOUTH ZONE 2026
                  </span>
                </div>
                <h1 className="font-pixel text-xl sm:text-2xl lg:text-3xl text-pixel-cream tracking-wide">
                  {participant?.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-sans">
                  <span className="px-2 py-0.5 bg-pixel-black/70 border border-pixel-gray-700 font-mono text-pixel-cyan font-bold">
                    ID: {participant?.playerId}
                  </span>
                  <span className="px-2 py-0.5 bg-pixel-black/70 border border-pixel-gray-700 font-pixel text-pixel-cream text-[11px]">
                    {participant?.team?.name || "Independent Contingent"}
                  </span>
                  <span className="text-pixel-muted font-sans text-xs">
                    {participant?.institution}
                  </span>
                </div>
              </div>

              {/* Status & Pass Quick Launch */}
              <div className="flex flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-pixel-gray-800">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-pixel-muted">STATUS:</span>
                  <PixelBadge variant={getStatusBadgeVariant(participant?.status)}>
                    {participant?.status || "PENDING"}
                  </PixelBadge>
                </div>
                <button
                  onClick={() => setCurrentTab("pass")}
                  className="px-4 py-2 bg-pixel-orange-fiery text-black font-pixel text-xs hover:bg-pixel-orange-bright transition-colors flex items-center gap-2 cursor-pointer shadow-pixel-sm"
                >
                  <QrCode className="w-4 h-4" />
                  <span>VIEW TOURNAMENT PASS</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIVE NOW BANNER (Requirement 23) */}
          {liveMatch && (
            <div className="p-4 bg-pixel-orange-fiery/15 border-2 border-pixel-orange-fiery flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-pixel-orange-fiery text-black font-pixel text-xs flex items-center justify-center font-bold shrink-0">
                  LIVE
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-pixel-orange-bright">
                      MATCH IN PROGRESS &bull; {liveMatch.court}
                    </span>
                    <span className="font-mono text-[10px] text-pixel-muted">
                      ({liveMatch.category})
                    </span>
                  </div>
                  <h3 className="font-pixel text-sm text-pixel-cream mt-0.5">
                    {liveMatch.playerA} vs {liveMatch.playerB}
                  </h3>
                  <p className="font-mono text-xs text-pixel-cyan font-bold mt-0.5">
                    SCORE: {liveMatch.scoreA || "0"} - {liveMatch.scoreB || "0"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentTab("matches")}
                className="px-3 py-1.5 bg-pixel-black border border-pixel-orange-fiery text-pixel-orange-bright font-pixel text-xs hover:bg-pixel-orange-fiery hover:text-black transition-colors self-start sm:self-auto cursor-pointer"
              >
                MATCH TRACKER &rarr;
              </button>
            </div>
          )}

          {/* 8. PERSONAL STATUS CARDS (6 Compact Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Registration */}
            <div
              onClick={() => setCurrentTab("registration")}
              className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-pixel-muted mb-2">
                <span className="font-pixel text-[10px] text-pixel-gray-400">REGISTRATION</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-pixel-green" />
              </div>
              <p className="font-pixel text-xs text-pixel-cream group-hover:text-pixel-orange-bright transition-colors truncate">
                {kpis.registrationStatus || "PENDING"}
              </p>
              <span className="font-mono text-[10px] text-pixel-muted mt-1 block">Accreditation</span>
            </div>

            {/* Card 2: Documents */}
            <div
              onClick={() => setCurrentTab("documents")}
              className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-pixel-muted mb-2">
                <span className="font-pixel text-[10px] text-pixel-gray-400">DOCUMENTS</span>
                <FileText className="w-3.5 h-3.5 text-pixel-cyan" />
              </div>
              <p className="font-pixel text-xs text-pixel-cream group-hover:text-pixel-cyan transition-colors truncate">
                {kpis.documentsStatus || "CHECKING"}
              </p>
              <span className="font-mono text-[10px] text-pixel-muted mt-1 block">Desk Check</span>
            </div>

            {/* Card 3: Payments */}
            <div
              onClick={() => setCurrentTab("payments")}
              className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-pixel-muted mb-2">
                <span className="font-pixel text-[10px] text-pixel-gray-400">PAYMENTS</span>
                <CreditCard className="w-3.5 h-3.5 text-pixel-amber" />
              </div>
              <p className="font-pixel text-xs text-pixel-cream group-hover:text-pixel-amber transition-colors truncate">
                {kpis.paymentsStatus || "CHECKING"}
              </p>
              <span className="font-mono text-[10px] text-pixel-muted mt-1 block">Fees Ledger</span>
            </div>

            {/* Card 4: Accommodation */}
            <div
              onClick={() => setCurrentTab("accommodation")}
              className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-pixel-muted mb-2">
                <span className="font-pixel text-[10px] text-pixel-gray-400">ACCOMMODATION</span>
                <Home className="w-3.5 h-3.5 text-pixel-green" />
              </div>
              <p className="font-pixel text-xs text-pixel-cream group-hover:text-pixel-green transition-colors truncate">
                {kpis.accommodationStatus ? "ALLOCATED" : "PENDING"}
              </p>
              <span className="font-mono text-[10px] text-pixel-muted mt-1 block">Hostel & Bed</span>
            </div>

            {/* Card 5: Transport */}
            <div
              onClick={() => setCurrentTab("transport")}
              className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-pixel-muted mb-2">
                <span className="font-pixel text-[10px] text-pixel-gray-400">TRANSPORT</span>
                <Bus className="w-3.5 h-3.5 text-pixel-cyan" />
              </div>
              <p className="font-pixel text-xs text-pixel-cream group-hover:text-pixel-cyan transition-colors truncate">
                {kpis.transportStatus ? "ASSIGNED" : "PENDING"}
              </p>
              <span className="font-mono text-[10px] text-pixel-muted mt-1 block">Free Shuttles</span>
            </div>

            {/* Card 6: Next Match */}
            <div
              onClick={() => setCurrentTab("matches")}
              className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-pixel-muted mb-2">
                <span className="font-pixel text-[10px] text-pixel-gray-400">NEXT MATCH</span>
                <Trophy className="w-3.5 h-3.5 text-pixel-orange-bright" />
              </div>
              <p className="font-pixel text-xs text-pixel-cream group-hover:text-pixel-orange-bright transition-colors truncate">
                {nextMatch ? nextMatch.court : "NOT RELEASED"}
              </p>
              <span className="font-mono text-[10px] text-pixel-muted mt-1 block">
                {nextMatch ? nextMatch.time : "Schedule Pending"}
              </span>
            </div>
          </div>

          {/* NEXT MATCH HIGHLIGHT (Requirement 22) */}
          {nextMatch && (
            <div className="p-5 bg-pixel-dark border-2 border-pixel-orange-fiery/60 shadow-pixel-sm">
              <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-pixel-orange-bright" />
                  <span className="font-pixel text-xs text-pixel-orange-bright uppercase tracking-wider">
                    NEXT UPCOMING TOURNAMENT FIXTURE
                  </span>
                </div>
                <span className="font-mono text-[10px] text-pixel-cyan">
                  {nextMatch.matchNumber} &bull; {nextMatch.category}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="text-[10px] font-pixel text-pixel-muted uppercase block">
                    YOU / YOUR TEAM
                  </span>
                  <p className="font-pixel text-sm text-pixel-cream mt-0.5 truncate">
                    {nextMatch.playerA}
                  </p>
                  <p className="font-sans text-xs text-pixel-gray-400 truncate">
                    {nextMatch.institutionA}
                  </p>
                </div>

                <div className="text-center space-y-1">
                  <span className="font-pixel text-xs text-pixel-orange-fiery">VS</span>
                  <div className="font-pixel text-sm text-pixel-cream">
                    {nextMatch.court} &bull; {nextMatch.time}
                  </div>
                  <div className="font-mono text-[11px] text-pixel-muted">{nextMatch.date}</div>
                </div>

                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="text-[10px] font-pixel text-pixel-muted uppercase block">
                    OPPONENT CONTINGENT
                  </span>
                  <p className="font-pixel text-sm text-pixel-cream mt-0.5 truncate">
                    {nextMatch.playerB}
                  </p>
                  <p className="font-sans text-xs text-pixel-gray-400 truncate">
                    {nextMatch.institutionB}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 9. ATHLETE READINESS CENTER */}
          <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800">
            <div className="border-b border-pixel-gray-800 pb-3 mb-4 flex items-center justify-between">
              <div>
                <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                  SYSTEM READINESS AUDIT
                </span>
                <h3 className="font-pixel text-sm text-pixel-cream tracking-wide">
                  ATHLETE TOURNAMENT READINESS
                </h3>
              </div>
              <span className="font-mono text-[10px] text-pixel-muted">
                {readiness.filter((r: any) => r.status === "READY" || r.status === "COMPLETED").length} /{" "}
                {readiness.length} CHECKS CLEARED
              </span>
            </div>

            <div className="space-y-3">
              {readiness.map((check: any) => (
                <div
                  key={check.id}
                  className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs text-pixel-cream">{check.title}</span>
                      <PixelBadge variant={getStatusBadgeVariant(check.status)}>
                        {check.status}
                      </PixelBadge>
                    </div>
                    <p className="font-sans text-xs text-pixel-gray-400">{check.description}</p>
                  </div>

                  <button
                    onClick={() => setCurrentTab(check.actionTab || "overview")}
                    className="px-3 py-1 bg-pixel-dark border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-cream font-pixel text-[10px] self-start sm:self-auto shrink-0 transition-colors cursor-pointer"
                  >
                    {check.action} &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT ANNOUNCEMENTS FEED (Requirement 27) */}
          <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800">
            <div className="border-b border-pixel-gray-800 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-pixel-orange-bright" />
                <h3 className="font-pixel text-sm text-pixel-cream tracking-wide">
                  TOURNAMENT BULLETINS & ANNOUNCEMENTS
                </h3>
              </div>
              <button
                onClick={() => setCurrentTab("announcements")}
                className="font-pixel text-[10px] text-pixel-cyan hover:underline cursor-pointer"
              >
                VIEW ARCHIVE &rarr;
              </button>
            </div>

            {recentAnnouncements.length === 0 ? (
              <p className="font-pixel text-xs text-pixel-muted py-4 text-center">
                NO ANNOUNCEMENTS AT THIS TIME
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentAnnouncements.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[9px] text-pixel-orange-bright">
                        [{a.targetAudience || "ALL"}]
                      </span>
                      <span className="font-mono text-[9px] text-pixel-muted">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-pixel text-xs text-pixel-cream line-clamp-1">{a.title}</h4>
                    <p className="font-sans text-xs text-pixel-gray-400 line-clamp-2">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: MY PROFILE (Requirement 10 & 11)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "profile" && (
        <div className="max-w-3xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL ACCREDITATION PROFILE
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY PROFILE</h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
            <div className="flex items-center gap-4 border-b border-pixel-gray-800 pb-5">
              <div className="w-14 h-14 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-lg text-pixel-orange-bright font-bold">
                {participant?.name ? participant.name.charAt(0) : "A"}
              </div>
              <div>
                <h3 className="font-pixel text-base text-pixel-cream">{participant?.name}</h3>
                <p className="font-mono text-xs text-pixel-cyan font-bold">{participant?.playerId}</p>
                <div className="flex items-center gap-2 mt-1">
                  <PixelBadge variant="green">PARTICIPANT</PixelBadge>
                  <PixelBadge variant={getStatusBadgeVariant(participant?.status)}>
                    {participant?.status}
                  </PixelBadge>
                </div>
              </div>
            </div>

            {/* Read-Only Athlete Information Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  FULL NAME
                </span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                  {profileData?.fullName || participant?.name}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  EMAIL ADDRESS
                </span>
                <span className="font-mono text-xs text-pixel-cream mt-1 block">
                  {profileData?.email || participant?.email || "—"}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  MOBILE NUMBER
                </span>
                <span className="font-mono text-xs text-pixel-cream mt-1 block">
                  {profileData?.phone || participant?.phone || "—"}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  CONTINGENT STATE
                </span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                  {profileData?.state || participant?.state || "—"}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 sm:col-span-2">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  AFFILIATED INSTITUTION
                </span>
                <span className="font-sans text-xs text-pixel-cream mt-1 block">
                  {profileData?.institution || participant?.institution}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  PARTICIPANT ID
                </span>
                <span className="font-mono text-xs text-pixel-cyan font-bold mt-1 block">
                  {profileData?.playerId || participant?.playerId}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  TEAM AFFILIATION
                </span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                  {profileData?.teamName || participant?.team?.name || "Independent"}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  CONTEST CATEGORY
                </span>
                <span className="font-pixel text-xs text-pixel-orange-bright mt-1 block">
                  {profileData?.category || participant?.category}
                </span>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  ATHLETE ROLE
                </span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                  {profileData?.role || participant?.team?.role || "PLAYER"}
                </span>
              </div>
            </div>

            {/* Read-Only Notice (Requirement 11) */}
            <div className="p-3 bg-pixel-black/40 border border-pixel-gray-800 flex items-start gap-2.5 text-xs font-sans text-pixel-gray-400">
              <Info className="w-4 h-4 text-pixel-cyan shrink-0 mt-0.5" />
              <span>
                Personal records and tournament affiliations are authoritative and read-only. For
                name spelling corrections or institutional verification updates, please visit
                Registration Desk 02 with authorized identity credentials.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: MY TEAM (Requirement 12)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "team" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              COLLEGIATE CONTINGENT IDENTITY
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY TEAM</h2>
          </div>

          {!teamData ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO TEAM ASSIGNED: You are registered as an independent contingent athlete.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Identity Card */}
              <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pixel-gray-800 pb-4">
                  <div>
                    <span className="font-mono text-[10px] text-pixel-cyan">
                      CODE: {teamData.teamCode}
                    </span>
                    <h3 className="font-pixel text-lg text-pixel-cream mt-0.5">{teamData.name}</h3>
                    <p className="font-sans text-xs text-pixel-gray-400">{teamData.institution}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PixelBadge variant={getStatusBadgeVariant(teamData.status)}>
                      {teamData.status}
                    </PixelBadge>
                    <span className="px-2 py-0.5 bg-pixel-black border border-pixel-gray-700 font-pixel text-xs text-pixel-orange-bright">
                      MY ROLE: {teamData.myRole}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                  <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                    <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                      STATE
                    </span>
                    <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                      {teamData.state}
                    </span>
                  </div>
                  <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                    <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                      TEAM MANAGER
                    </span>
                    <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                      {teamData.managerName || "—"}
                    </span>
                  </div>
                  <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                    <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                      TEAM CAPTAIN
                    </span>
                    <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                      {teamData.captainName || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorized Teammates Roster (Privacy Protected: No private emails, phone numbers, or DOB) */}
              <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3">
                  <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                    CONTINGENT ATHLETES ({teamData.members?.length || 0})
                  </h4>
                  <span className="font-mono text-[10px] text-pixel-muted">
                    PUBLIC ROSTER VIEW
                  </span>
                </div>

                <div className="space-y-2">
                  {teamData.members?.map((member: any) => (
                    <div
                      key={member.id}
                      className={`p-3 border flex items-center justify-between gap-3 text-xs font-sans ${
                        member.isMe
                          ? "bg-pixel-orange-fiery/10 border-pixel-orange-fiery/80"
                          : "bg-pixel-black/50 border-pixel-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pixel-dark border border-pixel-gray-700 flex items-center justify-center font-pixel text-xs text-pixel-cream">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-xs text-pixel-cream">
                              {member.name}
                            </span>
                            {member.isMe && (
                              <span className="px-1.5 py-0.2 bg-pixel-orange-fiery text-black font-pixel text-[9px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-pixel-cyan font-bold">
                            {member.playerId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline font-mono text-[11px] text-pixel-muted">
                          {member.category}
                        </span>
                        <PixelBadge variant={member.role === "CAPTAIN" ? "orange" : "dark"}>
                          {member.role}
                        </PixelBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: REGISTRATION (Requirement 13)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "registration" && (
        <div className="max-w-3xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL ACCREDITATION DESK STATUS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              MY REGISTRATION
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-4">
              <div>
                <span className="text-[10px] font-pixel text-pixel-muted uppercase block">
                  REGISTRATION ACCREDITATION
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="font-pixel text-base text-pixel-cream">
                    {registrationData?.currentStatus || participant?.status || "PENDING"}
                  </h3>
                  <PixelBadge
                    variant={getStatusBadgeVariant(
                      registrationData?.currentStatus || participant?.status
                    )}
                  >
                    {registrationData?.isAccredited ? "ACCREDITED" : "PENDING DESK"}
                  </PixelBadge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-pixel text-pixel-muted uppercase block">
                  LAST UPDATED
                </span>
                <span className="font-mono text-xs text-pixel-cyan">
                  {registrationData?.lastUpdated
                    ? new Date(registrationData.lastUpdated).toLocaleDateString()
                    : "ACTIVE SESSION"}
                </span>
              </div>
            </div>

            {/* Outstanding Requirements Checklist */}
            <div className="space-y-3">
              <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                ACCREDITATION CHECKLIST & REQUIREMENTS
              </h4>

              {registrationData?.outstandingRequirements?.length === 0 ? (
                <div className="p-4 bg-pixel-green/10 border border-pixel-green text-xs font-sans text-pixel-green flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All tournament registration and accreditation requirements satisfied.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {registrationData?.outstandingRequirements?.map((req: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-pixel-black/60 border border-pixel-amber/50 flex items-start gap-2.5 text-xs font-sans text-pixel-cream"
                    >
                      <AlertTriangle className="w-4 h-4 text-pixel-amber shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notice regarding self-registration (Requirement 13) */}
            <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-2 text-xs font-sans text-pixel-gray-400">
              <h5 className="font-pixel text-[11px] text-pixel-orange-bright uppercase">
                CRITICAL REGISTRATION POLICY
              </h5>
              <p className="leading-relaxed">
                {registrationData?.verificationDeskNote ||
                  "Participants do not self-register online. Official tournament entry and accreditation badges are managed and validated exclusively by university registration officials at Registration Desk 02."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: DOCUMENTS (Requirement 14 & 15)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "documents" && (
        <div className="max-w-3xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              ACCREDITATION AUDIT STATUS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY DOCUMENTS</h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3">
              <div>
                <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                  DOCUMENT VERIFICATION CHECKLIST
                </h4>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Physical original certificates verified by Registration Desk staff.
                </p>
              </div>
              <PixelBadge
                variant={documentsData?.summary?.allVerified ? "green" : "yellow"}
              >
                {documentsData?.summary?.totalVerified || 0} /{" "}
                {documentsData?.summary?.totalExpected || 4} VERIFIED
              </PixelBadge>
            </div>

            {/* Document Verification Cards (Status view only; NO public URLs, NO upload button) */}
            <div className="space-y-3">
              {documentsData?.documents?.map((doc: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-pixel-black/60 border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-pixel-orange-bright" />
                      <span className="font-pixel text-xs text-pixel-cream">{doc.label}</span>
                    </div>
                    <p className="font-mono text-[10px] text-pixel-muted">
                      TYPE: {doc.type} &bull;{" "}
                      {doc.updatedAt
                        ? `VERIFIED ON ${new Date(doc.updatedAt).toLocaleDateString()}`
                        : "NOT VERIFIED"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <PixelBadge variant={getStatusBadgeVariant(doc.status)}>
                      {doc.status}
                    </PixelBadge>
                  </div>
                </div>
              ))}
            </div>

            {/* Mandatory Security & Privacy Notice (Requirement 14 & 15) */}
            <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-2 text-xs font-sans text-pixel-gray-400">
              <h5 className="font-pixel text-[11px] text-pixel-cyan uppercase">
                DOCUMENT SECURITY PROTOCOL
              </h5>
              <p className="leading-relaxed">
                To guarantee cryptographic tamper-resistance and privacy compliance, digital document
                uploads by athletes are strictly prohibited. In accordance with South Zone Championship
                statutes, all student credentials, age proof documents, and medical fitness forms are
                physically inspected and certified at Registration Desk 02.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: PAYMENTS (Requirement 16 & 17 — NO TRANSPORT FEES!)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "payments" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              TOURNAMENT FINANCIAL LEDGERS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY PAYMENTS</h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pixel-gray-800 pb-4">
              <div>
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  APPLICABLE FEES SUMMARY
                </span>
                <h3 className="font-pixel text-sm text-pixel-cream mt-0.5">
                  TOTAL OUTSTANDING: ₹{(paymentsData?.summary?.totalBalance || 0).toLocaleString()}
                </h3>
              </div>
              <PixelBadge
                variant={paymentsData?.summary?.isSettled ? "green" : "yellow"}
              >
                {paymentsData?.summary?.isSettled ? "SETTLED IN FULL" : "SETTLEMENT PENDING"}
              </PixelBadge>
            </div>

            {/* Separate Fee Categories (REGISTRATION, ACCOMMODATION, MATCH) */}
            {/* STRICT DOMAIN RULE: Absolutely NO Transport payment! */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentsData?.ledgers?.map((ledger: any) => (
                <div
                  key={ledger.category}
                  className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-3 font-sans text-xs"
                >
                  <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                    <span className="font-pixel text-xs text-pixel-cream">{ledger.category}</span>
                    <PixelBadge variant={getStatusBadgeVariant(ledger.status)}>
                      {ledger.status}
                    </PixelBadge>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-pixel-muted">Amount Due:</span>
                      <span className="text-pixel-cream">₹{ledger.amountDue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pixel-muted">Amount Paid:</span>
                      <span className="text-pixel-green">₹{ledger.amountPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-pixel-gray-800 font-bold">
                      <span className="text-pixel-orange-bright">Balance:</span>
                      <span
                        className={ledger.balance > 0 ? "text-pixel-red" : "text-pixel-green"}
                      >
                        ₹{ledger.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Official Transactions History */}
            <div className="space-y-3 pt-2">
              <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                OFFICIAL FINANCE RECEIPTS & TRANSACTIONS
              </h4>

              {paymentsData?.transactions?.length === 0 ? (
                <div className="p-4 bg-pixel-black/40 border border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
                  NO PAYMENT TRANSACTIONS RECORDED
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentsData?.transactions?.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-pixel text-xs text-pixel-cream">
                            {t.category} FEE
                          </span>
                          <span className="font-mono text-[10px] text-pixel-cyan">
                            [{t.method}]
                          </span>
                          {t.receiptNumber && (
                            <span className="font-mono text-[10px] text-pixel-muted">
                              RCPT: {t.receiptNumber}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-pixel-muted block mt-0.5">
                          {new Date(t.date).toLocaleDateString()} {t.utr && `&bull; UTR: ${t.utr}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-pixel-green">
                          ₹{t.amount.toLocaleString()}
                        </span>
                        <PixelBadge variant="green">{t.status}</PixelBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Read-Only Notice (Requirement 17) */}
            <div className="p-3 bg-pixel-black/40 border border-pixel-gray-800 flex items-start gap-2.5 text-xs font-sans text-pixel-gray-400">
              <Info className="w-4 h-4 text-pixel-amber shrink-0 mt-0.5" />
              <span>
                Payment entries are managed exclusively by Finance Desk Officials. For audit
                compliance and anti-fraud protocols, participants cannot record manual payments or
                modify transaction values. Shuttles and airport transit are 100% complimentary
                university services and carry zero transport fees.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: ACCOMMODATION (Requirement 18 & 19)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "accommodation" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              HOSTEL RESIDENCE & BED ALLOCATION
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              MY ACCOMMODATION
            </h2>
          </div>

          {!accommodationData?.allocated ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center space-y-3 font-sans">
              <Home className="w-8 h-8 text-pixel-amber mx-auto" />
              <h3 className="font-pixel text-sm text-pixel-cream">NOT ALLOCATED</h3>
              <p className="text-xs text-pixel-gray-400 max-w-md mx-auto">
                Hostel room and bed allocation is currently pending warden desk verification. Please
                report to the Accommodation Desk at Shalmala Hostel upon contingent arrival.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pixel-gray-800 pb-4">
                <div>
                  <span className="text-[10px] font-pixel text-pixel-muted uppercase block">
                    ASSIGNED HOSTEL FACILITY
                  </span>
                  <h3 className="font-pixel text-base text-pixel-cream mt-0.5">
                    {accommodationData.accommodation.hostelName}
                  </h3>
                </div>
                <PixelBadge variant="green">ALLOCATION ACTIVE</PixelBadge>
              </div>

              {/* Dynamic Room, Floor, Bed & Capacity Readouts (No hardcoding!) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-xs">
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    HOSTEL WING
                  </span>
                  <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                    {accommodationData.accommodation.hostelName}
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    FLOOR LEVEL
                  </span>
                  <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                    {accommodationData.accommodation.floorName}
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    ROOM NUMBER
                  </span>
                  <span className="font-mono text-sm text-pixel-cyan font-bold mt-1 block">
                    {accommodationData.accommodation.roomNumber}
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    BED NUMBER
                  </span>
                  <span className="font-mono text-sm text-pixel-orange-bright font-bold mt-1 block">
                    {accommodationData.accommodation.bedNumber}
                  </span>
                </div>
              </div>

              {/* Roommates / Room Occupants (Privacy Protected) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                  <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                    ROOM OCCUPANTS (CAPACITY: {accommodationData.accommodation.roomCapacity} BEDS)
                  </h4>
                  <span className="font-mono text-[10px] text-pixel-muted">SAME DORM ROOM</span>
                </div>

                <div className="space-y-2">
                  {accommodationData.accommodation.roomOccupants?.map((occ: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 border flex items-center justify-between gap-3 text-xs font-sans ${
                        occ.isMe
                          ? "bg-pixel-orange-fiery/10 border-pixel-orange-fiery/80"
                          : "bg-pixel-black/50 border-pixel-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-pixel-cyan font-bold">
                          [{occ.bedNumber}]
                        </span>
                        <span className="font-pixel text-xs text-pixel-cream">{occ.name}</span>
                        {occ.isMe && (
                          <span className="px-1.5 py-0.2 bg-pixel-orange-fiery text-black font-pixel text-[9px] font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="font-sans text-[11px] text-pixel-gray-400">
                        {occ.institution}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-pixel-black/40 border border-pixel-gray-800 text-xs font-sans text-pixel-gray-400">
                {accommodationData.accommodation.wardenDeskNotice}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8: TRANSPORT (Requirement 20 — STRICTLY NO PAYMENT)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "transport" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              UNIVERSITY FLEET TRANSIT & SHUTTLES
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY TRANSPORT</h2>
          </div>

          {!transportData?.assigned ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center space-y-3 font-sans">
              <Bus className="w-8 h-8 text-pixel-cyan mx-auto" />
              <h3 className="font-pixel text-sm text-pixel-cream">NOT ASSIGNED</h3>
              <p className="text-xs text-pixel-gray-400 max-w-md mx-auto">
                Shuttle transit schedule dispatch is currently pending with the tournament transport
                coordinator. Shuttles run continuously between Hubballi Junction, Airport, Hostels,
                and the Badminton Arena.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pixel-gray-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-pixel-cyan font-bold">
                      {transportData.transport.tripCode}
                    </span>
                    <span className="font-pixel text-[10px] text-pixel-green">
                      &bull; 100% COMPLIMENTARY
                    </span>
                  </div>
                  <h3 className="font-pixel text-base text-pixel-cream mt-0.5">
                    {transportData.transport.routeName}
                  </h3>
                </div>
                <PixelBadge
                  variant={getStatusBadgeVariant(transportData.transport.boardingStatus)}
                >
                  BOARDING: {transportData.transport.boardingStatus}
                </PixelBadge>
              </div>

              {/* Transit Details Grid (Zero payment fields!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-xs">
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    PICKUP POINT
                  </span>
                  <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                    {transportData.transport.pickupPoint}
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    DROP DESTINATION
                  </span>
                  <span className="font-pixel text-xs text-pixel-cream mt-1 block">
                    {transportData.transport.dropPoint}
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    DEPARTURE TIME
                  </span>
                  <span className="font-mono text-xs text-pixel-cyan font-bold mt-1 block">
                    {transportData.transport.scheduledDeparture}
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                  <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    VEHICLE REG NO
                  </span>
                  <span className="font-mono text-xs text-pixel-cream font-bold mt-1 block">
                    {transportData.transport.vehicle.regNo}
                  </span>
                </div>
              </div>

              {/* Driver & Contact Information */}
              <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pixel-dark border border-pixel-gray-700 flex items-center justify-center font-pixel text-xs text-pixel-cyan">
                    BUS
                  </div>
                  <div>
                    <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                      ASSIGNED DRIVER & DISPATCH
                    </span>
                    <span className="font-pixel text-xs text-pixel-cream">
                      {transportData.transport.driver.name}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs text-pixel-cyan">
                  {transportData.transport.driver.phone}
                </span>
              </div>

              {/* Dispatch Notice (Zero payment guarantee!) */}
              <div className="p-3 bg-pixel-black/40 border border-pixel-gray-800 text-xs font-sans text-pixel-gray-400">
                {transportData.transport.dispatchNotice}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9: MATCHES (Requirement 21, 22, 23)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "matches" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                OFFICIAL TOURNAMENT SCHEDULE
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY MATCHES</h2>
            </div>
            <span className="font-mono text-[10px] text-pixel-muted">READ-ONLY VIEWER</span>
          </div>

          {/* LIVE NOW BANNER */}
          {matchesData?.liveMatch && (
            <div className="p-5 bg-pixel-orange-fiery/15 border-2 border-pixel-orange-fiery space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-pixel-orange-fiery animate-pulse" />
                  <span className="font-pixel text-xs text-pixel-orange-bright uppercase tracking-wider">
                    CURRENTLY LIVE ON COURT
                  </span>
                </div>
                <span className="font-mono text-xs text-pixel-cyan font-bold">
                  {matchesData.liveMatch.court}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-center">
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 text-left">
                  <p className="font-pixel text-xs text-pixel-cream">
                    {matchesData.liveMatch.playerA}
                  </p>
                  <p className="font-sans text-[11px] text-pixel-muted truncate">
                    {matchesData.liveMatch.institutionA}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-lg text-pixel-orange-bright font-bold">
                    {matchesData.liveMatch.scoreA || "0"} - {matchesData.liveMatch.scoreB || "0"}
                  </span>
                  <span className="font-pixel text-[9px] text-pixel-muted block">
                    OFFICIAL SCORESTREAM
                  </span>
                </div>
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 text-right">
                  <p className="font-pixel text-xs text-pixel-cream">
                    {matchesData.liveMatch.playerB}
                  </p>
                  <p className="font-sans text-[11px] text-pixel-muted truncate">
                    {matchesData.liveMatch.institutionB}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fixtures List */}
          <div className="space-y-4">
            <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
              UPCOMING & ACTIVE FIXTURES
            </h4>

            {!matchesData?.upcoming || matchesData.upcoming.length === 0 ? (
              <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
                NO MATCHES SCHEDULED: Tournament draw fixtures pending official release by Technical
                Officials.
              </div>
            ) : (
              <div className="space-y-3">
                {matchesData.upcoming.map((match: any) => (
                  <div
                    key={match.id}
                    className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3 font-sans text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pixel-gray-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs text-pixel-orange-bright">
                          {match.court}
                        </span>
                        <span className="text-pixel-muted">&bull;</span>
                        <span className="font-mono text-[11px] text-pixel-cyan font-bold">
                          {match.time} ({match.date})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-pixel-muted">
                          {match.category}
                        </span>
                        <PixelBadge variant={getStatusBadgeVariant(match.status)}>
                          {match.status}
                        </PixelBadge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                          OPPONENT
                        </span>
                        <p className="font-pixel text-xs text-pixel-cream mt-0.5">
                          {match.opponentName}
                        </p>
                        <p className="font-sans text-[11px] text-pixel-muted truncate">
                          {match.opponentInstitution}
                        </p>
                      </div>

                      <div className="sm:text-right font-mono text-[11px] text-pixel-muted">
                        STAGE: {match.stage} &bull; MATCH: {match.matchNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10: RESULTS (Requirement 24)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "results" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                OFFICIAL MATCH OUTCOMES
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">MY RESULTS</h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-pixel-green font-bold">WINS: {resultsData?.wins || 0}</span>
              <span className="text-pixel-red font-bold">LOSSES: {resultsData?.losses || 0}</span>
            </div>
          </div>

          {!resultsData?.results || resultsData.results.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO RESULTS: No completed tournament ties recorded for this participant yet.
            </div>
          ) : (
            <div className="space-y-3">
              {resultsData.results.map((res: any) => (
                <div
                  key={res.id}
                  className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3 font-sans text-xs"
                >
                  <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs text-pixel-cream">
                        {res.category} &bull; {res.stage}
                      </span>
                      <span className="font-mono text-[10px] text-pixel-muted">
                        ({res.date} &bull; {res.court})
                      </span>
                    </div>
                    <PixelBadge variant={res.myResult === "WON" ? "green" : "red"}>
                      {res.myResult}
                    </PixelBadge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                        OPPONENT
                      </span>
                      <p className="font-pixel text-xs text-pixel-cream mt-0.5">{res.opponent}</p>
                      <p className="font-sans text-[11px] text-pixel-muted">
                        {res.opponentInstitution}
                      </p>
                    </div>

                    <div className="sm:text-right font-mono text-xs">
                      <span className="text-pixel-muted block text-[10px]">SETS SCORE:</span>
                      <span className="text-pixel-cyan font-bold">
                        {res.scoreA || "0"} - {res.scoreB || "0"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 11: TOURNAMENT PASS (Requirement 25 & 26 — OPAQUE QR)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "pass" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 text-center">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL DIGITAL ACCREDITATION
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TOURNAMENT ACCREDITATION PASS
            </h2>
          </div>

          {/* Secure Digital Badge Pass */}
          <div className="bg-pixel-dark border-4 border-pixel-orange-fiery p-6 space-y-6 shadow-pixel-orange relative overflow-hidden">
            {/* Header */}
            <div className="text-center border-b-2 border-pixel-gray-800 pb-4 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-pixel text-[9px] text-pixel-orange-bright tracking-widest uppercase">
                <Flame className="w-3.5 h-3.5 text-pixel-orange-fiery" />
                <span>SOUTH ZONE BADMINTON CHAMPIONSHIP 2026</span>
              </div>
              <h3 className="font-pixel text-sm sm:text-base text-pixel-cream tracking-wide">
                ATHLETE ACCREDITATION BADGE
              </h3>
            </div>

            {/* Athlete Info */}
            <div className="space-y-1.5 text-center">
              <h4 className="font-pixel text-lg text-pixel-cream">
                {passData?.fullName || participant?.name}
              </h4>
              <p className="font-mono text-xs text-pixel-cyan font-bold">
                PLAYER ID: {passData?.playerId || participant?.playerId}
              </p>
              <p className="font-sans text-xs text-pixel-gray-400">
                {passData?.institution || participant?.institution}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="px-2 py-0.5 bg-pixel-black border border-pixel-gray-700 font-pixel text-[10px] text-pixel-cream">
                  {passData?.teamName || "Independent"}
                </span>
                <span className="px-2 py-0.5 bg-pixel-black border border-pixel-gray-700 font-pixel text-[10px] text-pixel-orange-bright">
                  ROLE: {passData?.role || "PLAYER"}
                </span>
                <PixelBadge variant={getStatusBadgeVariant(passData?.accreditationStatus)}>
                  {passData?.accreditationStatus || "APPROVED"}
                </PixelBadge>
              </div>
            </div>

            {/* Authentic SVG QR Code (Requirement 25 & 26) */}
            {/* CRITICAL: ONLY OPAQUE TOKEN IS ENCODED. ZERO PII IN QR PAYLOAD! */}
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="p-3 bg-pixel-cream border-4 border-black shadow-pixel-sm">
                <PixelQR
                  value={passData?.qrToken || `sz26_qr_pt_${participant?.id || "ananya"}`}
                  size={190}
                  fgColor="#050914"
                  bgColor="#F4E6CE"
                />
              </div>
              <span className="font-mono text-[9px] text-pixel-muted">
                TOKEN: {passData?.qrToken || "sz26_qr_pt_authenticated"}
              </span>
            </div>

            {/* Cryptographic Security Statement */}
            <div className="border-t border-pixel-gray-800 pt-3 text-center space-y-1 text-pixel-muted font-sans text-[11px]">
              <p className="font-mono text-[10px] text-pixel-cyan">
                SECURE CRYPTOGRAPHIC TOKEN &bull; SERVER-RESOLVED
              </p>
              <p className="leading-tight text-[10px]">
                {passData?.securityNotice ||
                  "This QR pass encodes exclusively an opaque authentication token. No personal details, room keys, or banking information are stored on this code."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 12: ANNOUNCEMENTS (Requirement 27)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "announcements" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                OFFICIAL COMMUNICATIONS
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                TOURNAMENT ANNOUNCEMENTS
              </h2>
            </div>
            <span className="font-mono text-xs text-pixel-cyan">
              {announcementsData.length} BULLETINS
            </span>
          </div>

          {announcementsData.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO ANNOUNCEMENTS: Tournament bulletin board is up to date.
            </div>
          ) : (
            <div className="space-y-4">
              {announcementsData.map((a: any) => (
                <div
                  key={a.id}
                  className="p-5 bg-pixel-dark border border-pixel-gray-800 space-y-3 font-sans text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pixel-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-pixel-orange-fiery/20 border border-pixel-orange-fiery font-pixel text-[9px] text-pixel-orange-bright">
                        {a.category}
                      </span>
                      <h4 className="font-pixel text-xs sm:text-sm text-pixel-cream">{a.title}</h4>
                    </div>
                    <span className="font-mono text-[10px] text-pixel-muted">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-pixel-gray-300 leading-relaxed whitespace-pre-line">
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 13: SUPPORT (Requirement 30 & 31 — PRIVATE TICKETS)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "support" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              ATHLETE ASSISTANCE & HELPDESK
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TOURNAMENT SUPPORT
            </h2>
          </div>

          {/* Official Contact Channels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supportData?.contactChannels?.map((ch: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-2 font-sans text-xs"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pixel-orange-bright shrink-0" />
                  <h4 className="font-pixel text-xs text-pixel-cream">{ch.channel}</h4>
                </div>
                <p className="text-pixel-gray-400 text-[11px]">{ch.location}</p>
                <div className="flex items-center justify-between pt-1 border-t border-pixel-gray-800 font-mono text-[10px]">
                  <span className="text-pixel-cyan">{ch.email}</span>
                  <span className="text-pixel-muted">{ch.hours}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Submit New Support Request */}
          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-4">
            <div className="border-b border-pixel-gray-800 pb-2">
              <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                REPORT AN OPERATIONAL ISSUE OR QUERY
              </h4>
              <p className="font-sans text-xs text-pixel-gray-400 mt-0.5">
                Tickets are private and accessible exclusively by you and tournament support staff.
              </p>
            </div>

            {ticketSuccess && (
              <div className="p-3 bg-pixel-green/10 border border-pixel-green text-xs font-sans text-pixel-green">
                {ticketSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    QUERY SUBJECT
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="e.g. Hostel room keycard query / Shuttle timing"
                    className="w-full px-3 py-2 bg-pixel-black border border-pixel-gray-700 text-pixel-cream font-sans text-xs focus:border-pixel-orange-fiery outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-pixel text-[10px] text-pixel-muted uppercase block">
                    CATEGORY
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-pixel-black border border-pixel-gray-700 text-pixel-cream font-sans text-xs focus:border-pixel-orange-fiery outline-none"
                  >
                    <option value="REGISTRATION">REGISTRATION</option>
                    <option value="ACCOMMODATION">ACCOMMODATION</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="MATCH">MATCH FIXTURES</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  DETAILS & CONTEXT
                </label>
                <textarea
                  required
                  rows={3}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue with relevant specifics..."
                  className="w-full px-3 py-2 bg-pixel-black border border-pixel-gray-700 text-pixel-cream font-sans text-xs focus:border-pixel-orange-fiery outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTicket}
                className="px-4 py-2 bg-pixel-orange-fiery text-black font-pixel text-xs hover:bg-pixel-orange-bright transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingTicket ? "SUBMITTING..." : "SUBMIT TICKET"}</span>
              </button>
            </form>
          </div>

          {/* Participant's Own Tickets (Requirement 31 — Strictly Own Records) */}
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
              MY SUPPORT TICKETS ({supportData?.tickets?.length || 0})
            </h4>

            {!supportData?.tickets || supportData.tickets.length === 0 ? (
              <div className="p-6 bg-pixel-dark border border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
                NO ACTIVE SUPPORT TICKETS
              </div>
            ) : (
              <div className="space-y-2">
                {supportData.tickets.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-2 font-sans text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-pixel-cyan font-bold">{t.id}</span>
                        <span className="font-pixel text-xs text-pixel-cream">{t.subject}</span>
                      </div>
                      <PixelBadge variant={t.status === "RESOLVED" ? "green" : "yellow"}>
                        {t.status}
                      </PixelBadge>
                    </div>
                    <p className="text-pixel-gray-400">{t.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-pixel-gray-800 text-[10px] font-mono text-pixel-muted">
                      <span>CATEGORY: {t.category}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 14: SETTINGS (Requirement 32)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "settings" && (
        <div className="max-w-2xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              ATHLETE SECURITY & SESSION
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              ACCOUNT SETTINGS
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6 font-sans text-xs">
            <div className="space-y-3">
              <h4 className="font-pixel text-xs text-pixel-cream">AUTHENTICATED CREDENTIALS</h4>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-pixel-muted">Logged In User:</span>
                  <span className="font-pixel text-pixel-cream">{participant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-muted">Account Email:</span>
                  <span className="font-mono text-pixel-cyan">{participant?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-muted">Security Role:</span>
                  <span className="font-pixel text-pixel-orange-bright">PARTICIPANT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-muted">Session Isolation:</span>
                  <span className="font-mono text-pixel-green">ENFORCED (OWNER ONLY)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="font-pixel text-xs text-pixel-cream">DEVICE & ACCREDITATION SAFETY</h4>
              <p className="text-pixel-gray-400 leading-relaxed text-[11px]">
                Do not share your tournament QR pass or credentials with anyone. Authorized desk
                officials scan tokens directly at tournament checkpoints.
              </p>
            </div>
          </div>
        </div>
      )}
    </ParticipantPortalShell>
  );
}

export default function ParticipantDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-pixel-black text-pixel-cream flex items-center justify-center p-4">
          <div className="font-pixel text-xs text-pixel-orange-bright animate-pulse">
            LOADING ATHLETE CONTROL CENTER...
          </div>
        </div>
      }
    >
      <ParticipantDashboardContent />
    </Suspense>
  );
}
