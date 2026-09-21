"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface PixelSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
  error?: string;
}

export const PixelSelect: React.FC<PixelSelectProps> = ({
  label,
  options,
  error,
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
      <select
        className={twMerge(
          clsx(
            "w-full bg-pixel-black text-pixel-cream font-sans text-sm px-4 py-2.5 border-2 border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none shadow-pixel-sm transition-colors cursor-pointer",
            error && "border-pixel-red",
            className
          )
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-pixel-dark text-pixel-cream">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="font-pixel text-[9px] text-pixel-red mt-0.5">
          ⚠ {error}
        </span>
      )}
    </div>
  );
};
