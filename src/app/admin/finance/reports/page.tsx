"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import {
  TrendingUp,
  ArrowLeft,
  Download,
  Calendar,
  Building,
  RefreshCw,
  Banknote,
  ShieldAlert,
} from "lucide-react";

export default function FinanceReportsPage() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "finance_admin")!;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/finance/reports");
      if (!res.ok) {
        throw new Error(`Failed to load reports (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = (cat?: string) => {
    const url = cat ? `/api/finance/reports?format=csv&category=${cat}` : "/api/finance/reports?format=csv";
    window.open(url, "_blank");
  };

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 max-w-5xl mx-auto pb-16 font-mono text-xs">
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
              onClick={() => handleExportCSV()}
              className="px-3 py-1.5 bg-[#0D1929] hover:bg-[#16273D] border border-emerald-500/40 text-emerald-400 font-pixel text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT COMPLETE CSV</span>
            </button>
          </div>
        </div>

        {/* Audit Reminder */}
        <div className="p-3.5 bg-[#07101D] border-2 border-emerald-500 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-[11px] text-[#91A0AE]">
            <span className="text-white font-bold">STRICT TOURNAMENT FINANCE AUDIT:</span> This telemetry tracks only legitimate payments for Registration, Accommodation, and Match fees. Transport shuttles are university-provided with zero fees.
          </div>
        </div>

        {loading && (
          <div className="p-12 text-center text-[#91A0AE] font-mono text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#18D8D0]" />
            <span>Compiling tournament financial ledger analytics...</span>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* KPI Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">TOTAL INFLOW</span>
                <div className="font-pixel text-xl text-emerald-400 mt-1 font-bold">
                  ₹ {data.summary.totalCollected.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#91A0AE] mt-1">
                  Collection Rate: {data.summary.collectionRatePercent}%
                </div>
              </div>

              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">OUTSTANDING BALANCE</span>
                <div className="font-pixel text-xl text-[#FF5A16] mt-1 font-bold">
                  ₹ {data.summary.totalOutstandingBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#91A0AE] mt-1">
                  Total Due: ₹ {data.summary.totalDue.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">REFUNDED TOTAL</span>
                <div className="font-pixel text-xl text-amber-400 mt-1 font-bold">
                  ₹ {data.summary.totalRefunded.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#91A0AE] mt-1">
                  Net: ₹ {data.summary.netRevenue.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-[#07101D] border border-white/10">
                <span className="font-pixel text-[9px] text-[#91A0AE] uppercase">PAYMENT SPLIT</span>
                <div className="mt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-amber-400">Cash:</span>
                    <span>₹ {data.methodBreakdown.cash.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#18D8D0]">UPI:</span>
                    <span>₹ {data.methodBreakdown.upi.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="p-6 bg-[#07101D] border border-white/10 space-y-4">
              <div className="font-pixel text-xs text-white font-bold uppercase">
                CATEGORY-WISE FINANCIAL RECONCILIATION
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["REGISTRATION", "ACCOMMODATION", "MATCH"] as const).map((cat) => {
                  const item = data.categoryBreakdown[cat] || { collected: 0, count: 0, due: 0, balance: 0, refunded: 0 };
                  return (
                    <div key={cat} className="p-4 bg-[#0A1324] border border-white/10 space-y-2">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="font-pixel text-xs text-[#18D8D0] font-bold">{cat}</span>
                        <button
                          onClick={() => handleExportCSV(cat)}
                          className="text-[9px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          CSV Export
                        </button>
                      </div>
                      <div className="flex justify-between text-[#91A0AE]">
                        <span>Due:</span>
                        <span className="text-white">₹ {item.due.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#91A0AE]">
                        <span>Collected:</span>
                        <span className="text-emerald-400 font-bold">₹ {item.collected.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#91A0AE]">
                        <span>Balance:</span>
                        <span className={item.balance <= 0 ? "text-emerald-400" : "text-[#FF5A16]"}>
                          ₹ {item.balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Institution Ledger Summary */}
            <div className="p-6 bg-[#07101D] border border-white/10 space-y-4">
              <div className="font-pixel text-xs text-white font-bold uppercase flex justify-between items-center">
                <span>INSTITUTION BALANCES & REVENUE CONTRIBUTION</span>
                <span className="text-[9px] text-[#91A0AE]">RANKED BY OUTSTANDING DUE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[#91A0AE] font-pixel text-[9px] uppercase">
                      <th className="pb-2">INSTITUTION</th>
                      <th className="pb-2">ENTRIES</th>
                      <th className="pb-2">TOTAL DUE</th>
                      <th className="pb-2">TOTAL PAID</th>
                      <th className="pb-2 text-right">BALANCE OWED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.institutionBreakdown.map((inst: any) => (
                      <tr key={inst.institution} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 font-bold text-white">{inst.institution}</td>
                        <td className="py-2.5 text-[#91A0AE]">{inst.entries}</td>
                        <td className="py-2.5 text-white">₹ {inst.totalDue.toLocaleString()}</td>
                        <td className="py-2.5 text-emerald-400">₹ {inst.totalPaid.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-bold">
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
      </div>
    </DashboardShell>
  );
}
