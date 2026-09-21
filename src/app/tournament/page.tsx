"use client";

import React from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelTable } from "@/components/pixel/PixelTable";
import { CATEGORIES_DATA, TOURNAMENT_DATA, VENUE_DETAILS_DATA } from "@/data/tournament";
import { Trophy, Shield, MapPin, Calendar } from "lucide-react";

export default function TournamentPage() {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Trophy className="w-8 h-8 text-pixel-orange-fiery animate-bounce" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              TOURNAMENT OVERVIEW & RULES
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              SOUTH ZONE WOMEN'S BADMINTON TOURNAMENT 2026 OFFICIAL CATEGORIES & SPECIFICATIONS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <PixelCard headerTitle="OFFICIAL VENUE" headerBadge="LOCATION">
            <div className="flex items-center gap-3 my-2">
              <MapPin className="w-6 h-6 text-pixel-orange-bright" />
              <div>
                <p className="font-pixel text-xs text-pixel-amber">{VENUE_DETAILS_DATA.name}</p>
                <p className="font-sans text-xs text-pixel-gray-400">{VENUE_DETAILS_DATA.facilities.join(" • ")}</p>
              </div>
            </div>
          </PixelCard>

          <PixelCard headerTitle="DATES & SCHEDULE" headerBadge="CALENDAR">
            <div className="flex items-center gap-3 my-2">
              <Calendar className="w-6 h-6 text-pixel-orange-bright" />
              <div>
                <p className="font-pixel text-xs text-pixel-amber">{TOURNAMENT_DATA.dates}</p>
                <p className="font-sans text-xs text-pixel-gray-400">PUBLICATION PENDING FINAL FIXTURES</p>
              </div>
            </div>
          </PixelCard>

          <PixelCard headerTitle="ORGANIZING BODY" headerBadge="HOST">
            <div className="flex items-center gap-3 my-2">
              <Shield className="w-6 h-6 text-pixel-orange-bright" />
              <div>
                <p className="font-pixel text-xs text-pixel-amber">{TOURNAMENT_DATA.organizer}</p>
                <p className="font-sans text-xs text-pixel-gray-400">{TOURNAMENT_DATA.status}</p>
              </div>
            </div>
          </PixelCard>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-pixel text-xs text-pixel-orange-bright uppercase">
              COMPETITION CATEGORIES ({CATEGORIES_DATA.length})
            </h2>
            <PixelBadge variant="orange">OFFICIAL CATEGORY MATRIX</PixelBadge>
          </div>

          <PixelTable
            columns={[
              { key: "code", header: "CODE" },
              { key: "name", header: "CATEGORY NAME" },
              { key: "type", header: "TYPE" },
              { key: "eligibility", header: "ELIGIBILITY" },
              { key: "fee", header: "REGISTRATION FEE" },
              { key: "maxEntries", header: "MAX ENTRIES" },
            ]}
            data={CATEGORIES_DATA}
            keyExtractor={(item) => item.id}
          />
        </div>
      </main>
    </div>
  );
}
