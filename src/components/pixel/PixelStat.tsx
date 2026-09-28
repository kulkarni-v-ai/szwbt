"use client";

import React from "react";

interface PixelStatProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: "orange" | "amber" | "green" | "cyan" | "purple";
}

export const PixelStat: React.FC<PixelStatProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = "orange",
}) => {
  const accentIconStyles = {
    orange: "bg-orange-50 text-orange-600 border border-orange-100",
    amber: "bg-amber-50 text-amber-600 border border-amber-100",
    green: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    cyan: "bg-teal-50 text-teal-600 border border-teal-100",
    purple: "bg-purple-50 text-purple-600 border border-purple-100",
  };

  const accentTopBorder = {
    orange: "border-t-2 border-t-orange-500",
    amber: "border-t-2 border-t-amber-500",
    green: "border-t-2 border-t-emerald-500",
    cyan: "border-t-2 border-t-teal-500",
    purple: "border-t-2 border-t-purple-500",
  };

  return (
    <div
      className={`p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between ${accentTopBorder[accent]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentIconStyles[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
