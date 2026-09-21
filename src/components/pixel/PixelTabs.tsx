"use client";

import React from "react";
import { clsx } from "clsx";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
}

interface PixelTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const PixelTabs: React.FC<PixelTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div className={clsx("flex flex-wrap gap-2 border-b-2 border-pixel-gray-800 pb-2", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "font-pixel text-[10px] sm:text-xs px-4 py-2 border-2 uppercase transition-all duration-100 cursor-pointer flex items-center gap-2 select-none",
              isActive
                ? "bg-pixel-orange-fiery text-black border-black shadow-pixel-sm font-bold -translate-y-0.5"
                : "bg-pixel-dark text-pixel-gray-400 border-pixel-gray-800 hover:border-pixel-orange-fiery hover:text-pixel-cream"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "px-1.5 py-0.2 text-[9px] border",
                  isActive
                    ? "bg-black text-pixel-orange-bright border-black"
                    : "bg-pixel-gray-800 text-pixel-gray-400 border-pixel-gray-700"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
