"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { COURTS_DATA } from "@/data/schedule";
import { Radio } from "lucide-react";

export default function LiveOpsDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "live_ops")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="mb-6 flex items-center justify-between p-4 bg-pixel-orange-fiery/10 border-2 border-pixel-orange-fiery text-pixel-orange-bright">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="font-pixel text-xs">MISSION CONTROL TOURNAMENT MONITOR ACTIVE</span>
        </div>
        <PixelBadge variant="orange" pulse>● SATELLITE SYNC</PixelBadge>
      </div>

      <h2 className="font-pixel text-xs text-pixel-orange-bright uppercase mb-3">
        REAL-TIME 8-COURT MISSION CONTROL MATRIX
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {COURTS_DATA.map((court) => (
          <PixelCard key={court.courtId} headerTitle={court.name} headerBadge={court.status} glow={court.status === "LIVE"}>
            <div className="flex flex-col gap-2 my-1">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] text-pixel-cream">{court.umpire}</span>
                <PixelBadge variant={court.status === "LIVE" ? "orange" : court.status === "READY" ? "green" : "red"}>
                  {court.status}
                </PixelBadge>
              </div>
              <div className="p-2 bg-pixel-black border border-pixel-gray-800 text-[10px] font-mono text-pixel-amber">
                FEED: SATELLITE_CH_{court.courtId.toUpperCase()}
              </div>
            </div>
          </PixelCard>
        ))}
      </div>
    </DashboardShell>
  );
}
