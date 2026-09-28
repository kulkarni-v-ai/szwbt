"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Eye,
  RotateCcw,
  AlertTriangle,
  X,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";

export default function SystemAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [securityAlertsCount, setSecurityAlertsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setAccessDenied(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (search) params.set("search", search);
      if (actionFilter) params.set("action", actionFilter);
      if (resourceFilter) params.set("resource", resourceFilter);

      const res = await fetch(`/api/system/audit?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied("403 Forbidden: Insufficient clearance for Immutable Audit Log inspection (AUDIT_READ required).");
          return;
        }
        throw new Error("Failed to load audit logs");
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalCount(data.totalCount || 0);
        setTodayCount(data.todayCount || 0);
        setSecurityAlertsCount(data.securityAlertsCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err: any) {
      console.error("Audit logs query error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, resourceFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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

  return (
    <SystemAdminShell onRefresh={fetchAuditLogs}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d3748] pb-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-pixel text-sm text-white uppercase">IMMUTABLE TAMPER-EVIDENT AUDIT TRAIL</h1>
              <p className="font-pixel text-[10px] text-gray-400">
                {totalCount} TOTAL SYSTEM EVENTS • {todayCount} LOGGED TODAY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-red-950/60 border border-red-500/50 text-red-400 font-pixel text-[10px]">
              {securityAlertsCount} SECURITY ALERTS
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-[#0b0c10] border border-[#2d3748]">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by actor, action, or resource ID..."
              className="w-full bg-[#060608] border border-[#2d3748] pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          <input
            type="text"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Action (e.g. USER_ROLE_CHANGED)"
            className="bg-[#060608] border border-[#2d3748] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
          />

          <input
            type="text"
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Resource (e.g. user, match)"
            className="bg-[#060608] border border-[#2d3748] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
          />
        </div>

        {/* Audit Logs Table */}
        <div className="bg-[#0b0c10] border-2 border-[#1f2430] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center font-pixel text-xs text-[#f5a623] animate-pulse">
              LOADING IMMUTABLE AUDIT LOGS...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 font-pixel text-xs">
              No audit events found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#060608] text-[#f5e6ca] font-pixel text-[10px] uppercase border-b border-[#2d3748]">
                  <tr>
                    <th className="p-3">TIMESTAMP</th>
                    <th className="p-3">ACTOR</th>
                    <th className="p-3">ACTION EVENT</th>
                    <th className="p-3">RESOURCE TARGET</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2430]">
                  {logs.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLog(l)}
                      className="hover:bg-[#1f2430]/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono text-gray-400 text-[11px]">
                        {new Date(l.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 font-mono text-white text-[11px]">{l.actorEmail}</td>
                      <td className="p-3 font-pixel text-[10px] text-[#ff5500]">{l.action}</td>
                      <td className="p-3 text-gray-300">
                        <span className="text-cyan-400">{l.resourceType}</span>: {l.resourceId}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(l);
                          }}
                          className="px-2 py-1 bg-[#060608] hover:bg-[#ff5500] hover:text-white text-gray-400 font-pixel text-[9px] border border-[#2d3748]"
                        >
                          <Eye className="w-3 h-3 inline mr-1" /> TRACE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-3 bg-[#060608] border-t border-[#1f2430] flex items-center justify-between">
            <span className="font-pixel text-[10px] text-gray-400">
              PAGE {page} OF {totalPages} ({totalCount} EVENTS)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 bg-[#0b0c10] hover:bg-[#1f2430] disabled:opacity-40 text-white font-pixel text-[10px] border border-[#2d3748] flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> PREV
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 bg-[#0b0c10] hover:bg-[#1f2430] disabled:opacity-40 text-white font-pixel text-[10px] border border-[#2d3748] flex items-center gap-1"
              >
                NEXT <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Trace Audit Detail */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-[#0b0c10] border-2 border-[#ff5500] p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#2d3748] pb-2">
                <h3 className="font-pixel text-xs text-[#ff5500]">AUDIT EVENT DETAILS // {selectedLog.id}</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">Timestamp:</span><span className="text-white font-mono">{new Date(selectedLog.timestamp).toISOString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Actor:</span><span className="text-white font-mono">{selectedLog.actorEmail}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Action:</span><span className="text-[#ff5500] font-pixel text-[10px]">{selectedLog.action}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Resource:</span><span className="text-cyan-400">{selectedLog.resourceType}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Resource ID:</span><span className="text-white font-mono">{selectedLog.resourceId}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Request ID:</span><span className="text-white font-mono">{selectedLog.requestId}</span></div>
              </div>

              {selectedLog.metadata && (
                <div className="p-3 bg-[#060608] border border-[#2d3748] space-y-1">
                  <p className="font-pixel text-[10px] text-[#f5a623]">METADATA PAYLOAD:</p>
                  <pre className="text-[11px] text-gray-300 overflow-x-auto font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-[#2d3748]">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 bg-[#ff5500] text-white font-pixel text-xs"
                >
                  CLOSE TRACE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SystemAdminShell>
  );
}
