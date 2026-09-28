"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelCardProps {
  children: React.ReactNode;
  variant?: "dark" | "orange" | "navy" | "amber" | "light";
  className?: string;
  glow?: boolean;
  interactive?: boolean;
  headerTitle?: string;
  headerBadge?: string;
  headerBadgeVariant?: string;
  retroCorners?: boolean;
}

export const PixelCard: React.FC<PixelCardProps> = ({
  children,
  variant = "dark",
  className,
  glow = false,
  interactive = false,
  headerTitle,
  headerBadge,
  headerBadgeVariant,
  retroCorners = false,
}) => {
  const variantStyles = {
    light: "bg-white border-slate-200 text-slate-900 shadow-xs",
    dark: "bg-white border-slate-200 text-slate-900 shadow-xs",
    orange: "bg-orange-50/40 border-orange-200 text-slate-900 shadow-xs",
    navy: "bg-slate-50 border-slate-200 text-slate-900 shadow-xs",
    amber: "bg-amber-50/30 border-amber-200 text-slate-900 shadow-xs",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "pixel-card relative border rounded-xl p-4 sm:p-5 transition-all duration-150 text-slate-900",
          variantStyles[variant],
          interactive && "hover:-translate-y-0.5 hover:shadow-md hover:border-orange-300 cursor-pointer",
          glow && "ring-2 ring-orange-500/20 border-orange-500",
          className
        )
      )}
    >
      {/* Corner Pixel Decorators only if retroCorners explicitly enabled */}
      {retroCorners && (
        <>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-pixel-orange-fiery" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-pixel-orange-fiery" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pixel-orange-fiery" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-pixel-orange-fiery" />
        </>
      )}

      {headerTitle && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">
              {headerTitle}
            </h3>
          </div>
          {headerBadge && (
            <span className="text-[11px] font-medium bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200/80">
              {headerBadge}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
