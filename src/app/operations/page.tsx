"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { QrCode } from "lucide-react";

export default function OperationsDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "operations")!;
  const [scanned, setScanned] = useState(false);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PixelCard headerTitle="ON-GROUND QR CHECK-IN DESK" headerBadge="SCAN STATION" glow>
          <div className="flex flex-col items-center p-6 bg-pixel-black border-2 border-dashed border-pixel-orange-fiery text-center gap-3">
            <QrCode className="w-14 h-14 text-pixel-orange-fiery animate-bounce" />
            <p className="font-pixel text-xs text-pixel-cream">ON-GROUND DESK SCANNER</p>
            <p className="font-sans text-xs text-pixel-gray-400">SCAN PARTICIPANT / DELEGATE ACCREDITATION</p>

            <PixelButton variant="primary" size="md" glow onClick={() => setScanned(!scanned)}>
              {scanned ? "RESET CHECK-IN" : "TEST PARTICIPANT ENTRY"}
            </PixelButton>

            {scanned && (
              <div className="w-full p-4 bg-pixel-dark border-2 border-pixel-green text-left font-sans text-xs space-y-1 mt-2">
                <p className="font-pixel text-[10px] text-pixel-green">✓ ENTRY ACCREDITED:</p>
                <p className="font-bold text-pixel-cream">Kavya Sundaram</p>
                <p className="text-pixel-amber">ID: SZ-2026-003 | Tamil Nadu Institute</p>
                <p className="text-pixel-gray-300">Checked-In: 10:52 AM Gate 01</p>
              </div>
            )}
          </div>
        </PixelCard>

        <PixelCard headerTitle="RECENT CHECK-INS LOG" headerBadge="LIVE LOG">
          <div className="space-y-2 font-sans text-xs">
            <div className="p-2.5 bg-pixel-black border-l-2 border-pixel-green flex justify-between items-center">
              <div>
                <p className="font-bold text-pixel-cream">Ananya Sharma</p>
                <p className="text-pixel-gray-400">Checked In @ Arena Main Gate</p>
              </div>
              <span className="font-mono text-pixel-amber">10:45 AM</span>
            </div>
            <div className="p-2.5 bg-pixel-black border-l-2 border-pixel-green flex justify-between items-center">
              <div>
                <p className="font-bold text-pixel-cream">Priya Nair</p>
                <p className="text-pixel-gray-400">Checked In @ Shalmala Hostel</p>
              </div>
              <span className="font-mono text-pixel-amber">10:30 AM</span>
            </div>
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
