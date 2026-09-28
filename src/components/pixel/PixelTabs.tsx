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
    <div className={clsx("inline-flex flex-wrap p-1 bg-slate-100/90 rounded-xl border border-slate-200 gap-1", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "text-xs px-4 py-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2 select-none",
              isActive
                ? "bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "px-2 py-0.5 text-[10px] font-semibold rounded-full",
                  isActive
                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                    : "bg-slate-200/70 text-slate-600"
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
