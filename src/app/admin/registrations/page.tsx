"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PARTICIPANTS_DATA } from "@/data/participants";
import { UserCheck, FileText, CheckCircle2, XCircle } from "lucide-react";

export default function RegistrationAdminDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "registration_admin")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="TOTAL REGISTRATIONS" value="128 PLAYERS" subtext="All 5 States" icon={<UserCheck className="w-5 h-5" />} accent="orange" />
        <PixelStat label="APPROVED PLAYERS" value="112 VERIFIED" subtext="Passes Generated" icon={<CheckCircle2 className="w-5 h-5" />} accent="green" />
        <PixelStat label="UNDER REVIEW" value="12 PENDING" subtext="Document Check" icon={<FileText className="w-5 h-5" />} accent="amber" />
        <PixelStat label="REJECTED" value="4 REJECTED" subtext="Incomplete Form" icon={<XCircle className="w-5 h-5" />} accent="purple" />
      </div>

      <PixelCard headerTitle="PARTICIPANT VERIFICATION QUEUE" headerBadge="ACTION REQUIRED">
        <PixelTable
          columns={[
            { key: "playerId", header: "PLAYER ID", render: (r) => <span className="font-mono text-pixel-amber">{r.playerId}</span> },
            { key: "name", header: "NAME" },
            { key: "institution", header: "INSTITUTION" },
            { key: "category", header: "CATEGORY" },
            { key: "status", header: "STATUS", render: (r) => <PixelBadge variant={r.status === "APPROVED" ? "green" : "yellow"}>{r.status}</PixelBadge> },
            {
              key: "actions",
              header: "ACTION",
              render: (r) => (
                <div className="flex items-center gap-1.5">
                  <PixelButton variant="primary" size="sm">APPROVE</PixelButton>
                  <PixelButton variant="dark" size="sm">REVIEW</PixelButton>
                </div>
              ),
            },
          ]}
          data={PARTICIPANTS_DATA}
          keyExtractor={(item) => item.id}
        />
      </PixelCard>
    </DashboardShell>
  );
}
