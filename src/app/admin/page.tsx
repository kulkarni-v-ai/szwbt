"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PARTICIPANTS_DATA } from "@/data/participants";
import { Users, Trophy, Home, Bus } from "lucide-react";

export default function SuperAdminDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "super_admin")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="TOTAL PARTICIPANTS" value="128 PLAYERS" subtext="Across 8 Categories" icon={<Users className="w-5 h-5" />} accent="orange" />
        <PixelStat label="TOTAL TEAMS" value="16 TEAMS" subtext="5 South States" icon={<Trophy className="w-5 h-5" />} accent="amber" />
        <PixelStat label="HOSTEL OCCUPANCY" value="63 / 100" subtext="Shalmala & Vindhya Hostels" icon={<Home className="w-5 h-5" />} accent="green" />
        <PixelStat label="SHUTTLE FLEET" value="3 ACTIVE" subtext="Routes 01 - 03" icon={<Bus className="w-5 h-5" />} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PixelCard headerTitle="RECENT REGISTRATIONS QUEUE" headerBadge="LIVE VERIFICATION">
            <PixelTable
              columns={[
                { key: "playerId", header: "ID", render: (r) => <span className="font-mono text-pixel-amber">{r.playerId}</span> },
                { key: "name", header: "NAME" },
                { key: "institution", header: "INSTITUTION" },
                { key: "category", header: "CATEGORY" },
                { key: "status", header: "STATUS", render: (r) => <PixelBadge variant={r.status === "APPROVED" ? "green" : "yellow"}>{r.status}</PixelBadge> },
              ]}
              data={PARTICIPANTS_DATA}
              keyExtractor={(item) => item.id}
            />
          </PixelCard>
        </div>

        <PixelCard headerTitle="COMMAND CENTER ALERTS" headerBadge="LOGS">
          <div className="flex flex-col gap-3 font-sans text-xs my-2">
            <div className="p-2.5 bg-pixel-black border-l-2 border-pixel-orange-fiery">
              <p className="font-pixel text-[9px] text-pixel-orange-bright">10:42 AM — REGISTRATION DESK</p>
              <p className="text-pixel-cream">Verified Player Ananya Sharma (Karnataka State University)</p>
            </div>
            <div className="p-2.5 bg-pixel-black border-l-2 border-pixel-green">
              <p className="font-pixel text-[9px] text-pixel-green">10:35 AM — MATCH OFFICIAL</p>
              <p className="text-pixel-cream">Court 01 Match M-001 Set 3 Score Updated</p>
            </div>
            <div className="p-2.5 bg-pixel-black border-l-2 border-pixel-cyan">
              <p className="font-pixel text-[9px] text-pixel-cyan">10:20 AM — FLEET CONTROL</p>
              <p className="text-pixel-cream">Shuttle Bus KA-01 Departed Airport Station</p>
            </div>
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
