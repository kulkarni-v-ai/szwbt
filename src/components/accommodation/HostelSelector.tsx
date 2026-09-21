"use client";

import React from "react";
import { HOSTELS_DATA, HostelDetails } from "@/data/accommodation";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Home, Users, CheckCircle2 } from "lucide-react";

interface HostelSelectorProps {
  selectedHostelId: "SHALMALA" | "VINDHYA";
  onSelectHostel: (id: "SHALMALA" | "VINDHYA") => void;
  shalmalaStats: { total: number; occupied: number; available: number };
  vindhyaStats: { total: number; occupied: number; available: number };
}

export const HostelSelector: React.FC<HostelSelectorProps> = ({
  selectedHostelId,
  onSelectHostel,
  shalmalaStats,
  vindhyaStats,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {HOSTELS_DATA.map((h) => {
        const isSelected = selectedHostelId === h.id;
        const stats = h.id === "SHALMALA" ? shalmalaStats : vindhyaStats;

        return (
          <div
            key={h.id}
            onClick={() => onSelectHostel(h.id)}
            className="cursor-pointer"
          >
            <PixelCard
              headerTitle={h.name}
              headerBadge={h.id}
              glow={isSelected}
              className={isSelected ? "border-pixel-orange-fiery bg-pixel-brown/40" : "hover:border-pixel-gray-600"}
            >
              <div className="flex flex-col gap-2 my-2 font-sans text-xs">
                <p className="text-pixel-gray-300 font-medium">{h.targetAudience}</p>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-pixel-gray-800 text-center font-pixel text-[10px]">
                  <div className="bg-pixel-black p-2 border border-pixel-gray-800">
                    <span className="block text-pixel-gray-400">TOTAL BEDS</span>
                    <span className="text-pixel-cream text-xs">{stats.total}</span>
                  </div>
                  <div className="bg-pixel-black p-2 border border-pixel-gray-800">
                    <span className="block text-pixel-orange-bright">OCCUPIED</span>
                    <span className="text-pixel-orange-bright text-xs">{stats.occupied}</span>
                  </div>
                  <div className="bg-pixel-black p-2 border border-pixel-gray-800">
                    <span className="block text-pixel-green">AVAILABLE</span>
                    <span className="text-pixel-green text-xs">{stats.available}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 text-[10px] font-pixel">
                  <span className="text-pixel-amber">FLOORS: {h.floors.length}</span>
                  <PixelBadge variant={isSelected ? "orange" : "dark"}>
                    {isSelected ? "● SELECTED HOSTEL" : "CLICK TO SELECT"}
                  </PixelBadge>
                </div>
              </div>
            </PixelCard>
          </div>
        );
      })}
    </div>
  );
};
