"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { Briefcase, Users, Flame, Home } from "lucide-react";

export default function OrganizerDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "organizer")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="EXECUTIVE STATUS" value="ACTIVE" subtext="All Systems Operational" icon={<Briefcase className="w-5 h-5" />} accent="orange" />
        <PixelStat label="ATHLETES VERIFIED" value="112 PLAYERS" subtext="8 Categories" icon={<Users className="w-5 h-5" />} accent="amber" />
        <PixelStat label="MATCHES SCHEDULED" value="64 MATCHES" subtext="8 Courts Active" icon={<Flame className="w-5 h-5" />} accent="green" />
        <PixelStat label="HOSTEL ALLOCATIONS" value="63 ROOMS" subtext="Shalmala & Vindhya Hostels" icon={<Home className="w-5 h-5" />} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PixelCard headerTitle="CROSS-DEPARTMENTAL HEALTH" headerBadge="EXECUTIVE">
          <div className="space-y-3 font-sans text-xs">
            <div className="flex justify-between items-center p-2 bg-pixel-black border border-pixel-gray-800">
              <span>REGISTRATION VERIFICATION DEPT</span>
              <span className="font-pixel text-xs text-pixel-green">● 95% READY</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-pixel-black border border-pixel-gray-800">
              <span>TOURNAMENT MATCH FIXTURES</span>
              <span className="font-pixel text-xs text-pixel-orange-bright">● LIVE MATCHES ON COURT</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-pixel-black border border-pixel-gray-800">
              <span>HOSTEL LOGISTICS & TRANSPORT</span>
              <span className="font-pixel text-xs text-pixel-green">● FLEET ACTIVE</span>
            </div>
          </div>
        </PixelCard>

        <PixelCard headerTitle="TOURNAMENT EXECUTIVE MEMO" headerBadge="NOTICE">
          <p className="font-sans text-xs text-pixel-cream leading-relaxed mb-4">
            The executive committee retains high-level oversight over all 18 operational role dashboards.
            SMTP email delivery and 4-Bed hostel allocation engine are fully active.
          </p>
          <div className="font-pixel text-[10px] text-pixel-amber">
            STATUS: EXECUTIVE TELEMETRY ACTIVE
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
