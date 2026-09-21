"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { QrCode, CheckSquare } from "lucide-react";

export default function VolunteerDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "volunteer")!;
  const [scanned, setScanned] = useState(false);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="flex flex-col gap-6 max-w-xl mx-auto">
        <PixelCard headerTitle="MY VOLUNTEER SHIFT" headerBadge="MOBILE FIELD" glow>
          <div className="flex items-center justify-between font-sans text-xs my-2">
            <div>
              <p className="font-pixel text-xs text-pixel-amber">SHIFT: MORNING ARENA DESK</p>
              <p className="text-pixel-gray-400">Assigned Location: Main Arena Gate 02</p>
            </div>
            <PixelBadge variant="green">ACTIVE SHIFT</PixelBadge>
          </div>
        </PixelCard>

        <PixelCard headerTitle="QUICK PARTICIPANT QR SCANNER" headerBadge="FIELD SCAN">
          <div className="flex flex-col items-center justify-center p-6 bg-pixel-black border-2 border-dashed border-pixel-orange-fiery text-center gap-3">
            <QrCode className="w-16 h-16 text-pixel-orange-fiery animate-pulse" />
            <p className="font-pixel text-xs text-pixel-cream">CAMERA SCANNER MATRIX READY</p>
            <p className="font-sans text-xs text-pixel-gray-400">POINT CAMERA AT PLAYER QR PASS</p>

            <PixelButton variant="primary" size="md" glow onClick={() => setScanned(!scanned)}>
              {scanned ? "RESET SCANNER" : "TEST QR PARTICIPANT SCAN"}
            </PixelButton>

            {scanned && (
              <div className="w-full p-4 bg-pixel-dark border-2 border-pixel-green text-left font-sans text-xs space-y-1 mt-2">
                <p className="font-pixel text-[10px] text-pixel-green">✓ VERIFIED PASS:</p>
                <p className="font-bold text-pixel-cream">Ananya Sharma</p>
                <p className="text-pixel-amber">ID: SZ-2026-001 | Karnataka State University</p>
                <p className="text-pixel-gray-300">Category: WS-U19 Singles</p>
              </div>
            )}
          </div>
        </PixelCard>

        <PixelCard headerTitle="FIELD TASKS CHECKLIST" headerBadge="TASKS">
          <div className="space-y-2 font-sans text-xs">
            <label className="flex items-center gap-2 p-2 bg-pixel-black border border-pixel-gray-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-pixel-orange-fiery" />
              <span>Verify player credentials at Gate 02</span>
            </label>
            <label className="flex items-center gap-2 p-2 bg-pixel-black border border-pixel-gray-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-pixel-orange-fiery" />
              <span>Provide shuttle timetable to team managers</span>
            </label>
            <label className="flex items-center gap-2 p-2 bg-pixel-black border border-pixel-gray-800 cursor-pointer">
              <input type="checkbox" className="accent-pixel-orange-fiery" />
              <span>Escort Court 03 players to warm-up area</span>
            </label>
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
