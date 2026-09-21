"use client";

import React from "react";

interface PixelStatProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: "orange" | "amber" | "green" | "cyan" | "purple";
}

export const PixelStat: React.FC<PixelStatProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = "orange",
}) => {
  const accentColors = {
    orange: "border-pixel-orange-fiery text-pixel-orange-bright",
    amber: "border-pixel-amber text-pixel-amber",
    green: "border-pixel-green text-pixel-green",
    cyan: "border-pixel-cyan text-pixel-cyan",
    purple: "border-purple-500 text-purple-300",
  };

  return (
    <div className={`p-4 bg-pixel-black border-2 ${accentColors[accent].split(" ")[0]} shadow-pixel relative flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-pixel text-[10px] text-pixel-gray-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className={`${accentColors[accent].split(" ")[1]}`}>{icon}</div>}
      </div>
      <div>
        <div className={`font-pixel text-xl sm:text-2xl font-bold ${accentColors[accent].split(" ")[1]} tracking-tight`}>
          {value}
        </div>
        {subtext && (
          <p className="font-sans text-[11px] text-pixel-gray-500 mt-1 uppercase">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
