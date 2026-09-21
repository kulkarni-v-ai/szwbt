"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  children: React.ReactNode;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  variant = "primary",
  size = "md",
  glow = false,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "relative inline-flex items-center justify-center font-pixel text-center transition-all duration-100 select-none uppercase tracking-wider active:translate-x-0.5 active:translate-y-0.5 cursor-pointer";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[10px] border-2",
    md: "px-5 py-2.5 text-xs border-2 shadow-pixel-sm",
    lg: "px-8 py-3.5 text-sm border-4 shadow-pixel",
  };

  const variantStyles = {
    primary:
      "bg-pixel-orange-fiery text-black border-black hover:bg-pixel-orange-bright hover:shadow-pixel-orange",
    secondary:
      "bg-pixel-navy text-pixel-cream border-black hover:bg-pixel-gray-800 hover:text-pixel-orange-bright",
    accent:
      "bg-pixel-amber text-black border-black hover:bg-pixel-yellow",
    outline:
      "bg-transparent text-pixel-orange-bright border-pixel-orange-fiery hover:bg-pixel-orange-fiery/10",
    danger:
      "bg-pixel-red text-white border-black hover:bg-red-600",
    dark:
      "bg-pixel-gray-900 text-pixel-cream border-pixel-gray-700 hover:border-pixel-orange-fiery hover:text-pixel-orange-fiery",
  };

  const glowStyles = glow ? "shadow-pixel-glow animate-pulse-glow" : "";

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          glowStyles,
          className
        )
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};
