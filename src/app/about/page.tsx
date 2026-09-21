"use client";

import React from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Zap, Shield, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Zap className="w-8 h-8 text-pixel-orange-fiery animate-bounce" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              ABOUT THE CHAMPIONSHIP
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              16-BIT / 32-BIT ANIME SPORTS x RETRO ARCADE EXPERIENCE
            </p>
          </div>
        </div>

        <PixelCard headerTitle="CHAMPIONSHIP VISION" headerBadge="LORE" className="mb-6">
          <p className="font-sans text-sm text-pixel-cream leading-relaxed mb-4">
            The South Zone Badminton Championship 2026 brings together top athletes from universities and institutions across Southern India.
            Designed as a high-octane 16-bit anime sports experience, this platform turns tournament operations, court scoreboards, and registration hubs into an interactive game world.
          </p>
          <div className="flex items-center gap-3 text-pixel-amber font-pixel text-xs">
            <Sparkles className="w-4 h-4 text-pixel-orange-fiery" />
            <span>THE SOUTH CONVERGES. THE COURT DECIDES.</span>
          </div>
        </PixelCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PixelCard headerTitle="PIXEL ART ARCHITECTURE" headerBadge="DESIGN">
            <p className="font-sans text-xs text-pixel-gray-300 leading-relaxed">
              Featuring nearest-neighbor sprite rendering, CRT scanline overlays, dynamic 2D/3D court perspective canvas, and a unified 18-role operational dashboard matrix.
            </p>
          </PixelCard>

          <PixelCard headerTitle="ANTI-HALLUCINATION POLICY" headerBadge="COMPLIANCE">
            <p className="font-sans text-xs text-pixel-gray-300 leading-relaxed">
              All unannounced dates, venues, fee figures, and rules strictly use placeholder markers (`COMING SOON`, `DEMO`, `SAMPLE`, `—`). No fake business logic is asserted.
            </p>
          </PixelCard>
        </div>
      </main>
    </div>
  );
}
