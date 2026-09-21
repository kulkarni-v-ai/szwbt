"use client";

import React from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { ANNOUNCEMENTS_DATA } from "@/data/announcements";
import { Megaphone, Pin } from "lucide-react";

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Megaphone className="w-8 h-8 text-pixel-orange-fiery animate-bounce" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              TOURNAMENT ANNOUNCEMENTS
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              OFFICIAL BROADCAST BULLETIN & ADVISORY NOTICES
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {ANNOUNCEMENTS_DATA.map((ann) => (
            <PixelCard
              key={ann.id}
              headerTitle={ann.title}
              headerBadge={ann.category}
              glow={ann.pinned}
            >
              <div className="flex flex-col gap-2 my-2">
                <div className="flex items-center justify-between text-[10px] font-pixel text-pixel-gray-400">
                  <span className="text-pixel-amber">{ann.date}</span>
                  {ann.pinned && (
                    <span className="flex items-center gap-1 text-pixel-orange-bright">
                      <Pin className="w-3 h-3" /> PINNED ANNOUNCEMENT
                    </span>
                  )}
                </div>
                <p className="font-sans text-xs text-pixel-cream leading-relaxed">
                  {ann.fullText}
                </p>
              </div>
            </PixelCard>
          ))}
        </div>
      </main>
    </div>
  );
}
