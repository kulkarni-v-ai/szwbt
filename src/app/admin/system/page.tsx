"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX, SYSTEM_SERVICES_DATA } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Server, Activity, Cpu, ShieldCheck } from "lucide-react";

export default function SystemHealthDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "system_health")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="CORE API STATUS" value="OPERATIONAL" subtext="24ms Latency" icon={<Server className="w-5 h-5" />} accent="green" />
        <PixelStat label="SMTP MAIL ENGINE" value="OPERATIONAL" subtext="Real Transporter" icon={<Cpu className="w-5 h-5" />} accent="green" />
        <PixelStat label="CACHE MATRIX" value="OPERATIONAL" subtext="4ms Response" icon={<Activity className="w-5 h-5" />} accent="cyan" />
        <PixelStat label="UPTIME TELEMETRY" value="99.98%" subtext="System Telemetry" icon={<ShieldCheck className="w-5 h-5" />} accent="orange" />
      </div>

      <PixelCard headerTitle="SERVICES & TELEMETRY MONITOR" headerBadge="SYSTEM MONITOR">
        <div className="space-y-3 font-sans text-xs my-2">
          {SYSTEM_SERVICES_DATA.map((srv) => (
            <div key={srv.name} className="p-3 bg-pixel-black border border-pixel-gray-800 flex justify-between items-center">
              <div>
                <p className="font-pixel text-xs text-pixel-cream">{srv.name}</p>
                <p className="text-[10px] text-pixel-gray-400">Region: {srv.region} • Ping: {srv.ping}</p>
              </div>
              <PixelBadge variant="green">{srv.status}</PixelBadge>
            </div>
          ))}
        </div>
      </PixelCard>
    </DashboardShell>
  );
}
