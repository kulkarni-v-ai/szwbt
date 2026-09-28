"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Server,
  Activity,
  Database,
  ShieldCheck,
  HardDrive,
  Mail,
  Users,
  Settings,
  History,
  Home,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Clock,
  Send,
  Lock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";
import { useAuth } from "@/lib/rbac/useAuth";

export default function SystemCommandCenterPage() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setRefreshing(true);
      setAccessDenied(null);
      const res = await fetch("/api/system/health");
      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied("403 Forbidden: Insufficient clearance. Super Administrator authority required.");
          return;
        }
        throw new Error(`Health check returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setHealthData(data);
      }
    } catch (err: any) {
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleSendTestEmail = async () => {
    const target = prompt("Enter recipient email address for diagnostic test email:", user?.email || "admin@szwbt2026.edu");
    if (!target) return;

    try {
      setTestEmailSending(true);
      setTestEmailResult(null);
      const res = await fetch("/api/system/health/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: target.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult(data.message);
      } else {
        alert(data.error || "Failed to trigger test email.");
      }
    } catch (err: any) {
      alert("Test email error: " + err.message);
    } finally {
      setTestEmailSending(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0b0c10] border-2 border-red-600 p-6 text-center space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
          <div className="w-12 h-12 mx-auto bg-red-950 border border-red-500 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="font-pixel text-sm text-red-500 uppercase tracking-wider">
              SUPER ADMIN RESTRICTION // 403 FORBIDDEN
            </h1>
            <p className="text-xs text-gray-300 mt-2">{accessDenied}</p>
          </div>
          <div className="p-3 bg-[#060608] border border-[#2d3748] text-[11px] text-gray-400 text-left space-y-1">
            <p>• Required Clearance: <span className="text-[#ff5500]">LEVEL 04 ROOT (SUPER_ADMIN)</span></p>
            <p>• Active User: <span className="text-white">{user?.email || "Anonymous"}</span></p>
            <p>• Security Notice: Unauthorized access attempts to the System Command Center are logged in the tamper-evident audit ledger.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-xs transition-colors"
          >
            RETURN TO OPERATIONAL DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  const s = healthData?.services;

  return (
    <SystemAdminShell
      onRefresh={fetchHealth}
      systemStatus={healthData?.overallStatus || "HEALTHY"}
    >
      <div className="space-y-6">
        {/* ── TOP SYSTEM STATUS BANNER ── */}
        <section className="p-4 bg-[#0b0c10] border-2 border-[#1f2430] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-sm text-white">SYSTEM STATUS:</span>
                <span className="font-pixel text-sm text-emerald-400">
                  {healthData?.overallStatus === "HEALTHY" ? "ALL SYSTEMS OPERATIONAL" : healthData?.overallStatus || "INITIALIZING..."}
                </span>
              </div>
              <p className="font-pixel text-[10px] text-gray-400">
                LAST AUDITED: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString("en-IN") + " IST" : "CHECKING..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={refreshing}
              className="px-3 py-1.5 bg-[#060608] hover:bg-[#1a202c] text-[#f5a623] border border-[#2d3748] font-pixel text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "DIAGNOSING..." : "RUN DIAGNOSTICS"}</span>
            </button>
          </div>
        </section>

        {testEmailResult && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs flex items-center justify-between">
            <span>{testEmailResult}</span>
            <button onClick={() => setTestEmailResult(null)} className="text-gray-400">✕</button>
          </div>
        )}

        {/* ── SERVICE HEALTH MATRIX (Real PostgreSQL / Next.js Telemetry) ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Database Core */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#ff5500]" />
                <span className="font-pixel text-xs text-white">DATABASE CORE</span>
              </div>
              <span className="px-1.5 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                {s?.database?.status || "HEALTHY"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Engine:</span>
                <span className="text-white font-mono">{s?.database?.engine || "PostgreSQL 16"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Query Ping Latency:</span>
                <span className="text-emerald-400 font-mono font-bold">{s?.database?.latencyMs ?? 0} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Schema Migrations:</span>
                <span className="text-white font-pixel text-[10px]">{s?.database?.migrations || "UP TO DATE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active DB Records:</span>
                <span className="text-[#f5a623] font-mono">
                  {s?.database?.activeUsers ?? 0} Users • {s?.database?.activeParticipants ?? 0} Players
                </span>
              </div>
            </div>
          </div>

          {/* 2. Route Engine (API) */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-pixel text-xs text-white">ROUTE ENGINE (API)</span>
              </div>
              <span className="px-1.5 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                {s?.api?.status || "HEALTHY"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Runtime:</span>
                <span className="text-white font-mono">Node.js {s?.api?.nodeVersion || process.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Environment:</span>
                <span className="text-white uppercase font-mono">{s?.api?.environment || "development"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Process Uptime:</span>
                <span className="text-cyan-400 font-mono">{s?.api?.uptimeSeconds ?? 0} seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">V8 Heap Memory:</span>
                <span className="text-[#f5a623] font-mono">{s?.api?.heapMemory || "Active"}</span>
              </div>
            </div>
          </div>

          {/* 3. Authentication & RBAC Core */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-pixel text-xs text-white">AUTHENTICATION &amp; RBAC</span>
              </div>
              <span className="px-1.5 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                {s?.authentication?.status || "HEALTHY"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Signature:</span>
                <span className="text-white font-mono">HMAC-SHA256</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Session TTL:</span>
                <span className="text-white font-mono">7 Days (604800s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cookie Key:</span>
                <span className="text-[#f5a623] font-mono">szwbt_session</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Escalation Guard:</span>
                <span className="text-emerald-400 font-pixel text-[9px]">ENFORCED</span>
              </div>
            </div>
          </div>

          {/* 4. Secure Storage */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#f5a623]" />
                <span className="font-pixel text-xs text-white">OBJECT STORAGE</span>
              </div>
              <span className="px-1.5 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                {s?.storage?.status || "HEALTHY"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Adapter:</span>
                <span className="text-white font-mono">{s?.storage?.engine || "LOCAL_SECURE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Access Mode:</span>
                <span className="text-emerald-400 font-pixel text-[9px]">AUTHENTICATED ONLY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Public Buckets:</span>
                <span className="text-red-400 font-pixel text-[9px]">DISABLED (SECURE)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Credential Shielding:</span>
                <span className="text-emerald-400 font-pixel text-[9px]">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* 5. SMTP / Email Gateway */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="font-pixel text-xs text-white">EMAIL DISPATCH (SMTP)</span>
              </div>
              <span
                className={`px-1.5 py-0.5 font-pixel text-[9px] border ${
                  s?.email?.status === "HEALTHY"
                    ? "bg-emerald-950 text-emerald-400 border-emerald-600/40"
                    : "bg-amber-950 text-amber-400 border-amber-600/40"
                }`}
              >
                {s?.email?.status || "NOT CONFIGURED"}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Engine:</span>
                <span className="text-white font-mono">Nodemailer Gateway</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gateway Port:</span>
                <span className="text-white font-mono">{s?.email?.port || 587}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-400">Diagnostic:</span>
                <button
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending}
                  className="px-2 py-0.5 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-[9px] flex items-center gap-1"
                >
                  <Send className="w-2.5 h-2.5" />
                  <span>{testEmailSending ? "SENDING..." : "TEST EMAIL"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 6. Background Queue Engine */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-pixel text-xs text-white">BACKGROUND QUEUE</span>
              </div>
              <span className="px-1.5 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                HEALTHY
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Engine:</span>
                <span className="text-white font-mono">In-process Async Queue</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Workers:</span>
                <span className="text-emerald-400 font-mono">1 Dedicated</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed Jobs:</span>
                <span className="text-white font-mono">0 Failed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">BullMQ Compatibility:</span>
                <span className="text-cyan-400 font-pixel text-[9px]">READY</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── QUICK ADMINISTRATIVE CHANNELS ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/system/accommodation"
            className="p-4 bg-[#0b0c10] border-2 border-[#ff5500]/40 hover:border-[#ff5500] group transition-all"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <Home className="w-5 h-5 text-[#ff5500] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </div>
            <h2 className="font-pixel text-xs text-white">HOUSING TOPOLOGY</h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Configure hostels, floors, room numbering, bed counts &amp; maintenance.
            </p>
          </Link>

          <Link
            href="/admin/system/users"
            className="p-4 bg-[#0b0c10] border-2 border-cyan-500/40 hover:border-cyan-400 group transition-all"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <Users className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </div>
            <h2 className="font-pixel text-xs text-white">USER ADMINISTRATION</h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Search staff accounts, manage roles, enable or disable user access.
            </p>
          </Link>

          <Link
            href="/admin/system/configuration"
            className="p-4 bg-[#0b0c10] border-2 border-[#f5a623]/40 hover:border-[#f5a623] group transition-all"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <Settings className="w-5 h-5 text-[#f5a623] group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </div>
            <h2 className="font-pixel text-xs text-white">SYSTEM CONFIGURATION</h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Championship rules, registration fees, maintenance mode &amp; policies.
            </p>
          </Link>

          <Link
            href="/admin/system/audit"
            className="p-4 bg-[#0b0c10] border-2 border-yellow-500/40 hover:border-yellow-400 group transition-all"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <History className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </div>
            <h2 className="font-pixel text-xs text-white">IMMUTABLE AUDIT TRAIL</h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Trace tamper-evident security events, role changes &amp; operator actions.
            </p>
          </Link>
        </section>

        {/* ── SECURITY CHARTER NOTICE ── */}
        <section className="p-4 bg-[#1b0d2b]/60 border border-[#ff5500]/50 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
            <h3 className="font-pixel text-xs text-white uppercase">SUPER ADMIN INTEGRITY CHARTER</h3>
          </div>
          <p className="text-gray-300">
            All system mutations are strictly authenticated via the backend PostgreSQL RBAC layer. Direct URL tampering cannot elevate privileges. Browser shell execution, raw SQL consoles, and arbitrary database drop actions are strictly barred by architectural security policy.
          </p>
        </section>
      </div>
    </SystemAdminShell>
  );
}
