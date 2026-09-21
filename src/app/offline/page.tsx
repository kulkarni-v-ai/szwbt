"use client";

import React from "react";
import Link from "next/link";
import { PixelButton } from "@/components/pixel/PixelButton";
import { WifiOff, Home } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-pixel-dark border-4 border-pixel-gray-700 shadow-pixel flex flex-col items-center gap-4">
        <WifiOff className="w-16 h-16 text-pixel-amber animate-pulse" />

        <div className="font-pixel text-2xl text-pixel-amber font-extrabold tracking-widest">
          OFFLINE MODE
        </div>

        <p className="font-sans text-xs text-pixel-gray-400">
          NETWORK CONNECTION LOST. CACHED PIXEL HUD & APPLICATION DATA ACTIVE.
        </p>

        <Link href="/">
          <PixelButton variant="dark" size="md">
            <Home className="w-4 h-4" />
            <span>RETURN HOME</span>
          </PixelButton>
        </Link>
      </div>
    </div>
  );
}
