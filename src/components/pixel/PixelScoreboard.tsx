"use client";

import React from "react";
import { MatchItem } from "@/data/schedule";
import { PixelBadge } from "./PixelBadge";

interface PixelScoreboardProps {
  match: MatchItem;
  className?: string;
}

export const PixelScoreboard: React.FC<PixelScoreboardProps> = ({ match, className }) => {
  const isLive = match.status === "LIVE";

  return (
    <div className={`relative bg-pixel-black border-2 border-pixel-orange-fiery p-4 shadow-pixel-orange ${className}`}>
      {/* Court Header */}
      <div className="flex items-center justify-between border-b-2 border-pixel-gray-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-xs text-pixel-orange-bright uppercase font-bold">
            {match.court}
          </span>
          <span className="font-pixel text-[10px] text-pixel-gray-400">
            [{match.category}]
          </span>
        </div>
        <PixelBadge
          variant={
            isLive ? "orange" : match.status === "COMPLETED" ? "green" : match.status === "DELAYED" ? "red" : "dark"
          }
          pulse={isLive}
        >
          {match.status}
        </PixelBadge>
      </div>

      {/* Players & Live Digital Score Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Player A */}
        <div className="flex items-center justify-between bg-pixel-dark p-3 border border-pixel-gray-800">
          <div>
            <p className="font-pixel text-xs text-pixel-cream">{match.playerA}</p>
            <p className="font-sans text-[11px] text-pixel-gray-500">{match.institutionA}</p>
          </div>
          <div className="flex items-center gap-1 font-pixel text-xl text-pixel-orange-bright bg-black px-3 py-1 border border-pixel-orange-fiery/40">
            {match.scoreA.map((s, idx) => (
              <span key={idx} className={idx === match.scoreA.length - 1 ? "text-pixel-amber font-bold" : "text-pixel-gray-600 text-sm"}>
                {s.toString().padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>

        {/* Player B */}
        <div className="flex items-center justify-between bg-pixel-dark p-3 border border-pixel-gray-800">
          <div>
            <p className="font-pixel text-xs text-pixel-cream">{match.playerB}</p>
            <p className="font-sans text-[11px] text-pixel-gray-500">{match.institutionB}</p>
          </div>
          <div className="flex items-center gap-1 font-pixel text-xl text-pixel-orange-bright bg-black px-3 py-1 border border-pixel-orange-fiery/40">
            {match.scoreB.map((s, idx) => (
              <span key={idx} className={idx === match.scoreB.length - 1 ? "text-pixel-amber font-bold" : "text-pixel-gray-600 text-sm"}>
                {s.toString().padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 text-[10px] font-pixel text-pixel-gray-400 pt-2 border-t border-pixel-gray-800/60">
        <span>MATCH ID: {match.matchNumber}</span>
        <span>SET: {match.currentSet}</span>
        <span>SCHEDULED: {match.time}</span>
      </div>
    </div>
  );
};
