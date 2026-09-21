"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Shield, Volume2, VolumeX } from "lucide-react";
import { PixelBadge } from "./PixelBadge";
import { ROLE_MATRIX } from "@/data/dashboard";

interface PixelHUDProps {
  currentRoleTitle?: string;
  badge?: string;
  showRoleSwitcher?: boolean;
}

export const PixelHUD: React.FC<PixelHUDProps> = ({
  currentRoleTitle = "SOUTH ZONE 2026",
  badge = "ARCADE HUD",
  showRoleSwitcher = true,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [muted, setMuted] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

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
    <header className="sticky top-0 z-50 bg-pixel-black/95 backdrop-blur-sm border-b-2 border-pixel-orange-fiery px-4 py-2.5 shadow-pixel-orange select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Arcade Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group font-pixel text-xs text-pixel-orange-bright hover:text-pixel-yellow transition-colors"
          >
            <Zap className="w-5 h-5 text-pixel-orange-fiery group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline tracking-wider font-bold">
              SZWBT 2026
            </span>
          </Link>
          <span className="text-pixel-gray-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[11px] text-pixel-cream uppercase tracking-wide">
              {currentRoleTitle}
            </span>
            <PixelBadge variant="orange" className="hidden md:inline-flex">
              {badge}
            </PixelBadge>
          </div>
        </div>

        {/* Right: Arcade Stats & Role Matrix Switcher */}
        <div className="flex items-center gap-3">
          {/* Clock Display */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-pixel-amber bg-pixel-dark px-2.5 py-1 border border-pixel-gray-800">
            <span className="w-1.5 h-1.5 bg-pixel-green rounded-full animate-ping" />
            <span>{timeStr || "00:00:00"}</span>
          </div>

          {/* Sound Audio Toggle */}
          <button
            onClick={() => setMuted(!muted)}
            title={muted ? "Audio Muted (Click to enable)" : "Audio Ready"}
            className="p-1.5 bg-pixel-dark border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-orange-bright cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-pixel-orange-fiery" />}
          </button>

          {/* Role Switcher Menu Toggle */}
          {showRoleSwitcher && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="font-pixel text-[10px] bg-pixel-orange-fiery text-black px-3 py-1.5 border border-black hover:bg-pixel-orange-bright font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>ROLES (18)</span>
              </button>

              {/* Role Matrix Dropdown Shell */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-pixel-black border-2 border-pixel-orange-fiery p-3 shadow-pixel-orange z-50">
                  <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-2 mb-2">
                    <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">
                      SELECT DASHBOARD ROLE
                    </span>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="font-pixel text-[10px] text-pixel-gray-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {ROLE_MATRIX.map((r) => (
                      <Link
                        key={r.roleId}
                        href={r.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="p-2 bg-pixel-dark hover:bg-pixel-orange-fiery/20 border border-pixel-gray-800 hover:border-pixel-orange-fiery flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <p className="font-pixel text-[11px] text-pixel-cream group-hover:text-pixel-orange-bright">
                            {r.roleName}
                          </p>
                          <p className="font-sans text-[10px] text-pixel-gray-400 truncate max-w-[180px]">
                            {r.description}
                          </p>
                        </div>
                        <span className="font-pixel text-[9px] bg-pixel-black text-pixel-amber px-1.5 py-0.5 border border-pixel-gray-700">
                          {r.badge}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
