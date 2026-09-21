"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { COURTS_DATA, MATCHES_DATA } from "@/data/schedule";
import { Trophy, Flame, Activity } from "lucide-react";

export default function TournamentAdminDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "tournament_admin")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="MATCHES TODAY" value="64 MATCHES" subtext="8 Courts Active" icon={<Flame className="w-5 h-5" />} accent="orange" />
        <PixelStat label="ONGOING LIVE" value="2 COURTS" subtext="Courts 01 & 03" icon={<Activity className="w-5 h-5" />} accent="amber" />
        <PixelStat label="COMPLETED" value="12 MATCHES" subtext="Morning Session" icon={<Trophy className="w-5 h-5" />} accent="green" />
        <PixelStat label="DELAYED" value="1 MATCH" subtext="Court 05 Break" icon={<Activity className="w-5 h-5" />} accent="purple" />
      </div>

      <div className="mb-6">
        <h2 className="font-pixel text-xs text-pixel-orange-bright uppercase mb-3">
          8-COURT MATRIX STATUS
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {COURTS_DATA.map((c) => (
            <PixelCard key={c.courtId} headerTitle={c.name} headerBadge={c.status}>
              <div className="flex flex-col gap-1 my-1">
                <p className="font-sans text-xs text-pixel-cream font-medium">UMPIRE: {c.umpire}</p>
                <PixelBadge variant={c.status === "LIVE" ? "orange" : c.status === "READY" ? "green" : "red"} pulse={c.status === "LIVE"}>
                  {c.status}
                </PixelBadge>
              </div>
            </PixelCard>
          ))}
        </div>
      </div>

      <PixelCard headerTitle="FIXTURES & SCHEDULE CONTROL" headerBadge="MATCH MATRIX">
        <PixelTable
          columns={[
            { key: "matchNumber", header: "MATCH ID", render: (r) => <span className="font-pixel text-xs text-pixel-orange-bright">{r.matchNumber}</span> },
            { key: "court", header: "COURT" },
            { key: "category", header: "CATEGORY" },
            { key: "playerA", header: "PLAYER A" },
            { key: "playerB", header: "PLAYER B" },
            { key: "status", header: "STATUS", render: (r) => <PixelBadge variant={r.status === "LIVE" ? "orange" : "dark"}>{r.status}</PixelBadge> },
          ]}
          data={MATCHES_DATA}
          keyExtractor={(item) => item.id}
        />
      </PixelCard>
    </DashboardShell>
  );
}
