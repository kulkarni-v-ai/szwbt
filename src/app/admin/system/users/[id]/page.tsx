"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  KeyRound,
  LogOut,
  ArrowLeft,
  Phone,
  Mail,
  Building,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  Layers,
  Lock,
  RefreshCw,
  Laptop,
  Smartphone,
  Globe,
  Award,
  UserCheck,
  Activity,
  FileText,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";
import { useAuth } from "@/lib/rbac/useAuth";

interface UserDetail {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  institution: string | null;
  state: string | null;
  badge: string;
  targetUrl: string;
  isActive: boolean;
  status: string;
  lastLoginAt: string | null;
  sessionVersion: number;
  roles: string[];
  participantId: string | null;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccessMatrixItem {
  resource: string;
  actions: string[];
}

interface TeamContext {
  teamId: string | null;
  teamCode: string;
  teamName: string;
  institution: string;
  category: string;
  role: string;
  playerId?: string;
}

interface SessionItem {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
}

interface AuditItem {
  id: string;
  action: string;
  actorEmail: string;
  resourceType: string;
  timestamp: string;
  metadata: any;
}

export default function SuperAdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrixItem[]>([]);
  const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditItem[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"account" | "roles" | "access" | "team" | "sessions" | "audit">("account");
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isForceLogoutModalOpen, setIsForceLogoutModalOpen] = useState(false);

