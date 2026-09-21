"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PixelInput: React.FC<PixelInputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="font-pixel text-[11px] text-pixel-orange-bright uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={twMerge(
          clsx(
            "w-full bg-pixel-black text-pixel-cream font-sans text-sm px-4 py-2.5 border-2 border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none shadow-pixel-sm transition-colors placeholder:text-pixel-gray-600",
            error && "border-pixel-red text-pixel-red",
            className
          )
        )}
        {...props}
      />
      {error && (
        <span className="font-pixel text-[9px] text-pixel-red mt-0.5">
          ⚠ {error}
        </span>
      )}
      {helperText && !error && (
        <span className="font-sans text-xs text-pixel-gray-500">
          {helperText}
        </span>
      )}
    </div>
  );
};
