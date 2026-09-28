"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import {
  User as UserIcon,
  Shield,
  Key,
  Lock,
  Smartphone,
  Laptop,
  Globe,
  Bell,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  LifeBuoy,
  Calendar,
  MapPin,
  Home,
  Bus,
  Trophy,
  FileText,
  QrCode,
  Edit3,
  Save,
  X,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  Check,
  Building,
} from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  institution: string | null;
  state: string | null;
  badge: string | null;
  targetUrl: string | null;
  createdAt: string;
  accountStatus: string;
}

interface RoleData {
  roleKey: string;
  displayName: string;
  description: string;
  assignedAt: string;
}

interface PreferencesData {
  tournamentAnnounce: boolean;
  matchUpdates: boolean;
  accommodationUpdates: boolean;
  transportUpdates: boolean;
  supportUpdates: boolean;
  systemNotifications: boolean;
  channelInApp: boolean;
  channelEmail: boolean;
  channelSms: boolean;
  channelPush: boolean;
  updatedAt: string;
}

interface SessionData {
  id: string;
  device: string;
  browser: string;
  ipAddress: string | null;
  location: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  resourceType: string;
  timestamp: string;
}

export default function AccountProfilePage() {
  const router = useRouter();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [authorizedModules, setAuthorizedModules] = useState<string[]>([]);
  const [tournamentContext, setTournamentContext] = useState<Record<string, any> | null>(null);
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [securityInfo, setSecurityInfo] = useState<Record<string, any> | null>(null);

  // Sessions and Activity
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Modals & UI interactive state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    state: "",
    institution: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Preference update state
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Session revocation modal state
  const [confirmRevokeSession, setConfirmRevokeSession] = useState<string | null>(null);
  const [confirmRevokeAllOthers, setConfirmRevokeAllOthers] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Logout confirmation
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Network offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch full profile data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/me", { credentials: "same-origin" });
      if (res.status === 401) {
        router.push("/login?returnTo=/profile");
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Unable to load your profile.");
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load profile.");
      }

      setProfile(data.profile);
      setRoles(data.roles || []);
      setAuthorizedModules(data.authorizedModules || []);
      setTournamentContext(data.tournamentContext || null);
      setPreferences(data.preferences || null);
      setSecurityInfo(data.security || null);

      setEditFormData({
        name: data.profile.name || "",
        phone: data.profile.phone || "",
        state: data.profile.state || "",
        institution: data.profile.institution || "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to communicate with profile server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/me/sessions", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSessions(data.sessions || []);
        }
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Fetch recent activity
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/me/activity", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivity(data.activity || []);
        }
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchSessions();
    fetchActivity();
  }, [fetchProfile, fetchSessions, fetchActivity]);

  // Handle Edit Profile Save
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setEditError("Cannot update profile while offline.");
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      setEditSuccess(null);

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: editFormData.name.trim(),
          phone: editFormData.phone.trim() || null,
          state: editFormData.state.trim() || null,
          institution: editFormData.institution.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Profile update failed.");
      }

      setEditSuccess("Profile updated successfully!");
      setProfile((prev) => (prev ? { ...prev, ...data.profile } : null));

      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccess(null);
        fetchProfile();
        fetchActivity();
      }, 1000);
    } catch (err: any) {
      setEditError(err.message || "An unexpected error occurred during update.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Notification Preference Toggle
  const handlePreferenceToggle = async (key: keyof PreferencesData) => {
    if (!preferences || isOffline) return;
    if (key === "systemNotifications") return; // Mandatory

    const currentVal = preferences[key];
    const newVal = !currentVal;

    // Optimistic UI update
    setPreferences((prev) => (prev ? { ...prev, [key]: newVal } : null));
    setPrefSaving(true);
    setPrefSuccess(false);

    try {
      const res = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ [key]: newVal }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback on failure
        setPreferences((prev) => (prev ? { ...prev, [key]: currentVal } : null));
      } else {
        setPrefSuccess(true);
        setTimeout(() => setPrefSuccess(false), 2500);
        fetchActivity();
      }
    } catch {
      // Rollback on network failure
      setPreferences((prev) => (prev ? { ...prev, [key]: currentVal } : null));
    } finally {
      setPrefSaving(false);
    }
  };

  // Handle Revoke Session
  const handleRevokeSession = async () => {
    if (!confirmRevokeSession) return;
    try {
      setRevokeLoading(true);
      const res = await fetch("/api/me/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId: confirmRevokeSession }),
      });
      if (res.ok) {
        setConfirmRevokeSession(null);
        fetchSessions();
        fetchActivity();
      }
    } catch {
      // ignore
    } finally {
      setRevokeLoading(false);
    }
  };

  // Handle Revoke All Other Sessions
  const handleRevokeAllOtherSessions = async () => {
    try {
      setRevokeLoading(true);
      const res = await fetch("/api/me/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ allOthers: true }),
      });
      if (res.ok) {
        setConfirmRevokeAllOthers(false);
        fetchSessions();
        fetchActivity();
      }
    } catch {
      // ignore
    } finally {
      setRevokeLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      setLogoutLoading(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setLogoutLoading(false);
    }
  };

  // Derive visual label based on roles
  const primaryRole = roles[0]?.roleKey || "USER";
  const getHeaderLabel = () => {
    if (primaryRole === "PARTICIPANT") return "PLAYER // PROFILE";
    if (primaryRole === "TEAM_MANAGER") return "MANAGER // PROFILE";
    if (primaryRole === "MATCH_OFFICIAL") return "OFFICIAL // PROFILE";
    if (primaryRole === "SUPER_ADMIN") return "ROOT // PROFILE";
    return "ACCOUNT // PROFILE";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] text-[#f5e6ca] flex flex-col justify-between selection:bg-[#ff5500] selection:text-white">
        <ArcadeNav />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
          <div className="p-8 bg-[#0b0c10] border-2 border-[#ff5500]/60 shadow-[0_0_30px_rgba(255,85,0,0.15)] text-center max-w-md w-full">
            <RefreshCw className="w-10 h-10 text-[#ff5500] animate-spin mx-auto mb-4" />
            <div className="font-pixel text-xs text-[#18d8d0] uppercase tracking-widest mb-1">
              INITIALIZING TELEMETRY
            </div>
            <h1 className="font-display text-xl text-[#f5e6ca] font-bold">
              LOADING PROFILE DATA...
            </h1>
            <p className="font-sans text-xs text-[#94a3b8] mt-2">
              Verifying cryptographic session credentials with central IDP...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#060608] text-[#f5e6ca] flex flex-col justify-between selection:bg-[#ff5500] selection:text-white">
        <ArcadeNav />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
          <div className="p-8 bg-[#0b0c10] border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] text-center max-w-md w-full">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <div className="font-pixel text-xs text-red-400 uppercase tracking-widest mb-1">
              AUTHENTICATION ERROR
            </div>
            <h1 className="font-display text-xl text-[#f5e6ca] font-bold">
              UNABLE TO LOAD PROFILE
            </h1>
            <p className="font-sans text-xs text-[#94a3b8] mt-2 mb-6">
              {error || "Your session could not be authoritatively validated."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fetchProfile()}
                className="px-4 py-2 bg-[#ff5500] text-black font-pixel text-xs font-bold hover:bg-[#d94e16] transition-colors"
              >
                RETRY
              </button>
              <Link
                href="/login"
                className="px-4 py-2 border border-[#94a3b8]/40 text-[#f5e6ca] font-pixel text-xs hover:border-[#f5e6ca] transition-colors"
              >
                LOG IN
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SZ";

  return (
    <div className="min-h-screen bg-[#060608] text-[#f5e6ca] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#ff5500] selection:text-white">
      <ArcadeNav />

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500/20 border-b border-amber-500 text-amber-300 px-4 py-2 text-center text-xs font-pixel flex items-center justify-center gap-2 sticky top-[57px] z-30 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4" />
          <span>OFFLINE MODE ACTIVE: Profile mutations are disabled until connection is restored.</span>
        </div>
      )}

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-24 z-10">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 1. MASTER PROFILE HEADER (HUD IDENTITY MATRIX) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section
          aria-label="Profile Header"
          className="bg-[#0b0c10] border-2 border-[#18d8d0]/60 p-6 sm:p-8 rounded-sm shadow-[0_0_25px_rgba(24,216,208,0.12)] mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#18d8d0]/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Pixel Avatar */}
              <div className="w-20 h-20 rounded-sm border-2 border-[#18d8d0] bg-[#060608] flex items-center justify-center text-[#18d8d0] text-3xl font-display font-bold shadow-[0_0_18px_rgba(24,216,208,0.25)] relative group">
                <span>{initials}</span>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#18d8d0] border border-black flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-pixel text-[9px] text-[#18d8d0] uppercase tracking-wider">
                    {getHeaderLabel()}
                  </span>
                  <span className="px-2 py-0.5 bg-[#18d8d0] text-black font-pixel text-[8px] font-bold">
                    {profile.accountStatus}
                  </span>
                  <span className="px-2 py-0.5 bg-[#1b0d2b] border border-[#ff5500]/60 text-[#f5a623] font-pixel text-[8px] font-bold">
                    {roles[0]?.displayName?.toUpperCase() || "AUTHORIZED PERSONNEL"}
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-4xl text-[#f5e6ca] font-bold tracking-tight">
                  {profile.name}
                </h1>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 font-sans text-xs text-[#94a3b8] mt-1.5">
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#18d8d0]" />
                    {profile.email}
                  </span>
                  {profile.institution && (
                    <span className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#ff5500]" />
                      {profile.institution}
                    </span>
                  )}
                  {profile.state && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#f5a623]" />
                      {profile.state}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="edit-profile-btn"
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2.5 bg-[#ff5500] text-black font-pixel text-xs font-bold hover:bg-[#d94e16] transition-all flex items-center gap-2 shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>EDIT PROFILE</span>
              </button>

              <button
                id="sign-out-btn"
                onClick={() => setConfirmLogout(true)}
                className="px-4 py-2.5 border border-red-500/60 bg-red-950/20 text-red-300 font-pixel text-xs font-bold hover:bg-red-900/40 hover:border-red-500 transition-all flex items-center gap-2 shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>SIGN OUT</span>
              </button>
            </div>
          </div>

          {/* Telemetry Status Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
            <div className="p-3 bg-[#060608] border border-[#18d8d0]/40 flex items-center gap-3">
              <div className="w-8 h-8 border border-[#18d8d0] bg-[#0b0c10] flex items-center justify-center text-[#18d8d0] shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="font-pixel text-[8px] text-[#94a3b8] uppercase">IDENTITY AUTH</div>
                <div className="font-display text-xs text-[#18d8d0] font-bold">VERIFIED SSO</div>
              </div>
            </div>

            <div className="p-3 bg-[#060608] border border-[#ff5500]/40 flex items-center gap-3">
              <div className="w-8 h-8 border border-[#ff5500] bg-[#0b0c10] flex items-center justify-center text-[#ff5500] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-pixel text-[8px] text-[#94a3b8] uppercase">SECURITY STATUS</div>
                <div className="font-display text-xs text-[#ff5500] font-bold">ACTIVE & SECURE</div>
              </div>
            </div>

            <div className="p-3 bg-[#060608] border border-[#f5a623]/40 flex items-center gap-3">
              <div className="w-8 h-8 border border-[#f5a623] bg-[#0b0c10] flex items-center justify-center text-[#f5a623] shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <div className="font-pixel text-[8px] text-[#94a3b8] uppercase">ACTIVE SESSIONS</div>
                <div className="font-display text-xs text-[#f5a623] font-bold">
                  {sessions.length} {sessions.length === 1 ? "DEVICE" : "DEVICES"}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#060608] border border-[#18d8d0]/40 flex items-center gap-3">
              <div className="w-8 h-8 border border-[#18d8d0] bg-[#0b0c10] flex items-center justify-center text-[#18d8d0] shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-pixel text-[8px] text-[#94a3b8] uppercase">LAST LOGIN</div>
                <div className="font-display text-xs text-[#f5e6ca] font-bold truncate max-w-[140px]">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "RECENT"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 2. MAIN 3-COLUMN CONTENT GRID */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* LEFT COLUMN: Personal Info & Digital Pass (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Personal Information Panel */}
            <section
              aria-label="Personal Information"
              className="bg-[#0b0c10] border-2 border-[#18d8d0]/40 p-6 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#18d8d0]/20">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#18d8d0]" />
                  <h2 className="font-pixel text-xs text-[#18d8d0] uppercase tracking-wider">
                    PERSONAL INFORMATION
                  </h2>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="font-pixel text-[9px] text-[#ff5500] hover:text-[#f5a623] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>EDIT</span>
                </button>
              </div>

              <div className="space-y-4 font-sans text-xs">
                <div>
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-0.5">FULL NAME</div>
                  <div className="text-sm font-semibold text-[#f5e6ca] bg-[#060608] px-3 py-2 border border-[#1e293b]">
                    {profile.name}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-pixel text-[8px] text-[#94a3b8] uppercase">EMAIL ADDRESS</span>
                    <span className="font-pixel text-[7px] text-[#18d8d0]">MANAGED BY IDP</span>
                  </div>
                  <div className="text-sm text-[#94a3b8] bg-[#060608]/70 px-3 py-2 border border-[#1e293b]/70 flex items-center justify-between">
                    <span>{profile.email}</span>
                    <Lock className="w-3.5 h-3.5 text-[#94a3b8]/60" />
                  </div>
                </div>

                <div>
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-0.5">MOBILE NUMBER</div>
                  <div className="text-sm text-[#f5e6ca] bg-[#060608] px-3 py-2 border border-[#1e293b]">
                    {profile.phone || <span className="text-[#94a3b8] italic">Not provided</span>}
                  </div>
                </div>

                <div>
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-0.5">INSTITUTION / UNIVERSITY</div>
                  <div className="text-sm text-[#f5e6ca] bg-[#060608] px-3 py-2 border border-[#1e293b]">
                    {profile.institution || <span className="text-[#94a3b8] italic">Not assigned</span>}
                  </div>
                </div>

                <div>
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-0.5">DOMICILE STATE</div>
                  <div className="text-sm text-[#f5e6ca] bg-[#060608] px-3 py-2 border border-[#1e293b]">
                    {profile.state || <span className="text-[#94a3b8] italic">Not specified</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* Digital Pass / QR HUD (Section 11) */}
            {tournamentContext?.qrCodeToken || tournamentContext?.teamQrToken ? (
              <section
                aria-label="Digital Pass"
                className="bg-[#0b0c10] border-2 border-[#ff5500]/60 p-6 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#ff5500]/30">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#ff5500]" />
                    <h2 className="font-pixel text-xs text-[#ff5500] uppercase tracking-wider">
                      DIGITAL PASS // QR
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 bg-[#ff5500] text-black font-pixel text-[8px] font-bold">
                    ACCREDITED
                  </span>
                </div>

                <div className="bg-[#060608] p-4 border border-[#ff5500]/40 flex flex-col items-center text-center">
                  {/* Visual QR representation with opaque token */}
                  <div className="w-36 h-36 bg-white p-2.5 rounded-xs flex items-center justify-center shadow-[0_0_15px_rgba(255,85,0,0.2)] mb-3">
                    <div className="w-full h-full border-2 border-black border-dashed flex flex-col items-center justify-center text-black">
                      <QrCode className="w-16 h-16 text-black" />
                      <span className="font-pixel text-[7px] font-bold mt-1">SZWBT 2026 PASS</span>
                    </div>
                  </div>

                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-1">
                    CRYPTOGRAPHIC PASS REFERENCE
                  </div>
                  <code className="font-mono text-[10px] text-[#18d8d0] bg-[#0b0c10] px-2.5 py-1 border border-[#18d8d0]/30 mb-2 select-all">
                    {tournamentContext.qrCodeToken || tournamentContext.teamQrToken}
                  </code>
                  <p className="font-sans text-[11px] text-[#94a3b8] max-w-xs">
                    Present this pass at arena gate scanners, hostel checkpoints, and transport shuttles.
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          {/* CENTER COLUMN: Tournament Context & Logistics (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tournament Identity Context (Section 9 & 10) */}
            <section
              aria-label="Tournament Identity"
              className="bg-[#0b0c10] border-2 border-[#18d8d0]/40 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#18d8d0]/20">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#18d8d0]" />
                  <h2 className="font-pixel text-xs text-[#18d8d0] uppercase tracking-wider">
                    TOURNAMENT IDENTITY
                  </h2>
                </div>
                <span className="font-pixel text-[8px] text-[#18d8d0] bg-[#18d8d0]/10 border border-[#18d8d0]/30 px-2 py-0.5">
                  SZWBT 2026
                </span>
              </div>

              {/* Participant Athlete Details */}
              {tournamentContext?.type === "PARTICIPANT" && (
                <div className="space-y-4">
                  {/* Team Details */}
                  {tournamentContext.team ? (
                    <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-pixel text-[8px] text-[#94a3b8] uppercase">MY TEAM</span>
                        <span className="px-1.5 py-0.5 bg-[#18d8d0]/20 text-[#18d8d0] font-pixel text-[8px]">
                          {tournamentContext.team.role}
                        </span>
                      </div>
                      <div className="font-display text-base font-bold text-[#f5e6ca]">
                        {tournamentContext.team.name}
                      </div>
                      <div className="font-sans text-xs text-[#94a3b8] mt-0.5">
                        Code: <span className="font-mono text-[#f5e6ca]">{tournamentContext.team.teamCode}</span> &bull; Manager: {tournamentContext.team.managerName || "Assigned Desk"}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#060608] border border-[#1e293b] text-xs text-[#94a3b8] italic">
                      No team assigned.
                    </div>
                  )}

                  {/* Accommodation Logistics (Read-only, Section 29) */}
                  <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-pixel text-[8px] text-[#94a3b8] uppercase flex items-center gap-1.5">
                        <Home className="w-3 h-3 text-[#18d8d0]" />
                        ACCOMMODATION ALLOCATION
                      </span>
                      {tournamentContext.accommodation ? (
                        <span className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/60 text-emerald-300 font-pixel text-[8px]">
                          {tournamentContext.accommodation.status}
                        </span>
                      ) : null}
                    </div>

                    {tournamentContext.accommodation ? (
                      <div className="space-y-1">
                        <div className="font-display text-sm font-bold text-[#f5e6ca]">
                          {tournamentContext.accommodation.hostel}
                        </div>
                        <div className="font-sans text-xs text-[#94a3b8]">
                          Room <strong className="text-[#18d8d0]">{tournamentContext.accommodation.room}</strong> &bull; Bed <strong className="text-[#ff5500]">{tournamentContext.accommodation.bed}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#94a3b8] italic">
                        No accommodation allocated yet. Check with Accommodation Desk.
                      </div>
                    )}
                  </div>

                  {/* Transport Logistics (Strict Zero Transport Payment Rule, Section 28 & 30) */}
                  <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-pixel text-[8px] text-[#94a3b8] uppercase flex items-center gap-1.5">
                        <Bus className="w-3 h-3 text-[#ff5500]" />
                        SHUTTLE TRANSPORT
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 font-pixel text-[8px] font-bold">
                        COMPLIMENTARY
                      </span>
                    </div>

                    {tournamentContext.transport ? (
                      <div className="space-y-1">
                        <div className="font-display text-sm font-bold text-[#f5e6ca]">
                          {tournamentContext.transport.routeName}
                        </div>
                        <div className="font-sans text-xs text-[#94a3b8]">
                          Pickup: <strong className="text-[#f5e6ca]">{tournamentContext.transport.pickupPoint}</strong> &bull; Scheduled: {tournamentContext.transport.scheduledTime}
                        </div>
                        <div className="font-pixel text-[8px] text-[#18d8d0] mt-1">
                          STATUS: {tournamentContext.transport.boardingStatus}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#94a3b8] italic">
                        No transport booking registered. University shuttle is free of charge.
                      </div>
                    )}
                  </div>

                  {/* Documents Status (Read-Only Status, Section 27) */}
                  {tournamentContext.documents && tournamentContext.documents.length > 0 && (
                    <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                      <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-2 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-[#18d8d0]" />
                        DOCUMENT VERIFICATION STATUS
                      </div>
                      <div className="space-y-1.5">
                        {tournamentContext.documents.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between py-1 px-2 bg-[#0b0c10] border border-[#1e293b]/60 text-xs"
                          >
                            <span className="font-mono text-[11px] text-[#f5e6ca] truncate max-w-[180px]">
                              {doc.type.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 font-pixel text-[7px] font-bold ${
                                doc.status === "VERIFIED"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                  : "bg-amber-950 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="font-sans text-[10px] text-[#94a3b8] mt-2">
                        Official verification handled at Registration Desk.
                      </div>
                    </div>
                  )}

                  {/* Match Context (Section 31) */}
                  {tournamentContext.matches && tournamentContext.matches.length > 0 && (
                    <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-pixel text-[8px] text-[#94a3b8] uppercase flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#f5a623]" />
                          MATCH SCHEDULE & RESULTS
                        </span>
                        <Link
                          href="/schedule"
                          className="font-pixel text-[8px] text-[#ff5500] hover:underline flex items-center gap-0.5"
                        >
                          FULL DRAWS <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {tournamentContext.matches.map((m: any) => (
                          <div
                            key={m.id}
                            className="p-2 bg-[#0b0c10] border border-[#1e293b] text-xs"
                          >
                            <div className="flex items-center justify-between font-pixel text-[8px] text-[#94a3b8] mb-1">
                              <span>{m.matchNumber} &bull; {m.court}</span>
                              <span className="text-[#18d8d0]">{m.status}</span>
                            </div>
                            <div className="font-semibold text-[#f5e6ca]">
                              {m.playerA} vs {m.playerB}
                            </div>
                            <div className="text-[11px] text-[#94a3b8] flex items-center justify-between mt-0.5">
                              <span>{m.time}</span>
                              {m.scoreA && <span className="font-mono text-[#ff5500]">{m.scoreA} - {m.scoreB}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Manager Details */}
              {tournamentContext?.type === "TEAM_MANAGER" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                    <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-1">
                      MANAGED INSTITUTION TEAM
                    </div>
                    <div className="font-display text-lg font-bold text-[#f5e6ca]">
                      {tournamentContext.name}
                    </div>
                    <div className="font-sans text-xs text-[#94a3b8] mt-1">
                      Team Code: <span className="font-mono text-[#18d8d0]">{tournamentContext.teamCode}</span> &bull; {tournamentContext.institution} ({tournamentContext.state})
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs">
                      <span className="text-[#94a3b8]">Verified Athletes:</span>
                      <strong className="text-[#18d8d0] font-mono">{tournamentContext.memberCount} Players</strong>
                    </div>
                  </div>

                  <Link
                    href="/team"
                    className="block p-3 bg-[#ff5500]/10 border border-[#ff5500]/40 text-center font-pixel text-xs text-[#ff5500] hover:bg-[#ff5500]/20 transition-colors"
                  >
                    OPEN TEAM MANAGER DESK &rarr;
                  </Link>
                </div>
              )}

              {/* Staff Details */}
              {tournamentContext?.type === "STAFF" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#060608] border border-[#1e293b]">
                    <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-1">
                      OPERATIONAL ASSIGNMENT
                    </div>
                    <div className="font-display text-base font-bold text-[#f5e6ca]">
                      {profile.badge || "OFFICIAL SYSTEM CONTROLLER"}
                    </div>
                    <div className="font-sans text-xs text-[#94a3b8] mt-1">
                      Authorized tournament official. Clearance active for championship period.
                    </div>
                  </div>

                  {profile.targetUrl && (
                    <Link
                      href={profile.targetUrl}
                      className="block p-3 bg-[#18d8d0]/10 border border-[#18d8d0]/40 text-center font-pixel text-xs text-[#18d8d0] hover:bg-[#18d8d0]/20 transition-colors"
                    >
                      OPEN PRIMARY OPERATIONAL DESK &rarr;
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN: Roles, Access & Notifications (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Roles & Access (Section 7 & 8) */}
            <section
              aria-label="Your Access"
              className="bg-[#0b0c10] border-2 border-[#f5a623]/40 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f5a623]/20">
                <Key className="w-4 h-4 text-[#f5a623]" />
                <h2 className="font-pixel text-xs text-[#f5a623] uppercase tracking-wider">
                  YOUR ACCESS
                </h2>
              </div>

              <div className="space-y-3">
                <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-1">
                  ASSIGNED ROLES (READ-ONLY)
                </div>

                {roles.map((r) => (
                  <div
                    key={r.roleKey}
                    className="p-3 bg-[#060608] border border-[#1e293b] rounded-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-pixel text-[9px] text-[#f5a623] font-bold">
                        {r.displayName}
                      </span>
                      <span className="px-1.5 py-0.2 bg-[#f5a623]/20 text-[#f5a623] font-pixel text-[7px]">
                        ACTIVE
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#94a3b8]">
                      {r.description}
                    </p>
                  </div>
                ))}

                <div className="pt-2">
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-2">
                    AUTHORIZED MODULES
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {authorizedModules.map((mod) => (
                      <span
                        key={mod}
                        className="px-2 py-1 bg-[#060608] border border-[#18d8d0]/30 text-[#18d8d0] font-pixel text-[8px]"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 bg-[#060608] border border-amber-500/20 text-[10px] text-[#94a3b8] flex items-start gap-2 mt-4">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Roles and module clearances are configured by Tournament Administration.
                  </span>
                </div>
              </div>
            </section>

            {/* Notification Preferences (Section 12 & 13) */}
            <section
              aria-label="Notification Settings"
              className="bg-[#0b0c10] border-2 border-[#18d8d0]/40 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#18d8d0]/20">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#18d8d0]" />
                  <h2 className="font-pixel text-xs text-[#18d8d0] uppercase tracking-wider">
                    NOTIFICATION SETTINGS
                  </h2>
                </div>
                {prefSaving && (
                  <span className="font-pixel text-[8px] text-[#ff5500] animate-pulse">SAVING...</span>
                )}
                {prefSuccess && (
                  <span className="font-pixel text-[8px] text-emerald-400">SAVED!</span>
                )}
              </div>

              {preferences && (
                <div className="space-y-3 font-sans text-xs">
                  {/* Announcements */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b]">
                    <div>
                      <div className="font-medium text-[#f5e6ca]">Championship Announcements</div>
                      <div className="text-[10px] text-[#94a3b8]">Public notices and broadcast alerts</div>
                    </div>
                    <button
                      onClick={() => handlePreferenceToggle("tournamentAnnounce")}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        preferences.tournamentAnnounce ? "bg-[#ff5500]" : "bg-[#1e293b]"
                      }`}
                      aria-label="Toggle tournament announcements"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          preferences.tournamentAnnounce ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Match Updates */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b]">
                    <div>
                      <div className="font-medium text-[#f5e6ca]">Match & Court Calls</div>
                      <div className="text-[10px] text-[#94a3b8]">Schedule shifts and court calls</div>
                    </div>
                    <button
                      onClick={() => handlePreferenceToggle("matchUpdates")}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        preferences.matchUpdates ? "bg-[#ff5500]" : "bg-[#1e293b]"
                      }`}
                      aria-label="Toggle match updates"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          preferences.matchUpdates ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Accommodation Updates */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b]">
                    <div>
                      <div className="font-medium text-[#f5e6ca]">Hostel & Check-in Alerts</div>
                      <div className="text-[10px] text-[#94a3b8]">Room assignment notices</div>
                    </div>
                    <button
                      onClick={() => handlePreferenceToggle("accommodationUpdates")}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        preferences.accommodationUpdates ? "bg-[#ff5500]" : "bg-[#1e293b]"
                      }`}
                      aria-label="Toggle accommodation updates"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          preferences.accommodationUpdates ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Transport Updates */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b]">
                    <div>
                      <div className="font-medium text-[#f5e6ca]">Transport Shuttle Alerts</div>
                      <div className="text-[10px] text-[#94a3b8]">Bus departure & arrival calls</div>
                    </div>
                    <button
                      onClick={() => handlePreferenceToggle("transportUpdates")}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        preferences.transportUpdates ? "bg-[#ff5500]" : "bg-[#1e293b]"
                      }`}
                      aria-label="Toggle transport updates"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          preferences.transportUpdates ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Support Responses */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b]">
                    <div>
                      <div className="font-medium text-[#f5e6ca]">Support Responses</div>
                      <div className="text-[10px] text-[#94a3b8]">Help desk inquiry updates</div>
                    </div>
                    <button
                      onClick={() => handlePreferenceToggle("supportUpdates")}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        preferences.supportUpdates ? "bg-[#ff5500]" : "bg-[#1e293b]"
                      }`}
                      aria-label="Toggle support responses"
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          preferences.supportUpdates ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* System Notifications (MANDATORY) */}
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="font-medium text-[#f5e6ca] flex items-center gap-1.5">
                        <span>System Critical Notices</span>
                        <span className="px-1.5 py-0.2 bg-red-950 text-red-300 font-pixel text-[7px] border border-red-500/40">
                          REQUIRED
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">Emergency arena notices & safety alerts</div>
                    </div>
                    <div className="w-9 h-5 rounded-full p-0.5 bg-[#18d8d0] opacity-80 cursor-not-allowed">
                      <div className="w-4 h-4 rounded-full bg-black translate-x-4" />
                    </div>
                  </div>

                  {/* Delivery Channels */}
                  <div className="pt-3 border-t border-[#1e293b]">
                    <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-2">
                      COMMUNICATION CHANNELS
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#060608] border border-emerald-500/30 text-[10px]">
                        <div className="text-[#f5e6ca] font-medium">IN-APP HUD</div>
                        <div className="text-emerald-400 font-pixel text-[7px]">ACTIVE</div>
                      </div>
                      <div className="p-2 bg-[#060608] border border-emerald-500/30 text-[10px]">
                        <div className="text-[#f5e6ca] font-medium">EMAIL DISPATCH</div>
                        <div className="text-emerald-400 font-pixel text-[7px]">ACTIVE</div>
                      </div>
                      <div className="p-2 bg-[#060608] border border-[#1e293b] text-[10px] opacity-50">
                        <div className="text-[#94a3b8]">SMS GATEWAY</div>
                        <div className="text-[#94a3b8] font-pixel text-[7px]">NOT CONFIGURED</div>
                      </div>
                      <div className="p-2 bg-[#060608] border border-[#1e293b] text-[10px] opacity-50">
                        <div className="text-[#94a3b8]">PUSH ALERTS</div>
                        <div className="text-[#94a3b8] font-pixel text-[7px]">NOT CONFIGURED</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 3. LOWER SECTION: SECURITY, SESSIONS, ACTIVITY & SUPPORT */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Security Center & Active Sessions (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Active Sessions Panel (Section 15) */}
            <section
              aria-label="Active Sessions"
              className="bg-[#0b0c10] border-2 border-[#18d8d0]/40 p-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#18d8d0]/20 gap-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-[#18d8d0]" />
                  <h2 className="font-pixel text-xs text-[#18d8d0] uppercase tracking-wider">
                    ACTIVE SESSIONS
                  </h2>
                </div>

                {sessions.length > 1 && (
                  <button
                    onClick={() => setConfirmRevokeAllOthers(true)}
                    className="font-pixel text-[9px] text-red-400 hover:text-red-300 border border-red-500/40 px-2.5 py-1 bg-red-950/20 hover:bg-red-900/30 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    SIGN OUT ALL OTHER SESSIONS
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-xs text-[#94a3b8] italic">No active sessions available.</div>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 bg-[#060608] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 border border-[#18d8d0]/50 bg-[#0b0c10] flex items-center justify-center text-[#18d8d0] shrink-0">
                          {sess.device.includes("Mobile") || sess.device.includes("iPhone") ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#f5e6ca]">
                              {sess.device}
                            </span>
                            {sess.isCurrent && (
                              <span className="px-1.5 py-0.2 bg-[#18d8d0] text-black font-pixel text-[7px] font-bold">
                                CURRENT SESSION
                              </span>
                            )}
                          </div>
                          <div className="font-sans text-xs text-[#94a3b8] mt-0.5">
                            {sess.browser} &bull; {sess.location} {sess.ipAddress && `(${sess.ipAddress})`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-pixel text-[8px] text-[#94a3b8]">
                          ACTIVE: {new Date(sess.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!sess.isCurrent && (
                          <button
                            onClick={() => setConfirmRevokeSession(sess.id)}
                            className="px-2 py-1 bg-red-950/40 border border-red-500/50 text-red-300 font-pixel text-[8px] hover:bg-red-900/60 transition-colors cursor-pointer"
                          >
                            REVOKE
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Personal Activity (Section 16) */}
            <section
              aria-label="Recent Account Activity"
              className="bg-[#0b0c10] border-2 border-[#18d8d0]/40 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#18d8d0]/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#18d8d0]" />
                  <h2 className="font-pixel text-xs text-[#18d8d0] uppercase tracking-wider">
                    RECENT ACCOUNT ACTIVITY
                  </h2>
                </div>
                <span className="font-pixel text-[8px] text-[#94a3b8]">AUDIT TRAIL</span>
              </div>

              <div className="space-y-2">
                {activity.length === 0 ? (
                  <div className="text-xs text-[#94a3b8] italic p-3 bg-[#060608] border border-[#1e293b]">
                    No recent account activity logged.
                  </div>
                ) : (
                  activity.slice(0, 8).map((act) => (
                    <div
                      key={act.id}
                      className="p-3 bg-[#060608] border border-[#1e293b] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#18d8d0] shrink-0" />
                        <div>
                          <div className="font-medium text-[#f5e6ca]">{act.description}</div>
                          <div className="font-pixel text-[8px] text-[#94a3b8] mt-0.5">
                            ACTION: {act.action} &bull; RESOURCE: {act.resourceType}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#94a3b8] shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Support & Security Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Security Summary Panel (Section 14 & 18) */}
            <section
              aria-label="Security Settings"
              className="bg-[#0b0c10] border-2 border-[#ff5500]/40 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#ff5500]/20">
                <Shield className="w-4 h-4 text-[#ff5500]" />
                <h2 className="font-pixel text-xs text-[#ff5500] uppercase tracking-wider">
                  SECURITY CENTER
                </h2>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div>
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-0.5">IDENTITY PROVIDER</div>
                  <div className="p-2.5 bg-[#060608] border border-[#1e293b] text-[#f5e6ca] font-medium">
                    {securityInfo?.authProvider || "SZWBT Central SSO"}
                  </div>
                </div>

                <div>
                  <div className="font-pixel text-[8px] text-[#94a3b8] uppercase mb-0.5">ACCOUNT RECOVERY & PASSWORDS</div>
                  <div className="p-2.5 bg-[#060608] border border-[#1e293b] text-[#94a3b8] flex items-center justify-between">
                    <span>Managed via Central OIDC</span>
                    <Lock className="w-3.5 h-3.5 text-[#18d8d0]" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setConfirmLogout(true)}
                    className="w-full py-2.5 bg-[#ff5500] text-black font-pixel text-xs font-bold hover:bg-[#d94e16] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>SIGN OUT THIS DEVICE</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Need Help / Support (Section 20) */}
            <section
              aria-label="Support Desk"
              className="bg-[#0b0c10] border-2 border-[#18d8d0]/40 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#18d8d0]/20">
                <LifeBuoy className="w-4 h-4 text-[#18d8d0]" />
                <h2 className="font-pixel text-xs text-[#18d8d0] uppercase tracking-wider">
                  NEED HELP?
                </h2>
              </div>

              <p className="font-sans text-xs text-[#94a3b8] mb-4">
                Encountering accreditation discrepancies, schedule inquiries, or technical credential issues?
                The official championship Help Desk is available 24/7.
              </p>

              <Link
                href="/support"
                className="w-full py-2.5 border-2 border-[#18d8d0] bg-[#18d8d0]/10 text-[#18d8d0] font-pixel text-xs font-bold hover:bg-[#18d8d0]/20 transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000]"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>OPEN SUPPORT TICKET</span>
              </Link>
            </section>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. ACCESSIBLE DIALOGS & CONFIRMATION MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* A) EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-lg w-full p-6 shadow-[0_0_30px_rgba(255,85,0,0.3)]">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#ff5500]/30">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#ff5500]" />
                <h3 id="edit-profile-title" className="font-pixel text-sm text-[#f5e6ca] uppercase">
                  EDIT PERSONAL PROFILE
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-500 text-red-300 text-xs font-sans">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-sans">
                {editSuccess}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 font-sans text-xs">
              <div>
                <label htmlFor="edit-name" className="block font-pixel text-[9px] text-[#94a3b8] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-[#060608] border border-[#1e293b] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] px-3 py-2 text-sm text-[#f5e6ca] outline-none"
                  placeholder="Enter full legal name"
                />
              </div>

              <div>
                <label htmlFor="edit-email-readonly" className="block font-pixel text-[9px] text-[#94a3b8] uppercase mb-1">
                  Email Address (Managed by Identity Provider)
                </label>
                <input
                  id="edit-email-readonly"
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full bg-[#060608]/50 border border-[#1e293b]/50 px-3 py-2 text-sm text-[#94a3b8] cursor-not-allowed"
                />
                <span className="text-[10px] text-[#94a3b8] mt-0.5 block">
                  Identity Provider email cannot be edited locally.
                </span>
              </div>

              <div>
                <label htmlFor="edit-phone" className="block font-pixel text-[9px] text-[#94a3b8] uppercase mb-1">
                  Mobile Number
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full bg-[#060608] border border-[#1e293b] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] px-3 py-2 text-sm text-[#f5e6ca] outline-none"
                  placeholder="+91 98451 22334"
                />
              </div>

              <div>
                <label htmlFor="edit-institution" className="block font-pixel text-[9px] text-[#94a3b8] uppercase mb-1">
                  Institution / University
                </label>
                <input
                  id="edit-institution"
                  type="text"
                  value={editFormData.institution}
                  onChange={(e) => setEditFormData({ ...editFormData, institution: e.target.value })}
                  className="w-full bg-[#060608] border border-[#1e293b] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] px-3 py-2 text-sm text-[#f5e6ca] outline-none"
                  placeholder="e.g. KLE Technological University"
                />
              </div>

              <div>
                <label htmlFor="edit-state" className="block font-pixel text-[9px] text-[#94a3b8] uppercase mb-1">
                  Domicile State
                </label>
                <input
                  id="edit-state"
                  type="text"
                  value={editFormData.state}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  className="w-full bg-[#060608] border border-[#1e293b] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] px-3 py-2 text-sm text-[#f5e6ca] outline-none"
                  placeholder="e.g. Karnataka"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#1e293b] text-[#94a3b8] font-pixel text-xs hover:border-[#f5e6ca] hover:text-[#f5e6ca] transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-[#ff5500] text-black font-pixel text-xs font-bold hover:bg-[#d94e16] transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editLoading ? "SAVING..." : "SAVE CHANGES"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B) REVOKE SPECIFIC SESSION CONFIRMATION MODAL */}
      {confirmRevokeSession && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-[#0b0c10] border-2 border-red-500 max-w-sm w-full p-6 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-pixel text-sm text-[#f5e6ca] uppercase">REVOKE SESSION?</h3>
            </div>
            <p className="font-sans text-xs text-[#94a3b8] mb-6">
              This device will be immediately signed out and its authentication credentials invalidated.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmRevokeSession(null)}
                className="px-3.5 py-1.5 border border-[#1e293b] text-[#94a3b8] font-pixel text-xs hover:border-[#f5e6ca] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleRevokeSession}
                disabled={revokeLoading}
                className="px-4 py-1.5 bg-red-600 text-white font-pixel text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
              >
                {revokeLoading ? "REVOKING..." : "REVOKE SESSION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C) REVOKE ALL OTHER SESSIONS CONFIRMATION MODAL */}
      {confirmRevokeAllOthers && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-[#0b0c10] border-2 border-red-500 max-w-sm w-full p-6 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-pixel text-sm text-[#f5e6ca] uppercase">SIGN OUT ALL OTHER DEVICES?</h3>
            </div>
            <p className="font-sans text-xs text-[#94a3b8] mb-6">
              All other active sessions on phones, laptops, and tablets will be disconnected. Your current session will remain active.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmRevokeAllOthers(false)}
                className="px-3.5 py-1.5 border border-[#1e293b] text-[#94a3b8] font-pixel text-xs hover:border-[#f5e6ca] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleRevokeAllOtherSessions}
                disabled={revokeLoading}
                className="px-4 py-1.5 bg-red-600 text-white font-pixel text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
              >
                {revokeLoading ? "TERMINATING..." : "CONFIRM SIGN OUT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D) LOGOUT CONFIRMATION MODAL */}
      {confirmLogout && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-[#0b0c10] border-2 border-[#ff5500] max-w-sm w-full p-6 shadow-[0_0_30px_rgba(255,85,0,0.3)]">
            <div className="flex items-center gap-2 mb-3">
              <LogOut className="w-5 h-5 text-[#ff5500]" />
              <h3 className="font-pixel text-sm text-[#f5e6ca] uppercase">SIGN OUT?</h3>
            </div>
            <p className="font-sans text-xs text-[#94a3b8] mb-6">
              Are you sure you want to end your current session? You will need your security credentials to log back in.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="px-3.5 py-1.5 border border-[#1e293b] text-[#94a3b8] font-pixel text-xs hover:border-[#f5e6ca] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleSignOut}
                disabled={logoutLoading}
                className="px-4 py-1.5 bg-[#ff5500] text-black font-pixel text-xs font-bold hover:bg-[#d94e16] transition-colors cursor-pointer"
              >
                {logoutLoading ? "SIGNING OUT..." : "CONFIRM SIGN OUT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