  // Form states
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    institution: "",
    state: "",
    badge: "",
    targetUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const [resetAction, setResetAction] = useState<"SEND_RESET" | "SET_TEMPORARY">("SEND_RESET");
  const [tempPassword, setTempPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Load Roles for Role Modal
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await fetch("/api/system/roles");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.roles)) {
            setAvailableRoles(data.roles.map((r: any) => r.name));
          }
        }
      } catch (err) {
        console.error("Failed to load roles list:", err);
      }
    }
    loadRoles();
  }, []);

  // Fetch User Details
  const fetchUserDetail = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setActionError(null);
      setAccessDenied(null);
      const res = await fetch(`/api/system/users/${userId}`);
      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied("403 Forbidden: Insufficient clearance. Super Administrator authority required.");
          return;
        }
        if (res.status === 401) {
          setAccessDenied("401 Unauthorized: Valid session credentials required.");
          return;
        }
        if (res.status === 404) {
          throw new Error("User account not found in system.");
        }
        throw new Error(`Failed to load user details (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setAccessMatrix(data.accessMatrix || []);
        setTeamContext(data.teamAssociation || null);
        setSessions(data.sessions || []);
        setAuditHistory(data.auditHistory || []);

        setEditFormData({
          name: data.user.name,
          phone: data.user.phone || "",
          institution: data.user.institution || "",
          state: data.user.state || "",
          badge: data.user.badge,
          targetUrl: data.user.targetUrl,
        });
        setSelectedRoles([...data.user.roles]);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  // Handle Save Basic Info
  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingEdit(true);
      setActionError(null);
      const res = await fetch(`/api/system/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile information.");
      }
      setActionSuccess("User basic information updated successfully.");
      setIsEditOpen(false);
      fetchUserDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Save Roles
  const handleSaveRoles = async () => {
    if (!user) return;
    try {
      setSavingRoles(true);
      setActionError(null);
      const res = await fetch(`/api/system/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selectedRoles }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user roles.");
      }
      setActionSuccess(`Roles updated for ${user.email}.`);
      setIsRoleModalOpen(false);
      fetchUserDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSavingRoles(false);
    }
  };

  // Handle Password Reset
  const handleExecutePasswordReset = async () => {
    if (!user) return;
    try {
      setResetting(true);
      setActionError(null);
      const res = await fetch(`/api/system/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resetAction,
          temporaryPassword: resetAction === "SET_TEMPORARY" ? tempPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Password reset failed.");
      }
      setActionSuccess(data.message || "Password reset successfully executed.");
      setIsResetModalOpen(false);
      setTempPassword("");
      fetchUserDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setResetting(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (newActive: boolean) => {
    if (!user) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/system/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update account status.");
      }
      setActionSuccess(`Account for ${user.email} is now ${newActive ? "ACTIVE" : "DISABLED"}.`);
      setIsDisableModalOpen(false);
      fetchUserDetail();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Handle Revoke Single Session
  const handleRevokeSingleSession = async (sessionId: string) => {
    if (!user) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/system/users/${user.id}/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke session.");
      }
      setActionSuccess("Target session terminated.");
      fetchUserDetail();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Handle Force Logout All Sessions
  const handleForceLogoutAll = async () => {
    if (!user) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/system/users/${user.id}/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allSessions: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke sessions.");
      }
      setActionSuccess(`All active sessions terminated for ${user.email}.`);
      setIsForceLogoutModalOpen(false);
      fetchUserDetail();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Access Denied Screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#050914] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#07101D] border-2 border-red-500 p-6 text-center space-y-4 shadow-[4px_4px_0px_#000]">
          <ShieldAlert className="w-12 h-12 mx-auto text-red-500 animate-pulse" />
          <h1 className="font-pixel text-sm text-red-500 uppercase tracking-wider">
            SECURITY CLEARANCE VIOLATION // 403
          </h1>
          <p className="text-xs text-[#91A0AE]">{accessDenied}</p>
          <div className="pt-2">
            <Link
              href="/admin/system/users"
              className="inline-block px-4 py-2 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold shadow-[2px_2px_0px_#000]"
            >
              RETURN TO USER DIRECTORY
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !user) {
    return (
      <SystemAdminShell>
        <div className="py-24 text-center font-pixel text-xs text-[#FF5500] animate-pulse">
          ACCESSING AUTHORIZED USER RECORD...
        </div>
      </SystemAdminShell>
    );
  }

  if (!user) {
    return (
      <SystemAdminShell>
        <div className="py-20 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
          <h2 className="font-pixel text-sm text-[#F4E6CE]">ACCOUNT RECORD NOT FOUND</h2>
          <Link
            href="/admin/system/users"
            className="inline-block px-4 py-2 bg-[#18D8D0] text-black font-pixel text-xs font-bold"
          >
            ← BACK TO DIRECTORY
          </Link>
        </div>
      </SystemAdminShell>
    );
  }

  const isSelf = currentUser?.id === user.id;
  const isSuperAdmin = user.roles.includes("SUPER_ADMIN");
  const fallbackRoles = availableRoles.length > 0 ? availableRoles : [
    "SUPER_ADMIN", "TOURNAMENT_ADMIN", "REGISTRATION_STAFF", "ACCOMMODATION_STAFF",
    "TRANSPORT_STAFF", "FINANCE_STAFF", "MATCH_OFFICIAL", "ORGANIZER",
    "OPERATIONS_STAFF", "COMMUNICATIONS_STAFF", "REPORTS_STAFF", "VOLUNTEER",
    "TEAM_MANAGER", "PARTICIPANT", "SUPPORT_STAFF"
  ];

  return (
    <SystemAdminShell onRefresh={fetchUserDetail}>
      <div className="space-y-6">

        {/* ═══ USER DETAIL HEADER (USER // ACCOUNT) ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#18D8D0]/30 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/system/users"
              className="p-2 border border-[#18D8D0]/40 bg-[#07101D] text-[#18D8D0] hover:text-white hover:border-[#18D8D0] transition-colors shadow-[2px_2px_0px_#000]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-widest">
                  USER // ACCOUNT
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
              </div>
              <h1 className="font-pixel text-base sm:text-lg text-[#F4E6CE] uppercase font-bold tracking-tight">
                {user.name}
              </h1>
              <p className="font-mono text-xs text-[#91A0AE]">{user.email}</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3 py-1.5 bg-[#07101D] hover:bg-[#18D8D0] hover:text-black text-[#18D8D0] border border-[#18D8D0]/50 font-pixel text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> EDIT INFO
            </button>

            <button
              onClick={() => {
                setSelectedRoles([...user.roles]);
                setIsRoleModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#07101D] hover:bg-[#FF5500] hover:text-black text-[#F4E6CE] border border-[#FF5500]/50 font-pixel text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> MANAGE ROLES
            </button>

            <button
              onClick={() => {
                setResetAction("SEND_RESET");
                setTempPassword("");
                setIsResetModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#07101D] hover:bg-[#F5A623] hover:text-black text-[#F5A623] border border-[#F5A623]/50 font-pixel text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> RESET PASSWORD
            </button>

            {user.isActive ? (
              <button
                onClick={() => setIsDisableModalOpen(true)}
                className="px-3 py-1.5 bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white border border-red-500 font-pixel text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                DISABLE ACCOUNT
              </button>
            ) : (
              <button
                onClick={() => handleToggleActive(true)}
                className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500 font-pixel text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                ENABLE ACCOUNT
              </button>
            )}

            <button
              onClick={() => setIsForceLogoutModalOpen(true)}
              className="px-3 py-1.5 bg-[#07101D] hover:bg-red-900/60 text-red-400 border border-red-500/40 font-pixel text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
              title="Force logout all active sessions"
            >
              <LogOut className="w-3.5 h-3.5" /> FORCE LOGOUT
            </button>
          </div>
        </div>

        {/* Action Banners */}
        {actionError && (
          <div className="p-3 bg-red-950/80 border-2 border-red-600 text-red-200 text-xs flex items-center justify-between shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 text-xs flex items-center justify-between shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ═══ OVERVIEW METRIC SUMMARY CARD ═══ */}
        <div className="p-4 bg-[#07101D] border-2 border-[#18D8D0]/40 shadow-[3px_3px_0px_#000]">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">ACCOUNT STATUS</span>
              {user.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500 text-emerald-400 font-pixel text-[8.5px]">
                  <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950/80 border border-red-500 text-red-400 font-pixel text-[8.5px]">
                  <XCircle className="w-2.5 h-2.5" /> DISABLED
                </span>
              )}
            </div>

            <div>
              <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">ASSIGNED ROLES</span>
              <p className="font-pixel text-xs text-[#FF5500] font-bold">{user.roles.length} ROLES</p>
            </div>

            <div>
              <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">CLEARANCE BADGE</span>
              <p className="font-pixel text-xs text-[#18D8D0] font-bold">{user.badge}</p>
            </div>

            <div>
              <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">SESSION VERSION</span>
              <p className="font-mono text-xs text-[#F4E6CE] font-bold">v{user.sessionVersion}</p>
            </div>

            <div>
              <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">LAST LOGIN</span>
              <p className="font-mono text-[11px] text-[#91A0AE]">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-IN") : "NO RECORD"}
              </p>
            </div>

            <div>
              <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">CREATED DATE</span>
              <p className="font-mono text-[11px] text-[#91A0AE]">
                {new Date(user.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ DETAIL TABS ═══ */}
        <div className="flex flex-wrap gap-1 border-b-2 border-[#18D8D0]/30 font-pixel text-[10px]">
          {[
            { id: "account", label: "ACCOUNT & PROFILE" },
            { id: "roles", label: `ROLES (${user.roles.length})` },
            { id: "access", label: `ACCESS MATRIX (${accessMatrix.length})` },
            { id: "team", label: "TEAM CONTEXT" },
            { id: "sessions", label: `SESSIONS (${sessions.length})` },
            { id: "audit", label: `AUDIT HISTORY (${auditHistory.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-t-2 border-l-2 border-r-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#07101D] text-[#18D8D0] border-[#18D8D0] -mb-[2px] font-bold shadow-[2px_2px_0px_#000]"
                  : "bg-[#050914] text-[#91A0AE] border-transparent hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB 1: ACCOUNT & PROFILE ═══ */}
        {activeTab === "account" && (
          <div className="p-5 bg-[#07101D] border-2 border-[#18D8D0]/40 space-y-4 shadow-[3px_3px_0px_#000]">
            <div className="flex justify-between items-center border-b border-[#18D8D0]/20 pb-3">
              <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                USER PROFILE SPECIFICATION
              </h3>
              <button
                onClick={() => setIsEditOpen(true)}
                className="px-3 py-1 bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-[9.5px] flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> MODIFY
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#050914] border border-[#18D8D0]/20 space-y-2">
                <p className="text-[#91A0AE] text-[10px] font-pixel">FULL NAME</p>
                <p className="text-[#F4E6CE] font-bold text-sm">{user.name}</p>

                <p className="text-[#91A0AE] text-[10px] font-pixel pt-2">PRIMARY EMAIL</p>
                <p className="text-[#18D8D0] font-bold">{user.email}</p>

                <p className="text-[#91A0AE] text-[10px] font-pixel pt-2">PHONE / MOBILE</p>
                <p className="text-[#F4E6CE]">{user.phone || <span className="italic text-[#91A0AE]">Not configured</span>}</p>
              </div>

              <div className="p-3 bg-[#050914] border border-[#18D8D0]/20 space-y-2">
                <p className="text-[#91A0AE] text-[10px] font-pixel">AFFILIATED INSTITUTION</p>
                <p className="text-[#F4E6CE] font-bold">{user.institution || <span className="italic text-[#91A0AE]">Unassigned</span>}</p>

                <p className="text-[#91A0AE] text-[10px] font-pixel pt-2">STATE / REGION</p>
                <p className="text-[#F4E6CE]">{user.state || "Not specified"}</p>

                <p className="text-[#91A0AE] text-[10px] font-pixel pt-2">TARGET ROUTE LANDING</p>
                <p className="text-[#FF5500] font-bold">{user.targetUrl || "/dashboard"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: ROLES ═══ */}
        {activeTab === "roles" && (
          <div className="p-5 bg-[#07101D] border-2 border-[#18D8D0]/40 space-y-4 shadow-[3px_3px_0px_#000]">
            <div className="flex justify-between items-center border-b border-[#18D8D0]/20 pb-3">
              <div>
                <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                  ASSIGNED SYSTEM ROLES
                </h3>
                <p className="text-xs text-[#91A0AE]">
                  Roles grant permissions authoritatively. Role assignment is the primary access control mechanism.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRoles([...user.roles]);
                  setIsRoleModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold"
              >
                MANAGE ROLES
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {user.roles.map((r) => {
                const isSuper = r === "SUPER_ADMIN";
                return (
                  <div
                    key={r}
                    className={`p-3 border-2 ${
                      isSuper
                        ? "bg-red-950/60 border-red-500 shadow-[2px_2px_0px_#000]"
                        : "bg-[#050914] border-[#18D8D0]/40 shadow-[2px_2px_0px_#000]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs font-bold text-[#F4E6CE]">{r}</span>
                      {isSuper && <span className="font-pixel text-[8px] text-red-400">[ROOT ADMIN]</span>}
                    </div>
                    <p className="text-[11px] text-[#91A0AE] mt-1.5 leading-relaxed">
                      {isSuper
                        ? "Unrestricted administrative clearance across all tournament operations and system configurations."
                        : `Authorized operational capabilities associated with the ${r} role.`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB 3: ACCESS MATRIX (CALCULATED ROLE PERMISSIONS) ═══ */}
        {activeTab === "access" && (
          <div className="p-5 bg-[#07101D] border-2 border-[#18D8D0]/40 space-y-4 shadow-[3px_3px_0px_#000]">
            <div className="border-b border-[#18D8D0]/20 pb-3">
              <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                CALCULATED ACCESS MATRIX
              </h3>
              <p className="text-xs text-[#91A0AE]">
                Derived dynamically from: <strong className="text-white">USER → ASSIGNED ROLES → ROLE PERMISSIONS</strong>. Direct editing of individual permissions on user profiles is disabled by architecture.
              </p>
            </div>

            {accessMatrix.length === 0 ? (
              <p className="font-pixel text-xs text-[#91A0AE] py-6 text-center">
                NO EXPLICIT PERMISSIONS ASSOCIATED WITH CURRENT ROLES
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {accessMatrix.map((item) => (
                  <div key={item.resource} className="p-3 bg-[#050914] border border-[#18D8D0]/30 shadow-[2px_2px_0px_#000]">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#18D8D0]/20">
                      <span className="font-pixel text-[10px] text-[#F5A623] font-bold">
                        {item.resource}
                      </span>
                      <span className="font-pixel text-[8px] text-[#91A0AE]">
                        {item.actions.length} ACTIONS
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.actions.map((act) => (
                        <span
                          key={act}
                          className="px-1.5 py-0.5 bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/30 font-pixel text-[8px] uppercase"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 4: TEAM CONTEXT ═══ */}
        {activeTab === "team" && (
          <div className="p-5 bg-[#07101D] border-2 border-[#18D8D0]/40 space-y-4 shadow-[3px_3px_0px_#000]">
            <div className="border-b border-[#18D8D0]/20 pb-3">
              <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                TOURNAMENT &amp; TEAM ASSOCIATION
              </h3>
              <p className="text-xs text-[#91A0AE]">
                Displays team contingent affiliation if user is registered as a Team Manager, Official, or Participant. Team ownership remains a separate controlled operation.
              </p>
            </div>

            {teamContext ? (
              <div className="max-w-md p-4 bg-[#050914] border-2 border-[#18D8D0]/40 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                  <span className="text-[#91A0AE]">TEAM CODE:</span>
                  <span className="text-[#FF5500] font-pixel text-xs font-bold">{teamContext.teamCode}</span>
                </div>
                <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                  <span className="text-[#91A0AE]">TEAM NAME:</span>
                  <span className="text-[#F4E6CE] font-bold">{teamContext.teamName}</span>
                </div>
                <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                  <span className="text-[#91A0AE]">INSTITUTION:</span>
                  <span className="text-[#F4E6CE]">{teamContext.institution}</span>
                </div>
                <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                  <span className="text-[#91A0AE]">CATEGORY:</span>
                  <span className="text-[#18D8D0] font-pixel text-[10px]">{teamContext.category}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#91A0AE]">AFFILIATION ROLE:</span>
                  <span className="text-emerald-400 font-pixel text-[10px] font-bold">{teamContext.role}</span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <Building className="w-8 h-8 mx-auto text-[#91A0AE]/50" />
                <p className="font-pixel text-xs text-[#91A0AE]">NO LINKED TEAM CONTINGENT FOR THIS ACCOUNT</p>
                <p className="text-[11px] text-[#91A0AE]/70">
                  This user operates primarily in administrative or operational desk capacities.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 5: ACTIVE SESSIONS & SECURITY ═══ */}
        {activeTab === "sessions" && (
          <div className="p-5 bg-[#07101D] border-2 border-[#18D8D0]/40 space-y-4 shadow-[3px_3px_0px_#000]">
            <div className="flex justify-between items-center border-b border-[#18D8D0]/20 pb-3">
              <div>
                <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                  ACTIVE SESSIONS &amp; SECURITY TELEMETRY
                </h3>
                <p className="text-xs text-[#91A0AE]">
                  Tokens and credentials are never exposed. Super Admin can terminate individual sessions or force full logout.
                </p>
              </div>
              <button
                onClick={() => setIsForceLogoutModalOpen(true)}
                className="px-3 py-1.5 bg-red-950/80 hover:bg-red-700 text-red-200 border border-red-500 font-pixel text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
              >
                <LogOut className="w-3.5 h-3.5" /> REVOKE ALL SESSIONS
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="font-pixel text-xs text-[#91A0AE] py-8 text-center">
                NO ACTIVE RECORDED SESSIONS FOR THIS USER
              </p>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-[#050914] border border-[#18D8D0]/30 flex flex-wrap items-center justify-between gap-3 text-xs font-sans shadow-[2px_2px_0px_#000]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#07101D] border border-[#18D8D0]/30 text-[#18D8D0]">
                        {s.device.toLowerCase().includes("mobile") || s.device.toLowerCase().includes("phone") ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F4E6CE]">{s.device}</span>
                          {s.isCurrent && (
                            <span className="px-1.5 py-0.2 bg-emerald-950/70 border border-emerald-500 text-emerald-400 font-pixel text-[7.5px]">
                              CURRENT SESSION
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#91A0AE] font-mono">
                          {s.browser} • IP: {s.ipAddress} • {s.location}
                        </p>
                        <p className="text-[10px] text-[#91A0AE]/70 font-mono mt-0.5">
                          Last active: {new Date(s.lastActiveAt).toLocaleString("en-IN")} • Expires: {new Date(s.expiresAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSingleSession(s.id)}
                      className="px-2.5 py-1 bg-[#07101D] hover:bg-red-950 text-red-400 border border-red-500/40 font-pixel text-[9px]"
                    >
                      REVOKE SESSION
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 6: AUDIT TRAIL ═══ */}
        {activeTab === "audit" && (
          <div className="p-5 bg-[#07101D] border-2 border-[#18D8D0]/40 space-y-4 shadow-[3px_3px_0px_#000]">
            <div className="border-b border-[#18D8D0]/20 pb-3">
              <h3 className="font-pixel text-xs text-[#18D8D0] uppercase font-bold">
                TAMPER-EVIDENT ADMINISTRATIVE AUDIT LOG
              </h3>
              <p className="text-xs text-[#91A0AE]">
                Immutable server-side trail of administrative operations performed on or by this account.
              </p>
            </div>

            {auditHistory.length === 0 ? (
              <p className="font-pixel text-xs text-[#91A0AE] py-8 text-center">
                NO AUDIT EVENTS RECORDED FOR THIS USER
              </p>
            ) : (
              <div className="space-y-2">
                {auditHistory.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-[#050914] border border-[#18D8D0]/25 text-xs font-mono space-y-1 shadow-[1px_1px_0px_#000]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-pixel text-[9px] text-[#FF5500] font-bold">
                        {log.action}
                      </span>
                      <span className="text-[10.5px] text-[#91A0AE]">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#F4E6CE]">
                      Actor: <span className="text-[#18D8D0]">{log.actorEmail}</span> • Resource: {log.resourceType}
                    </p>
                    {log.metadata && (
                      <p className="text-[10px] text-[#91A0AE] bg-[#07101D] p-1.5 border border-[#18D8D0]/10 overflow-x-auto">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL: EDIT BASIC INFO
            ═══════════════════════════════════════════════════════════ */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#18D8D0] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex justify-between items-center border-b border-[#18D8D0]/40 pb-2">
                <h3 className="font-pixel text-xs text-[#F4E6CE] uppercase font-bold">EDIT USER PROFILE</h3>
                <button onClick={() => setIsEditOpen(false)} className="text-[#91A0AE] hover:text-white">✕</button>
              </div>

              <form onSubmit={handleSaveBasicInfo} className="space-y-3 text-xs">
                <div>
                  <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">FULL NAME *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-[#050914] border border-[#18D8D0]/40 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">PHONE / MOBILE</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full bg-[#050914] border border-[#18D8D0]/40 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">STATE / REGION</label>
                    <input
                      type="text"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full bg-[#050914] border border-[#18D8D0]/40 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">INSTITUTION</label>
                  <input
                    type="text"
                    value={editFormData.institution}
                    onChange={(e) => setEditFormData({ ...editFormData, institution: e.target.value })}
                    className="w-full bg-[#050914] border border-[#18D8D0]/40 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">BADGE</label>
                    <input
                      type="text"
                      value={editFormData.badge}
                      onChange={(e) => setEditFormData({ ...editFormData, badge: e.target.value })}
                      className="w-full bg-[#050914] border border-[#18D8D0]/40 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">LANDING URL</label>
                    <input
                      type="text"
                      value={editFormData.targetUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, targetUrl: e.target.value })}
                      className="w-full bg-[#050914] border border-[#18D8D0]/40 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#18D8D0]/30">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-1.5 bg-[#18D8D0] text-black font-pixel text-xs font-bold disabled:opacity-50"
                  >
                    {savingEdit ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL: MANAGE ROLES
            ═══════════════════════════════════════════════════════════ */}
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#18D8D0] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex justify-between items-center border-b border-[#18D8D0]/40 pb-2">
                <div>
                  <h3 className="font-pixel text-xs text-[#F4E6CE] uppercase font-bold">MANAGE ASSIGNED ROLES</h3>
                  <p className="font-mono text-[11px] text-[#18D8D0]">{user.name} ({user.email})</p>
                </div>
                <button onClick={() => setIsRoleModalOpen(false)} className="text-[#91A0AE] hover:text-white">✕</button>
              </div>

              {/* Current Roles vs New Roles comparison */}
              <div className="p-3 bg-[#050914] border border-[#18D8D0]/30 space-y-2 text-xs">
                <div>
                  <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">CURRENT ROLES:</span>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <span key={r} className="px-1.5 py-0.5 bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-[8px]">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#18D8D0]/20">
                  <span className="font-pixel text-[8.5px] text-[#FF5500] uppercase block mb-1">NEW ROLES PREVIEW:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedRoles.length === 0 ? (
                      <span className="text-red-400 italic text-[10px]">No roles selected (invalid)</span>
                    ) : (
                      selectedRoles.map((r) => (
                        <span key={r} className="px-1.5 py-0.5 bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500] font-pixel text-[8px]">
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="max-h-52 overflow-y-auto border border-[#18D8D0]/30 bg-[#050914] p-2 space-y-1.5 text-xs">
                {fallbackRoles.map((r) => {
                  const isChecked = selectedRoles.includes(r);
                  const isSuper = r === "SUPER_ADMIN";

                  return (
                    <label
                      key={r}
                      className={`flex items-center gap-2 p-1.5 cursor-pointer ${
                        isChecked ? "bg-[#18D8D0]/10 text-[#F4E6CE]" : "text-[#91A0AE]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, r]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((role) => role !== r));
                          }
                        }}
                        className="accent-[#FF5500]"
                      />
                      <span className="font-pixel text-[9px]">{r}</span>
                      {isSuper && <span className="font-pixel text-[7.5px] text-red-400 ml-auto">[ROOT]</span>}
                    </label>
                  );
                })}
              </div>

              {/* Super Admin Warning */}
              {selectedRoles.includes("SUPER_ADMIN") && (
                <div className="p-2.5 bg-red-950/80 border border-red-500 text-red-200 text-xs space-y-1">
                  <p className="font-pixel text-[9px] text-red-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> SUPER_ADMIN ROLE WARNING
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    SUPER_ADMIN grants full administrative access to the tournament platform.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#18D8D0]/30">
                <button
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveRoles}
                  disabled={savingRoles || selectedRoles.length === 0}
                  className="px-4 py-1.5 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold disabled:opacity-50"
                >
                  {savingRoles ? "SAVING..." : "CONFIRM ROLE ASSIGNMENT"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL: PASSWORD RESET
            ═══════════════════════════════════════════════════════════ */}
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#F5A623] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex justify-between items-center border-b border-[#F5A623]/40 pb-2">
                <div>
                  <h3 className="font-pixel text-xs text-[#F4E6CE] uppercase font-bold">CREDENTIAL MANAGEMENT</h3>
                  <p className="font-mono text-[11px] text-[#F5A623]">{user.email}</p>
                </div>
                <button onClick={() => setIsResetModalOpen(false)} className="text-[#91A0AE] hover:text-white">✕</button>
              </div>

              <div className="p-3 bg-amber-950/50 border border-[#F5A623] text-amber-200 text-xs space-y-1">
                <p className="font-pixel text-[9px] text-[#F5A623] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> CREDENTIAL OVERRIDE WARNING
                </p>
                <p className="text-[11px] leading-relaxed">
                  Resetting this account&apos;s credentials will affect the user&apos;s ability to authenticate. Active sessions will be immediately terminated.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block">CHOOSE RESET MECHANISM</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2 bg-[#050914] border border-[#18D8D0]/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resetModeDetail"
                      checked={resetAction === "SEND_RESET"}
                      onChange={() => setResetAction("SEND_RESET")}
                      className="mt-0.5 accent-[#FF5500]"
                    />
                    <div>
                      <span className="font-pixel text-[9.5px] text-[#F4E6CE] font-bold block">
                        SEND PASSWORD RESET EMAIL (RECOMMENDED)
                      </span>
                      <span className="text-[11px] text-[#91A0AE]">
                        Dispatches a secure verification link directly to the user&apos;s registered address.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 bg-[#050914] border border-[#18D8D0]/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resetModeDetail"
                      checked={resetAction === "SET_TEMPORARY"}
                      onChange={() => setResetAction("SET_TEMPORARY")}
                      className="mt-0.5 accent-[#FF5500]"
                    />
                    <div>
                      <span className="font-pixel text-[9.5px] text-[#F4E6CE] font-bold block">
                        PROVISION TEMPORARY CREDENTIAL
                      </span>
                      <span className="text-[11px] text-[#91A0AE]">
                        Establishes a temporary credential and flags mandatory change upon next login.
                      </span>
                    </div>
                  </label>
                </div>

                {resetAction === "SET_TEMPORARY" && (
                  <div className="pt-2">
                    <label className="font-pixel text-[8.5px] text-[#18D8D0] block mb-1">
                      SPECIFY TEMPORARY PASSWORD (OR LEAVE BLANK FOR AUTO-GENERATED)
                    </label>
                    <input
                      type="password"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Enter temporary password..."
                      className="w-full bg-[#050914] border border-[#18D8D0]/50 px-3 py-1.5 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F5A623]/30">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleExecutePasswordReset}
                  disabled={resetting}
                  className="px-4 py-1.5 bg-[#F5A623] hover:bg-[#d98216] text-black font-pixel text-xs font-bold disabled:opacity-50"
                >
                  {resetting ? "PROCESSING..." : "CONFIRM & EXECUTE RESET"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL: DISABLE CONFIRMATION
            ═══════════════════════════════════════════════════════════ */}
        {isDisableModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-red-500 p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex items-center gap-3 text-red-500 border-b border-red-500/40 pb-2">
                <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
                <h3 className="font-pixel text-xs uppercase font-bold text-white">DEACTIVATE ACCOUNT</h3>
              </div>

              <p className="text-xs text-[#91A0AE]">
                Are you sure you want to deactivate <strong className="text-white">{user.email}</strong>? All active sessions will be terminated and access will be denied immediately.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-red-500/30">
                <button
                  onClick={() => setIsDisableModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleToggleActive(false)}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-pixel text-xs font-bold"
                >
                  DEACTIVATE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL: FORCE LOGOUT CONFIRMATION
            ═══════════════════════════════════════════════════════════ */}
        {isForceLogoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#FF5500] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex items-center gap-3 text-[#FF5500] border-b border-[#FF5500]/40 pb-2">
                <LogOut className="w-5 h-5 shrink-0" />
                <h3 className="font-pixel text-xs uppercase font-bold text-white">TERMINATE ACTIVE SESSIONS</h3>
              </div>

              <p className="text-xs text-[#91A0AE]">
                Terminate all active sessions for <strong className="text-white">{user.email}</strong>? The user will be required to authenticate anew.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#FF5500]/30">
                <button
                  onClick={() => setIsForceLogoutModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleForceLogoutAll}
                  className="px-4 py-1.5 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold"
                >
                  REVOKE ALL SESSIONS
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </SystemAdminShell>
  );
}
