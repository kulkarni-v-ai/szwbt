"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Shield,
  Zap,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Home,
  Bus,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Activity,
  QrCode,
  Megaphone,
  HelpCircle,
  User,
  Search,
  RefreshCw,
  Printer,
  ExternalLink,
  Flame,
  Radio,
  Eye,
  Check,
  X,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelQR } from "@/components/team/PixelQR";
import { MemberDetailModal, MemberDetailData } from "@/components/team/MemberDetailModal";
import { TeamPortalShell, AuthorizedTeamOption } from "@/components/team/TeamPortalShell";
import { useAuth } from "@/lib/rbac/useAuth";

// Types
interface TeamOverviewData {
  authorizedTeams: AuthorizedTeamOption[];
  selectedTeam: {
    id: string;
    teamCode: string;
    name: string;
    institution: string;
    state: string;
    managerName: string | null;
    managerPhone: string | null;
    captainName: string | null;
    captainPhone: string | null;
    status: string;
    teamQrToken: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  kpis: {
    memberCount: number;
    registrationStatus: string;
    documentsStatus: string;
    paymentsStatus: string;
    accommodationStatus: string;
    transportStatus: string;
    upcomingMatchesCount: number;
  };
  readiness: Array<{
    id: string;
    title: string;
    status: string;
    description: string;
    action: string;
    actionTab: string;
  }>;
  liveMatch: any;
  upcomingMatchesCount: number;
  recentResultsCount: number;
  recentAnnouncements: any[];
}

function TeamManagerPortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Tab & Team selection state
  const tabFromUrl = searchParams.get("tab") || "overview";
  const teamIdFromUrl = searchParams.get("teamId") || "";

