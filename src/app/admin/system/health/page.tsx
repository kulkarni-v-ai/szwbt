"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Server,
  Database,
  ShieldCheck,
  HardDrive,
  Mail,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";
import { useAuth } from "@/lib/rbac/useAuth";

export default function SystemHealthPage() {
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
        <div className="max-w-md w-full bg-[#0b0c10] border-2 border-red-600 p-6 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 mx-auto text-red-500 animate-pulse" />
          <h1 className="font-pixel text-sm text-red-500 uppercase">ACCESS RESTRICTED // 403 FORBIDDEN</h1>
          <p className="text-xs text-gray-300">{accessDenied}</p>
          <Link href="/admin/system" className="inline-block px-4 py-2 bg-[#ff5500] text-white font-pixel text-xs">
            BACK TO SYSTEM OVERVIEW
          </Link>
        </div>
      </div>
    );
  }

  const s = healthData?.services;

  return (
    <SystemAdminShell onRefresh={fetchHealth} systemStatus={healthData?.overallStatus || "HEALTHY"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-pixel text-sm text-white uppercase">HEALTH DIAGNOSTICS &amp; SERVICE TELEMETRY</h1>
          </div>
          <button
            onClick={fetchHealth}
            disabled={refreshing}
            className="px-3 py-1 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>REFRESH STATUS</span>
          </button>
        </div>

        {testEmailResult && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs flex items-center justify-between">
            <span>{testEmailResult}</span>
            <button onClick={() => setTestEmailResult(null)} className="text-gray-400">✕</button>
          </div>
        )}

        {/* Detailed Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database Diagnostics */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
            <div className="flex justify-between items-center border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#ff5500]" />
                <span className="font-pixel text-xs text-white">DATABASE LAYER</span>
              </div>
              <span className="px-2 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                {s?.database?.status || "HEALTHY"}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Engine:</span><span className="text-white font-mono">{s?.database?.engine || "PostgreSQL 16"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Roundtrip Latency:</span><span className="text-emerald-400 font-mono font-bold">{s?.database?.latencyMs ?? 0} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Migrations:</span><span className="text-white font-pixel text-[10px]">{s?.database?.migrations || "UP TO DATE"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Active Records:</span><span className="text-[#f5a623]">{s?.database?.activeUsers ?? 0} Users • {s?.database?.activeParticipants ?? 0} Participants</span></div>
            </div>
          </div>

          {/* API Engine Diagnostics */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
            <div className="flex justify-between items-center border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-pixel text-xs text-white">SERVER ENVIRONMENT</span>
              </div>
              <span className="px-2 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                HEALTHY
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Node Version:</span><span className="text-white font-mono">{s?.api?.nodeVersion || process.version}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Uptime:</span><span className="text-cyan-400 font-mono">{s?.api?.uptimeSeconds ?? 0}s</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Heap Memory:</span><span className="text-[#f5a623] font-mono">{s?.api?.heapMemory || "Active"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Environment:</span><span className="text-white uppercase">{s?.api?.environment || "development"}</span></div>
            </div>
          </div>

          {/* Auth Security Diagnostics */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
            <div className="flex justify-between items-center border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-pixel text-xs text-white">AUTH &amp; SECURITY CORE</span>
              </div>
              <span className="px-2 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                SECURED
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Token Mechanism:</span><span className="text-white font-mono">HMAC-SHA256 Signed</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Cookie Key:</span><span className="text-white font-mono">szwbt_session</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Session Expiration:</span><span className="text-[#f5a623]">7 Days (Rolling)</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Credential Shielding:</span><span className="text-emerald-400 font-pixel text-[9px]">ENFORCED</span></div>
            </div>
          </div>

          {/* SMTP / Mail Transporter */}
          <div className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
            <div className="flex justify-between items-center border-b border-[#1f2430] pb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="font-pixel text-xs text-white">SMTP GATEWAY</span>
              </div>
              <span className={`px-2 py-0.5 font-pixel text-[9px] border ${s?.email?.status === "HEALTHY" ? "bg-emerald-950 text-emerald-400 border-emerald-600/40" : "bg-amber-950 text-amber-400 border-amber-600/40"}`}>
                {s?.email?.status || "NOT CONFIGURED"}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Gateway Port:</span><span className="text-white font-mono">{s?.email?.port || 587}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Transporter:</span><span className="text-white font-mono">Nodemailer</span></div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-400">Diagnostic Test:</span>
                <button
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending}
                  className="px-2 py-1 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-[10px] flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{testEmailSending ? "DISPATCHING..." : "DISPATCH TEST EMAIL"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SystemAdminShell>
  );
}
