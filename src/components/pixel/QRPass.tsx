"use client";

import React from "react";
import { PixelBadge } from "./PixelBadge";
import { QrCode, Shield, Zap } from "lucide-react";

interface QRPassProps {
  playerData?: {
    name: string;
    playerId: string;
    institution: string;
    category: string;
    status: string;
    qrCode: string;
  };
}

export const QRPass: React.FC<QRPassProps> = ({
  playerData = {
    name: "ACCREDITED ATHLETE",
    playerId: "SZ-2026-PENDING",
    institution: "AFFILIATED UNIVERSITY",
    category: "WOMEN'S BADMINTON",
    status: "ACCREDITED",
    qrCode: "SZ26-ACCREDITATION-PASS",
  },
}) => {
  return (
    <div className="relative max-w-sm w-full bg-pixel-black border-4 border-pixel-orange-fiery p-6 shadow-pixel-orange rounded-none text-pixel-cream font-sans">
      {/* Top Arcade Card Header */}
      <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-pixel-orange-bright animate-bounce" />
          <span className="font-pixel text-xs text-pixel-orange-bright uppercase tracking-widest">
            GAME PASS
          </span>
        </div>
        <PixelBadge variant="orange">OFFICIAL ACCREDITATION</PixelBadge>
      </div>

      {/* Main Pass Content */}
      <div className="flex flex-col gap-3 mb-5">
        <div>
          <span className="font-pixel text-[9px] text-pixel-gray-400 uppercase">
            PLAYER NAME
          </span>
          <p className="font-pixel text-sm text-pixel-cream tracking-wide">
            {playerData.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-pixel text-[9px] text-pixel-gray-400 uppercase">
              PLAYER ID
            </span>
            <p className="font-mono text-xs text-pixel-amber font-bold">
              {playerData.playerId}
            </p>
          </div>
          <div>
            <span className="font-pixel text-[9px] text-pixel-gray-400 uppercase">
              CATEGORY
            </span>
            <p className="font-pixel text-[10px] text-pixel-cream">
              {playerData.category}
            </p>
          </div>
        </div>

        <div>
          <span className="font-pixel text-[9px] text-pixel-gray-400 uppercase">
            INSTITUTION
          </span>
          <p className="font-sans text-xs text-pixel-gray-300">
            {playerData.institution}
          </p>
        </div>
      </div>

      {/* QR Code Pixel Matrix Placeholder */}
      <div className="flex flex-col items-center justify-center p-4 bg-pixel-cream border-2 border-black mb-4">
        <div className="relative p-2 bg-black text-pixel-cream flex items-center justify-center">
          <QrCode className="w-28 h-28 text-pixel-orange-bright" />
        </div>
        <p className="font-mono text-[9px] text-black mt-2 tracking-widest uppercase">
          [{playerData.qrCode}]
        </p>
      </div>

      {/* Footer Security Badge */}
      <div className="flex items-center justify-between pt-2 border-t border-pixel-gray-800 text-[9px] font-pixel text-pixel-gray-400">
        <div className="flex items-center gap-1 text-pixel-green">
          <Shield className="w-3 h-3" />
          <span>STATUS: {playerData.status}</span>
        </div>
        <span>SZWBT 2026</span>
      </div>
    </div>
  );
};
