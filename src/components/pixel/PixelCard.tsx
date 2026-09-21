"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelCardProps {
  children: React.ReactNode;
  variant?: "dark" | "orange" | "navy" | "amber";
  className?: string;
  glow?: boolean;
  interactive?: boolean;
  headerTitle?: string;
  headerBadge?: string;
}

export const PixelCard: React.FC<PixelCardProps> = ({
  children,
  variant = "dark",
  className,
  glow = false,
  interactive = false,
  headerTitle,
  headerBadge,
}) => {
  const variantStyles = {
    dark: "bg-pixel-dark border-pixel-gray-700 text-pixel-cream",
    orange: "bg-pixel-brown border-pixel-orange-fiery text-pixel-cream",
    navy: "bg-pixel-navy border-pixel-gray-600 text-pixel-cream",
    amber: "bg-[#1f1707] border-pixel-amber text-pixel-cream",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "relative border-2 p-4 shadow-pixel transition-all duration-150",
          variantStyles[variant],
          interactive && "hover:-translate-y-1 hover:shadow-pixel-orange hover:border-pixel-orange-fiery cursor-pointer",
          glow && "shadow-pixel-glow border-pixel-orange-fiery",
          className
        )
      )}
    >
      {/* Corner Pixel Decorators */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-pixel-orange-fiery" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-pixel-orange-fiery" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pixel-orange-fiery" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-pixel-orange-fiery" />

      {headerTitle && (
        <div className="flex items-center justify-between border-b border-pixel-gray-700/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-pixel-orange-fiery animate-pulse" />
            <h3 className="font-pixel text-xs text-pixel-orange-bright uppercase tracking-wider">
              {headerTitle}
            </h3>
          </div>
          {headerBadge && (
            <span className="font-pixel text-[9px] bg-pixel-orange-fiery/20 text-pixel-orange-bright px-2 py-0.5 border border-pixel-orange-fiery/40">
              {headerBadge}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
