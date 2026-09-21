"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { QRPass } from "@/components/pixel/QRPass";
import { PARTICIPANTS_DATA } from "@/data/participants";
import { Zap, Calendar, Home, Bus, QrCode } from "lucide-react";

export default function ParticipantDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "participant")!;
  const [showPassModal, setShowPassModal] = useState(false);
  const player = PARTICIPANTS_DATA[0];

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="flex flex-col gap-6">
        {/* Welcome Player Header */}
        <div className="p-6 bg-pixel-black border-2 border-pixel-orange-fiery shadow-pixel-orange flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-6 h-6 text-pixel-orange-bright animate-bounce" />
              <h2 className="font-display text-2xl text-pixel-cream font-bold">
                WELCOME, {player.name}
              </h2>
            </div>
            <p className="font-sans text-xs text-pixel-gray-400">
              {player.institution} • {player.category} CATEGORY
            </p>
          </div>

          <PixelButton variant="primary" size="lg" glow onClick={() => setShowPassModal(!showPassModal)}>
            <QrCode className="w-4 h-4" />
            <span>{showPassModal ? "HIDE QR PASS" : "VIEW MY QR PASS"}</span>
          </PixelButton>
        </div>

        {/* QR Access Pass Display */}
        {showPassModal && (
          <div className="flex justify-center my-2">
            <QRPass
              playerData={{
                name: player.name,
                playerId: player.playerId,
                institution: player.institution,
                category: player.category,
                status: "VERIFIED & ACCREDITED",
                qrCode: player.qrCode,
              }}
            />
          </div>
        )}

        {/* Dashboard Status Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PixelCard headerTitle="REGISTRATION & EMAIL" headerBadge="VERIFIED">
            <div className="flex items-center justify-between my-2">
              <span className="font-pixel text-xs text-pixel-cream">REGISTRATION</span>
              <PixelBadge variant="green">● APPROVED</PixelBadge>
            </div>
            <p className="font-sans text-xs text-pixel-gray-400">Email verified via server OTP.</p>
          </PixelCard>

          <PixelCard headerTitle="NEXT MATCH COURT" headerBadge="TIMINGS">
            <div className="flex items-center gap-3 my-2">
              <Calendar className="w-6 h-6 text-pixel-orange-fiery" />
              <div>
                <p className="font-pixel text-xs text-pixel-amber">COURT 01 — 10:00 AM</p>
                <p className="font-sans text-xs text-pixel-gray-400">VS Priya Nair (Kerala Academy)</p>
              </div>
            </div>
          </PixelCard>

          <PixelCard headerTitle="MY ACCOMMODATION" headerBadge="SHALMALA HOSTEL">
            <div className="space-y-2 font-sans text-xs my-2">
              <div className="flex justify-between items-center">
                <span>SHALMALA • ROOM S-101 (BED 01)</span>
                <PixelBadge variant="green">ALLOCATED</PixelBadge>
              </div>
              <div className="flex justify-between items-center">
                <span>SHUTTLE ROUTE 02</span>
                <PixelBadge variant="orange">ACTIVE PASS</PixelBadge>
              </div>
            </div>
          </PixelCard>
        </div>
      </div>
    </DashboardShell>
  );
}
