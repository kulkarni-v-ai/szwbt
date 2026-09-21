"use client";

import React, { useState } from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelTabs } from "@/components/pixel/PixelTabs";
import { MATCHES_DATA, COURTS_DATA } from "@/data/schedule";
import { Calendar } from "lucide-react";

export default function SchedulePage() {
  const [activeCourtFilter, setActiveCourtFilter] = useState("ALL");

  const filteredMatches = activeCourtFilter === "ALL"
    ? MATCHES_DATA
    : MATCHES_DATA.filter(m => m.court.replace(" ", "") === activeCourtFilter);

  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Calendar className="w-8 h-8 text-pixel-orange-fiery animate-bounce" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              ARCADE MATCH SCHEDULE
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              REAL-TIME DIGIT SCOREBOARD & COURT TIMINGS MATRIX
            </p>
          </div>
        </div>

        {/* Court Tabs Filter */}
        <div className="mb-6">
          <PixelTabs
            tabs={[
              { id: "ALL", label: "ALL COURTS", count: MATCHES_DATA.length },
              { id: "COURT01", label: "COURT 01", count: 1 },
              { id: "COURT02", label: "COURT 02", count: 1 },
              { id: "COURT03", label: "COURT 03", count: 1 },
              { id: "COURT04", label: "COURT 04", count: 1 },
            ]}
            activeTab={activeCourtFilter}
            onChange={setActiveCourtFilter}
          />
        </div>

        {/* Schedule Scoreboard Matrix */}
        <div className="bg-pixel-dark border-2 border-pixel-gray-800 p-4 shadow-pixel">
          <div className="flex items-center justify-between mb-4 border-b border-pixel-gray-800 pb-2">
            <span className="font-pixel text-xs text-pixel-orange-bright uppercase">
              MATCH TIMINGS SCOREBOARD
            </span>
            <PixelBadge variant="orange" pulse>
              LIVE SYNC
            </PixelBadge>
          </div>

          <PixelTable
            columns={[
              { key: "time", header: "TIME", render: (r) => <span className="font-mono text-pixel-amber">{r.time}</span> },
              { key: "court", header: "COURT", render: (r) => <span className="font-pixel text-[10px] text-pixel-cream">{r.court}</span> },
              { key: "matchNumber", header: "MATCH", render: (r) => <span className="font-pixel text-[10px] text-pixel-orange-bright">{r.matchNumber}</span> },
              { key: "category", header: "CATEGORY" },
              {
                key: "players",
                header: "PLAYERS",
                render: (r) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-pixel text-[10px] text-pixel-cream">{r.playerA} ({r.institutionA})</span>
                    <span className="text-[10px] text-pixel-gray-500">VS</span>
                    <span className="font-pixel text-[10px] text-pixel-cream">{r.playerB} ({r.institutionB})</span>
                  </div>
                ),
              },
              {
                key: "status",
                header: "STATUS",
                render: (r) => (
                  <PixelBadge
                    variant={r.status === "LIVE" ? "orange" : r.status === "COMPLETED" ? "green" : r.status === "DELAYED" ? "red" : "dark"}
                    pulse={r.status === "LIVE"}
                  >
                    {r.status}
                  </PixelBadge>
                ),
              },
            ]}
            data={filteredMatches}
            keyExtractor={(item) => item.id}
          />
        </div>
      </main>
    </div>
  );
}
