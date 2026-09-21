"use client";

import React from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelScoreboard } from "@/components/pixel/PixelScoreboard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { MATCHES_DATA } from "@/data/schedule";
import { Radio } from "lucide-react";

export default function MatchesPage() {
  const liveMatches = MATCHES_DATA.filter(m => m.status === "LIVE");
  const upcomingMatches = MATCHES_DATA.filter(m => m.status === "UPCOMING" || m.status === "DELAYED");

  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Radio className="w-8 h-8 text-pixel-orange-fiery animate-pulse" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              LIVE COURT ARENA & MATCH FEEDS
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              REAL-TIME SCOREBOARD MATRIX & LIVE COURT STATUS
            </p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-pixel text-xs text-pixel-orange-bright uppercase">
              LIVE ON COURT NOW
            </h2>
            <PixelBadge variant="orange" pulse>
              ● LIVE STREAM MATRIX
            </PixelBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((m) => (
              <PixelScoreboard key={m.id} match={m} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-pixel text-xs text-pixel-cream uppercase mb-4">
            UPCOMING COURTS & FIXTURES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingMatches.map((m) => (
              <PixelScoreboard key={m.id} match={m} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
