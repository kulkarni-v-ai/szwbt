"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Lock,
  X,
  AlertTriangle,
  RotateCcw,
  LogOut,
  ExternalLink,
  Eye,
  KeyRound,
  Building,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";
import { useAuth } from "@/lib/rbac/useAuth";

interface UserItem {
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
  participantId: string | null;
  teamId: string | null;
  sessionVersion: number;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  userCount: number;
}

export default function SuperAdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [rolesList, setRolesList] = useState<RoleItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metrics, setMetrics] = useState({ total: 0, active: 0, disabled: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  // Modals State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionStep, setProvisionStep] = useState(1);
  const [roleModalUser, setRoleModalUser] = useState<UserItem | null>(null);
  const [resetModalUser, setResetModalUser] = useState<UserItem | null>(null);
  const [disableModalUser, setDisableModalUser] = useState<UserItem | null>(null);
  const [forceLogoutUser, setForceLogoutUser] = useState<UserItem | null>(null);

  // 5-Step Provision Form State
  const [provisionData, setProvisionData] = useState({
    name: "",
    phone: "",
    state: "",
    institution: "",
    email: "",
    status: "ACTIVE",
    roles: ["VOLUNTEER"],
    badge: "OFFICIAL",
  });
  const [provisioning, setProvisioning] = useState(false);

  // Manage Roles State
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // Password Reset State
  const [resetAction, setResetAction] = useState<"SEND_RESET" | "SET_TEMPORARY">("SEND_RESET");
  const [tempPassword, setTempPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Load Roles Registry
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await fetch("/api/system/roles");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.roles)) {
            setRolesList(data.roles);
          }
        }
      } catch (err) {
        console.error("Failed to load roles registry:", err);
      }
    }
    loadRoles();
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);
      setAccessDenied(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter && roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (institutionFilter.trim()) params.set("institution", institutionFilter.trim());
      if (stateFilter.trim()) params.set("state", stateFilter.trim());

      const res = await fetch(`/api/system/users?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied("403 Forbidden: Insufficient clearance. Super Administrator authority required for user management.");
          return;
        }
        if (res.status === 401) {
          setAccessDenied("401 Unauthorized: Valid session credentials required.");
          return;
        }
        throw new Error(`Failed to load users (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err: any) {
      console.error("Users query error:", err);
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter, institutionFilter, stateFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setInstitutionFilter("");
    setStateFilter("");
    setPage(1);
  };

  // ── Provision User (5-Step) ──
  const handleCompleteProvision = async () => {
    try {
      setProvisioning(true);
      setActionError(null);
      const res = await fetch("/api/system/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provisionData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to provision user.");
      }
      setActionSuccess(`User ${data.user.name} (${data.user.email}) successfully provisioned!`);
      setIsProvisionOpen(false);
      setProvisionStep(1);
      setProvisionData({
        name: "",
        phone: "",
        state: "",
        institution: "",
        email: "",
        status: "ACTIVE",
        roles: ["VOLUNTEER"],
        badge: "OFFICIAL",
      });
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProvisioning(false);
    }
  };

  // ── Manage Roles ──
  const handleSaveRoles = async () => {
    if (!roleModalUser) return;
    try {
      setSavingRoles(true);
      setActionError(null);
      const res = await fetch(`/api/system/users/${roleModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selectedRoles }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user roles.");
      }
      setActionSuccess(`Roles updated for ${roleModalUser.email}.`);
      setRoleModalUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSavingRoles(false);
    }
  };

  // ── Password Reset ──
  const handleExecutePasswordReset = async () => {
    if (!resetModalUser) return;
    try {
      setResetting(true);
      setActionError(null);
      const res = await fetch(`/api/system/users/${resetModalUser.id}/reset-password`, {
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
      setResetModalUser(null);
      setTempPassword("");
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setResetting(false);
    }
  };

  // ── Account Enable / Disable ──
  const handleToggleActive = async (targetUser: UserItem, newActive: boolean) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/system/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to change account status.");
      }
      setActionSuccess(`Account for ${targetUser.email} is now ${newActive ? "ACTIVE" : "DISABLED"}.`);
      setDisableModalUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // ── Force Logout / Revoke All Sessions ──
  const handleForceLogout = async () => {
    if (!forceLogoutUser) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/system/users/${forceLogoutUser.id}/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allSessions: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to force logout user.");
      }
      setActionSuccess(`All sessions terminated for ${forceLogoutUser.email}.`);
      setForceLogoutUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // ── Access Denied Render ──
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
              href="/admin"
              className="inline-block px-4 py-2 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold shadow-[2px_2px_0px_#000]"
            >
              RETURN TO COMMAND CENTER
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const defaultRoleNames = rolesList.length > 0
    ? rolesList.map((r) => r.name)
    : [
        "SUPER_ADMIN",
        "TOURNAMENT_ADMIN",
        "REGISTRATION_STAFF",
        "ACCOMMODATION_STAFF",
        "TRANSPORT_STAFF",
        "FINANCE_STAFF",
        "MATCH_OFFICIAL",
        "ORGANIZER",
        "OPERATIONS_STAFF",
        "COMMUNICATIONS_STAFF",
        "REPORTS_STAFF",
        "VOLUNTEER",
        "TEAM_MANAGER",
        "PARTICIPANT",
        "SUPPORT_STAFF",
      ];

  return (
    <SystemAdminShell onRefresh={fetchUsers}>
      <div className="space-y-6">
        
        {/* ═══ TOP HUD / HEADER ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#18D8D0]/30 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="p-2 border border-[#18D8D0]/40 bg-[#07101D] text-[#18D8D0] hover:text-white hover:border-[#18D8D0] transition-colors shadow-[2px_2px_0px_#000]">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-widest">
                  SYSTEM // USERS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
              </div>
              <h1 className="font-pixel text-base sm:text-lg text-[#F4E6CE] uppercase font-bold tracking-tight">
                CENTRAL USER &amp; ACCOUNT MANAGEMENT
              </h1>
              <p className="font-sans text-xs text-[#91A0AE]">
                Authoritative account administration, role assignment, credential lifecycle &amp; active session control.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setProvisionStep(1);
                setIsProvisionOpen(true);
              }}
              className="px-4 py-2 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> PROVISION USER
            </button>
          </div>
        </div>

        {/* ═══ TELEMETRY METRICS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#07101D] border-2 border-[#18D8D0]/40 shadow-[2px_2px_0px_#000]">
            <p className="font-pixel text-[9px] text-[#18D8D0] tracking-wider uppercase">TOTAL ACCOUNTS</p>
            <p className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold mt-1">{totalCount}</p>
          </div>
          <div className="p-3.5 bg-[#07101D] border-2 border-emerald-500/40 shadow-[2px_2px_0px_#000]">
            <p className="font-pixel text-[9px] text-emerald-400 tracking-wider uppercase">ACTIVE ACCOUNTS</p>
            <p className="font-pixel text-xl sm:text-2xl text-emerald-400 font-bold mt-1">{metrics.active}</p>
          </div>
          <div className="p-3.5 bg-[#07101D] border-2 border-red-500/40 shadow-[2px_2px_0px_#000]">
            <p className="font-pixel text-[9px] text-red-400 tracking-wider uppercase">DISABLED / SUSPENDED</p>
            <p className="font-pixel text-xl sm:text-2xl text-red-400 font-bold mt-1">{metrics.disabled}</p>
          </div>
          <div className="p-3.5 bg-[#07101D] border-2 border-[#FF5500]/40 shadow-[2px_2px_0px_#000]">
            <p className="font-pixel text-[9px] text-[#FF5500] tracking-wider uppercase">CONFIGURED ROLES</p>
            <p className="font-pixel text-xl sm:text-2xl text-[#FF5500] font-bold mt-1">{rolesList.length || 15}</p>
          </div>
        </div>

        {/* Action Error / Success Banners */}
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

        {/* ═══ SERVER-SIDE SEARCH & FILTERS ═══ */}
        <div className="p-4 bg-[#07101D] border-2 border-[#18D8D0]/30 space-y-3 shadow-[3px_3px_0px_#000]">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#91A0AE]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name, Email, Mobile, User ID, Participant ID, Institution..."
                className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 pl-9 pr-3 py-2 text-xs text-[#F4E6CE] font-sans focus:outline-none focus:border-[#FF5500]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#18D8D0] hover:bg-[#15b8b1] text-black font-pixel text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              SEARCH
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-[#050914] hover:bg-[#18D8D0]/20 text-[#91A0AE] hover:text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-xs shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              RESET
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-[#18D8D0]/20 text-xs">
            <div>
              <label className="font-pixel text-[8.5px] text-[#91A0AE] block mb-1 uppercase">ASSIGNED ROLE</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#050914] border border-[#18D8D0]/40 px-2.5 py-1.5 text-xs text-[#F4E6CE] font-pixel focus:outline-none focus:border-[#FF5500]"
              >
                <option value="ALL">ALL ROLES</option>
                {defaultRoleNames.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-pixel text-[8.5px] text-[#91A0AE] block mb-1 uppercase">ACCOUNT STATUS</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#050914] border border-[#18D8D0]/40 px-2.5 py-1.5 text-xs text-[#F4E6CE] font-pixel focus:outline-none focus:border-[#FF5500]"
              >
                <option value="ALL">ALL STATUSES</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            <div>
              <label className="font-pixel text-[8.5px] text-[#91A0AE] block mb-1 uppercase">INSTITUTION</label>
              <input
                type="text"
                value={institutionFilter}
                onChange={(e) => {
                  setInstitutionFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter institution..."
                className="w-full bg-[#050914] border border-[#18D8D0]/40 px-2.5 py-1.5 text-xs text-[#F4E6CE] font-sans focus:outline-none focus:border-[#FF5500]"
              />
            </div>

            <div>
              <label className="font-pixel text-[8.5px] text-[#91A0AE] block mb-1 uppercase">STATE / REGION</label>
              <input
                type="text"
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter state..."
                className="w-full bg-[#050914] border border-[#18D8D0]/40 px-2.5 py-1.5 text-xs text-[#F4E6CE] font-sans focus:outline-none focus:border-[#FF5500]"
              />
            </div>
          </div>
        </div>

        {/* ═══ USERS DATA TABLE ═══ */}
        <div className="bg-[#07101D] border-2 border-[#18D8D0]/40 overflow-hidden shadow-[3px_3px_0px_#000]">
          {loading ? (
            <div className="py-24 text-center font-pixel text-xs text-[#FF5500] animate-pulse">
              ACCESSING CENTRAL USER DIRECTORY...
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Users className="w-10 h-10 mx-auto text-[#91A0AE]/50" />
              <p className="font-pixel text-xs text-[#91A0AE]">NO USER ACCOUNTS MATCH SEARCH CRITERIA</p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1 bg-[#18D8D0] text-black font-pixel text-[10px] font-bold"
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#050914] text-[#18D8D0] font-pixel text-[9.5px] uppercase border-b-2 border-[#18D8D0]/40 tracking-wider">
                  <tr>
                    <th className="p-3">USER / IDENTITY</th>
                    <th className="p-3">INSTITUTION / STATE</th>
                    <th className="p-3">ASSIGNED ROLES</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3">LAST LOGIN</th>
                    <th className="p-3 text-right">ADMIN ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18D8D0]/20">
                  {users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const isSuperAdmin = u.roles.includes("SUPER_ADMIN");

                    return (
                      <tr key={u.id} className="hover:bg-[#18D8D0]/5 transition-colors">
                        {/* Name & Email */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-[10px] text-[#F4E6CE] font-bold">
                              {u.name}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 bg-[#FF5500]/20 border border-[#FF5500] text-[#FF5500] font-pixel text-[7.5px]">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#91A0AE] font-mono mt-0.5">{u.email}</p>
                          {u.phone && (
                            <p className="text-[10px] text-[#91A0AE]/80 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-[#18D8D0]" /> {u.phone}
                            </p>
                          )}
                        </td>

                        {/* Institution & State */}
                        <td className="p-3">
                          <p className="text-xs text-[#F4E6CE] font-medium">
                            {u.institution || <span className="text-[#91A0AE] italic">Unassigned</span>}
                          </p>
                          <p className="text-[10px] text-[#91A0AE] font-pixel mt-0.5">
                            {u.state || "N/A"}
                          </p>
                        </td>

                        {/* Assigned Roles */}
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className={`px-1.5 py-0.5 font-pixel text-[8px] uppercase tracking-wider ${
                                  r === "SUPER_ADMIN"
                                    ? "bg-red-950/80 text-red-400 border border-red-500 shadow-[1px_1px_0px_#000]"
                                    : r === "TOURNAMENT_ADMIN"
                                    ? "bg-purple-950/80 text-purple-300 border border-purple-500 shadow-[1px_1px_0px_#000]"
                                    : "bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/40 shadow-[1px_1px_0px_#000]"
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500 text-emerald-400 font-pixel text-[8.5px] uppercase">
                              <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950/80 border border-red-500 text-red-400 font-pixel text-[8.5px] uppercase">
                              <XCircle className="w-2.5 h-2.5" /> DISABLED
                            </span>
                          )}
                        </td>

                        {/* Last Login (Strictly never fabricated) */}
                        <td className="p-3 font-mono text-[10.5px] text-[#91A0AE]">
                          {u.lastLoginAt ? (
                            new Date(u.lastLoginAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-[#91A0AE]/60 italic font-pixel text-[8.5px]">NO RECORD</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Detail */}
                            <Link
                              href={`/admin/system/users/${u.id}`}
                              className="px-2 py-1 bg-[#050914] hover:bg-[#18D8D0] hover:text-black text-[#18D8D0] border border-[#18D8D0]/50 font-pixel text-[9px] flex items-center gap-1 transition-colors"
                              title="Inspect full user account and security context"
                            >
                              <Eye className="w-3 h-3" /> DETAIL
                            </Link>

                            {/* Manage Roles */}
                            <button
                              onClick={() => {
                                setRoleModalUser(u);
                                setSelectedRoles([...u.roles]);
                              }}
                              className="px-2 py-1 bg-[#050914] hover:bg-[#FF5500] hover:text-black text-[#F4E6CE] border border-[#18D8D0]/40 font-pixel text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Assign or revoke roles"
                            >
                              <Shield className="w-3 h-3" /> ROLES
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResetModalUser(u);
                                setResetAction("SEND_RESET");
                                setTempPassword("");
                              }}
                              className="px-2 py-1 bg-[#050914] hover:bg-[#F5A623] hover:text-black text-[#F5A623] border border-[#F5A623]/50 font-pixel text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Reset user credentials"
                            >
                              <KeyRound className="w-3 h-3" /> RESET
                            </button>

                            {/* Enable / Disable */}
                            {u.isActive ? (
                              <button
                                onClick={() => setDisableModalUser(u)}
                                className="px-2 py-1 bg-red-950/70 hover:bg-red-600 text-red-300 hover:text-white border border-red-500 font-pixel text-[9px] transition-colors cursor-pointer"
                                title="Deactivate user account"
                              >
                                DISABLE
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleActive(u, true)}
                                className="px-2 py-1 bg-emerald-950/70 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500 font-pixel text-[9px] transition-colors cursor-pointer"
                                title="Enable user account"
                              >
                                ENABLE
                              </button>
                            )}

                            {/* Force Logout */}
                            <button
                              onClick={() => setForceLogoutUser(u)}
                              className="p-1 text-[#91A0AE] hover:text-[#FF5500] border border-transparent hover:border-[#FF5500]/40 transition-colors"
                              title="Force logout all active sessions"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ PAGINATION CONTROLS ═══ */}
          <div className="p-3 bg-[#050914] border-t-2 border-[#18D8D0]/30 flex flex-wrap items-center justify-between gap-3">
            <span className="font-pixel text-[9.5px] text-[#91A0AE]">
              SHOWING PAGE {page} OF {totalPages} ({totalCount} REGISTERED ACCOUNTS)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 bg-[#07101D] hover:bg-[#18D8D0] hover:text-black disabled:opacity-30 text-[#F4E6CE] border border-[#18D8D0]/40 font-pixel text-[9.5px] flex items-center gap-1 shadow-[1px_1px_0px_#000]"
              >
                <ChevronLeft className="w-3 h-3" /> PREV
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-[#07101D] hover:bg-[#18D8D0] hover:text-black disabled:opacity-30 text-[#F4E6CE] border border-[#18D8D0]/40 font-pixel text-[9.5px] flex items-center gap-1 shadow-[1px_1px_0px_#000]"
              >
                NEXT <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            MODAL 1: 5-STEP USER PROVISIONING WIZARD
            ═══════════════════════════════════════════════════════════ */}
        {isProvisionOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-[#07101D] border-2 border-[#FF5500] p-6 space-y-5 shadow-[6px_6px_0px_#000]">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b-2 border-[#FF5500]/40 pb-3">
                <div>
                  <h3 className="font-pixel text-sm text-[#F4E6CE] uppercase font-bold tracking-tight">
                    PROVISION USER ACCOUNT
                  </h3>
                  <p className="font-pixel text-[9px] text-[#FF5500]">
                    STEP {provisionStep} OF 4 — {
                      provisionStep === 1 ? "BASIC INFORMATION" :
                      provisionStep === 2 ? "ACCOUNT CREDENTIALS" :
                      provisionStep === 3 ? "ROLE ASSIGNMENT" :
                      "REVIEW & CONFIRMATION"
                    }
                  </p>
                </div>
                <button
                  onClick={() => setIsProvisionOpen(false)}
                  className="p-1 text-[#91A0AE] hover:text-white border border-[#18D8D0]/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Steps Header */}
              <div className="grid grid-cols-4 gap-1 text-center font-pixel text-[8px] uppercase">
                {["01 BASIC", "02 ACCOUNT", "03 ROLE", "04 REVIEW"].map((label, idx) => (
                  <div
                    key={label}
                    className={`py-1 border ${
                      provisionStep === idx + 1
                        ? "bg-[#FF5500] text-black font-bold border-[#FF5500]"
                        : provisionStep > idx + 1
                        ? "bg-[#18D8D0]/20 text-[#18D8D0] border-[#18D8D0]"
                        : "bg-[#050914] text-[#91A0AE] border-[#18D8D0]/20"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Step 1: Basic Information */}
              {provisionStep === 1 && (
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      required
                      value={provisionData.name}
                      onChange={(e) => setProvisionData({ ...provisionData, name: e.target.value })}
                      placeholder="e.g. Dr. Priya Sundaram"
                      className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                        PHONE / MOBILE
                      </label>
                      <input
                        type="tel"
                        value={provisionData.phone}
                        onChange={(e) => setProvisionData({ ...provisionData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                      />
                    </div>
                    <div>
                      <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                        STATE / REGION
                      </label>
                      <input
                        type="text"
                        value={provisionData.state}
                        onChange={(e) => setProvisionData({ ...provisionData, state: e.target.value })}
                        placeholder="e.g. Karnataka"
                        className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                      AFFILIATED INSTITUTION / UNIVERSITY
                    </label>
                    <input
                      type="text"
                      value={provisionData.institution}
                      onChange={(e) => setProvisionData({ ...provisionData, institution: e.target.value })}
                      placeholder="e.g. KLE Technological University, Hubballi"
                      className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Account */}
              {provisionStep === 2 && (
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                      OFFICIAL EMAIL ADDRESS *
                    </label>
                    <input
                      type="email"
                      required
                      value={provisionData.email}
                      onChange={(e) => setProvisionData({ ...provisionData, email: e.target.value })}
                      placeholder="e.g. priya.s@kletech.ac.in"
                      className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                    />
                    <p className="font-sans text-[11px] text-[#91A0AE] mt-1">
                      Must be unique. A secure password setup link will be dispatched to this address.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                        INITIAL ACCOUNT STATUS
                      </label>
                      <select
                        value={provisionData.status}
                        onChange={(e) => setProvisionData({ ...provisionData, status: e.target.value })}
                        className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] font-pixel focus:outline-none focus:border-[#FF5500]"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PENDING">PENDING VERIFICATION</option>
                        <option value="DISABLED">DISABLED (DRAFT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-pixel text-[9px] text-[#18D8D0] block mb-1">
                        BADGE LEVEL
                      </label>
                      <input
                        type="text"
                        value={provisionData.badge}
                        onChange={(e) => setProvisionData({ ...provisionData, badge: e.target.value })}
                        placeholder="OFFICIAL / DESK / TECHNICAL"
                        className="w-full bg-[#050914] border-2 border-[#18D8D0]/40 px-3 py-2 text-xs text-[#F4E6CE] focus:outline-none focus:border-[#FF5500]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Role Selection */}
              {provisionStep === 3 && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-pixel text-[9px] text-[#18D8D0] uppercase">
                      SELECT PRIMARY &amp; AUXILIARY ROLES *
                    </label>
                    <span className="font-pixel text-[8.5px] text-[#FF5500]">
                      {provisionData.roles.length} SELECTED
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border-2 border-[#18D8D0]/30 bg-[#050914] p-3 space-y-2">
                    {defaultRoleNames.map((r) => {
                      const isSelected = provisionData.roles.includes(r);
                      const isSuper = r === "SUPER_ADMIN";

                      return (
                        <label
                          key={r}
                          className={`flex items-start gap-2.5 p-2 border cursor-pointer transition-colors ${
                            isSelected
                              ? isSuper
                                ? "bg-red-950/60 border-red-500 text-red-200"
                                : "bg-[#18D8D0]/15 border-[#18D8D0] text-[#F4E6CE]"
                              : "bg-[#07101D] border-transparent text-[#91A0AE] hover:border-[#18D8D0]/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProvisionData({ ...provisionData, roles: [...provisionData.roles, r] });
                              } else {
                                setProvisionData({
                                  ...provisionData,
                                  roles: provisionData.roles.filter((role) => role !== r),
                                });
                              }
                            }}
                            className="mt-0.5 accent-[#FF5500]"
                          />
                          <div>
                            <span className="font-pixel text-[9.5px] font-bold block">{r}</span>
                            {isSuper && (
                              <span className="font-pixel text-[8px] text-red-400 block mt-0.5">
                                HIGH RISK: Grants full unrestricted root privileges across platform
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {provisionStep === 4 && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#050914] border-2 border-[#18D8D0]/40 space-y-2 font-mono">
                    <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                      <span className="text-[#91A0AE]">NAME:</span>
                      <span className="text-[#F4E6CE] font-bold">{provisionData.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                      <span className="text-[#91A0AE]">EMAIL:</span>
                      <span className="text-[#18D8D0]">{provisionData.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                      <span className="text-[#91A0AE]">PHONE:</span>
                      <span className="text-[#F4E6CE]">{provisionData.phone || "None specified"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                      <span className="text-[#91A0AE]">INSTITUTION:</span>
                      <span className="text-[#F4E6CE]">{provisionData.institution || "None specified"}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#18D8D0]/20 pb-1.5">
                      <span className="text-[#91A0AE]">STATUS:</span>
                      <span className="text-emerald-400 font-pixel text-[9px]">{provisionData.status}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-[#91A0AE]">ROLES:</span>
                      <span className="text-[#FF5500] font-pixel text-[9px]">
                        {provisionData.roles.join(", ")}
                      </span>
                    </div>
                  </div>

                  {provisionData.roles.includes("SUPER_ADMIN") && (
                    <div className="p-2.5 bg-red-950/80 border border-red-600 text-red-300 font-pixel text-[9px] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>WARNING: You are provisioning an account with SUPER_ADMIN clearance.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Step Navigation Controls */}
              <div className="flex justify-between items-center border-t-2 border-[#FF5500]/40 pt-4">
                {provisionStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setProvisionStep((s) => s - 1)}
                    className="px-3 py-1.5 bg-[#050914] text-[#F4E6CE] border border-[#18D8D0]/40 font-pixel text-xs"
                  >
                    ← PREVIOUS
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsProvisionOpen(false)}
                    className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] border border-[#18D8D0]/20 font-pixel text-xs"
                  >
                    CANCEL
                  </button>
                )}

                {provisionStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (provisionStep === 1 && !provisionData.name.trim()) {
                        alert("Full Name is required.");
                        return;
                      }
                      if (provisionStep === 2 && !provisionData.email.trim()) {
                        alert("Official Email is required.");
                        return;
                      }
                      if (provisionStep === 3 && provisionData.roles.length === 0) {
                        alert("At least one role must be selected.");
                        return;
                      }
                      setProvisionStep((s) => s + 1);
                    }}
                    className="px-4 py-1.5 bg-[#18D8D0] text-black font-pixel text-xs font-bold"
                  >
                    NEXT STEP →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteProvision}
                    disabled={provisioning}
                    className="px-5 py-2 bg-[#FF5500] hover:bg-[#D94E16] text-black font-pixel text-xs font-bold shadow-[2px_2px_0px_#000] disabled:opacity-50"
                  >
                    {provisioning ? "PROVISIONING..." : "COMMIT & PROVISION ACCOUNT"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL 2: MANAGE ROLES (CURRENT VS NEW + SUPER_ADMIN SAFETY)
            ═══════════════════════════════════════════════════════════ */}
        {roleModalUser && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#18D8D0] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex justify-between items-center border-b border-[#18D8D0]/40 pb-2">
                <div>
                  <h3 className="font-pixel text-xs text-[#F4E6CE] uppercase font-bold">MANAGE ASSIGNED ROLES</h3>
                  <p className="font-mono text-[11px] text-[#18D8D0]">{roleModalUser.name} ({roleModalUser.email})</p>
                </div>
                <button onClick={() => setRoleModalUser(null)} className="text-[#91A0AE] hover:text-white">✕</button>
              </div>

              {/* Current Roles vs New Roles comparison */}
              <div className="p-3 bg-[#050914] border border-[#18D8D0]/30 space-y-2 text-xs">
                <div>
                  <span className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block mb-1">CURRENT ROLES:</span>
                  <div className="flex flex-wrap gap-1">
                    {roleModalUser.roles.map((r) => (
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

              {/* Role Checkboxes */}
              <div className="max-h-52 overflow-y-auto border border-[#18D8D0]/30 bg-[#050914] p-2 space-y-1.5 text-xs">
                {defaultRoleNames.map((r) => {
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

              {/* High-Risk Warning for SUPER_ADMIN */}
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
                  onClick={() => setRoleModalUser(null)}
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
            MODAL 3: CREDENTIAL MANAGEMENT & PASSWORD RESET
            ═══════════════════════════════════════════════════════════ */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#F5A623] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex justify-between items-center border-b border-[#F5A623]/40 pb-2">
                <div>
                  <h3 className="font-pixel text-xs text-[#F4E6CE] uppercase font-bold">CREDENTIAL MANAGEMENT</h3>
                  <p className="font-mono text-[11px] text-[#F5A623]">{resetModalUser.email}</p>
                </div>
                <button onClick={() => setResetModalUser(null)} className="text-[#91A0AE] hover:text-white">✕</button>
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-amber-950/50 border border-[#F5A623] text-amber-200 text-xs space-y-1">
                <p className="font-pixel text-[9px] text-[#F5A623] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> CREDENTIAL OVERRIDE WARNING
                </p>
                <p className="text-[11px] leading-relaxed">
                  Resetting this account&apos;s credentials will affect the user&apos;s ability to authenticate. Active sessions will be immediately terminated.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2 text-xs">
                <label className="font-pixel text-[8.5px] text-[#91A0AE] uppercase block">CHOOSE RESET MECHANISM</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2 bg-[#050914] border border-[#18D8D0]/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      checked={resetAction === "SEND_RESET"}
                      onChange={() => setResetAction("SEND_RESET")}
                      className="mt-0.5 accent-[#FF5500]"
                    />
                    <div>
                      <span className="font-pixel text-[9.5px] text-[#F4E6CE] font-bold block">
                        SEND PASSWORD RESET EMAIL (RECOMMENDED)
                      </span>
                      <span className="text-[11px] text-[#91A0AE]">
                        Dispatches a secure one-time verification mechanism directly through the identity provider.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 bg-[#050914] border border-[#18D8D0]/30 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      checked={resetAction === "SET_TEMPORARY"}
                      onChange={() => setResetAction("SET_TEMPORARY")}
                      className="mt-0.5 accent-[#FF5500]"
                    />
                    <div>
                      <span className="font-pixel text-[9.5px] text-[#F4E6CE] font-bold block">
                        PROVISION TEMPORARY CREDENTIAL
                      </span>
                      <span className="text-[11px] text-[#91A0AE]">
                        Establishes an administrator-set temporary password and flags mandatory password change on next login.
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
                  onClick={() => setResetModalUser(null)}
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
            MODAL 4: DISABLE USER ACCOUNT CONFIRMATION
            ═══════════════════════════════════════════════════════════ */}
        {disableModalUser && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-red-500 p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex items-center gap-3 text-red-500 border-b border-red-500/40 pb-2">
                <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
                <h3 className="font-pixel text-xs uppercase font-bold text-white">CONFIRM DEACTIVATE USER</h3>
              </div>

              <div className="space-y-2 text-xs text-[#91A0AE]">
                <p>
                  Are you certain you wish to disable access for:
                </p>
                <div className="p-2.5 bg-[#050914] border border-red-500/30 text-white font-mono text-[11px]">
                  <p className="font-bold">{disableModalUser.name}</p>
                  <p className="text-[#18D8D0]">{disableModalUser.email}</p>
                </div>
                <p className="text-[11px] text-red-400">
                  This will immediately terminate all active sessions, invalidate tokens, and deny access across all tournament routes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-red-500/30">
                <button
                  onClick={() => setDisableModalUser(null)}
                  className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleToggleActive(disableModalUser, false)}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-pixel text-xs font-bold"
                >
                  DEACTIVATE ACCOUNT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODAL 5: FORCE LOGOUT CONFIRMATION
            ═══════════════════════════════════════════════════════════ */}
        {forceLogoutUser && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#07101D] border-2 border-[#FF5500] p-5 space-y-4 shadow-[6px_6px_0px_#000]">
              <div className="flex items-center gap-3 text-[#FF5500] border-b border-[#FF5500]/40 pb-2">
                <LogOut className="w-5 h-5 shrink-0" />
                <h3 className="font-pixel text-xs uppercase font-bold text-white">FORCE SESSION TERMINATION</h3>
              </div>

              <p className="text-xs text-[#91A0AE]">
                Terminate all active sessions for <strong className="text-white">{forceLogoutUser.email}</strong>?
                The user will be required to log in again with their primary credentials.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#FF5500]/30">
                <button
                  onClick={() => setForceLogoutUser(null)}
                  className="px-3 py-1.5 bg-[#050914] text-[#91A0AE] font-pixel text-xs border border-[#18D8D0]/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleForceLogout}
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
