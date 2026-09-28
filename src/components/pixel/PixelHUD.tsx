"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Volume2, VolumeX, Sun, Moon } from "lucide-react";
import { PixelBadge } from "./PixelBadge";

interface PixelHUDProps {
  currentRoleTitle?: string;
  badge?: string;
  showRoleSwitcher?: boolean;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export const PixelHUD: React.FC<PixelHUDProps> = ({
  currentRoleTitle = "SOUTH ZONE 2026",
  badge = "ARCADE HUD",
  showRoleSwitcher = false,
  theme = "light",
  onToggleTheme,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [muted, setMuted] = useState<boolean>(true);
  const isLight = theme === "light";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 px-4 sm:px-6 py-2.5 select-none transition-colors duration-200 ${
        isLight
          ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs text-slate-900"
          : "bg-pixel-black/95 backdrop-blur-sm border-b-2 border-pixel-orange-fiery shadow-pixel-orange text-pixel-cream"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Logo & Current Role */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group text-xs sm:text-sm font-bold text-slate-900 hover:text-orange-600 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <span className="hidden sm:inline font-bold tracking-tight">
              SZWBT <span className="text-orange-600">2026</span>
            </span>
          </Link>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
              {currentRoleTitle}
            </span>
            <span className="hidden md:inline-flex text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80">
              {badge}
            </span>
          </div>
        </div>

        {/* Right: Controls & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock Display */}
          <div
            className={`hidden lg:flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full border ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700"
                : "bg-pixel-dark border-pixel-gray-800 text-pixel-amber"
            }`}
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span>{timeStr || "00:00:00"}</span>
          </div>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={isLight ? "Switch to Dark Theme" : "Switch to Light Theme"}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  : "bg-pixel-dark border-pixel-gray-700 text-pixel-gray-300 hover:text-pixel-orange-bright"
              }`}
            >
              {isLight ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span className="hidden sm:inline font-semibold">{isLight ? "Light" : "Dark"}</span>
            </button>
          )}

          {/* Sound Audio Toggle */}
          <button
            onClick={() => setMuted(!muted)}
            title={muted ? "Audio Muted (Click to enable)" : "Audio Ready"}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-orange-600 hover:bg-slate-100"
                : "bg-pixel-dark border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-orange-bright"
            }`}
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-orange-500" />
            )}
          </button>

        </div>
      </div>
    </header>
  );
};

