"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import {
  Users, Trophy, Home, Bus, Shield, Key, CreditCard, Activity,
  Server, ArrowRight, UserPlus, CheckCircle2, AlertTriangle, X,
  Radio, Lock, RefreshCw, FileText
} from "lucide-react";
import { ScheduleCsvUploader } from "@/components/admin/ScheduleCsvUploader";
import { useAuth, PermissionGate } from "@/lib/rbac/useAuth";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ROLES } from "@/lib/rbac/roles";

export default function SuperAdminDashboard() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "super_admin")!;
  const { user, roles, permissions, hasPermission, hasAnyPermission } = useAuth();

  // Role Management State
  const [roleData, setRoleData] = useState<{
    roles: Array<{ id: string; name: string; displayName: string; permissions: string[] }>;
    users: Array<{ id: string; email: string; name: string; roles: string[]; isActive: boolean }>;
    permissions: Array<{ id: string; code: string; resource: string; action: string }>;
  } | null>(null);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<string>("");
  const [roleToAssign, setRoleToAssign] = useState<string>("REGISTRATION_STAFF");
  const [roleActionMsg, setRoleActionMsg] = useState<{ success: boolean; msg: string } | null>(null);

  // Fetch Roles and Audit Logs if authorized
  const loadRolesAndAudit = async () => {
    try {
      if (hasPermission(PERMISSIONS.ROLES_READ)) {
        const res = await fetch("/api/admin/roles");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setRoleData(data);
        }
      }
      if (hasPermission(PERMISSIONS.AUDIT_READ)) {
        const auditRes = await fetch("/api/audit/logs?limit=10");
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.success) setAuditLogs(auditData.logs || []);
        }
      }
      // Load recent registrations dynamically
      try {
        const regRes = await fetch("/api/admin/registrations?limit=10");
        if (regRes.ok) {
          const regData = await regRes.json();
          if (regData.success) setRecentRegistrations(regData.registrations || []);
        }
      } catch (err) {
        // fallback
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadRolesAndAudit();
  }, [hasPermission]);

  // Handle Role Assignment
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleActionMsg(null);

    if (!selectedUserForRole || !roleToAssign) return;

    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUserForRole,
          roleName: roleToAssign,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRoleActionMsg({ success: true, msg: data.message });
        loadRolesAndAudit();
      } else {
        setRoleActionMsg({ success: false, msg: data.error || "Failed to assign role." });
      }
    } catch (err: any) {
      setRoleActionMsg({ success: false, msg: "Network error during role assignment." });
    }
  };

  // Handle Role Removal
  const handleRemoveRole = async (targetUserId: string, roleName: string) => {
    setRoleActionMsg(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          roleName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRoleActionMsg({ success: true, msg: data.message });
        loadRolesAndAudit();
      } else {
        setRoleActionMsg({ success: false, msg: data.error || "Failed to remove role." });
      }
    } catch (err: any) {
      setRoleActionMsg({ success: false, msg: "Network error during role removal." });
    }
  };

  return (
    <DashboardShell currentRole={currentRole}>
      {/* ═══ TOP STATS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat
          label="TOTAL PARTICIPANTS"
          value="128 PLAYERS"
          subtext="Across 8 Categories"
          icon={<Users className="w-5 h-5" />}
          accent="orange"
        />
        <PixelStat
          label="TOTAL TEAMS"
          value="16 TEAMS"
          subtext="5 South States"
          icon={<Trophy className="w-5 h-5" />}
          accent="amber"
        />
        <PixelStat
          label="HOSTEL OCCUPANCY"
          value="63 / 100"
          subtext="Shalmala & Vindhya Hostels"
          icon={<Home className="w-5 h-5" />}
          accent="green"
        />
        <PixelStat
          label="SHUTTLE FLEET"
          value="3 ACTIVE"
          subtext="Routes 01 - 03"
          icon={<Bus className="w-5 h-5" />}
          accent="cyan"
        />
      </div>

      {/* ═══ CLEARANCE-FILTERED OPERATIONAL MODULES GRID ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#FF5A16]" />
            <span className="font-pixel text-xs text-slate-900 font-bold">
              AUTHORITATIVE OPERATIONAL MODULES (RBAC FILTERED)
            </span>
          </div>
          <span className="font-pixel text-[9px] text-slate-500">
            AUTHORIZED IDENTITY: {user?.email || "CHECKING"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. REGISTRATION MODULE */}
          {hasAnyPermission([PERMISSIONS.REGISTRATION_READ, PERMISSIONS.REGISTRATION_CREATE]) && (
            <div className="p-5 bg-white border border-slate-200 hover:border-[#FF5A16] rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-[#FF5A16] font-bold">01 • REGISTRATION</span>
                  <span className="px-2 py-0.5 bg-orange-50 text-[#FF5A16] border border-orange-200 font-pixel text-[8px] rounded font-bold">
                    DESK 01 &amp; 02
                  </span>
                </div>
                <h3 className="font-display text-base text-slate-900 font-bold mb-1">
                  ATHLETE REGISTRATION DESK
                </h3>
                <p className="font-sans text-xs text-slate-500 mb-4">
                  Verify participant credentials, capture SSLC/PUC marks cards, record separate registration fees, and issue Team QR passes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/register" className="flex-1">
                  <button className="w-full py-2 bg-[#FF5A16] hover:bg-[#e04808] text-white font-pixel text-[10px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors">
                    <Radio className="w-3.5 h-3.5" />
                    <span>LAUNCH DESK</span>
                  </button>
                </Link>
                <Link href="/admin/registrations">
                  <button className="px-3 py-2 bg-slate-50 text-slate-700 font-pixel text-[10px] border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors">
                    QUEUE
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* 2. ACCOMMODATION MODULE */}
          {hasAnyPermission([PERMISSIONS.ACCOMMODATION_READ, PERMISSIONS.ACCOMMODATION_ALLOCATE]) && (
            <div className="p-5 bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-emerald-700 font-bold">02 • ACCOMMODATION</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-pixel text-[8px] rounded font-bold">
                    STRICT 5-BED ROOMS
                  </span>
                </div>
                <h3 className="font-display text-base text-slate-900 font-bold mb-1">
                  HOSTEL LOGISTICS CONTROL
                </h3>
                <p className="font-sans text-xs text-slate-500 mb-4">
                  Shalmala Female Hostel &amp; Vindhya Boys Hostel. Allocate beds (Bed 01-05), scan Team QRs, and manage check-ins.
                </p>
              </div>
              <Link href="/admin/accommodation">
                <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-pixel text-[10px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors">
                  <Home className="w-3.5 h-3.5" />
                  <span>MANAGE 5-BED ALLOCATIONS</span>
                </button>
              </Link>
            </div>
          )}

          {/* 3. FINANCE MODULE */}
          {hasAnyPermission([PERMISSIONS.FINANCE_READ, PERMISSIONS.PAYMENT_READ]) && (
            <div className="p-5 bg-white border border-slate-200 hover:border-amber-500 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-amber-700 font-bold">03 • TREASURY</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-pixel text-[8px] rounded font-bold">
                    4 SEPARATE LEDGERS
                  </span>
                </div>
                <h3 className="font-display text-base text-slate-900 font-bold mb-1">
                  FINANCIAL LEDGERS &amp; UTR AUDIT
                </h3>
                <p className="font-sans text-xs text-slate-500 mb-4">
                  Separate audit ledgers for Registration, Accommodation, Shuttle, and Match fees. Real-time UTR lookup and Cash vs UPI summaries.
                </p>
              </div>
              <Link href="/admin/finance">
                <button className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-pixel text-[10px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>VIEW TREASURY LEDGERS</span>
                </button>
              </Link>
            </div>
          )}

          {/* 4. MATCH OPERATIONS MODULE */}
          {hasAnyPermission([PERMISSIONS.MATCH_READ, PERMISSIONS.SCORING_UPDATE]) && (
            <div className="p-5 bg-white border border-slate-200 hover:border-cyan-500 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-cyan-700 font-bold">04 • MATCH OPS</span>
                  <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 font-pixel text-[8px] rounded font-bold">
                    COURT SCOREBOARD
                  </span>
                </div>
                <h3 className="font-display text-base text-slate-900 font-bold mb-1">
                  COURT UMPIRE &amp; SCORING
                </h3>
                <p className="font-sans text-xs text-slate-500 mb-4">
                  Live court scoreboard for assigned officials. Point increments, undo, and official match result submissions.
                </p>
              </div>
              <Link href="/official">
                <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-pixel text-[10px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors">
                  <Activity className="w-3.5 h-3.5" />
                  <span>OPEN SCOREBOARD</span>
                </button>
              </Link>
            </div>
          )}

          {/* 5. TRANSPORT FLEET MODULE */}
          {hasAnyPermission([PERMISSIONS.TRANSPORT_READ, PERMISSIONS.TRANSPORT_BOARDING]) && (
            <div className="p-5 bg-white border border-slate-200 hover:border-purple-500 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-purple-700 font-bold">05 • FLEET LOGISTICS</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-pixel text-[8px] rounded font-bold">
                    AIRPORT / RAILWAY
                  </span>
                </div>
                <h3 className="font-display text-base text-slate-900 font-bold mb-1">
                  SHUTTLE FLEET CONTROL
                </h3>
                <p className="font-sans text-xs text-slate-500 mb-4">
                  Hubballi Airport &amp; UBL Junction shuttle manifests, passenger boarding check-ins, and transport fee ledger.
                </p>
              </div>
              <Link href="/admin/transport">
                <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-pixel text-[10px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors">
                  <Bus className="w-3.5 h-3.5" />
                  <span>FLEET MANIFESTS</span>
                </button>
              </Link>
            </div>
          )}

          {/* 6. RBAC & ROLE MANAGEMENT MODULE */}
          {hasPermission(PERMISSIONS.ROLES_READ) && (
            <div className="p-5 bg-white border-2 border-[#FF5A16] rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-[#FF5A16] font-bold">06 • ACCESS CONTROL</span>
                  <span className="px-2 py-0.5 bg-orange-50 text-[#FF5A16] border border-orange-200 font-pixel text-[8px] rounded font-bold">
                    SUPER ADMIN ONLY
                  </span>
                </div>
                <h3 className="font-display text-base text-slate-900 font-bold mb-1">
                  ROLE &amp; PERMISSION REGISTRY
                </h3>
                <p className="font-sans text-xs text-slate-500 mb-4">
                  Manage multiple roles per user, assign and revoke permissions, prevent privilege escalation, and inspect audit trails.
                </p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="w-full py-2 bg-[#FF5A16] hover:bg-[#e04808] text-white font-pixel text-[10px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>MANAGE RBAC ROLES</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fixtures CSV Uploader */}
      <ScheduleCsvUploader />

      {/* ═══ RECENT REGISTRATIONS & AUDIT ALERTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PixelCard headerTitle="RECENT REGISTRATIONS QUEUE" headerBadge="LIVE VERIFICATION">
            {recentRegistrations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl my-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-pixel text-[11px] text-slate-700 font-bold uppercase">NO ACTIVE REGISTRATIONS</p>
                <p className="text-xs text-slate-400 mt-1">Registrations submitted at Desk 01 or online will stream here in real-time.</p>
                <Link href="/register" className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white rounded-lg text-xs font-bold font-rajdhani uppercase transition-colors">
                  <UserPlus className="w-3.5 h-3.5" /> ONBOARD SQUAD
                </Link>
              </div>
            ) : (
              <PixelTable
                columns={[
                  { key: "playerId", header: "ID", render: (r) => <span className="font-mono text-orange-600 font-bold">{r.playerId}</span> },
                  { key: "name", header: "NAME" },
                  { key: "institution", header: "INSTITUTION" },
                  { key: "category", header: "CATEGORY" },
                  { key: "status", header: "STATUS", render: (r) => <PixelBadge variant={r.status === "APPROVED" ? "green" : "yellow"}>{r.status}</PixelBadge> },
                ]}
                data={recentRegistrations}
                keyExtractor={(item) => item.id}
              />
            )}
          </PixelCard>
        </div>

        {/* Live Tamper-Evident Audit Feed */}
        <PixelCard headerTitle="SECURITY AUDIT TRAIL" headerBadge="TAMPER-EVIDENT">
          <div className="flex flex-col gap-2.5 font-sans text-xs my-2 max-h-[360px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-slate-400 text-center font-pixel text-[10px] py-4">
                NO RECENT AUDIT EVENTS LOGGED
              </p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 border-l-3 border-[#FF5A16] rounded-r-xl">
                  <div className="flex items-center justify-between text-[9px] font-pixel text-[#FF5A16] mb-0.5 font-bold">
                    <span>{log.action}</span>
                    <span className="text-slate-400 font-normal">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-900 text-xs truncate font-medium">
                    Actor: {log.actorEmail}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Resource: {log.resourceType} {log.resourceId ? `• ${log.resourceId}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </PixelCard>
      </div>

      {/* ═══════════════════════════════════════════════════
          MODAL: SUPER ADMIN RBAC & ROLE MANAGER
      ═══════════════════════════════════════════════════ */}
      {isRoleModalOpen && roleData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-[#FF5A16] max-w-4xl w-full p-6 shadow-2xl rounded-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#FF5A16]" />
                <span className="font-pixel text-sm text-slate-900 font-bold uppercase">
                  CENTRALIZED RBAC ROLE &amp; PERMISSION REGISTRY
                </span>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banner */}
            {roleActionMsg && (
              <div
                className={`p-3 font-pixel text-xs mb-4 border rounded-xl ${
                  roleActionMsg.success
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {roleActionMsg.msg}
              </div>
            )}

            {/* Assign Role Form */}
            <form onSubmit={handleAssignRole} className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
              <span className="font-pixel text-[10px] text-[#FF5A16] block mb-2 uppercase font-bold">
                ASSIGN ROLE TO USER (MULTIPLE ROLES PERMITTED)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-pixel text-slate-500 mb-1">TARGET USER</label>
                  <select
                    value={selectedUserForRole}
                    onChange={(e) => setSelectedUserForRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 font-mono text-xs p-2 rounded-lg focus:outline-none focus:border-[#FF5A16]"
                    required
                  >
                    <option value="">-- SELECT USER --</option>
                    {roleData.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-pixel text-slate-500 mb-1">ROLE TO ASSIGN</label>
                  <select
                    value={roleToAssign}
                    onChange={(e) => setRoleToAssign(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 font-mono text-xs p-2 rounded-lg focus:outline-none focus:border-[#FF5A16]"
                    required
                  >
                    {roleData.roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.displayName} ({r.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#FF5A16] hover:bg-[#e04808] text-white font-pixel text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>ASSIGN ROLE</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Users & Assigned Roles Matrix */}
            <div className="max-h-[320px] overflow-y-auto mb-6 border border-slate-200 rounded-xl">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-pixel text-[10px]">
                    <th className="p-3">USER</th>
                    <th className="p-3">CURRENT ROLES (MULTI-ROLE)</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono bg-white">
                  {roleData.users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-900">
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((rName) => (
                            <span
                              key={rName}
                              className="px-2 py-0.5 bg-orange-50 text-[#FF5A16] font-pixel text-[8px] flex items-center gap-1 border border-orange-200 rounded font-bold"
                            >
                              <span>{rName}</span>
                              <button
                                onClick={() => handleRemoveRole(u.id, rName)}
                                className="text-slate-400 hover:text-rose-600 ml-0.5 font-bold"
                                title={`Revoke ${rName}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-pixel text-[8px] px-2 py-0.5 rounded border font-bold ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {u.isActive ? "ACTIVE" : "DISABLED"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[10px] text-slate-500">
                          {u.roles.length} Roles Assigned
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-pixel text-xs transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
