"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  BarChart3,
  ShieldAlert,
  ArrowLeft,
  Download,
  Filter,
  Search,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { ReportsPortalShell } from "@/components/reports/ReportsPortalShell";
import { useAuth } from "@/lib/rbac/useAuth";

interface ReportCategoryPageProps {
  params: Promise<{ category: string }>;
}

export default function ReportCategoryPage({ params }: ReportCategoryPageProps) {
  const resolvedParams = use(params);
  const rawCategory = resolvedParams.category?.toUpperCase() || "REGISTRATION";
  const { user } = useAuth();

  const [records, setRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [userClearance, setUserClearance] = useState<any>({
    canExport: true,
    hasFinanceAccess: false,
    hasAuditAccess: false,
    accessibleCategories: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setAccessDenied(null);

        // Fetch user overview clearance first
        const overviewRes = await fetch("/api/reports/overview");
        if (overviewRes.ok) {
          const ovData = await overviewRes.json();
          setUserClearance(ovData.user);
        }

        // Fetch category dataset
        const queryParams = new URLSearchParams({
          category: rawCategory,
          page: String(page),
          limit: "25",
        });
        if (search) queryParams.set("search", search);
        if (status) queryParams.set("status", status);

        const res = await fetch(`/api/reports/dataset?${queryParams.toString()}`);
        if (!res.ok) {
          if (res.status === 403) {
            const err = await res.json().catch(() => ({}));
            setAccessDenied(
              err.error || `403 Forbidden: Insufficient clearance to inspect ${rawCategory} reports.`
            );
            return;
          }
          throw new Error(`Failed to load dataset: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.success) {
          setRecords(data.records || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err: any) {
        console.error("Child route dataset error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [rawCategory, page, search, status]);

  const handleExport = async (format: string = "CSV") => {
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: rawCategory,
          format,
          filters: { search, status },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Export failed.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szwbt-${rawCategory.toLowerCase()}-${Date.now()}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#f5e6ca] p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 text-xs font-pixel text-[#f5a623] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO COMMAND CENTER
          </Link>
          <div className="flex items-center gap-2 font-pixel text-[10px] text-gray-400">
            <span>ROUTE:</span>
            <span className="text-white">/admin/reports/{rawCategory.toLowerCase()}</span>
          </div>
        </div>

        {/* Access Denied State (Direct URL testing check) */}
        {accessDenied ? (
          <div className="p-8 bg-[#0b0c10] border-2 border-red-600 space-y-4 text-center max-w-xl mx-auto my-12 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
            <div className="w-12 h-12 mx-auto bg-red-950/60 border border-red-500 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-red-500 uppercase">ACCESS RESTRICTED // 403 FORBIDDEN</h2>
              <p className="text-xs text-gray-300 mt-2">{accessDenied}</p>
            </div>
            <div className="p-3 bg-[#060608] border border-[#2d3748] text-[11px] text-gray-400 text-left space-y-1">
              <p>• Attempted Resource: <span className="text-white">{rawCategory}</span></p>
              <p>• Current User: <span className="text-white">{user?.email || "Anonymous"}</span></p>
              <p>• Authority: Backend database RBAC clearance is mandatory and authoritative.</p>
            </div>
            <Link
              href="/admin/reports"
              className="inline-block px-4 py-2 bg-[#ff5500] text-white font-pixel text-xs hover:bg-[#d94e16] transition-colors"
            >
              RETURN TO AUTHORIZED REPORTS
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Category Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0b0c10] border-2 border-[#1f2430]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1b0d2b] border border-[#ff5500] flex items-center justify-center text-[#ff5500]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-pixel text-base text-white tracking-wider">
                    {rawCategory} <span className="text-[#ff5500]">//</span> DOMAIN REPORT
                  </h1>
                  <p className="font-pixel text-[10px] text-[#f5a623]">
                    AUTHENTICATED DIRECT VIEW • {totalCount} ACTIVE RECORDS
                  </p>
                </div>
              </div>

              {userClearance.canExport && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport("CSV")}
                    className="px-3 py-1.5 bg-[#060608] hover:bg-[#1f2430] text-[#f5a623] border border-[#2d3748] font-pixel text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> EXPORT CSV
                  </button>
                  <button
                    onClick={() => handleExport("JSON")}
                    className="px-3 py-1.5 bg-[#060608] hover:bg-[#1f2430] text-cyan-400 border border-[#2d3748] font-pixel text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> EXPORT JSON
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3 p-3 bg-[#0b0c10] border border-[#2d3748]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={`Search ${rawCategory.toLowerCase()} records...`}
                  className="w-full bg-[#060608] border border-[#2d3748] pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-[#060608] border border-[#2d3748] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
              >
                <option value="">ALL STATUSES</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING">PENDING</option>
                <option value="OPEN">OPEN</option>
                <option value="SCHEDULED">SCHEDULED</option>
              </select>
            </div>

            {/* Data Table */}
            <div className="bg-[#0b0c10] border-2 border-[#1f2430] overflow-hidden">
              {loading ? (
                <div className="py-20 text-center font-pixel text-xs text-[#f5a623] animate-pulse">
                  LOADING {rawCategory} DATASET...
                </div>
              ) : records.length === 0 ? (
                <div className="py-16 text-center text-gray-500 font-pixel text-xs">
                  No records found in {rawCategory} matching current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[#060608] text-[#f5e6ca] font-pixel text-[10px] uppercase border-b border-[#2d3748]">
                      <tr>
                        <th className="p-3">IDENTIFIER</th>
                        <th className="p-3">PRIMARY ENTITY</th>
                        <th className="p-3">METRICS / METADATA</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2430]">
                      {records.map((r, i) => (
                        <tr
                          key={r.id || i}
                          onClick={() => setSelectedRecord(r)}
                          className="hover:bg-[#1f2430]/40 transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-pixel text-xs text-[#ff5500]">
                            {r.identifier || "N/A"}
                          </td>
                          <td className="p-3 font-medium text-white">
                            {r.name || r.title || r.subject || r.routeName || r.actor || "Record"}
                          </td>
                          <td className="p-3 text-gray-300 text-[11px]">
                            {r.institution || r.category || r.state || r.roomNumber || r.vehicleNo || r.action || "Standard"}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 font-pixel text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-600/40 uppercase">
                              {r.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecord(r);
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
                  PAGE {page} OF {totalPages} ({totalCount} RECORDS)
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
          </div>
        )}

        {/* Drill-down modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-[#0b0c10] border-2 border-[#ff5500] p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between border-b border-[#2d3748] pb-2">
                <h3 className="font-pixel text-xs text-[#ff5500]">TRACE: {selectedRecord.identifier}</h3>
                <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(selectedRecord).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between border-b border-[#1f2430] py-1">
                    <span className="text-gray-400 font-pixel text-[10px] uppercase">{k}:</span>
                    <span className="text-white max-w-xs truncate">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-3 py-1 bg-[#ff5500] text-white font-pixel text-xs"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
