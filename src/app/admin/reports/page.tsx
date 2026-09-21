"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { Download } from "lucide-react";

export default function ReportsDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "reports")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <PixelCard headerTitle="STATE REGISTRATION DEMOGRAPHICS" headerBadge="PIXEL CHART">
          <div className="space-y-4 my-4">
            {[
              { state: "KARNATAKA", count: 42, pct: "85%" },
              { state: "TAMIL NADU", count: 35, pct: "70%" },
              { state: "KERALA", count: 24, pct: "50%" },
              { state: "TELANGANA", count: 18, pct: "35%" },
              { state: "ANDHRA PRADESH", count: 9, pct: "20%" },
            ].map((item) => (
              <div key={item.state} className="space-y-1">
                <div className="flex justify-between font-pixel text-[10px] text-pixel-cream">
                  <span>{item.state}</span>
                  <span className="text-pixel-amber">{item.count} PLAYERS</span>
                </div>
                <div className="w-full h-4 bg-pixel-black border border-pixel-gray-700 overflow-hidden">
                  <div className="h-full bg-pixel-orange-fiery" style={{ width: item.pct }} />
                </div>
              </div>
            ))}
          </div>
        </PixelCard>

        <PixelCard headerTitle="DATA EXPORT ENGINE" headerBadge="REPORTS">
          <div className="flex flex-col gap-3 my-2 font-sans text-xs">
            <div className="p-3 bg-pixel-black border border-pixel-gray-800 flex justify-between items-center">
              <div>
                <p className="font-pixel text-[10px] text-pixel-cream">PARTICIPANT MASTER MANIFEST</p>
                <p className="text-pixel-gray-400">PDF / CSV Export</p>
              </div>
              <PixelButton variant="primary" size="sm">
                <Download className="w-3.5 h-3.5" /> EXPORT
              </PixelButton>
            </div>

            <div className="p-3 bg-pixel-black border border-pixel-gray-800 flex justify-between items-center">
              <div>
                <p className="font-pixel text-[10px] text-pixel-cream">ACCOMMODATION ALLOCATION LIST</p>
                <p className="text-pixel-gray-400">Shalmala & Vindhya Hostels PDF</p>
              </div>
              <PixelButton variant="dark" size="sm">
                <Download className="w-3.5 h-3.5" /> EXPORT
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
