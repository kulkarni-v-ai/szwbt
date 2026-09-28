"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
  Banknote,
  RotateCcw,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  X,
  Eye,
  FileText,
  User,
  Users,
  ChevronRight,
  Check,
  AlertTriangle,
  Building,
  Calendar,
  Layers,
  ArrowDownCircle,
  Hash,
} from "lucide-react";

// Types
interface FinanceOverviewData {
  summary: {
    totalCollected: number;
    totalRefunded: number;
    netRevenue: number;
    totalPending: number;
    totalTransactions: number;
    completedPayments: number;
    partialPayments: number;
    pendingPayments: number;
    failedPayments: number;
  };
  byCategory: {
    REGISTRATION: { collected: number; count: number; totalDue: number; totalPaid: number; balance: number };
    ACCOMMODATION: { collected: number; count: number; totalDue: number; totalPaid: number; balance: number };
    MATCH: { collected: number; count: number; totalDue: number; totalPaid: number; balance: number };
  };
  byMethod: {
    CASH: { total: number; count: number };
    UPI: { total: number; count: number };
  };
  recentTransactions: TransactionItem[];
}

interface TransactionItem {
  id: string;
  category: "REGISTRATION" | "ACCOMMODATION" | "MATCH";
  entityType: "PARTICIPANT" | "TEAM" | "GENERAL";
  entityId: string | null;
  amount: number;
  method: "CASH" | "UPI";
  utr: string | null;
  internalTxnId: string;
  operatorEmail: string;
  receiptNumber: string | null;
  status: "SUCCESS" | "REFUNDED" | "PENDING";
  notes: string | null;
  createdAt: string;
}

interface PendingLedgerItem {
  id: string;
  category: "REGISTRATION" | "ACCOMMODATION" | "MATCH";
  entityType: "PARTICIPANT" | "TEAM";
  participantId: string | null;
  teamId: string | null;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: string;
  updatedAt: string;
  participant?: {
    id: string;
    name: string;
    playerId: string;
    institution: string;
    category?: string;
    team?: { id: string; name: string; teamCode: string } | null;
  } | null;
  team?: {
    id: string;
    name: string;
    teamCode: string;
    institution: string;
    state?: string;
  } | null;
}

interface ReportData {
  summary: {
    totalCollected: number;
    totalRefunded: number;
    netRevenue: number;
    totalDue: number;
    totalOutstandingBalance: number;
    collectionRatePercent: string;
  };
  methodBreakdown: {
    cash: { total: number; count: number };
    upi: { total: number; count: number };
  };
  categoryBreakdown: Record<string, { collected: number; count: number; due: number; balance: number; refunded: number }>;
  dailyTimeline: { date: string; registration: number; accommodation: number; match: number; total: number }[];
  institutionBreakdown: { institution: string; totalDue: number; totalPaid: number; balance: number; entries: number }[];
}

