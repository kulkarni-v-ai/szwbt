"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  RefreshCw,
  Printer,
  ShieldCheck,
  User,
  Building,
} from "lucide-react";

export default function TransactionDetailPage() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "finance_admin")!;
  const { hasPermission } = useAuth();
  const params = useParams();
  const router = useRouter();
  const transactionId = params.transactionId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/finance/payments/${transactionId}`);
      if (!res.ok) {
        throw new Error(`Failed to load transaction (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Transaction not found");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchDetail();
    }
  }, [transactionId]);

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    setRefundSubmitting(true);
    try {
      const res = await fetch(`/api/finance/payments/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFUND",
          reason: refundReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Refund failed");
      }
      setShowRefundModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(`Refund Error: ${err.message}`);
    } finally {
      setRefundSubmitting(false);
    }
  };

  const tx = data?.transaction;
  const entity = data?.entity;
  const feeLedger = data?.feeLedger;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin/finance")}
            className="flex items-center gap-2 text-[#91A0AE] hover:text-white font-pixel text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO FINANCE CONSOLE</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#0D1929] hover:bg-[#16273D] border border-white/20 text-white font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT RECEIPT</span>
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-12 text-center text-[#91A0AE] font-mono text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#18D8D0]" />
            <span>Loading transaction audit records...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-500 text-rose-300 font-mono text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tx && (
          <div className="space-y-6">
            {/* Main Receipt Card */}
            <div className="p-6 bg-[#07101D] border-2 border-[#18D8D0] shadow-[0_0_25px_rgba(24,216,208,0.15)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider">
                    OFFICIAL TOURNAMENT RECEIPT
                  </div>
                  <h1 className="font-pixel text-lg text-white font-bold mt-1">
                    TXN: {tx.internalTxnId}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-pixel text-xs px-3 py-1 border ${
                      tx.status === "SUCCESS"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                        : tx.status === "REFUNDED"
                        ? "bg-amber-950 text-amber-300 border-amber-500"
                        : "bg-rose-950 text-rose-300 border-rose-500"
                    }`}
                  >
                    STATUS: {tx.status}
                  </span>
                </div>
              </div>

              {/* Amount Showcase */}
              <div className="p-4 bg-[#0A1324] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">SETTLEMENT AMOUNT</span>
                  <div className="font-pixel text-2xl text-emerald-400 font-bold mt-1">
                    ₹ {tx.amount.toLocaleString()}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">CATEGORY</span>
                  <div className="font-bold text-[#18D8D0] text-sm mt-1">{tx.category}</div>
                </div>
              </div>

              {/* Technical Audit Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3 bg-[#0D1929] border border-white/5 space-y-2">
                  <div className="text-[10px] font-pixel text-[#91A0AE] uppercase">PAYMENT METADATA</div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Method:</span>
                    <span className="text-white font-bold">{tx.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Bank UTR / Ref:</span>
                    <span className="text-white font-bold">{tx.utr || "— (Direct Cash Desk)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Receipt Number:</span>
                    <span className="text-white">{tx.receiptNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Created Timestamp:</span>
                    <span className="text-white">{new Date(tx.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#0D1929] border border-white/5 space-y-2">
                  <div className="text-[10px] font-pixel text-[#91A0AE] uppercase">OPERATOR AUDIT</div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Recorded By:</span>
                    <span className="text-[#18D8D0] font-bold">{tx.operatorEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Entity Type:</span>
                    <span className="text-white font-bold">{tx.entityType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0AE]">Entity Identifier:</span>
                    <span className="text-white">{tx.entityId || "N/A"}</span>
                  </div>
                  {tx.notes && (
                    <div className="pt-2 border-t border-white/5 text-[11px] text-[#91A0AE]">
                      <span className="font-bold text-white">Remarks:</span> {tx.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Entity Card */}
              {entity && (
                <div className="p-4 bg-[#0A1324] border border-white/10">
                  <div className="font-pixel text-[10px] text-[#18D8D0] uppercase mb-2">
                    LINKED ENTITY DETAILS
                  </div>
                  <div className="font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {tx.entityType === "PARTICIPANT" ? (
                          <User className="w-4 h-4 text-[#18D8D0]" />
                        ) : (
                          <Building className="w-4 h-4 text-purple-400" />
                        )}
                        <span>{entity.name}</span>
                        <span className="text-[#18D8D0]">({entity.playerId || entity.teamCode})</span>
                      </div>
                      <div className="text-[#91A0AE] mt-0.5">{entity.institution}</div>
                    </div>

                    {feeLedger && (
                      <div className="p-2.5 bg-[#07101D] border border-white/10 text-right">
                        <div className="text-[10px] text-[#91A0AE]">CURRENT LEDGER BALANCE</div>
                        <div
                          className={`font-bold text-sm ${
                            feeLedger.balance <= 0 ? "text-emerald-400" : "text-[#FF5A16]"
                          }`}
                        >
                          ₹ {feeLedger.balance.toLocaleString()} ({feeLedger.status})
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {tx.status === "SUCCESS" && hasPermission("FINANCE_REFUND") && (
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500 text-rose-300 font-pixel text-xs uppercase flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>PROCESS REFUND FOR THIS TRANSACTION</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refund Authorization Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#07101D] border-2 border-rose-500 p-6 max-w-md w-full space-y-4 font-mono text-xs">
              <div className="font-pixel text-xs text-rose-400 font-bold uppercase flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>AUTHORIZE REFUND</span>
              </div>
              <p className="text-white text-[11px] leading-relaxed">
                Processing this refund will revert the payment of ₹ {tx.amount.toLocaleString()} and update the fee ledger balances accordingly.
              </p>
              <input
                type="text"
                placeholder="Audit reason (required, min 5 chars)..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-2 bg-[#0D1929] border border-white/20 text-white outline-none"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRefund}
                  disabled={refundSubmitting || refundReason.trim().length < 5}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-pixel text-[10px] uppercase cursor-pointer"
                >
                  {refundSubmitting ? "PROCESSING..." : "CONFIRM REFUND"}
                </button>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-pixel text-[10px] uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
