"use client";

import React from "react";
import { Zap } from "lucide-react";

interface PixelLoaderProps {
  label?: string;
  sublabel?: string;
}

export const PixelLoader: React.FC<PixelLoaderProps> = ({
  label = "LOADING LEVEL...",
  sublabel = "INITIALIZING COURT MATRIX & ARCADE HUD",
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-pixel-black border-2 border-pixel-orange-fiery/40 shadow-pixel">
      <div className="relative mb-6">
        <Zap className="w-12 h-12 text-pixel-orange-fiery animate-bounce" />
        <div className="absolute inset-0 bg-pixel-orange-fiery/20 blur-lg rounded-full animate-ping" />
      </div>

      <h3 className="font-pixel text-sm text-pixel-orange-bright uppercase tracking-widest mb-2 animate-pulse">
        {label}
      </h3>
      <p className="font-sans text-xs text-pixel-gray-400 uppercase tracking-wider text-center max-w-sm">
        {sublabel}
      </p>

      {/* Retro Pixel Progress Bar */}
      <div className="w-48 h-3 bg-pixel-dark border-2 border-pixel-gray-700 mt-4 overflow-hidden relative">
        <div className="h-full bg-pixel-orange-fiery animate-[pixelPulse_1.5s_ease-in-out_infinite]" style={{ width: '75%' }} />
      </div>
    </div>
  );
};
