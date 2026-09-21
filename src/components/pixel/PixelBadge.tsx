"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelBadgeProps {
  children: React.ReactNode;
  variant?: "orange" | "green" | "yellow" | "purple" | "cyan" | "red" | "dark";
  pulse?: boolean;
  className?: string;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  children,
  variant = "orange",
  pulse = false,
  className,
}) => {
  const variantStyles = {
    orange: "bg-pixel-orange-fiery/20 text-pixel-orange-bright border-pixel-orange-fiery",
    green: "bg-pixel-green/20 text-pixel-green border-pixel-green",
    yellow: "bg-pixel-yellow/20 text-pixel-yellow border-pixel-yellow",
    purple: "bg-pixel-purple/40 text-purple-300 border-purple-500",
    cyan: "bg-pixel-cyan/20 text-pixel-cyan border-pixel-cyan",
    red: "bg-pixel-red/20 text-pixel-red border-pixel-red",
    dark: "bg-pixel-gray-800 text-pixel-gray-400 border-pixel-gray-700",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 font-pixel text-[10px] uppercase px-2 py-0.5 border tracking-wider select-none",
          variantStyles[variant],
          pulse && "animate-pulse",
          className
        )
      )}
    >
      <span className="w-1.5 h-1.5 bg-current inline-block" />
      {children}
    </span>
  );
};
