"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelBadgeProps {
  children: React.ReactNode;
  variant?: "orange" | "green" | "yellow" | "purple" | "cyan" | "red" | "dark" | "gray" | "amber";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  children,
  variant = "orange",
  size = "md",
  pulse = false,
  className,
}) => {
  const variantStyles: Record<string, string> = {
    orange: "bg-pixel-orange-fiery/20 text-pixel-orange-bright border-pixel-orange-fiery",
    green: "bg-pixel-green/20 text-pixel-green border-pixel-green",
    yellow: "bg-pixel-yellow/20 text-pixel-yellow border-pixel-yellow",
    amber: "bg-pixel-amber/20 text-pixel-amber border-pixel-amber",
    purple: "bg-pixel-purple/40 text-purple-300 border-purple-500",
    cyan: "bg-pixel-cyan/20 text-pixel-cyan border-pixel-cyan",
    red: "bg-pixel-red/20 text-pixel-red border-pixel-red",
    dark: "bg-pixel-gray-800 text-pixel-gray-400 border-pixel-gray-700",
    gray: "bg-pixel-gray-800 text-pixel-gray-400 border-pixel-gray-700",
  };

  const sizeStyles: Record<string, string> = {
    sm: "text-[9px] px-1.5 py-0.5",
    md: "text-[10px] px-2 py-0.5",
    lg: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 font-pixel uppercase border tracking-wider select-none",
          variantStyles[variant] || variantStyles.orange,
          sizeStyles[size] || sizeStyles.md,
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
