"use client";

import React from "react";
import Link from "next/link";
import { X, Zap, Shield, ChevronRight } from "lucide-react";
import { PUBLIC_NAV_ITEMS } from "./ArcadeNav";
import { PixelBadge } from "@/components/pixel/PixelBadge";

interface MobileArcadeMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileArcadeMenu: React.FC<MobileArcadeMenuProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-pixel-black/98 flex flex-col justify-between p-6 overflow-y-auto animate-[pixelPulse_0.2s_ease-out]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-pixel-orange-fiery animate-bounce" />
          <span className="font-display text-lg text-pixel-cream tracking-tight">
            ARCADE MENU
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-pixel-orange-fiery text-black font-bold border-2 border-black hover:bg-pixel-orange-bright cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Large Touch-First Arcade Navigation Items */}
      <div className="flex flex-col gap-3 my-auto py-6">
        <PixelBadge variant="orange" className="self-start mb-2">
          LEVEL SELECT
        </PixelBadge>

        {PUBLIC_NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            onClick={onClose}
            className="p-4 bg-pixel-dark border-2 border-pixel-gray-800 hover:border-pixel-orange-fiery hover:bg-pixel-orange-fiery/10 flex items-center justify-between group transition-all"
          >
            <span className="font-pixel text-sm text-pixel-cream group-hover:text-pixel-orange-bright group-hover:translate-x-1 transition-transform">
              {item.label}
            </span>
            <ChevronRight className="w-5 h-5 text-pixel-orange-fiery group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>

      {/* Footer CTA & Dashboard Hub */}
      <div className="flex flex-col gap-3 border-t border-pixel-gray-800 pt-4">
        <Link
          href="/register"
          onClick={onClose}
          className="w-full py-3 bg-pixel-orange-fiery text-black font-pixel text-center text-xs border-2 border-black font-bold shadow-pixel"
        >
          ENTER ARENA →
        </Link>
        <Link
          href="/admin"
          onClick={onClose}
          className="w-full py-3 bg-pixel-gray-900 text-pixel-cream font-pixel text-center text-xs border-2 border-pixel-gray-700 flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4 text-pixel-amber" />
          <span>OPEN 18 DASHBOARDS HUB</span>
        </Link>
      </div>
    </div>
  );
};
