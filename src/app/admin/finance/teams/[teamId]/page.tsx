"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import {
  CreditCard,
  ArrowLeft,
  Users,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";

export default function TeamFinancePage() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "finance_admin")!;
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamFinance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/finance/search?q=${encodeURIComponent(teamId)}`);
      if (res.ok) {
        const json = await res.json();
        const found = json.data?.teams?.find((t: any) => t.id === teamId || t.teamCode === teamId);
        if (found) {
          setData(found);
        } else {
          throw new Error("Team financial profile not found.");
        }
      } else {
        throw new Error("Failed to load team data.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchTeamFinance();
    }
  }, [teamId]);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 max-w-4xl mx-auto pb-16 font-mono text-xs">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin/finance")}
            className="flex items-center gap-2 text-[#91A0AE] hover:text-white font-pixel text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO FINANCE CONSOLE</span>
          </button>
        </div>

        {loading && (
          <div className="p-12 text-center text-[#91A0AE] font-mono text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#18D8D0]" />
            <span>Loading team fee ledgers...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-500 text-rose-300 font-mono text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Header Profile */}
            <div className="p-6 bg-[#07101D] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-950/50 border border-purple-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="font-pixel text-lg text-white font-bold">{data.name}</h1>
                  <div className="text-[#91A0AE] flex items-center gap-2 mt-0.5">
                    <span className="text-purple-400 font-bold">CODE: {data.teamCode}</span>
                    <span>•</span>
                    <span>{data.institution}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push(`/admin/finance`)}
                className="px-4 py-2 bg-[#FF5A16] hover:bg-[#E04808] text-white font-pixel text-xs uppercase flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>RECORD PAYMENT</span>
              </button>
            </div>

            {/* Ledgers */}
            <div className="p-6 bg-[#07101D] border border-white/10 space-y-4">
              <div className="font-pixel text-xs text-white font-bold uppercase">
                TEAM FEE LEDGERS (MATCH / PROTEST / REGISTRATION)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.feeLedgers?.map((ledger: any) => (
                  <div
                    key={ledger.id}
                    className="p-4 bg-[#0A1324] border border-white/10 space-y-2"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="font-pixel text-xs text-purple-400 font-bold">
                        {ledger.category}
                      </span>
                      <span
                        className={`font-pixel text-[9px] px-1.5 py-0.5 rounded ${
                          ledger.balance <= 0
                            ? "bg-emerald-950 text-emerald-300"
                            : "bg-rose-950 text-rose-300"
                        }`}
                      >
                        {ledger.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#91A0AE]">
                      <span>Amount Due:</span>
                      <span className="text-white">₹ {ledger.amountDue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#91A0AE]">
                      <span>Amount Paid:</span>
                      <span className="text-emerald-400 font-bold">
                        ₹ {ledger.amountPaid.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
                      <span className="text-white">Outstanding Balance:</span>
                      <span className={ledger.balance <= 0 ? "text-emerald-400" : "text-[#FF5A16]"}>
                        ₹ {ledger.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