export default function FinanceAdminDashboard() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "finance_admin")!;
  const { user, hasPermission } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "TRANSACTIONS" | "REGISTRATION" | "ACCOMMODATION" | "MATCH" | "PENDING" | "HISTORY" | "REPORTS"
  >("OVERVIEW");

  // Telemetry States
  const [overview, setOverview] = useState<FinanceOverviewData | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [pendingLedgers, setPendingLedgers] = useState<PendingLedgerItem[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [txSearch, setTxSearch] = useState("");
  const [txMethodFilter, setTxMethodFilter] = useState("ALL");
  const [txStatusFilter, setTxStatusFilter] = useState("ALL");
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState("ALL");
  const [pendingSearch, setPendingSearch] = useState("");

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [txDetailData, setTxDetailData] = useState<any>(null);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  // Global Quick Search Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ transactions: any[]; participants: any[]; teams: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Record Payment Form State
  const [recordCategory, setRecordCategory] = useState<"REGISTRATION" | "ACCOMMODATION" | "MATCH">("REGISTRATION");
  const [recordEntityType, setRecordEntityType] = useState<"PARTICIPANT" | "TEAM" | "GENERAL">("PARTICIPANT");
  const [recordEntityId, setRecordEntityId] = useState("");
  const [recordAmount, setRecordAmount] = useState("2500");
  const [recordMethod, setRecordMethod] = useState<"UPI" | "CASH">("UPI");
  const [recordUtr, setRecordUtr] = useState("");
  const [recordReceipt, setRecordReceipt] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);

  // Auto-fill standard amounts based on category
  const setQuickCategory = (cat: "REGISTRATION" | "ACCOMMODATION" | "MATCH") => {
    setRecordCategory(cat);
    if (cat === "REGISTRATION") {
      setRecordAmount("2500");
      setRecordEntityType("PARTICIPANT");
    } else if (cat === "ACCOMMODATION") {
      setRecordAmount("3000");
      setRecordEntityType("PARTICIPANT");
    } else if (cat === "MATCH") {
      setRecordAmount("1500");
      setRecordEntityType("TEAM");
    }
  };

  // ── Fetch Overview & KPIs ──────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/finance/overview");
      if (!res.ok) {
        throw new Error(`Overview fetch failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setOverview(data.data);
      }
    } catch (err: any) {
      console.error("fetchOverview error:", err);
      setErrorMsg(err.message || "Failed to load financial telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Transactions ─────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/transactions?limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTransactions(data.data.transactions);
        }
      }
    } catch (err) {
      console.error("fetchTransactions error:", err);
    }
  }, []);

  // ── Fetch Pending Ledgers ──────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/pending?limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPendingLedgers(data.data.ledgers);
        }
      }
    } catch (err) {
      console.error("fetchPending error:", err);
    }
  }, []);

  // ── Fetch Reports ──────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/reports");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReportData(data.data);
        }
      }
    } catch (err) {
      console.error("fetchReports error:", err);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchTransactions();
    fetchPending();
    fetchReports();
  }, [fetchOverview, fetchTransactions, fetchPending, fetchReports]);

  // ── Handle Global Search ───────────────────────────────────────────
  useEffect(() => {
    if (!globalQuery || globalQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/finance/search?q=${encodeURIComponent(globalQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.data);
          }
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalQuery]);

  // ── View Transaction Detail ────────────────────────────────────────
  const openTransactionDetail = async (tx: TransactionItem) => {
    setSelectedTx(tx);
    setShowDetailModal(true);
    setTxDetailData(null);
    setShowRefundConfirm(false);
    setRefundReason("");
    try {
      const res = await fetch(`/api/finance/payments/${tx.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTxDetailData(data.data);
        }
      }
    } catch (err) {
      console.error("Detail error:", err);
    }
  };

  // ── Process Refund ─────────────────────────────────────────────────
  const handleProcessRefund = async () => {
    if (!selectedTx || !refundReason.trim()) return;
    setRefundLoading(true);
    try {
      const res = await fetch(`/api/finance/payments/${selectedTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFUND",
          reason: refundReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Refund processing failed.");
      }

      // Success
      setShowRefundConfirm(false);
      setShowDetailModal(false);
      fetchOverview();
      fetchTransactions();
      fetchPending();
      fetchReports();
    } catch (err: any) {
      alert(`Refund Error: ${err.message}`);
    } finally {
      setRefundLoading(false);
    }
  };

  // ── Record Payment Submit ──────────────────────────────────────────
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordSubmitting(true);
    setRecordError(null);
    setRecordSuccess(null);

    const amt = parseFloat(recordAmount);
    if (isNaN(amt) || amt <= 0) {
      setRecordError("Please enter a valid payment amount (> 0).");
      setRecordSubmitting(false);
      return;
    }

    if (recordMethod === "UPI" && !recordUtr.trim()) {
      setRecordError("UTR / Reference number is mandatory for UPI payments.");
      setRecordSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: recordCategory,
          entityType: recordEntityType,
          entityId: recordEntityId.trim() || null,
          amount: amt,
          method: recordMethod,
          utr: recordMethod === "UPI" ? recordUtr.trim() : null,
          receiptNumber: recordReceipt.trim() || undefined,
          notes: recordNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment recording failed.");
      }

      setRecordSuccess(
        `✓ Payment of ₹ ${amt.toLocaleString()} recorded successfully! Txn ID: ${data.data.transaction.internalTxnId}`
      );
      // Reset form
      setRecordUtr("");
      setRecordReceipt("");
      setRecordNotes("");

      // Refresh data
      fetchOverview();
      fetchTransactions();
      fetchPending();
      fetchReports();

      setTimeout(() => {
        setShowRecordModal(false);
        setRecordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setRecordError(err.message || "Failed to record payment.");
    } finally {
      setRecordSubmitting(false);
    }
  };

  // ── Quick Pay for Pending Ledger ───────────────────────────────────
  const openQuickPay = (ledger: PendingLedgerItem) => {
    setRecordCategory(ledger.category);
    setRecordEntityType(ledger.entityType);
    setRecordEntityId(ledger.participantId || ledger.teamId || "");
    setRecordAmount(String(ledger.balance));
    setRecordMethod("UPI");
    setRecordUtr("");
    setRecordReceipt("");
    setRecordNotes(`Settlement of outstanding ${ledger.category} balance for ${ledger.participant?.name || ledger.team?.name || "entity"}`);
    setRecordError(null);
    setRecordSuccess(null);
    setShowRecordModal(true);
  };

  // ── Export CSV Handler ─────────────────────────────────────────────
  const handleExportCSV = (cat?: string) => {
    const url = cat ? `/api/finance/reports?format=csv&category=${cat}` : "/api/finance/reports?format=csv";
    window.open(url, "_blank");
  };

  // ── Filtered Transactions List ─────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Category filter based on active tab
      if (activeTab === "REGISTRATION" && t.category !== "REGISTRATION") return false;
      if (activeTab === "ACCOMMODATION" && t.category !== "ACCOMMODATION") return false;
      if (activeTab === "MATCH" && t.category !== "MATCH") return false;

      // Method filter
      if (txMethodFilter !== "ALL" && t.method !== txMethodFilter) return false;

      // Status filter
      if (txStatusFilter !== "ALL" && t.status !== txStatusFilter) return false;

      // Search
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        return (
          t.internalTxnId.toLowerCase().includes(q) ||
          (t.utr && t.utr.toLowerCase().includes(q)) ||
          (t.receiptNumber && t.receiptNumber.toLowerCase().includes(q)) ||
          (t.entityId && t.entityId.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.operatorEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, activeTab, txMethodFilter, txStatusFilter, txSearch]);

  // ── Filtered Pending Ledgers ───────────────────────────────────────
  const filteredPending = useMemo(() => {
    return pendingLedgers.filter((l) => {
      if (pendingCategoryFilter !== "ALL" && l.category !== pendingCategoryFilter) return false;
      if (pendingSearch.trim()) {
        const q = pendingSearch.toLowerCase();
        const pName = l.participant?.name?.toLowerCase() || "";
        const pId = l.participant?.playerId?.toLowerCase() || "";
        const pInst = l.participant?.institution?.toLowerCase() || "";
        const tName = l.team?.name?.toLowerCase() || "";
        const tCode = l.team?.teamCode?.toLowerCase() || "";
        const tInst = l.team?.institution?.toLowerCase() || "";
        return (
          pName.includes(q) ||
          pId.includes(q) ||
          pInst.includes(q) ||
          tName.includes(q) ||
          tCode.includes(q) ||
          tInst.includes(q)
        );
      }
      return true;
    });
  }, [pendingLedgers, pendingCategoryFilter, pendingSearch]);

  // Derived Category Ledgers from real overview data
  const regCat = overview?.byCategory?.REGISTRATION || { collected: 0, count: 0, totalDue: 0, totalPaid: 0, balance: 0 };
  const accomCat = overview?.byCategory?.ACCOMMODATION || { collected: 0, count: 0, totalDue: 0, totalPaid: 0, balance: 0 };
  const matchCat = overview?.byCategory?.MATCH || { collected: 0, count: 0, totalDue: 0, totalPaid: 0, balance: 0 };
  const cashStats = overview?.byMethod?.CASH || { total: 0, count: 0 };
  const upiStats = overview?.byMethod?.UPI || { total: 0, count: 0 };

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 pb-16">
        {/* ═══ AUDIT BANNER & SYSTEM DOMAIN DIRECTIVE ═══ */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 text-[#FF5A16]">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="font-pixel text-[11px] text-[#FF5A16] font-bold tracking-wider uppercase flex items-center gap-2">
                <span>TREASURY & FINANCE CONTROL DESK</span>
                <span className="text-[9px] px-2 py-0.5 bg-orange-50 text-[#FF5A16] border border-orange-200 rounded-md font-bold">
                  SOUTH ZONE 2026
                </span>
              </div>
              <p className="font-mono text-xs text-slate-500 mt-0.5">
                3 Independent Tournament Ledgers: <span className="text-slate-900 font-semibold">REGISTRATION</span> (₹2,500) •{" "}
                <span className="text-slate-900 font-semibold">ACCOMMODATION</span> (₹3,000) •{" "}
                <span className="text-slate-900 font-semibold">MATCH</span> (₹1,500) |{" "}
                <span className="text-emerald-700 font-bold">TRANSPORT IS 100% UNIVERSITY-PROVIDED (ZERO FEES)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                fetchOverview();
                fetchTransactions();
                fetchPending();
                fetchReports();
              }}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FF5A16] ${loading ? "animate-spin" : ""}`} />
              <span>SYNC LEDGER</span>
            </button>
            <button
              onClick={() => handleExportCSV()}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>

        {/* ═══ PRIMARY ACTION BAR ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-pixel text-[9px] uppercase tracking-wider text-slate-500 group-hover:text-slate-800 font-bold">
                QUICK LOOKUP
              </span>
              <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </div>
            <div className="font-pixel text-xs text-slate-900 group-hover:text-[#FF5A16] font-bold">
              [ FIND TRANSACTION ]
            </div>
          </button>

          <button
            onClick={() => {
              setQuickCategory("REGISTRATION");
              setShowRecordModal(true);
            }}
            className="p-3.5 bg-white hover:bg-orange-50/20 border-2 border-[#FF5A16]/50 hover:border-[#FF5A16] rounded-xl text-left transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-[#FF5A16] mb-1">
              <span className="font-pixel text-[9px] uppercase tracking-wider text-slate-500 group-hover:text-[#FF5A16] font-bold">
                RECORD INFLOW
              </span>
              <Plus className="w-4 h-4 text-[#FF5A16]" />
            </div>
            <div className="font-pixel text-xs text-slate-900 group-hover:text-[#FF5A16] font-bold">
              [ RECORD PAYMENT ]
            </div>
          </button>

          <button
            onClick={() => setActiveTab("PENDING")}
            className="p-3.5 bg-white hover:bg-amber-50/20 border-2 border-slate-200 hover:border-amber-400 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="font-pixel text-[9px] uppercase tracking-wider text-slate-500 group-hover:text-amber-700 font-bold">
                OUTSTANDING DUES
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-pixel text-xs text-slate-900 group-hover:text-amber-700 font-bold">
              [ VIEW PENDING ]
            </div>
          </button>

          <button
            onClick={() => setActiveTab("REPORTS")}
            className="p-3.5 bg-white hover:bg-emerald-50/20 border-2 border-slate-200 hover:border-emerald-400 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="font-pixel text-[9px] uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 font-bold">
                AUDIT TELEMETRY
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="font-pixel text-xs text-slate-900 group-hover:text-emerald-700 font-bold">
              [ REPORTS & ANALYTICS ]
            </div>
          </button>
        </div>

        {/* ═══ 4 SEPARATE CATEGORY LEDGER CARDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. REGISTRATION LEDGER */}
          <div className="p-4 bg-white border-2 border-slate-200 hover:border-sky-500 rounded-2xl shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="font-pixel text-xs text-sky-700 font-bold">01. REGISTRATION</span>
              <span className="font-pixel text-[8px] px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded font-bold">DESK 02</span>
            </div>
            <div className="space-y-1.5 font-pixel text-[10px]">
              <div className="flex justify-between text-slate-500">
                <span>TOTAL DUE:</span>
                <span className="text-slate-800 font-bold">₹ {regCat.totalDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>COLLECTED:</span>
                <span className="text-emerald-600 font-bold">₹ {regCat.collected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-xs font-bold">
                <span className="text-slate-700">BALANCE:</span>
                <span className={regCat.balance <= 0 ? "text-emerald-600" : "text-[#FF5A16]"}>
                  ₹ {regCat.balance.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 text-[9px] text-slate-400 flex justify-between items-center border-t border-slate-100">
                <span>TXNS: {regCat.count}</span>
                <button
                  onClick={() => {
                    setQuickCategory("REGISTRATION");
                    setShowRecordModal(true);
                  }}
                  className="text-sky-600 hover:underline cursor-pointer font-bold"
                >
                  + Record Entry
                </button>
              </div>
            </div>
          </div>

          {/* 2. ACCOMMODATION LEDGER */}
          <div className="p-4 bg-white border-2 border-orange-200 hover:border-[#FF5A16] rounded-2xl shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="font-pixel text-xs text-[#FF5A16] font-bold">02. ACCOMMODATION</span>
              <span className="font-pixel text-[8px] px-2 py-0.5 bg-orange-50 text-[#FF5A16] border border-orange-200 rounded font-bold">HOSTEL OPS</span>
            </div>
            <div className="space-y-1.5 font-pixel text-[10px]">
              <div className="flex justify-between text-slate-500">
                <span>TOTAL DUE:</span>
                <span className="text-slate-800 font-bold">₹ {accomCat.totalDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>COLLECTED:</span>
                <span className="text-emerald-600 font-bold">₹ {accomCat.collected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-xs font-bold">
                <span className="text-slate-700">BALANCE:</span>
                <span className={accomCat.balance <= 0 ? "text-emerald-600" : "text-[#FF5A16]"}>
                  ₹ {accomCat.balance.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 text-[9px] text-slate-400 flex justify-between items-center border-t border-slate-100">
                <span>TXNS: {accomCat.count}</span>
                <button
                  onClick={() => {
                    setQuickCategory("ACCOMMODATION");
                    setShowRecordModal(true);
                  }}
                  className="text-[#FF5A16] hover:underline cursor-pointer font-bold"
                >
                  + Record Entry
                </button>
              </div>
            </div>
          </div>

          {/* 3. MATCH & PROTEST LEDGER */}
          <div className="p-4 bg-white border-2 border-slate-200 hover:border-purple-500 rounded-2xl shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="font-pixel text-xs text-purple-700 font-bold">03. MATCH & APPEAL</span>
              <span className="font-pixel text-[8px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold">DESK 04</span>
            </div>
            <div className="space-y-1.5 font-pixel text-[10px]">
              <div className="flex justify-between text-slate-500">
                <span>TOTAL DUE:</span>
                <span className="text-slate-800 font-bold">₹ {matchCat.totalDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>COLLECTED:</span>
                <span className="text-emerald-600 font-bold">₹ {matchCat.collected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-xs font-bold">
                <span className="text-slate-700">BALANCE:</span>
                <span className={matchCat.balance <= 0 ? "text-emerald-600" : "text-[#FF5A16]"}>
                  ₹ {matchCat.balance.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 text-[9px] text-slate-400 flex justify-between items-center border-t border-slate-100">
                <span>TXNS: {matchCat.count}</span>
                <button
                  onClick={() => {
                    setQuickCategory("MATCH");
                    setShowRecordModal(true);
                  }}
                  className="text-purple-600 hover:underline cursor-pointer font-bold"
                >
                  + Record Entry
                </button>
              </div>
            </div>
          </div>

          {/* 4. PAYMENT METHOD SPLIT (CASH vs UPI) */}
          <div className="p-4 bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="font-pixel text-xs text-emerald-700 font-bold">04. METHOD SPLIT</span>
              <span className="font-pixel text-[8px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">LIVE COUNTER</span>
            </div>
            <div className="space-y-1.5 font-pixel text-[10px]">
              <div className="flex justify-between text-slate-500">
                <span>CASH ({cashStats.count} TXNS):</span>
                <span className="text-amber-700 font-bold">₹ {cashStats.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>UPI ({upiStats.count} TXNS):</span>
                <span className="text-sky-700 font-bold">₹ {upiStats.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-xs font-bold">
                <span className="text-slate-700">TOTAL RECEIVED:</span>
                <span className="text-emerald-700 font-bold">
                  ₹ {((overview?.summary?.totalCollected || 0)).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 text-[9px] text-slate-400 flex justify-between items-center border-t border-slate-100">
                <span>NET REVENUE:</span>
                <span className="text-slate-900 font-bold">
                  ₹ {((overview?.summary?.netRevenue || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ NAVIGATION TABS ═══ */}
        <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto pb-0">
          {(
            [
              { id: "OVERVIEW", label: "OVERVIEW", count: null },
              { id: "TRANSACTIONS", label: "TRANSACTIONS", count: transactions.length },
              { id: "REGISTRATION", label: "REGISTRATION", count: regCat.count },
              { id: "ACCOMMODATION", label: "ACCOMMODATION", count: accomCat.count },
              { id: "MATCH", label: "MATCH FEES", count: matchCat.count },
              { id: "PENDING", label: "PENDING DUES", count: pendingLedgers.length },
              { id: "HISTORY", label: "PAYMENT HISTORY", count: null },
              { id: "REPORTS", label: "REPORTS", count: null },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 font-pixel text-xs tracking-wider uppercase transition-all whitespace-nowrap border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "border-[#FF5A16] text-[#FF5A16] bg-orange-50/50 font-bold rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      isActive ? "bg-[#FF5A16] text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB 1: OVERVIEW ═══ */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="font-pixel text-[9px] text-slate-500 uppercase font-bold">TOTAL INFLOW</span>
                <div className="font-pixel text-xl text-emerald-600 mt-1 font-bold">
                  ₹ {(overview?.summary?.totalCollected || 0).toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">
                  Completed Payments: {overview?.summary?.completedPayments || 0}
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="font-pixel text-[9px] text-slate-500 uppercase font-bold">OUTSTANDING BALANCE</span>
                <div className="font-pixel text-xl text-[#FF5A16] mt-1 font-bold">
                  ₹ {(overview?.summary?.totalPending || 0).toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">
                  Pending Entities: {pendingLedgers.length}
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="font-pixel text-[9px] text-slate-500 uppercase font-bold">REFUNDED TOTAL</span>
                <div className="font-pixel text-xl text-amber-600 mt-1 font-bold">
                  ₹ {(overview?.summary?.totalRefunded || 0).toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">
                  Net: ₹ {(overview?.summary?.netRevenue || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="font-pixel text-[9px] text-slate-500 uppercase font-bold">TOTAL TRANSACTIONS</span>
                <div className="font-pixel text-xl text-slate-900 mt-1 font-bold">
                  {overview?.summary?.totalTransactions || 0}
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">
                  Cash: {cashStats.count} | UPI: {upiStats.count}
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Transactions Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Recent Transactions */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF5A16]" />
                    <span className="font-pixel text-xs text-slate-900 font-bold">RECENT FINANCIAL TRANSACTIONS</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("TRANSACTIONS")}
                    className="font-pixel text-[10px] text-[#FF5A16] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span>VIEW ALL</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-pixel text-[9px] uppercase">
                        <th className="pb-2.5">TXN REF</th>
                        <th className="pb-2.5">CATEGORY</th>
                        <th className="pb-2.5">METHOD</th>
                        <th className="pb-2.5">AMOUNT</th>
                        <th className="pb-2.5">STATUS</th>
                        <th className="pb-2.5 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.slice(0, 7).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-bold text-slate-900">
                            <div>{t.internalTxnId}</div>
                            <div className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[9px] font-pixel px-2 py-0.5 rounded border font-bold ${
                                t.category === "REGISTRATION"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : t.category === "ACCOMMODATION"
                                  ? "bg-orange-50 text-[#FF5A16] border-orange-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {t.category}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[9px] font-pixel px-2 py-0.5 rounded border font-bold ${
                                t.method === "UPI"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {t.method}
                            </span>
                            {t.utr && <div className="text-[10px] text-slate-500 truncate max-w-[100px]">{t.utr}</div>}
                          </td>
                          <td className="py-3 font-bold text-emerald-600">
                            ₹ {t.amount.toLocaleString()}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[9px] font-pixel px-2 py-0.5 rounded border font-bold ${
                                t.status === "SUCCESS"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : t.status === "REFUNDED"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => openTransactionDetail(t)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-pixel text-[9px] uppercase border border-slate-200 rounded-md transition-all cursor-pointer shadow-xs"
                            >
                              DETAIL
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-mono text-xs">
                            No transactions recorded yet. Click [ RECORD PAYMENT ] to initiate ledger entry.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Col: Category Breakdowns & Direct Actions */}
              <div className="space-y-4">
                {/* Ledger Invariant Card */}
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center gap-2 font-pixel text-xs text-emerald-700 font-bold mb-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    <span>UNIVERSITY INVARIANT VERIFIED</span>
                  </div>
                  <p className="font-mono text-xs text-slate-500 leading-relaxed">
                    Tournament transport shuttles are completely university-provided. Zero transport billing or fee ledgers are permitted in this console.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-700">Active Transport Fees:</span>
                    <span className="text-emerald-700 font-bold">₹ 0.00 (NONE)</span>
                  </div>
                </div>

                {/* Desk Operator Info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="font-pixel text-xs text-slate-900 font-bold mb-3 flex items-center justify-between">
                    <span>OPERATOR CONTEXT</span>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">AUTHORIZED</span>
                  </div>
                  <div className="space-y-2 font-mono text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Operator:</span>
                      <span className="text-slate-900 font-bold">{user?.name || "Finance Controller"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="text-slate-900">{user?.email || "finance@szwbt2026.edu"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Role Clearance:</span>
                      <span className="text-[#FF5A16] font-bold">FINANCE_STAFF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Refund Clearance:</span>
                      <span className="text-emerald-700 font-bold">
                        {hasPermission("FINANCE_REFUND") ? "ACTIVE" : "RESTRICTED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Payment Short-cuts */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="font-pixel text-xs text-slate-900 font-bold mb-3">RECORD PAYMENT SHORTCUTS</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setQuickCategory("REGISTRATION");
                        setShowRecordModal(true);
                      }}
                      className="w-full py-2.5 px-3 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-sky-700 font-pixel text-[10px] rounded-xl text-left flex items-center justify-between transition-all cursor-pointer font-bold shadow-xs"
                    >
                      <span>REGISTRATION (₹ 2,500)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setQuickCategory("ACCOMMODATION");
                        setShowRecordModal(true);
                      }}
                      className="w-full py-2.5 px-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-[#FF5A16] font-pixel text-[10px] rounded-xl text-left flex items-center justify-between transition-all cursor-pointer font-bold shadow-xs"
                    >
                      <span>ACCOMMODATION (₹ 3,000)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setQuickCategory("MATCH");
                        setShowRecordModal(true);
                      }}
                      className="w-full py-2.5 px-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-purple-700 font-pixel text-[10px] rounded-xl text-left flex items-center justify-between transition-all cursor-pointer font-bold shadow-xs"
                    >
                      <span>MATCH / PROTEST (₹ 1,500)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 2, 3, 4, 5: TRANSACTIONS & CATEGORY LEDGERS ═══ */}
        {(activeTab === "TRANSACTIONS" ||
          activeTab === "REGISTRATION" ||
          activeTab === "ACCOMMODATION" ||
          activeTab === "MATCH" ||
          activeTab === "HISTORY") && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-[#07101D] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#91A0AE]" />
                  <input
                    type="text"
                    placeholder="Search by Txn ID, UTR, Receipt, Notes, Operator..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0D1929] border border-white/10 focus:border-[#18D8D0] font-mono text-xs text-white placeholder-[#91A0AE] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">METHOD:</span>
                  <select
                    value={txMethodFilter}
                    onChange={(e) => setTxMethodFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#0D1929] border border-white/10 font-mono text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL METHODS</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">STATUS:</span>
                  <select
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#0D1929] border border-white/10 font-mono text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="REFUNDED">REFUNDED</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleExportCSV(
                      activeTab === "REGISTRATION"
                        ? "REGISTRATION"
                        : activeTab === "ACCOMMODATION"
                        ? "ACCOMMODATION"
                        : activeTab === "MATCH"
                        ? "MATCH"
                        : undefined
                    )
                  }
                  className="px-3 py-1.5 bg-[#0D1929] hover:bg-[#16273D] border border-emerald-500/40 text-emerald-400 font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT FILTERED CSV</span>
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#07101D] border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-[#0A1324] border-b border-white/10 text-[#91A0AE] font-pixel text-[9px] uppercase">
                      <th className="p-3">TRANSACTION ID</th>
                      <th className="p-3">DATE & TIME</th>
                      <th className="p-3">CATEGORY</th>
                      <th className="p-3">ENTITY</th>
                      <th className="p-3">METHOD & UTR</th>
                      <th className="p-3">AMOUNT</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">OPERATOR</th>
                      <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white">
                          <div>{tx.internalTxnId}</div>
                          {tx.receiptNumber && (
                            <div className="text-[10px] text-[#91A0AE]">RCP: {tx.receiptNumber}</div>
                          )}
                        </td>
                        <td className="p-3 text-[#91A0AE]">
                          <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px]">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] font-pixel px-1.5 py-0.5 rounded ${
                              tx.category === "REGISTRATION"
                                ? "bg-[#18D8D0]/10 text-[#18D8D0] border border-[#18D8D0]/30"
                                : tx.category === "ACCOMMODATION"
                                ? "bg-[#FF5A16]/10 text-[#FF5A16] border border-[#FF5A16]/30"
                                : "bg-purple-900/30 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {tx.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{tx.entityType}</div>
                          <div className="text-[10px] text-[#91A0AE] truncate max-w-[120px]">
                            {tx.entityId || "N/A"}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] font-pixel px-1.5 py-0.5 rounded ${
                              tx.method === "UPI" ? "bg-cyan-950 text-cyan-300" : "bg-amber-950 text-amber-300"
                            }`}
                          >
                            {tx.method}
                          </span>
                          {tx.utr && (
                            <div className="text-[10px] text-white font-mono mt-0.5">{tx.utr}</div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-emerald-400">
                          ₹ {tx.amount.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] font-pixel px-1.5 py-0.5 rounded ${
                              tx.status === "SUCCESS"
                                ? "bg-emerald-950 text-emerald-300"
                                : tx.status === "REFUNDED"
                                ? "bg-amber-950 text-amber-400"
                                : "bg-rose-950 text-rose-300"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-[#91A0AE] truncate max-w-[140px]">
                          {tx.operatorEmail}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openTransactionDetail(tx)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white font-pixel text-[9px] uppercase border border-white/20 transition-all cursor-pointer"
                          >
                            VIEW
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[#91A0AE] font-mono text-xs">
                          No transactions matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 6: PENDING BALANCES ═══ */}
        {activeTab === "PENDING" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-[#07101D] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#91A0AE]" />
                  <input
                    type="text"
                    placeholder="Search by participant name, player ID, team, institution..."
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#0D1929] border border-white/10 focus:border-amber-400 font-mono text-xs text-white placeholder-[#91A0AE] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">CATEGORY:</span>
                  <select
                    value={pendingCategoryFilter}
                    onChange={(e) => setPendingCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#0D1929] border border-white/10 font-mono text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL CATEGORIES</option>
                    <option value="REGISTRATION">REGISTRATION</option>
                    <option value="ACCOMMODATION">ACCOMMODATION</option>
                    <option value="MATCH">MATCH</option>
                  </select>
                </div>
              </div>

              <div className="font-pixel text-xs text-amber-400">
                PENDING TOTAL: ₹ {(overview?.summary?.totalPending || 0).toLocaleString()}
              </div>
            </div>

            {/* Pending Ledgers Table */}
            <div className="bg-[#07101D] border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-[#0A1324] border-b border-white/10 text-[#91A0AE] font-pixel text-[9px] uppercase">
                      <th className="p-3">ENTITY NAME</th>
                      <th className="p-3">IDENTIFIER</th>
                      <th className="p-3">INSTITUTION</th>
                      <th className="p-3">CATEGORY</th>
                      <th className="p-3">AMOUNT DUE</th>
                      <th className="p-3">PAID SO FAR</th>
                      <th className="p-3">BALANCE OWED</th>
                      <th className="p-3 text-right">QUICK ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPending.map((ledger) => {
                      const entityName = ledger.participant?.name || ledger.team?.name || "General Entity";
                      const identifier = ledger.participant?.playerId || ledger.team?.teamCode || ledger.id;
                      const institution = ledger.participant?.institution || ledger.team?.institution || "N/A";

                      return (
                        <tr key={ledger.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              {ledger.entityType === "PARTICIPANT" ? (
                                <User className="w-3.5 h-3.5 text-[#18D8D0]" />
                              ) : (
                                <Users className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span>{entityName}</span>
                            </div>
                          </td>
                          <td className="p-3 text-[#18D8D0] font-bold">{identifier}</td>
                          <td className="p-3 text-[#91A0AE] truncate max-w-[200px]">{institution}</td>
                          <td className="p-3">
                            <span
                              className={`text-[9px] font-pixel px-1.5 py-0.5 rounded ${
                                ledger.category === "REGISTRATION"
                                  ? "bg-[#18D8D0]/10 text-[#18D8D0] border border-[#18D8D0]/30"
                                  : ledger.category === "ACCOMMODATION"
                                  ? "bg-[#FF5A16]/10 text-[#FF5A16] border border-[#FF5A16]/30"
                                  : "bg-purple-900/30 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {ledger.category}
                            </span>
                          </td>
                          <td className="p-3 text-white">₹ {ledger.amountDue.toLocaleString()}</td>
                          <td className="p-3 text-emerald-400">₹ {ledger.amountPaid.toLocaleString()}</td>
                          <td className="p-3 font-bold text-[#FF5A16]">₹ {ledger.balance.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => openQuickPay(ledger)}
                              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-pixel text-[9px] uppercase border border-amber-500/50 transition-all cursor-pointer"
                            >
                              [ COLLECT ₹ {ledger.balance} ]
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPending.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[#91A0AE] font-mono text-xs">
                          No pending fee ledgers found. All entities are settled!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 8: REPORTS & ANALYTICS ═══ */}
        {activeTab === "REPORTS" && reportData && (
          <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">TOTAL REVENUE (COLLECTED)</span>
                <div className="font-pixel text-xl text-emerald-400 mt-1 font-bold">
                  ₹ {reportData.summary.totalCollected.toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-[#91A0AE] mt-1">
                  Collection Rate: {reportData.summary.collectionRatePercent}%
                </div>
              </div>

              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">OUTSTANDING BALANCE</span>
                <div className="font-pixel text-xl text-[#FF5A16] mt-1 font-bold">
                  ₹ {reportData.summary.totalOutstandingBalance.toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-[#91A0AE] mt-1">
                  Total Due: ₹ {reportData.summary.totalDue.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">PAYMENT METHODS</span>
                <div className="font-mono text-xs text-white mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-amber-400 font-bold">Cash:</span>
                    <span>₹ {reportData.methodBreakdown.cash.total.toLocaleString()} ({reportData.methodBreakdown.cash.count})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#18D8D0] font-bold">UPI:</span>
                    <span>₹ {reportData.methodBreakdown.upi.total.toLocaleString()} ({reportData.methodBreakdown.upi.count})</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#07101D] border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">CSV DATA VAULT</span>
                  <p className="font-mono text-[10px] text-[#91A0AE] mt-1">
                    Download full audit report formatted according to RFC 4180
                  </p>
                </div>
                <button
                  onClick={() => handleExportCSV()}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500 text-emerald-300 font-pixel text-[10px] uppercase flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT FULL CSV</span>
                </button>
              </div>
            </div>

            {/* Daily Collections Timeline */}
            <div className="bg-[#07101D] border border-white/10 p-4">
              <div className="font-pixel text-xs text-white font-bold mb-3 flex items-center justify-between">
                <span>DAILY COLLECTION TIMELINE</span>
                <span className="text-[9px] text-[#91A0AE]">DATE-WISE RECONCILIATION</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[#91A0AE] font-pixel text-[9px] uppercase">
                      <th className="pb-2">DATE</th>
                      <th className="pb-2">REGISTRATION</th>
                      <th className="pb-2">ACCOMMODATION</th>
                      <th className="pb-2">MATCH FEES</th>
                      <th className="pb-2 text-right">TOTAL INFLOW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.dailyTimeline.map((day) => (
                      <tr key={day.date} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 font-bold text-white">{day.date}</td>
                        <td className="py-2 text-[#18D8D0]">₹ {day.registration.toLocaleString()}</td>
                        <td className="py-2 text-[#FF5A16]">₹ {day.accommodation.toLocaleString()}</td>
                        <td className="py-2 text-purple-400">₹ {day.match.toLocaleString()}</td>
                        <td className="py-2 text-right font-bold text-emerald-400">
                          ₹ {day.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {reportData.dailyTimeline.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#91A0AE]">
                          No timeline telemetry recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Institution Breakdown Table */}
            <div className="bg-[#07101D] border border-white/10 p-4">
              <div className="font-pixel text-xs text-white font-bold mb-3 flex items-center justify-between">
                <span>INSTITUTION BALANCES & SETTLEMENT</span>
                <span className="text-[9px] text-[#91A0AE]">RANKED BY OUTSTANDING BALANCE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[#91A0AE] font-pixel text-[9px] uppercase">
                      <th className="pb-2">INSTITUTION</th>
                      <th className="pb-2">LEDGER ENTRIES</th>
                      <th className="pb-2">TOTAL DUE</th>
                      <th className="pb-2">TOTAL PAID</th>
                      <th className="pb-2 text-right">BALANCE OWED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.institutionBreakdown.slice(0, 15).map((inst) => (
                      <tr key={inst.institution} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 font-bold text-white">{inst.institution}</td>
                        <td className="py-2 text-[#91A0AE]">{inst.entries}</td>
                        <td className="py-2 text-white">₹ {inst.totalDue.toLocaleString()}</td>
                        <td className="py-2 text-emerald-400">₹ {inst.totalPaid.toLocaleString()}</td>
                        <td className="py-2 text-right font-bold">
                          <span className={inst.balance > 0 ? "text-[#FF5A16]" : "text-emerald-400"}>
                            ₹ {inst.balance.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODAL: RECORD PAYMENT ═══ */}
        {showRecordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#07101D] border-2 border-[#18D8D0] shadow-[0_0_30px_rgba(24,216,208,0.2)] w-full max-w-lg p-6 relative">
              <button
                onClick={() => setShowRecordModal(false)}
                className="absolute top-4 right-4 text-[#91A0AE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-[#18D8D0]" />
                <h3 className="font-pixel text-sm text-white font-bold uppercase">
                  RECORD PAYMENT TRANSACTION
                </h3>
              </div>

              {recordError && (
                <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500 text-rose-300 font-mono text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recordError}</span>
                </div>
              )}

              {recordSuccess && (
                <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-mono text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{recordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-4 font-mono text-xs">
                {/* Category Selection (STRICTLY REGISTRATION, ACCOMMODATION, MATCH) */}
                <div>
                  <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                    01. PAYMENT CATEGORY (ZERO TRANSPORT)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["REGISTRATION", "ACCOMMODATION", "MATCH"] as const).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setQuickCategory(cat)}
                        className={`py-2 px-2 font-pixel text-[9px] uppercase border transition-all cursor-pointer ${
                          recordCategory === cat
                            ? "bg-[#18D8D0]/20 border-[#18D8D0] text-[#18D8D0] font-bold"
                            : "bg-[#0D1929] border-white/10 text-[#91A0AE] hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entity Type & Entity ID */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                      ENTITY TYPE
                    </label>
                    <select
                      value={recordEntityType}
                      onChange={(e: any) => setRecordEntityType(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 text-white outline-none cursor-pointer"
                    >
                      <option value="PARTICIPANT">PARTICIPANT</option>
                      <option value="TEAM">TEAM</option>
                      <option value="GENERAL">GENERAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                      ENTITY ID / CODE (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. part_xyz or team_abc"
                      value={recordEntityId}
                      onChange={(e) => setRecordEntityId(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 focus:border-[#18D8D0] text-white outline-none"
                    />
                  </div>
                </div>

                {/* Amount & Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                      AMOUNT (INR)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={recordAmount}
                      onChange={(e) => setRecordAmount(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 focus:border-[#18D8D0] text-white font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                      PAYMENT METHOD
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["UPI", "CASH"] as const).map((m) => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setRecordMethod(m)}
                          className={`py-2 px-2 font-pixel text-[9px] uppercase border transition-all cursor-pointer ${
                            recordMethod === m
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 font-bold"
                              : "bg-[#0D1929] border-white/10 text-[#91A0AE] hover:text-white"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* UTR / Reference (Mandatory for UPI, Disabled/Optional for CASH) */}
                <div>
                  <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1 flex items-center justify-between">
                    <span>UTR / TRANSACTION REFERENCE</span>
                    {recordMethod === "UPI" ? (
                      <span className="text-[#FF5A16] font-bold">MANDATORY FOR UPI</span>
                    ) : (
                      <span className="text-[#91A0AE]">NOT REQUIRED FOR CASH</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder={recordMethod === "UPI" ? "12-digit bank UTR or UPI reference" : "Leave blank for cash desk"}
                    disabled={recordMethod === "CASH"}
                    value={recordMethod === "CASH" ? "" : recordUtr}
                    onChange={(e) => setRecordUtr(e.target.value)}
                    className="w-full p-2 bg-[#0D1929] border border-white/10 focus:border-[#18D8D0] text-white outline-none disabled:opacity-40"
                  />
                </div>

                {/* Receipt Number & Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                      RECEIPT NUMBER
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RCP-2026-0042"
                      value={recordReceipt}
                      onChange={(e) => setRecordReceipt(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 focus:border-[#18D8D0] text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase mb-1">
                      OPERATOR NOTES
                    </label>
                    <input
                      type="text"
                      placeholder="Desk remarks or purpose"
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      className="w-full p-2 bg-[#0D1929] border border-white/10 focus:border-[#18D8D0] text-white outline-none"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={recordSubmitting}
                    className="w-full py-3 bg-[#FF5A16] hover:bg-[#E04808] disabled:opacity-50 text-white font-pixel text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,90,22,0.3)]"
                  >
                    {recordSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>RECORDING TRANSACTION...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>COMMIT TO TOURNAMENT LEDGER</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ MODAL: TRANSACTION DETAIL & REFUND ═══ */}
        {showDetailModal && selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#07101D] border-2 border-white/20 w-full max-w-lg p-6 relative">
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 text-[#91A0AE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#18D8D0]" />
                <h3 className="font-pixel text-sm text-white font-bold uppercase">
                  TRANSACTION RECEIPT DETAIL
                </h3>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#0D1929] border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">INTERNAL TXN ID:</span>
                    <span className="text-white font-bold">{selectedTx.internalTxnId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">CATEGORY:</span>
                    <span className="text-[#18D8D0] font-bold">{selectedTx.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">AMOUNT:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      ₹ {selectedTx.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">METHOD:</span>
                    <span className="text-amber-400 font-bold">{selectedTx.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">UTR / REF:</span>
                    <span className="text-white font-bold">{selectedTx.utr || "— (Cash Desk)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">STATUS:</span>
                    <span
                      className={`font-bold ${
                        selectedTx.status === "SUCCESS"
                          ? "text-emerald-400"
                          : selectedTx.status === "REFUNDED"
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {selectedTx.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">TIMESTAMP:</span>
                    <span className="text-white">
                      {new Date(selectedTx.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">RECORDED BY:</span>
                    <span className="text-[#18D8D0]">{selectedTx.operatorEmail}</span>
                  </div>
                  {selectedTx.receiptNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#91A0AE]">RECEIPT NO:</span>
                      <span className="text-white">{selectedTx.receiptNumber}</span>
                    </div>
                  )}
                  {selectedTx.notes && (
                    <div className="pt-2 border-t border-white/5 text-[11px] text-[#91A0AE]">
                      <span className="font-bold text-white">Notes:</span> {selectedTx.notes}
                    </div>
                  )}
                </div>

                {/* Resolved Entity Details if Available */}
                {txDetailData?.entity && (
                  <div className="p-3 bg-[#0D1929] border border-white/10 space-y-1.5">
                    <div className="font-pixel text-[9px] text-[#91A0AE] uppercase">RESOLVED ENTITY</div>
                    <div className="flex justify-between text-white font-bold">
                      <span>{txDetailData.entity.name}</span>
                      <span className="text-[#18D8D0]">
                        {txDetailData.entity.playerId || txDetailData.entity.teamCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#91A0AE]">{txDetailData.entity.institution}</div>
                  </div>
                )}

                {/* Refund Action Flow */}
                {selectedTx.status === "SUCCESS" && !showRefundConfirm && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowRefundConfirm(true)}
                      className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500 text-rose-300 font-pixel text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>PROCESS TRANSACTION REFUND</span>
                    </button>
                  </div>
                )}

                {showRefundConfirm && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500 space-y-3">
                    <div className="font-pixel text-[10px] text-rose-300 uppercase font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>CONFIRM REFUND AUTHORIZATION</span>
                    </div>
                    <p className="text-[11px] text-white">
                      Refunding this transaction will update the fee ledger and restore the outstanding balance.
                    </p>
                    <input
                      type="text"
                      placeholder="Audit reason for refund (required, min 5 chars)..."
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full p-2 bg-[#07101D] border border-white/20 text-white outline-none text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleProcessRefund}
                        disabled={refundLoading || refundReason.trim().length < 5}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-pixel text-[10px] uppercase cursor-pointer"
                      >
                        {refundLoading ? "PROCESSING..." : "CONFIRM REFUND"}
                      </button>
                      <button
                        onClick={() => setShowRefundConfirm(false)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-pixel text-[10px] uppercase cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODAL: GLOBAL SEARCH DRAWER ═══ */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-16">
            <div className="bg-[#07101D] border-2 border-[#18D8D0] shadow-[0_0_30px_rgba(24,216,208,0.25)] w-full max-w-2xl p-6 relative">
              <button
                onClick={() => setShowSearchModal(false)}
                className="absolute top-4 right-4 text-[#91A0AE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-[#18D8D0]" />
                <h3 className="font-pixel text-sm text-white font-bold uppercase">
                  FINANCIAL AUDIT LOOKUP
                </h3>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#91A0AE]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type UTR, Transaction ID, Receipt, Athlete Name, Team Code..."
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0D1929] border border-white/20 focus:border-[#18D8D0] font-mono text-sm text-white placeholder-[#91A0AE] outline-none"
                />
              </div>

              {searchLoading && (
                <div className="py-6 text-center text-[#91A0AE] font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#18D8D0]" />
                  <span>Searching tournament financial database...</span>
                </div>
              )}

              {searchResults && !searchLoading && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto font-mono text-xs">
                  {/* Matching Transactions */}
                  <div>
                    <div className="font-pixel text-[10px] text-[#18D8D0] uppercase mb-2">
                      TRANSACTIONS ({searchResults.transactions.length})
                    </div>
                    {searchResults.transactions.length === 0 ? (
                      <div className="text-[#91A0AE] text-[11px] p-2">No matching transactions.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {searchResults.transactions.map((tx: any) => (
                          <div
                            key={tx.id}
                            onClick={() => {
                              setShowSearchModal(false);
                              openTransactionDetail(tx);
                            }}
                            className="p-2.5 bg-[#0D1929] hover:bg-[#16273D] border border-white/10 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div>
                              <div className="font-bold text-white">{tx.internalTxnId}</div>
                              <div className="text-[10px] text-[#91A0AE]">
                                {tx.category} • {tx.method} {tx.utr ? `• UTR: ${tx.utr}` : ""}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-emerald-400 font-bold">₹ {tx.amount.toLocaleString()}</div>
                              <div className="text-[9px] text-[#91A0AE]">{tx.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Matching Participants */}
                  <div>
                    <div className="font-pixel text-[10px] text-[#FF5A16] uppercase mb-2">
                      PARTICIPANTS ({searchResults.participants.length})
                    </div>
                    {searchResults.participants.length === 0 ? (
                      <div className="text-[#91A0AE] text-[11px] p-2">No matching participants.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {searchResults.participants.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-2.5 bg-[#0D1929] border border-white/10 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{p.name}</span>
                                <span className="text-[#18D8D0] text-[10px]">({p.playerId})</span>
                              </div>
                              <div className="text-[10px] text-[#91A0AE]">{p.institution}</div>
                            </div>
                            <div className="flex gap-1.5">
                              {p.feeLedgers?.map((l: any) => (
                                <span
                                  key={l.id}
                                  className={`text-[9px] font-pixel px-1.5 py-0.5 rounded ${
                                    l.balance <= 0 ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"
                                  }`}
                                >
                                  {l.category}: {l.balance <= 0 ? "PAID" : `OWES ₹${l.balance}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