  const [currentTab, setCurrentTab] = useState<string>(tabFromUrl);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamIdFromUrl);

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<TeamOverviewData | null>(null);

  // Tab specific data states
  const [members, setMembers] = useState<MemberDetailData[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<MemberDetailData | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState<boolean>(false);

  const [registration, setRegistration] = useState<any>(null);
  const [documents, setDocuments] = useState<any>(null);
  const [payments, setPayments] = useState<any>(null);
  const [accommodation, setAccommodation] = useState<any>(null);
  const [transport, setTransport] = useState<any>(null);
  const [matches, setMatches] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [teamPass, setTeamPass] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Search and filter states
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("ALL");
  const [announcementCategory, setAnnouncementCategory] = useState<string>("ALL");
  const [passPrintModal, setPassPrintModal] = useState<boolean>(false);

  // Sync tab with URL
  const handleSelectTab = useCallback(
    (tabId: string) => {
      setCurrentTab(tabId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      if (selectedTeamId) params.set("teamId", selectedTeamId);
      router.push(`/team?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedTeamId]
  );

  // Sync team selection with URL
  const handleSelectTeamId = useCallback(
    (newTeamId: string) => {
      setSelectedTeamId(newTeamId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("teamId", newTeamId);
      if (currentTab) params.set("tab", currentTab);
      router.push(`/team?${params.toString()}`);
    },
    [router, searchParams, currentTab]
  );

  // 1. Fetch main team overview
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const q = selectedTeamId ? `?teamId=${encodeURIComponent(selectedTeamId)}` : "";
      const res = await fetch(`/api/team${q}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login?returnTo=/team");
        return;
      }

      if (res.status === 403) {
        setError("403 Forbidden: You do not have permissions to access this team resource.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load team data.");
        setLoading(false);
        return;
      }

      setOverview(data);
      if (data.selectedTeam?.id && !selectedTeamId) {
        setSelectedTeamId(data.selectedTeam.id);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading team portal.");
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, router]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // 2. Fetch Tab-Specific Data on Demand
  useEffect(() => {
    const activeTeamParam = selectedTeamId ? `?teamId=${encodeURIComponent(selectedTeamId)}` : "";

    if (currentTab === "members" || currentTab === "overview") {
      setMembersLoading(true);
      fetch(`/api/team/members${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setMembers(d.members || []);
        })
        .finally(() => setMembersLoading(false));
    }

    if (currentTab === "registration") {
      fetch(`/api/team/registration${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setRegistration(d);
        });
    }

    if (currentTab === "documents") {
      fetch(`/api/team/documents${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setDocuments(d);
        });
    }

    if (currentTab === "payments") {
      fetch(`/api/team/payments${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setPayments(d);
        });
    }

    if (currentTab === "accommodation") {
      fetch(`/api/team/accommodation${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setAccommodation(d);
        });
    }

    if (currentTab === "transport") {
      fetch(`/api/team/transport${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setTransport(d);
        });
    }

    if (currentTab === "matches" || currentTab === "overview") {
      fetch(`/api/team/matches${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setMatches(d);
        });
    }

    if (currentTab === "results") {
      fetch(`/api/team/results${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setResults(d);
        });
    }

    if (currentTab === "pass") {
      fetch(`/api/team/qr${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setTeamPass(d.pass);
        });
    }

    if (currentTab === "announcements" || currentTab === "overview") {
      fetch(`/api/team/announcements${activeTeamParam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setAnnouncements(d.announcements || []);
        });
    }
  }, [currentTab, selectedTeamId]);

  // Derived filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.playerId.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.category.toLowerCase().includes(memberSearch.toLowerCase());
      const matchesRole =
        memberRoleFilter === "ALL" || m.teamRole.toUpperCase() === memberRoleFilter.toUpperCase();
      return matchesSearch && matchesRole;
    });
  }, [members, memberSearch, memberRoleFilter]);

  // Derived filtered announcements
  const filteredAnnouncements = useMemo(() => {
    if (announcementCategory === "ALL") return announcements;
    return announcements.filter(
      (a) => a.category.toUpperCase() === announcementCategory.toUpperCase()
    );
  }, [announcements, announcementCategory]);

  const team = overview?.selectedTeam;

  // ═══════════════════════════════════════════════════════════════════
  // SKELETON / LOADING STATE
  // ═══════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-pixel-black text-pixel-cream flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-pixel-orange-fiery border-t-transparent animate-spin rounded-none" />
        <div className="text-center space-y-1">
          <p className="font-pixel text-sm text-pixel-orange-bright tracking-widest uppercase">
            CONNECTING TO TOURNAMENT DESK...
          </p>
          <p className="text-xs text-pixel-muted font-mono">
            Authorizing Team Manager credentials & roster data
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className="min-h-screen bg-pixel-black text-pixel-cream flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-pixel-dark border-2 border-pixel-red shadow-pixel-sm space-y-4 text-center">
          <AlertCircle className="w-10 h-10 text-pixel-red mx-auto" />
          <h2 className="font-pixel text-sm text-pixel-red uppercase tracking-wider">
            AUTHORIZATION / ACCESS FAILURE
          </h2>
          <p className="text-xs text-pixel-gray-300 font-sans">{error}</p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setSelectedTeamId("");
                fetchOverview();
              }}
              className="px-4 py-2 font-pixel text-xs bg-pixel-gray-800 hover:bg-pixel-orange-fiery hover:text-black border border-pixel-gray-700 transition-colors"
            >
              RELOAD DEFAULT TEAM
            </button>
            <Link
              href="/login"
              className="px-4 py-2 font-pixel text-xs bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright transition-colors"
            >
              LOGIN AGAIN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // EMPTY STATE: NO TEAM ASSIGNED TO THIS MANAGER
  // ═══════════════════════════════════════════════════════════════════
  if (!team) {
    return (
      <TeamPortalShell
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        authorizedTeams={[]}
        selectedTeamId={null}
        onSelectTeamId={handleSelectTeamId}
        teamName="UNASSIGNED MANAGER"
        institution="No Affiliated Institution"
        teamStatus="UNASSIGNED"
        indicators={{
          registration: "NONE",
          accommodation: "NONE",
          transport: "NONE",
          matches: "NONE",
        }}
      >
        <div className="max-w-xl mx-auto my-12 p-8 bg-pixel-dark border-2 border-pixel-amber shadow-pixel text-center space-y-4">
          <div className="w-12 h-12 bg-pixel-amber/20 border-2 border-pixel-amber flex items-center justify-center mx-auto text-pixel-amber">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="font-pixel text-base text-pixel-amber uppercase tracking-wider">
            NO TOURNAMENT TEAM ASSIGNED
          </h2>
          <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed">
            Your authenticated account has the <span className="text-pixel-cream font-bold">TEAM_MANAGER</span> clearance,
            but no institution team is currently assigned to your profile in the tournament database.
          </p>
          <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 text-xs text-left font-mono space-y-1">
            <p className="text-pixel-muted">Operator: <span className="text-pixel-cream">{user?.email}</span></p>
            <p className="text-pixel-muted">Status: <span className="text-pixel-amber">Pending Secretariat Linkage</span></p>
          </div>
          <p className="text-[11px] text-pixel-muted">
            Please report to <span className="text-pixel-cyan font-bold">Organizing Secretariat Desk 01</span> at the Main Arena or contact technical operations.
          </p>
        </div>
      </TeamPortalShell>
    );
  }

  // HUD Indicators
  const hudIndicators = {
    registration: overview?.kpis.registrationStatus || team.status,
    accommodation: overview?.kpis.accommodationStatus || "—",
    transport: overview?.kpis.transportStatus || "—",
    matches: overview?.kpis.upcomingMatchesCount
      ? `${overview.kpis.upcomingMatchesCount} SCHEDULED`
      : "NONE",
  };

  return (
    <TeamPortalShell
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      authorizedTeams={overview?.authorizedTeams || []}
      selectedTeamId={selectedTeamId}
      onSelectTeamId={handleSelectTeamId}
      teamName={team.name}
      institution={team.institution}
      teamStatus={team.status}
      indicators={hudIndicators}
      unreadCount={overview?.recentAnnouncements?.length || 0}
      announcements={overview?.recentAnnouncements || []}
    >
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: OVERVIEW COMMAND CENTER
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "overview" && (
        <div className="space-y-6">
          {/* Tournament Hero Area */}
          <div className="relative p-5 sm:p-7 bg-pixel-dark border-2 border-pixel-orange-fiery/80 shadow-pixel-orange overflow-hidden">
            {/* Subtle pixel art background grid & coordinates */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#FF5A16_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute top-2 right-3 font-mono text-[9px] text-pixel-muted select-none hidden sm:block">
              SZ-CAMPUS::LOC KLE TECH [15.3647° N, 75.1240° E] &bull; TIE-ID: {team.teamCode}
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest bg-pixel-orange-fiery/20 px-2 py-0.5 border border-pixel-orange-fiery/40">
                    TEAM CONTROL CENTER
                  </span>
                  <span className="text-[10px] font-mono text-pixel-cyan bg-pixel-cyan/10 px-2 py-0.5 border border-pixel-cyan/30">
                    ID: {team.teamCode}
                  </span>
                  <PixelBadge variant={team.status === "COMPLETED" ? "green" : "orange"}>
                    {team.status}
                  </PixelBadge>
                </div>

                <h1 className="text-2xl sm:text-3xl font-pixel text-pixel-cream tracking-wide">
                  {team.name}
                </h1>
                <p className="text-xs sm:text-sm text-pixel-muted font-sans flex items-center gap-2">
                  <span>{team.institution}</span>
                  <span>&bull;</span>
                  <span className="text-pixel-amber">{team.state}</span>
                </p>

                <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs text-pixel-gray-400">
                  <div>
                    Manager: <span className="text-pixel-cream">{team.managerName || "—"}</span>
                  </div>
                  <div>
                    Captain: <span className="text-pixel-cream">{team.captainName || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Fast Action Buttons */}
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button
                  onClick={() => handleSelectTab("pass")}
                  className="px-4 py-2 font-pixel text-xs bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright transition-all shadow-pixel-sm flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>SHOW TEAM PASS</span>
                </button>
                <button
                  onClick={() => handleSelectTab("members")}
                  className="px-4 py-2 font-pixel text-xs bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-cream transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-pixel-cyan" />
                  <span>ROSTER ({overview?.kpis.memberCount || 0})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Operational KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="p-3.5 bg-pixel-dark border border-pixel-gray-800 shadow-pixel-sm space-y-1">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">TEAM MEMBERS</span>
              <p className="font-pixel text-lg text-pixel-orange-bright">
                {overview?.kpis.memberCount !== undefined ? `${overview.kpis.memberCount} ATHLETES` : "—"}
              </p>
              <span className="text-[10px] text-pixel-muted font-sans block truncate">Active Roster</span>
            </div>

            <div className="p-3.5 bg-pixel-dark border border-pixel-gray-800 shadow-pixel-sm space-y-1">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">REGISTRATION</span>
              <p className="font-pixel text-sm text-pixel-green truncate">
                {overview?.kpis.registrationStatus || "—"}
              </p>
              <span className="text-[10px] text-pixel-muted font-sans block">Secretariat Status</span>
            </div>

            <div className="p-3.5 bg-pixel-dark border border-pixel-gray-800 shadow-pixel-sm space-y-1">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">DOCUMENTS</span>
              <p className="font-pixel text-sm text-pixel-cyan truncate">
                {overview?.kpis.documentsStatus || "—"}
              </p>
              <span className="text-[10px] text-pixel-muted font-sans block">Desk Verification</span>
            </div>

            <div className="p-3.5 bg-pixel-dark border border-pixel-gray-800 shadow-pixel-sm space-y-1">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">PAYMENTS</span>
              <p className="font-pixel text-sm text-pixel-amber truncate">
                {overview?.kpis.paymentsStatus || "—"}
              </p>
              <span className="text-[10px] text-pixel-muted font-sans block">Treasury Reconciled</span>
            </div>

            <div className="p-3.5 bg-pixel-dark border border-pixel-gray-800 shadow-pixel-sm space-y-1">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">ACCOMMODATION</span>
              <p className="font-pixel text-sm text-pixel-cream truncate">
                {overview?.kpis.accommodationStatus || "—"}
              </p>
              <span className="text-[10px] text-pixel-muted font-sans block">Hostel Room Allocation</span>
            </div>

            <div className="p-3.5 bg-pixel-dark border border-pixel-gray-800 shadow-pixel-sm space-y-1">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">UPCOMING MATCHES</span>
              <p className="font-pixel text-lg text-pixel-orange-fiery">
                {overview?.kpis.upcomingMatchesCount !== undefined ? overview.kpis.upcomingMatchesCount : "—"}
              </p>
              <span className="text-[10px] text-pixel-muted font-sans block">Published Fixtures</span>
            </div>
          </div>

          {/* Live Match Promotion Banner (Promoted if active) */}
          {overview?.liveMatch && (
            <div className="p-4 sm:p-5 bg-pixel-black border-2 border-pixel-orange-fiery shadow-pixel-orange relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-pixel text-[10px] bg-pixel-red text-white uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      LIVE NOW &bull; {overview.liveMatch.court}
                    </span>
                    <span className="font-mono text-[10px] text-pixel-muted">{overview.liveMatch.category}</span>
                  </div>
                  <div className="text-base sm:text-lg font-pixel text-pixel-cream flex flex-wrap items-center gap-3">
                    <span className="text-pixel-orange-bright">{overview.liveMatch.playerA}</span>
                    <span className="text-pixel-muted text-xs">VS</span>
                    <span>{overview.liveMatch.playerB}</span>
                  </div>
                  <p className="text-xs text-pixel-amber font-mono">
                    CURRENT SCORE: <span className="font-bold">{overview.liveMatch.scoreA || "0"} - {overview.liveMatch.scoreB || "0"}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectTab("matches")}
                    className="px-4 py-2 font-pixel text-xs bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>VIEW LIVE MATCH</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TEAM READINESS CENTER (CRITICAL WIDGET)
             ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-pixel-orange-fiery" />
                <h2 className="font-pixel text-xs sm:text-sm text-pixel-cream uppercase tracking-wider">
                  TEAM READINESS CENTER
                </h2>
              </div>
              <span className="text-[10px] font-pixel text-pixel-muted">8 OPERATIONAL CHECKS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {overview?.readiness.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery transition-colors flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-pixel-cream tracking-wide">{item.title}</span>
                      <PixelBadge variant={item.status === "READY" || item.status === "COMPLETED" ? "green" : item.status === "ACTION REQUIRED" ? "red" : "orange"}>
                        {item.status}
                      </PixelBadge>
                    </div>
                    <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectTab(item.actionTab)}
                    className="w-full mt-2 py-1.5 px-2 bg-pixel-black hover:bg-pixel-orange-fiery hover:text-black font-pixel text-[10px] text-pixel-orange-bright border border-pixel-gray-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{item.action}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Center & Official Bulletins Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Center */}
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                <span className="font-pixel text-xs text-pixel-amber uppercase tracking-wider">
                  ACTION CENTER & DESK INSTRUCTIONS
                </span>
                <span className="font-mono text-[10px] text-pixel-muted">OFFICIAL PROTOCOL</span>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-pixel-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-pixel text-xs text-pixel-cream">Accreditation Card Verification</p>
                    <p className="text-pixel-muted text-[11px] mt-0.5">
                      Ensure all players carry student photo IDs to Registration Desk 02 for physical verification stamp.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-2.5">
                  <Bus className="w-4 h-4 text-pixel-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="font-pixel text-xs text-pixel-cream">Transit Shuttle Boarding Protocol</p>
                    <p className="text-pixel-muted text-[11px] mt-0.5">
                      Present your digital Team Pass QR on mobile to the bus conductor at Hubballi Junction / Airport.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-2.5">
                  <Home className="w-4 h-4 text-pixel-amber shrink-0 mt-0.5" />
                  <div>
                    <p className="font-pixel text-xs text-pixel-cream">Hostel Check-in & Key Card</p>
                    <p className="text-pixel-muted text-[11px] mt-0.5">
                      Room allocations are configured for 5-bed modules at Shalmala and Vindhya hostels. Report to warden desk.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bulletins */}
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                <span className="font-pixel text-xs text-pixel-cyan uppercase tracking-wider">
                  RECENT OFFICIAL BULLETINS
                </span>
                <button
                  onClick={() => handleSelectTab("announcements")}
                  className="font-pixel text-[10px] text-pixel-amber hover:text-pixel-orange-bright"
                >
                  VIEW ALL &rarr;
                </button>
              </div>

              {overview?.recentAnnouncements?.length === 0 ? (
                <p className="text-xs text-pixel-muted italic py-3">No recent bulletins published.</p>
              ) : (
                <div className="space-y-2">
                  {overview?.recentAnnouncements?.slice(0, 3).map((ann: any) => (
                    <div key={ann.id} className="p-3 bg-pixel-black/60 border border-pixel-gray-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-pixel text-[9px] text-pixel-cyan">{ann.category || "GENERAL"}</span>
                        <span className="font-mono text-[10px] text-pixel-muted">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-semibold text-pixel-cream">{ann.title}</p>
                      <p className="text-pixel-muted text-[11px] line-clamp-1">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: TEAM IDENTITY
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "team" && (
        <div className="max-w-3xl space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL TEAM PROFILE
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TEAM IDENTITY & ACCREDITATION DOSSIER
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pixel-gray-800 pb-4">
              <div>
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">OFFICIAL TOURNAMENT SQUAD</span>
                <h3 className="text-xl sm:text-2xl font-pixel text-pixel-cream tracking-wide mt-1">
                  {team.name}
                </h3>
                <p className="text-xs text-pixel-muted font-sans mt-0.5">{team.institution}</p>
              </div>
              <PixelBadge variant={team.status === "COMPLETED" ? "green" : "orange"}>
                {team.status}
              </PixelBadge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-1">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">TOURNAMENT CODE</span>
                <span className="font-mono text-pixel-amber font-bold text-sm">{team.teamCode}</span>
              </div>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-1">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">AFFILIATED STATE</span>
                <span className="text-pixel-cream font-medium">{team.state}</span>
              </div>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-1">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">ACCREDITED TEAM MANAGER</span>
                <span className="text-pixel-cream font-semibold">{team.managerName || "—"}</span>
                {team.managerPhone && <p className="font-mono text-pixel-muted text-[11px]">{team.managerPhone}</p>}
              </div>
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 space-y-1">
                <span className="font-pixel text-[10px] text-pixel-muted uppercase block">TEAM CAPTAIN</span>
                <span className="text-pixel-cream font-semibold">{team.captainName || "—"}</span>
                {team.captainPhone && <p className="font-mono text-pixel-muted text-[11px]">{team.captainPhone}</p>}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3 border-t border-pixel-gray-800">
              <button
                onClick={() => handleSelectTab("members")}
                className="px-4 py-2 font-pixel text-xs bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright transition-colors"
              >
                VIEW FULL ROSTER
              </button>
              <button
                onClick={() => handleSelectTab("pass")}
                className="px-4 py-2 font-pixel text-xs bg-pixel-black border border-pixel-gray-700 hover:border-pixel-orange-fiery text-pixel-cream transition-colors"
              >
                SHOW ACCREDITATION PASS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: TEAM MEMBERS ROSTER & VIEW MEMBER MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "members" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-pixel-orange-fiery pb-3">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                CONTINGENT ATHLETES & OFFICIALS
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                TEAM MEMBERS ROSTER ({filteredMembers.length})
              </h2>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-pixel-muted absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-pixel-dark border border-pixel-gray-700 text-xs text-pixel-cream placeholder:text-pixel-muted font-sans focus:outline-none focus:border-pixel-orange-fiery w-40 sm:w-48"
                />
              </div>

              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-pixel-dark border border-pixel-gray-700 text-xs text-pixel-cream font-pixel focus:outline-none focus:border-pixel-orange-fiery"
              >
                <option value="ALL">ALL ROLES</option>
                <option value="CAPTAIN">CAPTAIN</option>
                <option value="PLAYER">PLAYER</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>

          {membersLoading ? (
            <div className="p-8 text-center text-pixel-muted font-pixel text-xs animate-pulse">
              LOADING CONTINGENT ROSTER...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 bg-pixel-dark border border-pixel-gray-800 text-center text-pixel-muted text-xs">
              No matching contingent members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-pixel-dark border-b-2 border-pixel-orange-fiery text-pixel-muted font-pixel text-[10px] uppercase tracking-wider">
                    <th className="p-3">Athlete / Official</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Registration</th>
                    <th className="p-3">Documents</th>
                    <th className="p-3">Accommodation</th>
                    <th className="p-3 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pixel-gray-800 bg-pixel-black/60">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-pixel-dark/80 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-pixel-cream">{m.name}</div>
                        <div className="font-mono text-[10px] text-pixel-muted">{m.playerId}</div>
                      </td>
                      <td className="p-3">
                        <PixelBadge variant={m.teamRole === "CAPTAIN" ? "orange" : m.teamRole === "MANAGER" ? "cyan" : "dark"}>
                          {m.teamRole}
                        </PixelBadge>
                      </td>
                      <td className="p-3 text-pixel-cream">{m.category}</td>
                      <td className="p-3">
                        <PixelBadge variant={m.registrationStatus === "APPROVED" || m.registrationStatus === "COMPLETED" ? "green" : "yellow"}>
                          {m.registrationStatus}
                        </PixelBadge>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] text-pixel-cyan">
                          {m.documents.length} captured
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-pixel-cream font-mono text-[11px]">
                          {m.accommodation.hostel}
                        </div>
                        <div className="text-pixel-muted text-[10px]">
                          {m.accommodation.roomNumber} &bull; {m.accommodation.bedNumber}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setMemberModalOpen(true);
                          }}
                          className="px-2.5 py-1 font-pixel text-[10px] bg-pixel-gray-800 hover:bg-pixel-orange-fiery hover:text-black border border-pixel-gray-700 transition-colors cursor-pointer"
                        >
                          VIEW MEMBER
                        </button>
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
          SECTION 4: REGISTRATION STATUS LIFECYCLE
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "registration" && (
        <div className="max-w-4xl space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              CHAMPIONSHIP VERIFICATION LIFECYCLE
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TEAM REGISTRATION TIMELINE
            </h2>
          </div>

          {/* Timeline Stages */}
          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-6">
            <div className="space-y-4">
              {registration?.stages?.map((stg: any, index: number) => {
                const isCompleted = stg.status === "COMPLETED";
                const isActionRequired = stg.status === "ACTION_REQUIRED";
                return (
                  <div key={stg.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 flex items-center justify-center font-pixel text-xs border-2 ${
                          isCompleted
                            ? "bg-pixel-green/20 border-pixel-green text-pixel-green"
                            : isActionRequired
                            ? "bg-pixel-red/20 border-pixel-red text-pixel-red"
                            : "bg-pixel-black border-pixel-gray-700 text-pixel-muted"
                        }`}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>
                      {index < (registration.stages.length - 1) && (
                        <div className={`w-0.5 h-10 ${isCompleted ? "bg-pixel-green/50" : "bg-pixel-gray-800"}`} />
                      )}
                    </div>

                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-pixel text-xs text-pixel-cream tracking-wide">
                          {stg.name}
                        </h4>
                        <PixelBadge variant={isCompleted ? "green" : isActionRequired ? "red" : "orange"}>
                          {stg.status}
                        </PixelBadge>
                      </div>
                      <p className="text-xs text-pixel-muted font-sans mt-0.5">{stg.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Outstanding Actions */}
            <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-2">
              <span className="font-pixel text-xs text-pixel-amber uppercase tracking-wider block">
                OUTSTANDING ACTIONS FOR TEAM MANAGER
              </span>
              <ul className="space-y-1.5 text-xs font-sans text-pixel-gray-300">
                {registration?.outstandingActions?.map((act: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-pixel-orange-fiery font-bold">&bull;</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-pixel-muted italic pt-1">
                Note: Registration Desk Staff at Desk 02 controls physical camera capture and document authorization.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: DOCUMENT STATUS CENTER
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "documents" && (
        <div className="space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              STATUS VIEW ONLY &bull; ZERO DOWNLOAD EXPOSURE
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              DOCUMENT CENTER
            </h2>
          </div>

          {/* Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase block">TOTAL REQUIRED</span>
              <p className="font-pixel text-lg text-pixel-cream">{documents?.summary?.total || 0}</p>
              <span className="text-[10px] text-pixel-muted">3 documents per athlete</span>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase block">VERIFIED BY DESK</span>
              <p className="font-pixel text-lg text-pixel-green">{documents?.summary?.verified || 0}</p>
              <span className="text-[10px] text-pixel-muted">Physical originals verified</span>
            </div>
            <div className="p-4 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase block">PENDING PROCESSING</span>
              <p className="font-pixel text-lg text-pixel-amber">{documents?.summary?.pending || 0}</p>
              <span className="text-[10px] text-pixel-muted">Awaiting Desk 02 scan</span>
            </div>
          </div>

          {/* Member documents list */}
          <div className="space-y-3">
            {documents?.memberDocuments?.map((m: any) => (
              <div key={m.participantId} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-2">
                <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                  <div>
                    <span className="font-pixel text-xs text-pixel-cream">{m.name}</span>
                    <span className="font-mono text-[10px] text-pixel-muted ml-2">({m.playerId})</span>
                  </div>
                  <PixelBadge variant={m.role === "CAPTAIN" ? "orange" : "dark"}>{m.role}</PixelBadge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  {m.documents.map((d: any) => (
                    <div key={d.id} className="p-2 bg-pixel-black/60 border border-pixel-gray-800 flex items-center justify-between">
                      <div>
                        <p className="font-pixel text-[10px] text-pixel-cream">{d.type.replace(/_/g, " ")}</p>
                        <p className="font-mono text-[9px] text-pixel-muted truncate max-w-[140px]">{d.fileName}</p>
                      </div>
                      <PixelBadge variant={d.status === "VERIFIED" || d.status === "READY" ? "green" : "yellow"}>
                        {d.status}
                      </PixelBadge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-pixel-black border border-pixel-gray-800 text-[11px] text-pixel-muted font-mono flex items-center gap-2">
            <Shield className="w-4 h-4 text-pixel-orange-fiery shrink-0" />
            <span>CONFIDENTIALITY PROTOCOL: Student identity documents are archived in encrypted server vault. Download links are not exposed.</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: PAYMENTS & FINANCIAL LEDGERS
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "payments" && (
        <div className="space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              CHAMPIONSHIP FINANCIAL RECONCILIATION
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TOURNAMENT PAYMENTS & LEDGERS
            </h2>
          </div>

          {/* Categorized Fee Ledgers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {payments?.ledgers?.map((l: any) => (
              <div key={l.category} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                  <span className="font-pixel text-xs text-pixel-cream">{l.displayName}</span>
                  <PixelBadge variant={l.status === "PAID" ? "green" : "red"}>{l.status}</PixelBadge>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-pixel-muted">Amount Due:</span>
                    <span className="text-pixel-cream font-bold">₹{l.amountDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pixel-muted">Amount Paid:</span>
                    <span className="text-pixel-green font-bold">₹{l.amountReceived.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-pixel-gray-800">
                    <span className="text-pixel-muted">Balance:</span>
                    <span className={`font-bold ${l.balance <= 0 ? "text-pixel-green" : "text-pixel-red"}`}>
                      ₹{l.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Strict Zero-Transport-Payment Notice */}
          <div className="p-3 bg-pixel-dark border border-pixel-cyan/40 flex items-center gap-3">
            <Bus className="w-5 h-5 text-pixel-cyan shrink-0" />
            <p className="text-xs text-pixel-gray-300 font-sans">
              <span className="text-pixel-cyan font-bold">ZERO TRANSPORT FEE POLICY:</span> Transportation shuttles are provided as a complimentary university service for all accredited players and managers. No transit fee ledgers exist.
            </p>
          </div>

          {/* Payment Receipts History */}
          <div className="space-y-3">
            <span className="font-pixel text-xs text-pixel-amber uppercase tracking-wider block">
              OFFICIAL PAYMENT RECEIPTS & TRANSACTIONS
            </span>

            {payments?.transactions?.length === 0 ? (
              <p className="text-xs text-pixel-muted italic p-4 bg-pixel-dark border border-pixel-gray-800">
                No recorded financial transactions yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-pixel-dark border-b-2 border-pixel-orange-fiery text-pixel-muted font-pixel text-[10px] uppercase">
                      <th className="p-3">Receipt / Ref</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">UTR / Ref</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pixel-gray-800 bg-pixel-black/60 font-mono text-[11px]">
                    {payments.transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-pixel-dark/80">
                        <td className="p-3 text-pixel-cream font-bold">{tx.receiptNumber || tx.id}</td>
                        <td className="p-3 text-pixel-cyan">{tx.category}</td>
                        <td className="p-3 text-pixel-green font-bold">₹{tx.amount.toLocaleString()}</td>
                        <td className="p-3">{tx.method}</td>
                        <td className="p-3 text-pixel-muted">{tx.utr || "CASH_COUNTER"}</td>
                        <td className="p-3">
                          <PixelBadge variant={tx.status === "SUCCESS" ? "green" : "red"}>{tx.status}</PixelBadge>
                        </td>
                        <td className="p-3 text-pixel-muted">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: ACCOMMODATION ALLOCATION
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "accommodation" && (
        <div className="space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              DYNAMIC HOSTEL & ROOM MODULES
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              ACCOMMODATION ALLOCATION
            </h2>
          </div>

          {/* Allocation summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">CONTINGENT TOTAL</span>
              <p className="font-pixel text-base text-pixel-cream">{accommodation?.summary?.totalMembers || 0}</p>
            </div>
            <div className="p-3 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">ALLOCATED BEDS</span>
              <p className="font-pixel text-base text-pixel-green">{accommodation?.summary?.allocatedCount || 0}</p>
            </div>
            <div className="p-3 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">PENDING</span>
              <p className="font-pixel text-base text-pixel-amber">{accommodation?.summary?.pendingCount || 0}</p>
            </div>
            <div className="p-3 bg-pixel-dark border border-pixel-gray-800">
              <span className="font-pixel text-[9px] text-pixel-muted uppercase block">HOSTEL BLOCKS</span>
              <p className="font-pixel text-xs text-pixel-cyan truncate">
                {accommodation?.summary?.assignedHostels?.join(", ") || "PENDING"}
              </p>
            </div>
          </div>

          {/* Individual Member Allocations */}
          <div className="space-y-2">
            <span className="font-pixel text-xs text-pixel-cream uppercase tracking-wider block">
              INDIVIDUAL ATHLETE & OFFICIAL ROOM SLOTS
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accommodation?.memberAllocations?.map((m: any) => (
                <div
                  key={m.participantId}
                  className="p-3.5 bg-pixel-dark border border-pixel-gray-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs text-pixel-cream">{m.name}</span>
                      <PixelBadge variant={m.role === "CAPTAIN" ? "orange" : m.role === "MANAGER" ? "cyan" : "dark"}>
                        {m.role}
                      </PixelBadge>
                    </div>
                    <p className="text-[11px] text-pixel-muted font-sans">
                      {m.hostelName} &bull; {m.floorName}
                    </p>
                    <div className="font-mono text-[11px] text-pixel-amber">
                      Room: <span className="font-bold">{m.roomNumber}</span> &bull; Bed: <span className="font-bold text-pixel-cyan">{m.bedNumber}</span>
                    </div>
                  </div>

                  <PixelBadge variant={m.isAllocated ? "green" : "red"}>
                    {m.status}
                  </PixelBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8: TRANSPORT SHUTTLE LOGISTICS
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "transport" && (
        <div className="space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              UNIVERSITY FLEET SHUTTLES &bull; COMPLIMENTARY
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TRANSPORT OPERATIONS
            </h2>
          </div>

          {/* Assigned Trips */}
          <div className="space-y-3">
            <span className="font-pixel text-xs text-pixel-cyan uppercase tracking-wider block">
              SCHEDULED TRANSIT SHUTTLES ({transport?.assignedTrips?.length || 0})
            </span>

            {transport?.assignedTrips?.length === 0 ? (
              <p className="text-xs text-pixel-muted italic p-4 bg-pixel-dark border border-pixel-gray-800">
                No dedicated shuttle trips assigned yet. Regular campus loop operates every 20 minutes.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transport?.assignedTrips?.map((trip: any) => (
                  <div key={trip.tripId} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                      <div>
                        <span className="font-pixel text-xs text-pixel-orange-bright">{trip.tripCode}</span>
                        <p className="text-xs font-semibold text-pixel-cream">{trip.routeName}</p>
                      </div>
                      <PixelBadge variant={trip.status === "BOARDING" || trip.status === "IN_TRANSIT" ? "green" : "orange"}>
                        {trip.status}
                      </PixelBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-pixel-muted uppercase block">ORIGIN</span>
                        <span className="text-pixel-cream">{trip.origin}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-pixel-muted uppercase block">DESTINATION</span>
                        <span className="text-pixel-cream">{trip.destination}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-pixel-muted uppercase block">DEPARTURE</span>
                        <span className="text-pixel-amber">{trip.scheduledTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-pixel-muted uppercase block">VEHICLE NO</span>
                        <span className="text-pixel-cyan font-bold">{trip.vehicleNo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Boarding Manifest */}
          <div className="space-y-3">
            <span className="font-pixel text-xs text-pixel-amber uppercase tracking-wider block">
              PASSENGER BOARDING STATUS
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-pixel-dark border-b-2 border-pixel-orange-fiery text-pixel-muted font-pixel text-[10px] uppercase">
                    <th className="p-3">Passenger</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Shuttle Trip</th>
                    <th className="p-3">Pickup Point</th>
                    <th className="p-3">Drop Point</th>
                    <th className="p-3">Boarding Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pixel-gray-800 bg-pixel-black/60 text-[11px]">
                  {transport?.passengerManifest?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-pixel-dark/80">
                      <td className="p-3 font-semibold text-pixel-cream">{p.passengerName}</td>
                      <td className="p-3 text-pixel-muted">{p.role}</td>
                      <td className="p-3 font-mono text-pixel-cyan">{p.tripCode}</td>
                      <td className="p-3 text-pixel-muted">{p.pickupPoint}</td>
                      <td className="p-3 text-pixel-muted">{p.dropPoint}</td>
                      <td className="p-3">
                        <PixelBadge variant={p.boardingStatus === "BOARDED" ? "green" : "orange"}>
                          {p.boardingStatus}
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
          SECTION 9: UPCOMING & LIVE MATCHES
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "matches" && (
        <div className="space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              CHAMPIONSHIP TIES & LIVE FEEDS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TEAM MATCHES
            </h2>
          </div>

          {/* Live match if present */}
          {matches?.liveMatch && (
            <div className="p-5 bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel-orange space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 font-pixel text-[10px] bg-pixel-red text-white uppercase animate-pulse">
                  LIVE MATCH ON COURT &bull; {matches.liveMatch.court}
                </span>
                <span className="font-mono text-xs text-pixel-cyan">{matches.liveMatch.category}</span>
              </div>
              <div className="flex items-center justify-between text-base sm:text-xl font-pixel text-pixel-cream">
                <div className="text-pixel-orange-bright">{matches.liveMatch.playerA}</div>
                <div className="font-mono text-sm text-pixel-amber font-bold">
                  {matches.liveMatch.rawScoreA || "0"} : {matches.liveMatch.rawScoreB || "0"}
                </div>
                <div>{matches.liveMatch.playerB}</div>
              </div>
              <p className="text-[11px] text-pixel-muted italic">
                Scoring is actively administered by the assigned BWF Match Official.
              </p>
            </div>
          )}

          {/* Upcoming Schedule */}
          <div className="space-y-3">
            <span className="font-pixel text-xs text-pixel-cream uppercase tracking-wider block">
              UPCOMING SCHEDULED TIES ({matches?.upcomingMatches?.length || 0})
            </span>

            {matches?.upcomingMatches?.length === 0 ? (
              <p className="text-xs text-pixel-muted italic p-4 bg-pixel-dark border border-pixel-gray-800">
                NO MATCHES SCHEDULED. Awaiting next round draw fixtures from tournament referee.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.upcomingMatches.map((m: any) => (
                  <div key={m.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2">
                      <div>
                        <span className="font-pixel text-xs text-pixel-orange-bright">{m.matchNumber}</span>
                        <p className="font-mono text-[10px] text-pixel-muted">{m.category}</p>
                      </div>
                      <PixelBadge variant="orange">{m.status}</PixelBadge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-pixel-cream">{m.playerA}</span>
                        <span className="font-mono text-[10px] text-pixel-muted">{m.institutionA}</span>
                      </div>
                      <div className="text-center font-pixel text-[10px] text-pixel-amber">VS</div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-pixel-cream">{m.playerB}</span>
                        <span className="font-mono text-[10px] text-pixel-muted">{m.institutionB}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-[11px] font-mono text-pixel-cyan">
                      <span>{m.court}</span>
                      <span>{m.date} &bull; {m.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10: RESULTS
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "results" && (
        <div className="space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL COMPLETED TIES
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              RECENT RESULTS ({results?.totalCompleted || 0})
            </h2>
          </div>

          {results?.results?.length === 0 ? (
            <p className="text-xs text-pixel-muted italic p-4 bg-pixel-dark border border-pixel-gray-800">
              No completed ties recorded for this team yet.
            </p>
          ) : (
            <div className="space-y-3">
              {results.results.map((res: any) => (
                <div key={res.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs text-pixel-orange-bright">{res.matchNumber}</span>
                      <span className="font-mono text-[10px] text-pixel-muted">&bull; {res.category}</span>
                      <PixelBadge variant={res.outcome === "WON" ? "green" : "red"}>{res.winnerLabel}</PixelBadge>
                    </div>
                    <div className="text-sm font-semibold text-pixel-cream">
                      {res.ourPlayer} vs {res.opponentPlayer} ({res.opponentInstitution})
                    </div>
                    <p className="font-mono text-xs text-pixel-amber">
                      FINAL SCORES: <span className="font-bold">{res.setScores}</span>
                    </p>
                  </div>

                  <div className="text-right font-mono text-[11px] text-pixel-muted shrink-0">
                    <div>{res.court}</div>
                    <div>{res.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 11: TEAM PASS & SECURE QR
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "pass" && (
        <div className="max-w-md mx-auto space-y-6">
          <div className="border-b-2 border-pixel-orange-fiery pb-2 text-center">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL CHAMPIONSHIP GAME PASS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TEAM PASS ACCREDITATION
            </h2>
          </div>

          {/* Arcade Game Pass Card */}
          <div className="relative p-6 bg-pixel-dark border-4 border-pixel-orange-fiery shadow-pixel-orange text-center space-y-4">
            <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-3">
              <div className="flex items-center gap-1.5 font-pixel text-xs text-pixel-orange-bright">
                <Zap className="w-4 h-4 animate-bounce" />
                <span>OFFICIAL TEAM PASS</span>
              </div>
              <PixelBadge variant="orange">ACCREDITED SQUAD</PixelBadge>
            </div>

            <div className="space-y-1">
              <span className="font-pixel text-[10px] text-pixel-muted uppercase">INSTITUTION SQUAD</span>
              <h3 className="text-xl font-pixel text-pixel-cream tracking-wide">
                {teamPass?.teamName || team.name}
              </h3>
              <p className="text-xs text-pixel-gray-300 font-sans">{teamPass?.institution || team.institution}</p>
              <p className="font-mono text-xs text-pixel-amber font-bold pt-1">
                CODE: {teamPass?.teamCode || team.teamCode}
              </p>
            </div>

            {/* QR Code Pixel Matrix generated with opaque token */}
            <div className="flex flex-col items-center justify-center p-4 bg-pixel-cream border-2 border-black">
              <PixelQR
                value={teamPass?.qrToken || team.teamQrToken || `sz26_qr_tm_${team.teamCode}`}
                size={180}
              />
              <p className="font-mono text-[9px] text-black mt-2 font-bold tracking-widest uppercase">
                [{teamPass?.qrToken || team.teamQrToken || "SZ26-TOKEN-OPAQUE"}]
              </p>
            </div>

            {/* Pass Metadata */}
            <div className="grid grid-cols-2 gap-2 text-left font-sans text-xs pt-1 border-t border-pixel-gray-800">
              <div>
                <span className="text-[9px] font-pixel text-pixel-muted uppercase block">MANAGER</span>
                <span className="text-pixel-cream">{teamPass?.managerName || team.managerName || "—"}</span>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-pixel-muted uppercase block">CAPTAIN</span>
                <span className="text-pixel-cream">{teamPass?.captainName || team.captainName || "—"}</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-2.5 bg-pixel-black border border-pixel-gray-800 text-[10px] text-pixel-muted font-mono text-left space-y-1">
              <div className="flex items-center gap-1.5 text-pixel-green font-pixel">
                <Shield className="w-3.5 h-3.5" />
                <span>CRYPTOGRAPHIC TOKEN VERIFIED</span>
              </div>
              <p>
                This pass encodes an opaque backend reference token. No personal phone numbers, emails, or private documents are exposed within the QR.
              </p>
            </div>

            {/* Print Pass Button */}
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 font-pixel text-xs bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright transition-colors shadow-pixel-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT / SAVE OFFICIAL PASS</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 12: ANNOUNCEMENTS
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "announcements" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-pixel-orange-fiery pb-3">
            <div>
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
                OFFICIAL BULLETIN BOARD
              </span>
              <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
                TOURNAMENT ANNOUNCEMENTS ({filteredAnnouncements.length})
              </h2>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["ALL", "GENERAL", "MATCH", "ACCOMMODATION", "TRANSPORT", "REGISTRATION", "IMPORTANT"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAnnouncementCategory(cat)}
                  className={`px-2.5 py-1 font-pixel text-[9px] border transition-colors cursor-pointer ${
                    announcementCategory === cat
                      ? "bg-pixel-orange-fiery text-black border-pixel-orange-fiery font-bold"
                      : "bg-pixel-dark text-pixel-muted border-pixel-gray-800 hover:text-pixel-cream"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredAnnouncements.length === 0 ? (
            <p className="text-xs text-pixel-muted italic p-6 bg-pixel-dark border border-pixel-gray-800 text-center">
              No bulletins published under this category.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.map((ann) => (
                <div key={ann.id} className="p-4 bg-pixel-dark border border-pixel-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[10px] text-pixel-cyan uppercase bg-pixel-cyan/10 px-2 py-0.5 border border-pixel-cyan/30">
                      {ann.category}
                    </span>
                    <span className="font-mono text-xs text-pixel-muted">
                      {new Date(ann.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-pixel text-sm text-pixel-cream tracking-wide">{ann.title}</h3>
                  <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed">{ann.content}</p>
                  <div className="pt-2 text-[10px] font-mono text-pixel-muted flex items-center justify-between border-t border-pixel-gray-800/60">
                    <span>Target: {ann.targetAudience}</span>
                    <span>Issued by: {ann.authorEmail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 13: SUPPORT
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "support" && (
        <div className="max-w-2xl space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              OFFICIAL HELP DESK & ASSISTANCE
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              TOURNAMENT SUPPORT
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-5 text-xs font-sans">
            <p className="text-pixel-gray-300 leading-relaxed">
              For operational queries regarding contingent accreditation, match protest procedures, hostel maintenance, or transport dispatch, please contact the designated tournament control desks below:
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-pixel-orange-fiery shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-pixel text-xs text-pixel-cream">Registration & Accreditation Desk 02</h4>
                  <p className="text-pixel-muted text-[11px] mt-0.5">Location: Main Badminton Arena South Wing Concourse</p>
                  <p className="font-mono text-pixel-cyan text-[11px]">Email: registration@szwbt2026.edu</p>
                </div>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-3">
                <Home className="w-5 h-5 text-pixel-green shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-pixel text-xs text-pixel-cream">Hostel & Accommodation Logistics</h4>
                  <p className="text-pixel-muted text-[11px] mt-0.5">Location: Shalmala & Vindhya Hostels Reception</p>
                  <p className="font-mono text-pixel-green text-[11px]">Email: hostel@szwbt2026.edu</p>
                </div>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-3">
                <Bus className="w-5 h-5 text-pixel-cyan shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-pixel text-xs text-pixel-cream">Fleet Transport Dispatch</h4>
                  <p className="text-pixel-muted text-[11px] mt-0.5">Location: Arena Bus Bay East Gate</p>
                  <p className="font-mono text-pixel-cyan text-[11px]">Email: transport@szwbt2026.edu</p>
                </div>
              </div>

              <div className="p-3 bg-pixel-black/60 border border-pixel-gray-800 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-pixel-amber shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-pixel text-xs text-pixel-cream">Treasury & Finance Counter</h4>
                  <p className="text-pixel-muted text-[11px] mt-0.5">Location: Main Administration Block Room 104</p>
                  <p className="font-mono text-pixel-amber text-[11px]">Email: finance@szwbt2026.edu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 14: MANAGER PROFILE
         ═══════════════════════════════════════════════════════════════ */}
      {currentTab === "profile" && (
        <div className="max-w-xl space-y-5">
          <div className="border-b-2 border-pixel-orange-fiery pb-2">
            <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-widest block">
              USER CLEARANCE & CREDENTIALS
            </span>
            <h2 className="font-pixel text-base text-pixel-cream tracking-wide">
              MANAGER PROFILE
            </h2>
          </div>

          <div className="p-6 bg-pixel-dark border-2 border-pixel-gray-800 space-y-5 text-xs font-sans">
            <div className="flex items-center gap-3 border-b border-pixel-gray-800 pb-4">
              <div className="w-12 h-12 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-lg text-pixel-orange-bright">
                TM
              </div>
              <div>
                <h3 className="font-pixel text-sm text-pixel-cream">{user?.name || "Rajesh Kumar"}</h3>
                <p className="font-mono text-[11px] text-pixel-muted">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <PixelBadge variant="orange">TEAM_MANAGER</PixelBadge>
                  <PixelBadge variant="green">ACTIVE SESSION</PixelBadge>
                </div>
              </div>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between p-2 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="text-pixel-muted">Clearance Badge:</span>
                <span className="text-pixel-amber font-bold">{user?.badge || "UNIVERSITY DESK"}</span>
              </div>
              <div className="flex justify-between p-2 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="text-pixel-muted">Associated Team:</span>
                <span className="text-pixel-cyan font-bold">{team.name}</span>
              </div>
              <div className="flex justify-between p-2 bg-pixel-black/60 border border-pixel-gray-800">
                <span className="text-pixel-muted">Institution:</span>
                <span className="text-pixel-cream">{team.institution}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={memberModalOpen}
        onClose={() => {
          setMemberModalOpen(false);
          setSelectedMember(null);
        }}
      />
    </TeamPortalShell>
  );
}

export default function TeamManagerPortal() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-pixel-black text-pixel-cream flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-12 h-12 border-4 border-pixel-orange-fiery border-t-transparent animate-spin rounded-none" />
          <p className="font-pixel text-xs text-pixel-orange-bright tracking-widest uppercase">
            LOADING TEAM COMMAND CONSOLE...
          </p>
        </div>
      }
    >
      <TeamManagerPortalContent />
    </React.Suspense>
  );
}
