"use client";

import React, { useState } from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelTabs } from "@/components/pixel/PixelTabs";
import { MATCHES_DATA } from "@/data/schedule";
import { Trophy, Award } from "lucide-react";

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState("HISTORY");

  const completedMatches = MATCHES_DATA.filter((m) => m.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Award className="w-8 h-8 text-pixel-orange-fiery animate-bounce" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              TOURNAMENT RESULTS & STANDINGS
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              OFFICIAL MATCH VICTORIES & HALL OF FAME LEADERBOARD
            </p>
          </div>
        </div>

        <div className="mb-6">
          <PixelTabs
            tabs={[
              { id: "HISTORY", label: "MATCH HISTORY", count: completedMatches.length },
              { id: "STANDINGS", label: "INSTITUTION STANDINGS", count: "ACTIVE" },
              { id: "MEDALS", label: "MEDAL TALLY", count: "8 CATS" },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === "HISTORY" && (
          <div className="bg-pixel-dark border-2 border-pixel-gray-800 p-4 shadow-pixel">
            <PixelTable
              columns={[
                { key: "matchNumber", header: "MATCH ID", render: (r) => <span className="font-pixel text-xs text-pixel-orange-bright">{r.matchNumber}</span> },
                { key: "category", header: "CATEGORY" },
                { key: "playerA", header: "WINNER", render: (r) => <span className="font-pixel text-xs text-pixel-green font-bold">👑 {r.playerA}</span> },
                { key: "playerB", header: "RUNNER-UP", render: (r) => <span className="font-pixel text-xs text-pixel-cream">{r.playerB}</span> },
                { key: "score", header: "SET SCORES", render: (r) => <span className="font-mono text-pixel-amber">{r.scoreA.join(" - ")} | {r.scoreB.join(" - ")}</span> },
              ]}
              data={completedMatches.length > 0 ? completedMatches : MATCHES_DATA}
              keyExtractor={(item) => item.id}
            />
          </div>
        )}

        {activeTab === "STANDINGS" && (
          <div className="p-8 text-center bg-pixel-dark border-2 border-pixel-gray-800 font-pixel text-xs text-pixel-amber">
            <Trophy className="w-12 h-12 mx-auto text-pixel-orange-fiery mb-3 animate-pulse" />
            <p>INSTITUTION STANDINGS WILL BE PUBLISHED UPON TOURNAMENT FINALS.</p>
            <p className="font-sans text-xs text-pixel-gray-500 mt-2">LEADERBOARD PREVIEW READY.</p>
          </div>
        )}

        {activeTab === "MEDALS" && (
          <div className="p-8 text-center bg-pixel-dark border-2 border-pixel-gray-800 font-pixel text-xs text-pixel-amber">
            <Award className="w-12 h-12 mx-auto text-pixel-yellow mb-3 animate-pulse" />
            <p>MEDAL TALLY MATRIX (GOLD, SILVER, BRONZE) — ACTIVE PREVIEW.</p>
          </div>
        )}
      </main>
    </div>
  );
}
