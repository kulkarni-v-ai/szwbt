"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { HelpCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function SupportDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "support")!;

  const tickets = [
    { id: "T-101", subject: "Accreditation Name Correction", category: "REGISTRATION", priority: "HIGH", status: "OPEN" },
    { id: "T-102", subject: "Shalmala Hostel Extra Keycard", category: "ACCOMMODATION", priority: "MEDIUM", status: "IN PROGRESS" },
    { id: "T-103", subject: "Shuttle Route 01 Pickup Timing", category: "TRANSPORT", priority: "LOW", status: "RESOLVED" },
  ];

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="TOTAL TICKETS" value="14 TICKETS" subtext="Helpdesk Desk" icon={<HelpCircle className="w-5 h-5" />} accent="orange" />
        <PixelStat label="OPEN TICKETS" value="4 OPEN" subtext="Awaiting Action" icon={<AlertTriangle className="w-5 h-5" />} accent="amber" />
        <PixelStat label="IN PROGRESS" value="3 ACTIVE" subtext="Assigned Operator" icon={<Clock className="w-5 h-5" />} accent="cyan" />
        <PixelStat label="RESOLVED" value="7 CLOSED" subtext="Resolved Today" icon={<CheckCircle2 className="w-5 h-5" />} accent="green" />
      </div>

      <PixelCard headerTitle="HELPDESK TICKET RESOLUTION QUEUE" headerBadge="SUPPORT MATRIX">
        <PixelTable
          columns={[
            { key: "id", header: "TICKET ID", render: (r) => <span className="font-mono text-pixel-amber">{r.id}</span> },
            { key: "subject", header: "SUBJECT" },
            { key: "category", header: "CATEGORY" },
            { key: "priority", header: "PRIORITY", render: (r) => <PixelBadge variant={r.priority === "HIGH" ? "red" : "dark"}>{r.priority}</PixelBadge> },
            { key: "status", header: "STATUS", render: (r) => <PixelBadge variant={r.status === "OPEN" ? "orange" : r.status === "RESOLVED" ? "green" : "yellow"}>{r.status}</PixelBadge> },
          ]}
          data={tickets}
          keyExtractor={(item) => item.id}
        />
      </PixelCard>
    </DashboardShell>
  );
}
