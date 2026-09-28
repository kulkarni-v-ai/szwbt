"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Users,
  Building,
  Home,
  Bus,
  Coins,
  Trophy,
  HelpCircle,
  Activity,
  Radio,
  FileText,
  Search,
  Filter,
  RotateCcw,
  Download,
  Bookmark,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  CheckCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  FileSpreadsheet,
  SlidersHorizontal,
} from "lucide-react";
import { ReportsPortalShell } from "@/components/reports/ReportsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { useAuth } from "@/lib/rbac/useAuth";

export default function ReportsDashboard() {
  const { user } = useAuth();

  // State
  const [currentCategory, setCurrentCategory] = useState<string>("REGISTRATION");
  const [overviewKpis, setOverviewKpis] = useState<any>(null);
  const [userClearance, setUserClearance] = useState<any>({
    canExport: true,
    hasFinanceAccess: false,
    hasAuditAccess: false,
    accessibleCategories: [],
  });

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Dataset
  const [dataset, setDataset] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summaryMetrics, setSummaryMetrics] = useState<any>({});

  // Loading & Error
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDataset, setLoadingDataset] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [savedReportsOpen, setSavedReportsOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  // Report Builder State
  const [builderType, setBuilderType] = useState("REGISTRATION");
  const [builderFormat, setBuilderFormat] = useState("CSV");
  const [builderColumns, setBuilderColumns] = useState<string[]>([]);
  const [builderReportName, setBuilderReportName] = useState("");
  const [savingReport, setSavingReport] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("CSV");

  // Fetch Overview KPIs
  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const res = await fetch("/api/reports/overview");
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg("403 Forbidden: You do not have clearance for the Reports & Analytics Center.");
          return;
        }
        throw new Error(`Failed to load telemetry (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setOverviewKpis(data.kpis);
        setUserClearance(data.user);
      }
    } catch (err: any) {
      console.error("Error fetching overview:", err);
      setErrorMsg(err.message || "Failed to load telemetry.");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Fetch Dataset for current Category & Filters
  const fetchDataset = useCallback(async () => {
    try {
      setLoadingDataset(true);
      setErrorMsg(null);
      const params = new URLSearchParams({
        category: currentCategory,
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (stateFilter) params.set("state", stateFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/reports/dataset?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg(`403 Forbidden: You lack clearance to inspect ${currentCategory} reports.`);
          setDataset([]);
          setTotalCount(0);
          return;
        }
        throw new Error(`Dataset query failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setDataset(data.records || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setSummaryMetrics(data.summaryMetrics || {});
      }
    } catch (err: any) {
      console.error("Error fetching dataset:", err);
      setErrorMsg(err.message || "Unable to generate dataset report.");
    } finally {
      setLoadingDataset(false);
    }
  }, [currentCategory, page, limit, search, status, stateFilter, dateFrom, dateTo]);

  // Fetch Saved Reports
  const fetchSavedReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/saved");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedReports(data.savedReports || []);
        }
      }
    } catch (err) {
      console.error("Error fetching saved reports:", err);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchSavedReports();
  }, [fetchOverview, fetchSavedReports]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  // Handle Export Download
  const handleExport = async (format: string = "CSV") => {
    try {
      setExporting(true);
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: currentCategory,
          format,
          filters: { status, state: stateFilter, search },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Export failed.");
        return;
      }

      // Download file blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szwbt-report-${currentCategory.toLowerCase()}-${Date.now()}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportDialogOpen(false);
    } catch (err: any) {
      console.error("Export error:", err);
      alert("Failed to download export file.");
    } finally {
      setExporting(false);
    }
  };

  // Save report template
  const handleSaveReportTemplate = async () => {
    if (!builderReportName.trim()) {
      alert("Please provide a name for this saved report.");
      return;
    }
    try {
      setSavingReport(true);
      const res = await fetch("/api/reports/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: builderReportName.trim(),
          reportType: builderType,
          filters: { status, state: stateFilter },
          columns: builderColumns.length > 0 ? builderColumns : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Report template saved successfully!");
        setReportBuilderOpen(false);
        setBuilderReportName("");
        fetchSavedReports();
      } else {
        alert(data.error || "Failed to save report.");
      }
    } catch (err) {
      console.error("Save report error:", err);
      alert("Failed to save report template.");
    } finally {
      setSavingReport(false);
    }
  };

  // Load Saved Report
  const handleLoadSavedReport = (sr: any) => {
    setCurrentCategory(sr.reportType);
    setSearch(sr.filters?.search || "");
    setStatus(sr.filters?.status || "");
    setStateFilter(sr.filters?.state || "");
    setPage(1);
    setSavedReportsOpen(false);
  };

  return (
    <ReportsPortalShell
      currentCategory={currentCategory}
      onSelectCategory={(cat) => {
        setCurrentCategory(cat);
        setPage(1);
      }}
      accessibleCategories={userClearance.accessibleCategories}
      hasFinanceAccess={userClearance.hasFinanceAccess}
      hasAuditAccess={userClearance.hasAuditAccess}
      canExport={userClearance.canExport}
      onRefresh={() => {
        fetchOverview();
        fetchDataset();
      }}
      onOpenReportBuilder={() => {
        setBuilderType(currentCategory);
        setReportBuilderOpen(true);
      }}
      onOpenExportDialog={() => setExportDialogOpen(true)}
      onOpenSavedReports={() => setSavedReportsOpen(true)}
    >
      <div className="space-y-6">
        {/* ── ERROR ALERT STATE ── */}
        {errorMsg && (
          <div className="p-4 bg-red-950/60 border-2 border-red-600 text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              <div>
                <p className="font-pixel text-xs text-white uppercase">SECURITY / CLEARANCE NOTIFICATION</p>
                <p className="text-xs text-red-300">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                fetchDataset();
              }}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white font-pixel text-[10px] border border-red-500"
            >
              RETRY
            </button>
          </div>
        )}

        {/* ── PRIMARY KPI STRIP (Real Backend PostgreSQL Data) ── */}
        <section aria-label="Executive Overview KPIs">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {/* 1. Participants */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">ATHLETES</span>
                <Users className="w-3.5 h-3.5 text-[#ff5500]" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-white">
                {overviewKpis?.registeredParticipants ?? "..."}
              </p>
              <span className="text-[9px] text-[#f5a623]">Accredited</span>
            </div>

            {/* 2. Teams */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">TEAMS</span>
                <Building className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-white">
                {overviewKpis?.registeredTeams ?? "..."}
              </p>
              <span className="text-[9px] text-cyan-400">
                {overviewKpis?.completedTeams ?? 0} Completed
              </span>
            </div>

            {/* 3. Registration Rate */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">REG. RATE</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-emerald-400">
                {overviewKpis?.registrationCompletionRate ?? 0}%
              </p>
              <span className="text-[9px] text-gray-400">Completion</span>
            </div>

            {/* 4. Accommodation Occupancy */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">HOSTELS</span>
                <Home className="w-3.5 h-3.5 text-[#f5a623]" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-white">
                {overviewKpis?.accommodation?.occupancyPercentage ?? 0}%
              </p>
              <span className="text-[9px] text-[#f5a623]">
                {overviewKpis?.accommodation?.occupiedBeds ?? 0}/{overviewKpis?.accommodation?.totalBeds ?? 0} Beds
              </span>
            </div>

            {/* 5. Free Transport Fleet */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">SHUTTLES</span>
                <Bus className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-white">
                {overviewKpis?.transport?.tripsScheduled ?? 0}
              </p>
              <span className="text-[9px] text-emerald-400 font-pixel text-[8px]">
                0 PAYMENT (FREE)
              </span>
            </div>

            {/* 6. Matches */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">MATCHES</span>
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-white">
                {overviewKpis?.matches?.completed ?? 0}/{overviewKpis?.matches?.total ?? 0}
              </p>
              <span className="text-[9px] text-yellow-400">
                {overviewKpis?.matches?.live ?? 0} Live Now
              </span>
            </div>

            {/* 7. Support Tickets */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">SUPPORT</span>
                <HelpCircle className="w-3.5 h-3.5 text-[#ff5500]" />
              </div>
              <p className="font-pixel text-lg sm:text-xl text-[#ff5500]">
                {overviewKpis?.support?.openTickets ?? 0}
              </p>
              <span className="text-[9px] text-gray-400">Open Cases</span>
            </div>

            {/* 8. Finance / Treasury (Strict RBAC Protected) */}
            <div className="p-3 bg-[#0b0c10] border border-[#2d3748] relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-pixel text-[9px] uppercase">TREASURY</span>
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              {userClearance.hasFinanceAccess && overviewKpis?.finance ? (
                <>
                  <p className="font-pixel text-sm sm:text-base text-emerald-400">
                    ₹{overviewKpis.finance.totalCollected.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[9px] text-gray-400">Desk Fees</span>
                </>
              ) : (
                <div className="flex items-center gap-1 text-gray-500 py-1">
                  <Lock className="w-3 h-3" />
                  <span className="font-pixel text-[9px]">RESTRICTED</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── GLOBAL FILTER MATRIX ── */}
        <section className="p-4 bg-[#0b0c10] border-2 border-[#1f2430] space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#ff5500]" />
              <span className="font-pixel text-xs text-white uppercase">
                FILTER MATRIX <span className="text-[#f5a623]">//</span> {currentCategory}
              </span>
            </div>
            <span className="font-pixel text-[10px] text-gray-400">
              MATCHING: <span className="text-[#ff5500] font-bold">{totalCount}</span> RECORDS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search IDs, names, codes..."
                className="w-full bg-[#060608] border border-[#2d3748] pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-[#060608] border border-[#2d3748] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
            >
              <option value="">ALL STATUSES</option>
              {currentCategory === "REGISTRATION" && (
                <>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="INCOMPLETE">INCOMPLETE</option>
                  <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
                </>
              )}
              {currentCategory === "PARTICIPANTS" && (
                <>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                </>
              )}
              {currentCategory === "ACCOMMODATION" && (
                <>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </>
              )}
              {currentCategory === "TRANSPORT" && (
                <>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="BOARDING">BOARDING</option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="ARRIVED">ARRIVED</option>
                  <option value="DELAYED">DELAYED</option>
                </>
              )}
              {currentCategory === "SUPPORT" && (
                <>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </>
              )}
            </select>

            {/* State Filter (For Participants & Teams) */}
            <input
              type="text"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by State (e.g. Karnataka)"
              className="bg-[#060608] border border-[#2d3748] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
            />

            {/* Date Range */}
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-1/2 bg-[#060608] border border-[#2d3748] px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#ff5500]"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-1/2 bg-[#060608] border border-[#2d3748] px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#ff5500]"
              />
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDataset()}
                className="flex-1 px-3 py-1.5 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-[10px] transition-colors"
              >
                APPLY
              </button>
              <button
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setStateFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-[#060608] hover:bg-[#1a202c] text-gray-400 hover:text-white border border-[#2d3748] text-[10px] font-pixel transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ── LIVE DATA STREAM TABLE (Real PostgreSQL Data with Server-Side Pagination) ── */}
        <section className="bg-[#0b0c10] border-2 border-[#1f2430] overflow-hidden">
          <div className="p-3 bg-[#060608] border-b border-[#1f2430] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff5500]" />
              <h2 className="font-pixel text-xs text-white uppercase tracking-wider">
                {currentCategory} REPORT DATASET
              </h2>
              {currentCategory === "TRANSPORT" && (
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-pixel text-[9px]">
                  COMPLIMENTARY FLEET (ZERO PAYMENT)
                </span>
              )}
            </div>

            {userClearance.canExport && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExport("CSV")}
                  disabled={exporting}
                  className="px-2 py-1 bg-[#060608] hover:bg-[#1f2430] text-[#f5a623] border border-[#2d3748] font-pixel text-[9px] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={() => handleExport("JSON")}
                  disabled={exporting}
                  className="px-2 py-1 bg-[#060608] hover:bg-[#1f2430] text-cyan-400 border border-[#2d3748] font-pixel text-[9px] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> JSON
                </button>
              </div>
            )}
          </div>

          {loadingDataset ? (
            <div className="py-20 text-center font-pixel text-xs text-[#f5a623] animate-pulse">
              LOADING {currentCategory} DATASET FROM DATABASE...
            </div>
          ) : dataset.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="font-pixel text-xs text-gray-400">No records found matching current criteria.</p>
              <p className="text-xs text-gray-500 mt-1">Try resetting search filters or selecting another category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#060608] text-[#f5e6ca] font-pixel text-[10px] uppercase border-b border-[#2d3748]">
                  <tr>
                    <th className="p-2.5">IDENTIFIER</th>
                    <th className="p-2.5">PRIMARY DETAILS</th>
                    <th className="p-2.5">CONTEXT / METRICS</th>
                    <th className="p-2.5">STATUS / CLEARANCE</th>
                    <th className="p-2.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2430]">
                  {dataset.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      onClick={() => setSelectedRecord(row)}
                      className="hover:bg-[#1f2430]/40 transition-colors cursor-pointer"
                    >
                      {/* 1. Identifier */}
                      <td className="p-2.5 font-pixel text-xs text-[#ff5500]">
                        {row.identifier || "N/A"}
                      </td>

                      {/* 2. Primary Details */}
                      <td className="p-2.5">
                        <div className="font-medium text-white">
                          {row.name || row.title || row.subject || row.routeName || row.matchNumber || row.roomNumber || row.actor || "Record"}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {row.institution || row.category || row.requester || row.hostelName || row.vehicleNo || row.action || "SZWBT 2026"}
                        </div>
                      </td>

                      {/* 3. Context / Metrics */}
                      <td className="p-2.5 text-[11px] text-gray-300">
                        {currentCategory === "PARTICIPANTS" && (
                          <div>
                            <span>{row.category}</span> • <span className="text-[#f5a623]">{row.state}</span>
                            {row.documentReadiness && (
                              <div className="flex gap-1 mt-0.5">
                                {Object.entries(row.documentReadiness).map(([type, st]: any) => (
                                  <span
                                    key={type}
                                    className={`px-1 text-[8px] font-pixel ${
                                      st === "VERIFIED"
                                        ? "bg-emerald-950 text-emerald-400"
                                        : "bg-amber-950 text-amber-400"
                                    }`}
                                  >
                                    {type}: {st}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {currentCategory === "TEAMS" && (
                          <div>
                            <span>Mgr: {row.manager}</span> • <span>Capt: {row.captain}</span> •{" "}
                            <span className="text-cyan-400">{row.memberCount} Athletes</span>
                          </div>
                        )}

                        {currentCategory === "ACCOMMODATION" && (
                          <div>
                            <span>{row.floorName}</span> • <span>Bed: {row.bedNumber}</span> •{" "}
                            <span className="text-[#f5a623]">Occupant: {row.occupantName}</span>
                          </div>
                        )}

                        {currentCategory === "TRANSPORT" && (
                          <div>
                            <span>{row.scheduledDate} {row.scheduledTime}</span> •{" "}
                            <span>Driver: {row.driverName}</span> •{" "}
                            <span className="text-emerald-400">
                              {row.boardedCount}/{row.passengersAssigned} Boarded ({row.noShowCount} No-Show)
                            </span>
                          </div>
                        )}

                        {currentCategory === "FINANCE" && (
                          <div>
                            <span className="text-emerald-400 font-bold">₹{row.amount}</span> •{" "}
                            <span>Method: {row.method}</span> • <span>UTR: {row.utr}</span>
                          </div>
                        )}

                        {currentCategory === "MATCHES" && (
                          <div>
                            <span>{row.tournamentDay}</span> • <span>{row.court}</span> •{" "}
                            <span className="text-white">{row.playerA} vs {row.playerB}</span> •{" "}
                            <span className="text-yellow-400">{row.score}</span>
                          </div>
                        )}

                        {currentCategory === "SUPPORT" && (
                          <div>
                            <span>Category: {row.category}</span> • <span>Priority: {row.priority}</span> •{" "}
                            <span>Agent: {row.assignedAgent}</span>
                          </div>
                        )}

                        {currentCategory === "AUDIT" && (
                          <div>
                            <span className="text-cyan-400">{row.resourceType}</span> •{" "}
                            <span>ID: {row.resourceId}</span>
                          </div>
                        )}

                        {currentCategory === "COMMUNICATIONS" && (
                          <div>
                            <span>Audience: {row.targetAudience}</span> • <span>Channels: {row.channels}</span> •{" "}
                            <span>Recipients: {row.recipientCount}</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Status / Clearance */}
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-pixel uppercase ${
                            row.status === "COMPLETED" ||
                            row.status === "APPROVED" ||
                            row.status === "SUCCESS" ||
                            row.status === "RESOLVED" ||
                            row.status === "AVAILABLE"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-600/40"
                              : row.status === "OCCUPIED" || row.status === "IN_PROGRESS" || row.status === "LIVE"
                              ? "bg-blue-950 text-blue-400 border border-blue-600/40"
                              : row.status === "ESCALATED" || row.status === "DELAYED"
                              ? "bg-red-950 text-red-400 border border-red-600/40"
                              : "bg-[#1b0d2b] text-[#f5a623] border border-[#f5a623]/40"
                          }`}
                        >
                          {row.status || "LOGGED"}
                        </span>
                      </td>

                      {/* 5. Action Drill-down */}
                      <td className="p-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(row);
                          }}
                          className="px-2 py-1 bg-[#060608] hover:bg-[#ff5500] hover:text-white text-gray-400 font-pixel text-[9px] border border-[#2d3748] transition-colors"
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

          {/* Pagination Toolbar */}
          <div className="p-3 bg-[#060608] border-t border-[#1f2430] flex items-center justify-between">
            <span className="font-pixel text-[10px] text-gray-400">
              PAGE {page} OF {totalPages} ({totalCount} TOTAL)
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
        </section>
      </div>

      {/* ── MODAL: DRILL-DOWN RECORD INSPECTOR ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0b0c10] border-2 border-[#ff5500] p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-[0_0_30px_rgba(255,85,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div>
                <p className="font-pixel text-xs text-[#ff5500] uppercase">
                  RECORD DRILL-DOWN TRACE // {selectedRecord.identifier || "ID"}
                </p>
                <p className="font-pixel text-sm text-white">{selectedRecord.name || selectedRecord.title || "Record Details"}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#060608] p-3 border border-[#2d3748] space-y-2 text-xs">
              {Object.entries(selectedRecord).map(([key, val]: any) => {
                if (key === "id" || key === "documentReadiness") return null;
                return (
                  <div key={key} className="flex justify-between border-b border-[#1f2430] py-1">
                    <span className="text-gray-400 font-pixel text-[10px] uppercase">{key}:</span>
                    <span className="text-white text-right max-w-xs truncate font-mono">
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                );
              })}
            </div>

            {selectedRecord.documentReadiness && (
              <div className="bg-[#060608] p-3 border border-[#2d3748] space-y-1">
                <p className="font-pixel text-[10px] text-[#f5a623] uppercase">DOCUMENT READINESS METADATA:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedRecord.documentReadiness).map(([type, st]: any) => (
                    <div key={type} className="flex justify-between bg-[#0b0c10] p-1.5 border border-[#1f2430]">
                      <span className="text-gray-300">{type}:</span>
                      <span className={st === "VERIFIED" ? "text-emerald-400" : "text-amber-400"}>
                        {st}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-[#ff5500] text-white font-pixel text-xs"
              >
                CLOSE TRACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT BUILDER (5 Steps) ── */}
      {reportBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#0b0c10] border-2 border-[#ff5500] p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-[0_0_30px_rgba(255,85,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ff5500]" />
                <h3 className="font-pixel text-sm text-white uppercase">REPORT BUILDER ENGINE</h3>
              </div>
              <button onClick={() => setReportBuilderOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1: Report Type */}
              <div className="space-y-1">
                <label className="font-pixel text-[10px] text-[#f5a623] uppercase">01 // SELECT REPORT TYPE</label>
                <select
                  value={builderType}
                  onChange={(e) => setBuilderType(e.target.value)}
                  className="w-full bg-[#060608] border border-[#2d3748] p-2 text-white focus:border-[#ff5500]"
                >
                  <option value="REGISTRATION">01 REGISTRATION (Team & Desk Registrations)</option>
                  <option value="PARTICIPANTS">02 PARTICIPANTS (Athlete Master Roster)</option>
                  <option value="TEAMS">03 TEAMS (Participating Institutions)</option>
                  <option value="ACCOMMODATION">04 ACCOMMODATION (Hostel Bed Allocations)</option>
                  <option value="TRANSPORT">05 TRANSPORT (Free Shuttle Logistics)</option>
                  {userClearance.hasFinanceAccess && <option value="FINANCE">06 FINANCE (Fee Ledgers)</option>}
                  <option value="MATCHES">07 MATCHES (Tournament Fixtures)</option>
                  <option value="RESULTS">08 RESULTS (Verified Scores)</option>
                  <option value="OPERATIONS">09 OPERATIONS (Field Logistics)</option>
                  <option value="SUPPORT">10 SUPPORT (Help Desk Cases)</option>
                  <option value="COMMUNICATIONS">11 COMMUNICATIONS (Broadcasts)</option>
                  {userClearance.hasAuditAccess && <option value="AUDIT">12 AUDIT (Tamper Logs)</option>}
                </select>
              </div>

              {/* Step 2: Format */}
              <div className="space-y-1">
                <label className="font-pixel text-[10px] text-[#f5a623] uppercase">02 // EXPORT FORMAT</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="fmt"
                      checked={builderFormat === "CSV"}
                      onChange={() => setBuilderFormat("CSV")}
                    />
                    <span>CSV (Comma Separated Values)</span>
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="fmt"
                      checked={builderFormat === "JSON"}
                      onChange={() => setBuilderFormat("JSON")}
                    />
                    <span>JSON (Structured Dataset)</span>
                  </label>
                </div>
              </div>

              {/* Step 3: Template Save Name */}
              <div className="space-y-1">
                <label className="font-pixel text-[10px] text-[#f5a623] uppercase">03 // SAVE AS NAMED TEMPLATE (OPTIONAL)</label>
                <input
                  type="text"
                  value={builderReportName}
                  onChange={(e) => setBuilderReportName(e.target.value)}
                  placeholder="e.g., Weekly Team Accommodation Manifest"
                  className="w-full bg-[#060608] border border-[#2d3748] p-2 text-white focus:border-[#ff5500]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#2d3748]">
                <button
                  onClick={() => setReportBuilderOpen(false)}
                  className="px-3 py-1.5 bg-[#060608] text-gray-400 font-pixel text-xs border border-[#2d3748]"
                >
                  CANCEL
                </button>
                <div className="flex gap-2">
                  {builderReportName.trim() && (
                    <button
                      onClick={handleSaveReportTemplate}
                      disabled={savingReport}
                      className="px-3 py-1.5 bg-[#1b0d2b] text-[#f5a623] border border-[#f5a623] font-pixel text-xs flex items-center gap-1"
                    >
                      <Bookmark className="w-3.5 h-3.5" /> SAVE CONFIG
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleExport(builderFormat);
                      setReportBuilderOpen(false);
                    }}
                    className="px-4 py-1.5 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-xs flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> EXPORT REPORT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SAVED REPORTS ── */}
      {savedReportsOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0b0c10] border-2 border-[#ff5500] p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-[0_0_30px_rgba(255,85,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-cyan-400" />
                <h3 className="font-pixel text-sm text-white uppercase">SAVED REPORT CONFIGURATIONS</h3>
              </div>
              <button onClick={() => setSavedReportsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {savedReports.length === 0 ? (
                <p className="text-gray-500 text-xs py-6 text-center">No saved report configurations available.</p>
              ) : (
                savedReports.map((sr) => (
                  <div
                    key={sr.id}
                    className="p-3 bg-[#060608] border border-[#2d3748] flex items-center justify-between hover:border-[#f5a623] transition-colors"
                  >
                    <div>
                      <p className="font-pixel text-xs text-white">{sr.name}</p>
                      <p className="text-[10px] text-[#f5a623]">
                        TYPE: {sr.reportType} • Owner: {sr.ownerEmail}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLoadSavedReport(sr)}
                      className="px-3 py-1 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-[10px]"
                    >
                      EXECUTE
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2d3748]">
              <button
                onClick={() => setSavedReportsOpen(false)}
                className="px-4 py-1.5 bg-[#060608] border border-[#2d3748] text-gray-300 font-pixel text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EXPORT DIALOG ── */}
      {exportDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0b0c10] border-2 border-[#ff5500] p-5 space-y-4 shadow-[0_0_30px_rgba(255,85,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="font-pixel text-sm text-white uppercase">EXPORT {currentCategory}</h3>
              </div>
              <button onClick={() => setExportDialogOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300">
                You are about to export the currently filtered dataset (<span className="text-[#ff5500] font-bold">{totalCount}</span> records) for{" "}
                <span className="text-white font-bold">{currentCategory}</span>.
              </p>

              {currentCategory === "TRANSPORT" && (
                <div className="p-2 bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 text-[11px]">
                  <strong>Championship Transit Charter:</strong> Transport is university-provided and complimentary. No payment records or fee fields exist in this report.
                </div>
              )}

              <div className="space-y-1">
                <label className="font-pixel text-[10px] text-[#f5a623]">SELECT FILE FORMAT:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="dlFormat"
                      checked={exportFormat === "CSV"}
                      onChange={() => setExportFormat("CSV")}
                    />
                    <span>CSV (.csv)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="dlFormat"
                      checked={exportFormat === "JSON"}
                      onChange={() => setExportFormat("JSON")}
                    />
                    <span>JSON (.json)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#2d3748]">
              <button
                onClick={() => setExportDialogOpen(false)}
                className="px-3 py-1.5 bg-[#060608] border border-[#2d3748] text-gray-400 font-pixel text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleExport(exportFormat)}
                disabled={exporting}
                className="px-4 py-1.5 bg-[#ff5500] hover:bg-[#d94e16] text-white font-pixel text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> {exporting ? "GENERATING..." : "DOWNLOAD"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ReportsPortalShell>
  );
}
