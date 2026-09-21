"use client";

import React from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-pixel-dark border-4 border-pixel-red shadow-pixel flex flex-col items-center gap-4">
        <div className="font-pixel text-4xl text-pixel-red font-extrabold tracking-widest text-pixel-glow">
          500 ERROR
        </div>

        <h1 className="font-display text-xl text-pixel-cream uppercase">
          SYSTEM GLITCH DETECTED
        </h1>

        <p className="font-sans text-xs text-pixel-gray-400">
          AN UNEXPECTED TELEMETRY FAULT OCCURRED IN THE ARCADE PIPELINE.
        </p>

        <PixelButton variant="danger" size="md" onClick={() => reset()}>
          <RefreshCw className="w-4 h-4" />
          <span>RELOAD SYSTEM / RETRY</span>
        </PixelButton>
      </div>
    </div>
  );
}
