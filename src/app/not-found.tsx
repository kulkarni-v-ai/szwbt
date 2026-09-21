"use client";

import React from "react";
import Link from "next/link";
import { PixelButton } from "@/components/pixel/PixelButton";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-pixel-dark border-4 border-pixel-orange-fiery shadow-pixel-orange flex flex-col items-center gap-4">
        <AlertTriangle className="w-16 h-16 text-pixel-orange-fiery animate-bounce" />

        <div className="font-pixel text-4xl text-pixel-orange-bright font-extrabold tracking-widest text-pixel-glow">
          404
        </div>

        <h1 className="font-display text-xl text-pixel-cream uppercase">
          AREA LOCKED / OUT OF BOUNDS
        </h1>

        <p className="font-sans text-xs text-pixel-gray-400">
          THE REQUESTED COURT LEVEL OR SECTOR COULD NOT BE FOUND IN THE ARENA MATRIX.
        </p>

        <div className="p-3 bg-pixel-black border border-pixel-gray-800 font-pixel text-[10px] text-pixel-amber w-full">
          ╔══════════════════════════╗ <br />
          ║       AREA LOCKED        ║ <br />
          ║       COMING SOON        ║ <br />
          ╚══════════════════════════╝
        </div>

        <Link href="/" className="mt-2">
          <PixelButton variant="primary" size="md" glow>
            <Home className="w-4 h-4" />
            <span>RETURN TO MAIN ARENA</span>
          </PixelButton>
        </Link>
      </div>
    </div>
  );
}
