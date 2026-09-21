"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { FINANCE_TRANSACTIONS_DATA, FINANCE_SUMMARY_DATA } from "@/data/finance";
import { CreditCard, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function FinanceAdminDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "finance_admin")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="p-4 bg-pixel-amber/10 border-2 border-pixel-amber text-pixel-amber font-pixel text-[10px] uppercase mb-6 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{FINANCE_SUMMARY_DATA.disclaimer}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="TOTAL TRANSACTIONS" value={FINANCE_SUMMARY_DATA.successfulCount} subtext="Registration & Hostel" icon={<CreditCard className="w-5 h-5" />} accent="orange" />
        <PixelStat label="TOTAL AMOUNT" value={FINANCE_SUMMARY_DATA.totalRevenue} subtext="Configurable Figures" icon={<CheckCircle2 className="w-5 h-5" />} accent="amber" />
        <PixelStat label="PENDING INVOICES" value={FINANCE_SUMMARY_DATA.pendingCount} subtext="Under Verification" icon={<Clock className="w-5 h-5" />} accent="green" />
        <PixelStat label="REFUND REQUESTS" value={FINANCE_SUMMARY_DATA.refundsCount} subtext="1 Request" icon={<AlertCircle className="w-5 h-5" />} accent="purple" />
      </div>

      <PixelCard headerTitle="TRANSACTION AUDIT LOGS" headerBadge="FINANCIAL AUDIT">
        <PixelTable
          columns={[
            { key: "txRef", header: "REFERENCE", render: (r) => <span className="font-mono text-pixel-amber">{r.txRef}</span> },
            { key: "institution", header: "INSTITUTION" },
            { key: "type", header: "TYPE" },
            { key: "amount", header: "AMOUNT", render: (r) => <span className="font-pixel text-xs text-pixel-orange-bright">{r.amount}</span> },
            { key: "status", header: "STATUS", render: (r) => <PixelBadge variant={r.status === "SUCCESSFUL" ? "green" : "yellow"}>{r.status}</PixelBadge> },
          ]}
          data={FINANCE_TRANSACTIONS_DATA}
          keyExtractor={(item) => item.id}
        />
      </PixelCard>
    </DashboardShell>
  );
}
