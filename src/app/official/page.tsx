"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Plus, Minus, CheckCircle } from "lucide-react";

export default function OfficialDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "official")!;

  const [scoreA, setScoreA] = useState(21);
  const [scoreB, setScoreB] = useState(18);
  const [setNum, setSetNum] = useState(2);
  const [complete, setComplete] = useState(false);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <PixelCard headerTitle="COURT UMPIRE SCOREBOARD CONTROLLER" headerBadge="COURT 03" glow>
          <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-3 mb-4">
            <div>
              <p className="font-pixel text-xs text-pixel-orange-bright">MATCH 024 — WS-U19 SINGLES</p>
              <p className="font-sans text-xs text-pixel-gray-400">Court Umpire: Umpire Alpha</p>
            </div>
            <PixelBadge variant={complete ? "green" : "orange"} pulse={!complete}>
              {complete ? "MATCH COMPLETE" : `● LIVE SET 0${setNum}`}
            </PixelBadge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-pixel-black border-2 border-pixel-gray-800 flex flex-col items-center gap-3">
              <span className="font-pixel text-xs text-pixel-cream text-center">ANANYA SHARMA</span>
              <div className="font-pixel text-4xl text-pixel-orange-bright font-bold bg-pixel-dark px-6 py-2 border border-pixel-orange-fiery/40">
                {scoreA}
              </div>
              <div className="flex items-center gap-2">
                <PixelButton variant="dark" size="sm" onClick={() => setScoreA(Math.max(0, scoreA - 1))}>
                  <Minus className="w-3.5 h-3.5" />
                </PixelButton>
                <PixelButton variant="primary" size="sm" onClick={() => setScoreA(scoreA + 1)}>
                  <Plus className="w-3.5 h-3.5" /> +1 PTS
                </PixelButton>
              </div>
            </div>

            <div className="p-4 bg-pixel-black border-2 border-pixel-gray-800 flex flex-col items-center gap-3">
              <span className="font-pixel text-xs text-pixel-cream text-center">PRIYA NAIR</span>
              <div className="font-pixel text-4xl text-pixel-orange-bright font-bold bg-pixel-dark px-6 py-2 border border-pixel-orange-fiery/40">
                {scoreB}
              </div>
              <div className="flex items-center gap-2">
                <PixelButton variant="dark" size="sm" onClick={() => setScoreB(Math.max(0, scoreB - 1))}>
                  <Minus className="w-3.5 h-3.5" />
                </PixelButton>
                <PixelButton variant="primary" size="sm" onClick={() => setScoreB(scoreB + 1)}>
                  <Plus className="w-3.5 h-3.5" /> +1 PTS
                </PixelButton>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-pixel-gray-800">
            <PixelButton variant="secondary" size="md" onClick={() => setSetNum(setNum + 1)}>
              START NEXT SET (SET 0{setNum + 1})
            </PixelButton>
            <PixelButton variant="primary" size="md" glow onClick={() => setComplete(!complete)}>
              <CheckCircle className="w-4 h-4" />
              <span>{complete ? "REOPEN MATCH" : "FINAL MATCH COMPLETE"}</span>
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
