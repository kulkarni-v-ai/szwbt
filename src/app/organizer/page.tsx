"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  Shield,
  Users,
  UserCheck,
  CheckCircle2,
  Home,
  Bus,
  Calendar,
  Flame,
  Activity,
  Megaphone,
  AlertTriangle,
  Zap,
  Clock,
  HelpCircle,
  BarChart3,
  User,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Send,
  Search,
  Filter,
  Eye,
  Info,
  Building,
  MapPin,
  TrendingUp,
} from "lucide-react";
import {
  OrganizerPortalShell,
  OrganizerHudIndicators,
} from "@/components/organizer/OrganizerPortalShell";
import { PixelBadge } from "@/components/pixel/PixelBadge";

function OrganizerDashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";

  const [currentTab, setCurrentTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync tab with search params
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
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [participantsData, setParticipantsData] = useState<any[]>([]);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [accommodationData, setAccommodationData] = useState<any>(null);
  const [transportData, setTransportData] = useState<any>(null);
  const [matchesData, setMatchesData] = useState<any>(null);
  const [resultsData, setResultsData] = useState<any>(null);
  const [announcementsData, setAnnouncementsData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);
  const [supportData, setSupportData] = useState<any>(null);

  // Announcement creation form state
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnAudience, setNewAnnAudience] = useState("ALL");
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [annSuccessMsg, setAnnSuccessMsg] = useState<string | null>(null);

  // Fetch initial overview
  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/organizer");
      if (res.status === 401 || res.status === 403) {
        setError(
          res.status === 403
            ? "403 Forbidden: Only authorized Tournament Organizers or Super Administrators can access the operations command center."
            : "Authentication required. Please sign in."
        );
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOverviewData(data);
      } else {
        setError(data.error || "Failed to load tournament telemetry.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading organizer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Fetch tab-specific data on tab switch
  useEffect(() => {
    async function loadTabData() {
      try {
        if (currentTab === "teams" && teamsData.length === 0) {
          const res = await fetch("/api/organizer/teams");
          const data = await res.json();
          if (data.success) setTeamsData(data.teams);
        } else if (currentTab === "participants" && participantsData.length === 0) {
          const res = await fetch("/api/organizer/participants");
          const data = await res.json();
          if (data.success) setParticipantsData(data.participants);
        } else if (currentTab === "registration" && !registrationData) {
          const res = await fetch("/api/organizer/registration");
          const data = await res.json();
          if (data.success) setRegistrationData(data);
        } else if (currentTab === "accommodation" && !accommodationData) {
          const res = await fetch("/api/organizer/accommodation");
          const data = await res.json();
          if (data.success) setAccommodationData(data);
        } else if (currentTab === "transport" && !transportData) {
          const res = await fetch("/api/organizer/transport");
          const data = await res.json();
          if (data.success) setTransportData(data);
        } else if ((currentTab === "matches" || currentTab === "schedule" || currentTab === "live-matches") && !matchesData) {
          const res = await fetch("/api/organizer/matches");
          const data = await res.json();
          if (data.success) setMatchesData(data);
        } else if (currentTab === "results" && !resultsData) {
          const res = await fetch("/api/organizer/results");
          const data = await res.json();
          if (data.success) setResultsData(data);
        } else if (currentTab === "announcements" && !announcementsData) {
          const res = await fetch("/api/organizer/announcements");
          const data = await res.json();
          if (data.success) setAnnouncementsData(data);
        } else if (currentTab === "activity" && activityData.length === 0) {
          const res = await fetch("/api/organizer/activity");
          const data = await res.json();
          if (data.success) setActivityData(data.activities);
        } else if (currentTab === "reports" && !reportsData) {
          const res = await fetch("/api/organizer/reports");
          const data = await res.json();
          if (data.success) setReportsData(data);
        } else if (currentTab === "support" && !supportData) {
          const res = await fetch("/api/organizer/support");
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
    teamsData.length,
    participantsData.length,
    registrationData,
    accommodationData,
    transportData,
    matchesData,
    resultsData,
    announcementsData,
    activityData.length,
    reportsData,
    supportData,
  ]);

  // Handle Announcement Creation
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    try {
      setCreatingAnnouncement(true);
      setAnnSuccessMsg(null);
      const res = await fetch("/api/organizer/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAnnTitle.trim(),
          content: newAnnContent.trim(),
          targetAudience: newAnnAudience,
          isPublished: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnnSuccessMsg("Official announcement broadcast successfully.");
        setNewAnnTitle("");
        setNewAnnContent("");
        // Reload announcements
        const annRes = await fetch("/api/organizer/announcements");
        const annData = await annRes.json();
        if (annData.success) setAnnouncementsData(annData);
      }
    } catch (err) {
      console.error("Failed to broadcast announcement:", err);
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "READY":
      case "APPROVED":
        return "green";
      case "LIVE":
        return "orange";
      case "UPCOMING":
      case "ON TRACK":
      case "SCHEDULED":
      case "IN PROGRESS":
        return "yellow";
      case "ACTION REQUIRED":
      case "CRITICAL":
      case "FAILED":
      case "REJECTED":
        return "red";
      default:
        return "dark";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-pixel-black text-pixel-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-pixel-dark border-2 border-pixel-red text-center space-y-4 shadow-pixel">
          <div className="w-12 h-12 mx-auto bg-pixel-red/20 border-2 border-pixel-red flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-pixel-red" />
          </div>
          <h2 className="font-pixel text-sm text-pixel-cream tracking-wide">
            ORGANIZER ACCESS RESTRICTED
          </h2>
          <p className="text-xs text-pixel-gray-400 font-sans leading-relaxed">{error}</p>
          <div className="pt-2">
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-pixel-orange-fiery text-black font-pixel text-xs hover:bg-pixel-orange-bright transition-colors"
            >
              Sign In to Organizer Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !overviewData) {
    return (
      <div className="min-h-screen bg-pixel-black text-pixel-cream flex flex-col">
        <div className="h-14 bg-pixel-dark border-b-2 border-pixel-orange-fiery animate-pulse" />
        <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="h-32 bg-pixel-dark border border-pixel-gray-800 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-pixel-dark border border-pixel-gray-800 animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-pixel-dark border border-pixel-gray-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const tournament = overviewData?.tournament;
  const snapshot = overviewData?.snapshot || {};
  const indicators: OrganizerHudIndicators = overviewData?.indicators || {
    registration: "CHECKING",
    accommodation: "CHECKING",
    transport: "CHECKING",
    matches: "CHECKING",
  };
  const health = overviewData?.health || [];
  const actionItems = overviewData?.actionItems || [];
  const alerts = overviewData?.alerts || [];
  const liveMatches = overviewData?.liveMatches || [];
  const upcomingMatches = overviewData?.upcomingMatches || [];

  return (
    <OrganizerPortalShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      tournamentStatus={tournament?.status || "LIVE"}
      indicators={indicators}
      unreadCount={actionItems.length}
      alertsCount={alerts.length}
      onRefresh={loadOverview}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: OVERVIEW TAB (COMMAND CENTER HERO & SNAPSHOT)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "overview" && (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* 8. COMMAND CENTER HERO */}
          <div className="relative overflow-hidden bg-pixel-dark border-2 border-pixel-orange-fiery p-5 sm:p-7 shadow-pixel-orange">
            <div className="absolute inset-0 bg-[radial-gradient(#18D8D0_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-pixel-orange-fiery/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-pixel-orange-fiery animate-pulse" />
                  <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest">
                    ORGANIZER CONTROL ROOM &bull; SOUTH ZONE 2026
                  </span>
                </div>
                <h1 className="font-pixel text-xl sm:text-2xl lg:text-3xl text-pixel-cream tracking-wide">
                  TOURNAMENT CONTROL CENTER
                </h1>
                <p className="text-xs text-pixel-gray-400 font-sans flex items-center gap-2">
                  <span>{tournament?.name}</span>
                  <span>&bull;</span>
                  <span className="text-pixel-cyan">{tournament?.venue}</span>
                </p>
              </div>

              {/* Status and Synchronized Timestamp */}
              <div className="flex flex-row md:flex-col items-start md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-pixel-gray-800">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-pixel-muted">STATUS:</span>
                  <PixelBadge variant={getStatusBadgeVariant(tournament?.status)}>
                    {tournament?.status}
                  </PixelBadge>
                </div>
                <span className="font-mono text-[10px] text-pixel-muted">
                  TELEMETRY SYNC: {new Date(tournament?.lastSynchronized).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* 9. GLOBAL TOURNAMENT SNAPSHOT (9 Real Operational Metric Cards) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest">
                GLOBAL OPERATIONAL SNAPSHOT
              </span>
              <span className="font-mono text-[10px] text-pixel-muted">REAL BACKEND TELEMETRY</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {/* Teams */}
              <div
                onClick={() => setCurrentTab("teams")}
                className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer"
              >
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  REGISTERED TEAMS
                </span>
                <p className="font-pixel text-lg text-pixel-cream mt-1">
                  {snapshot.registeredTeams ?? "—"}
                </p>
                <span className="font-mono text-[10px] text-pixel-cyan">Contingents</span>
              </div>

              {/* Participants */}
              <div
                onClick={() => setCurrentTab("participants")}
                className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer"
              >
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  TOTAL PARTICIPANTS
                </span>
                <p className="font-pixel text-lg text-pixel-cream mt-1">
                  {snapshot.registeredParticipants ?? "—"}
                </p>
                <span className="font-mono text-[10px] text-pixel-orange-bright">Accreditation</span>
              </div>

              {/* Completed Registrations */}
              <div
                onClick={() => setCurrentTab("registration")}
                className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer"
              >
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  COMPLETED REGISTRATIONS
                </span>
                <p className="font-pixel text-lg text-pixel-green mt-1">
                  {snapshot.completedRegistrations ?? "—"}
                </p>
                <span className="font-mono text-[10px] text-pixel-muted">
                  Pending: {snapshot.pendingRegistrations ?? 0}
                </span>
              </div>

              {/* Accommodation */}
              <div
                onClick={() => setCurrentTab("accommodation")}
                className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer"
              >
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  ACCOMMODATION ALLOCATED
                </span>
                <p className="font-pixel text-lg text-pixel-amber mt-1">
                  {snapshot.allocatedBeds ?? "—"}
                </p>
                <span className="font-mono text-[10px] text-pixel-muted">
                  Total Configured: {snapshot.totalConfiguredBeds ?? 0} Beds
                </span>
              </div>

              {/* Transport */}
              <div
                onClick={() => setCurrentTab("transport")}
                className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer"
              >
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  TRANSPORT ASSIGNED
                </span>
                <p className="font-pixel text-lg text-pixel-cyan mt-1">
                  {snapshot.transportPassengers ?? "—"}
                </p>
                <span className="font-mono text-[10px] text-pixel-green">100% Free Fleet</span>
              </div>

              {/* Live & Scheduled Matches */}
              <div
                onClick={() => setCurrentTab("matches")}
                className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery/70 transition-colors cursor-pointer"
              >
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">
                  MATCH OPERATIONS
                </span>
                <p className="font-pixel text-lg text-pixel-orange-bright mt-1">
                  {snapshot.liveMatches ?? 0} LIVE / {snapshot.scheduledMatches ?? 0} SCH
                </p>
                <span className="font-mono text-[10px] text-pixel-muted">
                  Completed: {snapshot.completedMatches ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* 10. TOURNAMENT HEALTH */}
          <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3">
              <div>
                <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                  CROSS-DEPARTMENTAL HEALTH
                </span>
                <h3 className="font-pixel text-sm text-pixel-cream tracking-wide">
                  OPERATIONAL TOURNAMENT HEALTH
                </h3>
              </div>
              <span className="font-mono text-[10px] text-pixel-muted">
                5 CRITICAL LOGISTICS DIMENSIONS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {health.map((item: any, i: number) => (
                <div
                  key={i}
                  onClick={() => setCurrentTab(item.tab)}
                  className="p-3 bg-pixel-black/60 border border-pixel-gray-800 hover:border-pixel-orange-fiery/60 cursor-pointer transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs text-pixel-cream">{item.dimension}</span>
                    <PixelBadge variant={getStatusBadgeVariant(item.status)}>
                      {item.status}
                    </PixelBadge>
                  </div>
                  <p className="font-sans text-xs text-pixel-gray-400">{item.metric}</p>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-pixel-gray-900 border border-pixel-gray-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        item.status === "READY"
                          ? "bg-pixel-green"
                          : item.status === "ACTION REQUIRED"
                          ? "bg-pixel-red"
                          : "bg-pixel-orange-bright"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 11. ACTION CENTER & 12. OPERATIONAL ALERTS (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Center */}
            <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-pixel-orange-bright" />
                  <h3 className="font-pixel text-xs text-pixel-cream tracking-wide">
                    ACTION CENTER ({actionItems.length})
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-pixel-muted">ATTENTION REQUIRED</span>
              </div>

              {actionItems.length === 0 ? (
                <p className="font-pixel text-xs text-pixel-muted py-6 text-center">
                  NO ACTION ITEMS PENDING
                </p>
              ) : (
                <div className="space-y-2">
                  {actionItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PixelBadge variant={item.priority === "HIGH" ? "red" : "yellow"}>
                            {item.module}
                          </PixelBadge>
                          <span className="font-pixel text-xs text-pixel-cream">{item.title}</span>
                        </div>
                        <p className="text-pixel-gray-400">{item.description}</p>
                      </div>

                      <button
                        onClick={() => setCurrentTab(item.actionTab)}
                        className="px-3 py-1 bg-pixel-dark border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-cream font-pixel text-[10px] self-start sm:self-auto shrink-0 transition-colors cursor-pointer"
                      >
                        {item.actionText} &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operational Alerts */}
            <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-pixel-red" />
                  <h3 className="font-pixel text-xs text-pixel-cream tracking-wide">
                    OPERATIONAL ALERTS ({alerts.length})
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-pixel-muted">LOGISTICS FEEDS</span>
              </div>

              {alerts.length === 0 ? (
                <p className="font-pixel text-xs text-pixel-muted py-6 text-center">
                  NO OPERATIONAL ALERTS
                </p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((al: any) => (
                    <div
                      key={al.id}
                      className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-2.5 text-xs font-sans"
                    >
                      <span className="font-pixel text-[9px] px-1.5 py-0.5 border text-pixel-amber border-pixel-amber shrink-0 mt-0.5">
                        {al.level}
                      </span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-pixel-cyan font-bold">
                            [{al.module}]
                          </span>
                          <span className="font-mono text-[10px] text-pixel-muted">{al.time}</span>
                        </div>
                        <p className="text-pixel-cream leading-tight">{al.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 23. LIVE MATCHES NOW BANNER & UPCOMING SCHEDULE */}
          {liveMatches.length > 0 && (
            <div className="p-5 bg-pixel-orange-fiery/15 border-2 border-pixel-orange-fiery space-y-3">
              <div className="flex items-center justify-between border-b border-pixel-orange-fiery/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-pixel-orange-fiery animate-pulse" />
                  <h3 className="font-pixel text-xs text-pixel-orange-bright uppercase tracking-wider">
                    LIVE MATCHES ON COURT ({liveMatches.length})
                  </h3>
                </div>
                <button
                  onClick={() => setCurrentTab("live-matches")}
                  className="font-pixel text-[10px] text-pixel-cream hover:underline cursor-pointer"
                >
                  FULL VIEW &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {liveMatches.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 bg-pixel-black/70 border border-pixel-gray-800 space-y-2 text-xs font-sans"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-pixel-orange-bright">{m.court}</span>
                      <span className="font-mono text-[10px] text-pixel-cyan">
                        {m.matchNumber} ({m.category})
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-center">
                      <div className="text-left w-2/5 truncate">
                        <p className="font-pixel text-xs text-pixel-cream truncate">{m.playerA}</p>
                        <p className="font-mono text-[10px] text-pixel-muted truncate">{m.institutionA}</p>
                      </div>

                      <div className="font-mono text-sm text-pixel-orange-bright font-bold px-2 shrink-0">
                        {m.scoreA || "0"} - {m.scoreB || "0"}
                      </div>

                      <div className="text-right w-2/5 truncate">
                        <p className="font-pixel text-xs text-pixel-cream truncate">{m.playerB}</p>
                        <p className="font-mono text-[10px] text-pixel-muted truncate">{m.institutionB}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: TOURNAMENT STATUS TAB
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "tournament" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              CHAMPIONSHIP SPECIFICATIONS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TOURNAMENT STATUS & INFRASTRUCTURE
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-5 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">CHAMPIONSHIP</span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">{tournament?.name}</span>
              </div>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">VENUE</span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">{tournament?.venue}</span>
              </div>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">OPERATIONAL STATUS</span>
                <span className="font-pixel text-xs text-pixel-orange-bright mt-1 block">{tournament?.status}</span>
              </div>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">CURRENT PHASE</span>
                <span className="font-pixel text-xs text-pixel-cream mt-1 block">{tournament?.phase}</span>
              </div>
            </div>

            <div className="p-4 bg-pixel-black/40 border border-pixel-gray-800 space-y-2 text-pixel-gray-400">
              <h4 className="font-pixel text-xs text-pixel-cyan uppercase">ORGANIZER COORDINATION NOTICE</h4>
              <p className="leading-relaxed">
                The Organizer Control Center integrates real-time telemetry across all 8 competition courts, 2 hostel accommodation wings, and airport/station fleet shuttles. Cross-departmental records update continuously.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: TEAMS TAB (Requirement 15)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "teams" && (
        <div className="max-w-6xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                COLLEGIATE CONTINGENTS
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                PARTICIPATING TEAMS ({teamsData.length})
              </h2>
            </div>
          </div>

          {teamsData.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO TEAMS FOUND
            </div>
          ) : (
            <div className="overflow-x-auto bg-pixel-dark border-2 border-pixel-gray-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-pixel-black border-b border-pixel-gray-800 font-pixel text-[10px] text-pixel-muted uppercase">
                  <tr>
                    <th className="p-3">TEAM / CODE</th>
                    <th className="p-3">INSTITUTION</th>
                    <th className="p-3">STATE</th>
                    <th className="p-3">MANAGER</th>
                    <th className="p-3">CAPTAIN</th>
                    <th className="p-3 text-center">MEMBERS</th>
                    <th className="p-3 text-center">BEDS</th>
                    <th className="p-3 text-center">SHUTTLE</th>
                    <th className="p-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pixel-gray-800">
                  {teamsData.map((team) => (
                    <tr key={team.id} className="hover:bg-pixel-black/40 transition-colors">
                      <td className="p-3">
                        <span className="font-pixel text-xs text-pixel-cream block">{team.name}</span>
                        <span className="font-mono text-[10px] text-pixel-cyan">{team.teamCode}</span>
                      </td>
                      <td className="p-3 text-pixel-gray-300">{team.institution}</td>
                      <td className="p-3 text-pixel-gray-300">{team.state}</td>
                      <td className="p-3 text-pixel-gray-300">{team.managerName}</td>
                      <td className="p-3 text-pixel-gray-300">{team.captainName}</td>
                      <td className="p-3 text-center font-mono text-pixel-cream font-bold">
                        {team.memberCount}
                      </td>
                      <td className="p-3 text-center font-mono text-pixel-amber">
                        {team.bedAllocationsCount}
                      </td>
                      <td className="p-3 text-center font-mono text-pixel-cyan">
                        {team.transportBookingsCount}
                      </td>
                      <td className="p-3">
                        <PixelBadge variant={getStatusBadgeVariant(team.status)}>
                          {team.status}
                        </PixelBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: PARTICIPANTS TAB (Requirement 16)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "participants" && (
        <div className="max-w-6xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                ATHLETE ACCREDITATION ROSTER
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                PARTICIPANTS ({participantsData.length})
              </h2>
            </div>
          </div>

          {participantsData.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO PARTICIPANTS FOUND
            </div>
          ) : (
            <div className="overflow-x-auto bg-pixel-dark border-2 border-pixel-gray-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-pixel-black border-b border-pixel-gray-800 font-pixel text-[10px] text-pixel-muted uppercase">
                  <tr>
                    <th className="p-3">ATHLETE / ID</th>
                    <th className="p-3">CONTINGENT</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">STATE</th>
                    <th className="p-3">ACCOMMODATION</th>
                    <th className="p-3">TRANSPORT</th>
                    <th className="p-3">REGISTRATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pixel-gray-800">
                  {participantsData.map((p) => (
                    <tr key={p.id} className="hover:bg-pixel-black/40 transition-colors">
                      <td className="p-3">
                        <span className="font-pixel text-xs text-pixel-cream block">{p.name}</span>
                        <span className="font-mono text-[10px] text-pixel-cyan font-bold">{p.playerId}</span>
                      </td>
                      <td className="p-3 text-pixel-gray-300">
                        <span>{p.teamName}</span>
                        <span className="block text-[10px] text-pixel-muted">{p.institution}</span>
                      </td>
                      <td className="p-3 font-mono text-pixel-orange-bright text-[11px]">{p.category}</td>
                      <td className="p-3 text-pixel-gray-300">{p.state}</td>
                      <td className="p-3 text-pixel-gray-300 text-[11px]">{p.accommodation}</td>
                      <td className="p-3 text-pixel-gray-300 text-[11px]">{p.transport}</td>
                      <td className="p-3">
                        <PixelBadge variant={getStatusBadgeVariant(p.registrationStatus)}>
                          {p.registrationStatus}
                        </PixelBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: REGISTRATION OPERATIONS (Requirement 13 & 14)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "registration" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              ACCREDITATION DESK OPERATIONS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              REGISTRATION OPERATIONS & READINESS
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase block">TOTAL ATHLETES</span>
              <p className="font-pixel text-xl text-pixel-cream mt-1">{registrationData?.summary?.total || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-green uppercase block">ACCREDITED</span>
              <p className="font-pixel text-xl text-pixel-green mt-1">{registrationData?.summary?.approved || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-amber uppercase block">DESK PENDING</span>
              <p className="font-pixel text-xl text-pixel-amber mt-1">{registrationData?.summary?.pending || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-cyan uppercase block">COMPLETION RATE</span>
              <p className="font-pixel text-xl text-pixel-cyan mt-1">{registrationData?.summary?.completionRate || 0}%</p>
            </div>
          </div>

          {/* Breakdown by Category */}
          <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-3">
            <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">CONTEST CATEGORY DISTRIBUTION</h4>
            <div className="space-y-2 font-sans text-xs">
              {registrationData?.categories?.map((cat: any, i: number) => (
                <div key={i} className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex justify-between items-center">
                  <span className="font-pixel text-xs text-pixel-cream">{cat.category}</span>
                  <span className="font-mono text-xs text-pixel-cyan font-bold">{cat.count} ATHLETES</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: ACCOMMODATION (Requirement 18 & 19)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "accommodation" && (
        <div className="max-w-5xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              HOSTEL RESIDENCES & CAPACITY
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              ACCOMMODATION OPERATIONS
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase block">CONFIGURED BEDS</span>
              <p className="font-pixel text-xl text-pixel-cream mt-1">{accommodationData?.summary?.totalCapacity || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-green uppercase block">OCCUPIED BEDS</span>
              <p className="font-pixel text-xl text-pixel-green mt-1">{accommodationData?.summary?.occupiedBeds || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-amber uppercase block">AVAILABLE BEDS</span>
              <p className="font-pixel text-xl text-pixel-amber mt-1">{accommodationData?.summary?.availableBeds || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-red uppercase block">UNALLOCATED</span>
              <p className="font-pixel text-xl text-pixel-red mt-1">{accommodationData?.summary?.unallocatedCount || 0}</p>
            </div>
          </div>

          {/* Dynamic Hostel Breakdown Cards */}
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">HOSTEL WING OCCUPANCY BREAKDOWN</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accommodationData?.hostels?.map((h: any) => (
                <div key={h.id} className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-3 font-sans text-xs">
                  <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                    <div>
                      <h5 className="font-pixel text-sm text-pixel-cream">{h.name}</h5>
                      <span className="font-mono text-[10px] text-pixel-muted">ROOMS: {h.totalRooms}</span>
                    </div>
                    <PixelBadge variant={h.occupancyRate > 90 ? "red" : "green"}>
                      {h.occupancyRate}% OCCUPIED
                    </PixelBadge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center">
                    <div className="p-2 bg-pixel-black/60 border border-pixel-gray-800">
                      <span className="text-pixel-muted block text-[10px]">CAPACITY</span>
                      <span className="text-pixel-cream font-bold">{h.capacity}</span>
                    </div>
                    <div className="p-2 bg-pixel-black/60 border border-pixel-gray-800">
                      <span className="text-pixel-muted block text-[10px]">OCCUPIED</span>
                      <span className="text-pixel-green font-bold">{h.occupied}</span>
                    </div>
                    <div className="p-2 bg-pixel-black/60 border border-pixel-gray-800">
                      <span className="text-pixel-muted block text-[10px]">AVAILABLE</span>
                      <span className="text-pixel-cyan font-bold">{h.available}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: TRANSPORT (Requirement 20 & 21 — ZERO PAYMENT)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "transport" && (
        <div className="max-w-5xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                CAMPUS SHUTTLE & FLEET TELEMETRY
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                TRANSPORT OPERATIONS
              </h2>
            </div>
            <span className="font-pixel text-[10px] text-pixel-green">100% FREE UNIVERSITY SHUTTLE</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase block">TRIPS TODAY</span>
              <p className="font-pixel text-xl text-pixel-cream mt-1">{transportData?.summary?.totalTrips || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-cyan uppercase block">BOARDING NOW</span>
              <p className="font-pixel text-xl text-pixel-cyan mt-1">{transportData?.summary?.boardingTrips || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase block">IN TRANSIT</span>
              <p className="font-pixel text-xl text-pixel-orange-bright mt-1">{transportData?.summary?.inTransitTrips || 0}</p>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-green uppercase block">PASSENGERS</span>
              <p className="font-pixel text-xl text-pixel-green mt-1">{transportData?.summary?.totalPassengers || 0}</p>
            </div>
          </div>

          {/* Trips Table */}
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">ACTIVE SHUTTLE DISPATCHES</h4>
            <div className="overflow-x-auto bg-pixel-dark border-2 border-pixel-gray-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-pixel-black border-b border-pixel-gray-800 font-pixel text-[10px] text-pixel-muted uppercase">
                  <tr>
                    <th className="p-3">TRIP CODE</th>
                    <th className="p-3">ROUTE</th>
                    <th className="p-3">DEP / ARR</th>
                    <th className="p-3">VEHICLE</th>
                    <th className="p-3">DRIVER</th>
                    <th className="p-3 text-center">RIDERS</th>
                    <th className="p-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pixel-gray-800">
                  {transportData?.trips?.map((trip: any) => (
                    <tr key={trip.id} className="hover:bg-pixel-black/40 transition-colors">
                      <td className="p-3 font-mono text-pixel-cyan font-bold">{trip.tripCode}</td>
                      <td className="p-3">
                        <span className="font-pixel text-xs text-pixel-cream block">{trip.routeName}</span>
                        <span className="text-[10px] text-pixel-muted">{trip.routeOrigin} &rarr; {trip.routeDestination}</span>
                      </td>
                      <td className="p-3 font-mono text-pixel-cream">{trip.departureTime} / {trip.estimatedArrival}</td>
                      <td className="p-3 font-mono text-pixel-gray-300">{trip.vehicleRegNo}</td>
                      <td className="p-3">
                        <span className="block text-pixel-cream">{trip.driverName}</span>
                        <span className="font-mono text-[10px] text-pixel-muted">{trip.driverPhone}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-pixel-cyan">
                        {trip.passengerCount} / {trip.capacity}
                      </td>
                      <td className="p-3">
                        <PixelBadge variant={getStatusBadgeVariant(trip.status)}>
                          {trip.status}
                        </PixelBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8: MATCHES & SCHEDULE (Requirement 22, 23, 24, 26)
         ═══════════════════════════════════════════════════════════════ */}
      {(currentTab === "matches" || currentTab === "schedule" || currentTab === "live-matches") && (
        <div className="max-w-5xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                ARENA MATCH MATRIX
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                MATCH OPERATIONS & FIXTURES
              </h2>
            </div>
            <span className="font-mono text-[10px] text-pixel-muted">READ-ONLY COORDINATION</span>
          </div>

          {/* Active Live Matches */}
          {matchesData?.liveMatches?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-pixel text-xs text-pixel-orange-bright tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 bg-pixel-orange-fiery animate-pulse" />
                <span>LIVE MATCHES ON COURT ({matchesData.liveMatches.length})</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchesData.liveMatches.map((m: any) => (
                  <div key={m.id} className="p-5 bg-pixel-orange-fiery/15 border-2 border-pixel-orange-fiery space-y-3 font-sans text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-pixel-orange-bright">{m.court}</span>
                      <span className="font-mono text-[10px] text-pixel-cyan">{m.matchNumber} ({m.category})</span>
                    </div>

                    <div className="flex justify-between items-center text-center">
                      <div className="text-left w-2/5 truncate">
                        <p className="font-pixel text-xs text-pixel-cream truncate">{m.playerA}</p>
                        <p className="font-mono text-[10px] text-pixel-muted truncate">{m.institutionA}</p>
                      </div>

                      <div className="font-mono text-base text-pixel-orange-bright font-bold px-3 shrink-0">
                        {m.scoreA || "0"} - {m.scoreB || "0"}
                      </div>

                      <div className="text-right w-2/5 truncate">
                        <p className="font-pixel text-xs text-pixel-cream truncate">{m.playerB}</p>
                        <p className="font-mono text-[10px] text-pixel-muted truncate">{m.institutionB}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled & Upcoming */}
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">UPCOMING SCHEDULED FIXTURES</h4>
            <div className="overflow-x-auto bg-pixel-dark border-2 border-pixel-gray-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-pixel-black border-b border-pixel-gray-800 font-pixel text-[10px] text-pixel-muted uppercase">
                  <tr>
                    <th className="p-3">COURT / TIME</th>
                    <th className="p-3">MATCH / STAGE</th>
                    <th className="p-3">ATHLETE A</th>
                    <th className="p-3 text-center">VS</th>
                    <th className="p-3">ATHLETE B</th>
                    <th className="p-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pixel-gray-800">
                  {matchesData?.upcomingMatches?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-pixel-black/40 transition-colors">
                      <td className="p-3">
                        <span className="font-pixel text-xs text-pixel-cream block">{m.court}</span>
                        <span className="font-mono text-[10px] text-pixel-cyan">{m.time} ({m.date})</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-pixel-muted">{m.matchNumber} ({m.category})</td>
                      <td className="p-3">
                        <span className="font-pixel text-xs text-pixel-cream block">{m.playerA}</span>
                        <span className="text-[10px] text-pixel-muted">{m.institutionA}</span>
                      </td>
                      <td className="p-3 text-center font-pixel text-pixel-orange-fiery">VS</td>
                      <td className="p-3">
                        <span className="font-pixel text-xs text-pixel-cream block">{m.playerB}</span>
                        <span className="text-[10px] text-pixel-muted">{m.institutionB}</span>
                      </td>
                      <td className="p-3">
                        <PixelBadge variant={getStatusBadgeVariant(m.status)}>
                          {m.status}
                        </PixelBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9: RESULTS (Requirement 25)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "results" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                COMPLETED TIES
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                RECENT RESULTS ({resultsData?.totalCompleted || 0})
              </h2>
            </div>
          </div>

          {!resultsData?.results || resultsData.results.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO COMPLETED MATCH RESULTS YET
            </div>
          ) : (
            <div className="space-y-3">
              {resultsData.results.map((r: any) => (
                <div key={r.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs text-pixel-cream">{r.matchNumber}</span>
                      <span className="font-mono text-[10px] text-pixel-cyan">[{r.category}]</span>
                      <span className="font-mono text-[10px] text-pixel-muted">&bull; {r.court}</span>
                    </div>
                    <p className="text-pixel-gray-300 mt-1">
                      {r.playerA} vs {r.playerB}
                    </p>
                    <p className="font-mono text-[10px] text-pixel-green font-bold mt-0.5">
                      WINNER: {r.winnerName} ({r.winnerInstitution})
                    </p>
                  </div>

                  <div className="sm:text-right font-mono text-sm text-pixel-orange-bright font-bold">
                    {r.scoreA || "0"} - {r.scoreB || "0"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10: ANNOUNCEMENTS (Requirement 28)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "announcements" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                COMMUNICATIONS & BROADCASTS
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                OFFICIAL TOURNAMENT ANNOUNCEMENTS
              </h2>
            </div>
          </div>

          {/* Broadcast Form (If Authorized) */}
          {announcementsData?.canCreate && (
            <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-4">
              <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">BROADCAST NEW OFFICIAL ANNOUNCEMENT</h4>
              {annSuccessMsg && (
                <div className="p-3 bg-pixel-green/10 border border-pixel-green text-xs font-sans text-pixel-green">
                  {annSuccessMsg}
                </div>
              )}
              <form onSubmit={handleCreateAnnouncement} className="space-y-3 font-sans text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-pixel text-[10px] text-pixel-muted uppercase block">ANNOUNCEMENT TITLE</label>
                    <input
                      type="text"
                      required
                      value={newAnnTitle}
                      onChange={(e) => setNewAnnTitle(e.target.value)}
                      placeholder="e.g. Schedule Update / Transport Advisory"
                      className="w-full px-3 py-2 bg-pixel-black border border-pixel-gray-700 text-pixel-cream text-xs outline-none focus:border-pixel-orange-fiery"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-pixel text-[10px] text-pixel-muted uppercase block">TARGET AUDIENCE</label>
                    <select
                      value={newAnnAudience}
                      onChange={(e) => setNewAnnAudience(e.target.value)}
                      className="w-full px-3 py-2 bg-pixel-black border border-pixel-gray-700 text-pixel-cream text-xs outline-none focus:border-pixel-orange-fiery"
                    >
                      <option value="ALL">ALL PARTICIPANTS & PUBLIC</option>
                      <option value="PARTICIPANTS">PARTICIPANTS ONLY</option>
                      <option value="TEAMS">TEAM MANAGERS</option>
                      <option value="OFFICIALS">MATCH OFFICIALS</option>
                      <option value="VOLUNTEERS">VOLUNTEERS</option>
                      <option value="ACCOMMODATION">HOSTEL DESK</option>
                      <option value="TRANSPORT">FLEET OPS</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-pixel text-[10px] text-pixel-muted uppercase block">CONTENT & BULLETINS</label>
                  <textarea
                    required
                    rows={3}
                    value={newAnnContent}
                    onChange={(e) => setNewAnnContent(e.target.value)}
                    placeholder="Enter broadcast specifics..."
                    className="w-full px-3 py-2 bg-pixel-black border border-pixel-gray-700 text-pixel-cream text-xs outline-none focus:border-pixel-orange-fiery resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingAnnouncement}
                  className="px-4 py-2 bg-pixel-orange-fiery text-black font-pixel text-xs hover:bg-pixel-orange-bright transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{creatingAnnouncement ? "BROADCASTING..." : "BROADCAST ANNOUNCEMENT"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Announcements Feed */}
          <div className="space-y-3">
            {announcementsData?.announcements?.map((a: any) => (
              <div key={a.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-2 text-xs font-sans">
                <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[9px] text-pixel-orange-bright">[{a.targetAudience}]</span>
                    <h5 className="font-pixel text-xs text-pixel-cream">{a.title}</h5>
                  </div>
                  <span className="font-mono text-[10px] text-pixel-muted">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-pixel-gray-300 leading-relaxed whitespace-pre-line">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 11: ACTION CENTER TAB (Requirement 11)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "action-center" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                PRIORITY OPERATIONS QUEUE
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                ACTION CENTER ({actionItems.length})
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {actionItems.map((item: any) => (
              <div key={item.id} className="p-4 bg-pixel-dark border-2 border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PixelBadge variant={item.priority === "HIGH" ? "red" : "yellow"}>
                      {item.module}
                    </PixelBadge>
                    <h4 className="font-pixel text-xs text-pixel-cream">{item.title}</h4>
                  </div>
                  <p className="text-pixel-gray-300">{item.description}</p>
                </div>

                <button
                  onClick={() => setCurrentTab(item.actionTab)}
                  className="px-4 py-2 bg-pixel-orange-fiery text-black font-pixel text-xs hover:bg-pixel-orange-bright transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
                >
                  {item.actionText} &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 12: ALERTS TAB (Requirement 12)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "alerts" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                SYSTEM TELEMETRY ALERTS
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                OPERATIONAL ALERTS ({alerts.length})
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {alerts.map((al: any) => (
              <div key={al.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 flex items-start gap-3 font-sans text-xs">
                <span className="font-pixel text-[10px] px-2 py-0.5 border text-pixel-amber border-pixel-amber shrink-0 mt-0.5">
                  {al.level}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-pixel-cyan font-bold">[{al.module}]</span>
                    <span className="font-mono text-[10px] text-pixel-muted">{al.time}</span>
                  </div>
                  <p className="text-pixel-cream">{al.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 13: STAFF ACTIVITY (Requirement 27)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "activity" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                FIELD OPERATIONS STREAM
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                RECENT STAFF OPERATIONAL ACTIVITY
              </h2>
            </div>
          </div>

          {activityData.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO ACTIVITY RECORDED
            </div>
          ) : (
            <div className="space-y-2">
              {activityData.map((act) => (
                <div key={act.id} className="p-3 bg-pixel-dark border border-pixel-gray-800 flex items-center justify-between gap-3 text-xs font-sans">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-pixel-cyan font-bold px-1.5 py-0.5 bg-pixel-black border border-pixel-gray-700">
                      {act.module}
                    </span>
                    <span className="font-pixel text-xs text-pixel-cream">{act.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-pixel-muted font-mono text-[10px]">
                    <span>BY: {act.actor}</span>
                    <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 14: REPORTS & INSIGHTS (Requirement 30)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "reports" && (
        <div className="max-w-5xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                ANALYTICS & OPERATIONAL TELEMETRY
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                REPORTS & INSIGHTS
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration Status Distribution */}
            <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-3 font-sans text-xs">
              <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">REGISTRATION STATUS DISTRIBUTION</h4>
              <div className="space-y-2">
                {reportsData?.registrationDistribution?.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-pixel-black/60 border border-pixel-gray-800">
                    <span className="font-pixel text-xs text-pixel-cream">{r.status}</span>
                    <span className="font-mono text-xs text-pixel-cyan font-bold">{r.count} ATHLETES</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Status Distribution */}
            <div className="p-5 bg-pixel-dark border-2 border-pixel-gray-800 space-y-3 font-sans text-xs">
              <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">MATCH FIXTURE PROGRESSION</h4>
              <div className="space-y-2">
                {reportsData?.matchDistribution?.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-pixel-black/60 border border-pixel-gray-800">
                    <span className="font-pixel text-xs text-pixel-cream">{m.status}</span>
                    <span className="font-mono text-xs text-pixel-orange-bright font-bold">{m.count} TIES</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 15: SUPPORT & ISSUES (Requirement 32)
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "support" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                HELPDESK OPERATIONAL QUEUE
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                OPERATIONAL SUPPORT REQUESTS ({supportData?.total || 0})
              </h2>
            </div>
          </div>

          {!supportData?.tickets || supportData.tickets.length === 0 ? (
            <div className="p-8 bg-pixel-dark border-2 border-pixel-gray-800 text-center font-pixel text-xs text-pixel-muted">
              NO ACTIVE SUPPORT QUERIES LOGGED
            </div>
          ) : (
            <div className="space-y-2">
              {supportData.tickets.map((t: any) => (
                <div key={t.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-2 text-xs font-sans">
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
                    <span>AUTHOR: {t.author}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 16: PROFILE TAB
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "profile" && (
        <div className="max-w-2xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              ORGANIZER CREDENTIALS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              ORGANIZER PROFILE & CLEARANCE
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-4 font-sans text-xs">
            <div className="flex items-center gap-4 border-b border-pixel-gray-800 pb-4">
              <div className="w-12 h-12 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-base text-pixel-orange-bright font-bold">
                HQ
              </div>
              <div>
                <h3 className="font-pixel text-sm text-pixel-cream">Tournament Secretariat</h3>
                <p className="font-mono text-xs text-pixel-cyan">ROLE: ORGANIZER</p>
              </div>
            </div>

            <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-pixel-muted">Operational Scope:</span>
                <span className="font-pixel text-pixel-cream">South Zone Championship 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pixel-muted">Clearance Level:</span>
                <span className="font-mono text-pixel-orange-bright font-bold">OPERATIONS COMMAND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pixel-muted">Administrative Boundary:</span>
                <span className="font-mono text-pixel-green font-bold">MONITORING & COORDINATION ONLY</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </OrganizerPortalShell>
  );
}

export default function OrganizerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-pixel-black text-pixel-cream flex items-center justify-center p-4">
          <div className="font-pixel text-xs text-pixel-orange-bright animate-pulse">
            INITIALIZING ORGANIZER CONTROL ROOM...
          </div>
        </div>
      }
    >
      <OrganizerDashboardContent />
    </Suspense>
  );
}
