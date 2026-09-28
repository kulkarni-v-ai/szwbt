"use client";

import React from "react";
import { clsx } from "clsx";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface PixelTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  variant?: "dark" | "light" | "glass";
}

export function PixelTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "NO DATA AVAILABLE",
  className,
  variant = "dark",
}: PixelTableProps<T>) {
  const isLight = variant === "light";

  if (data.length === 0) {
    return (
      <div
        className={clsx(
          "p-8 text-center font-rajdhani text-xs font-bold uppercase rounded-xl border",
          isLight
            ? "border-dashed border-slate-200 bg-slate-50 text-slate-500"
            : "border-dashed border-white/10 bg-[#060D1A]/60 text-slate-400 backdrop-blur-md"
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={clsx("w-full", className)}>
      {/* Desktop Pixel Table */}
      <div
        className={clsx(
          "hidden md:block overflow-x-auto rounded-xl shadow-md border",
          isLight
            ? "border-slate-200 bg-white"
            : "border-white/10 bg-[#060D1A]/80 backdrop-blur-xl"
        )}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={clsx(
                "border-b font-rajdhani text-xs uppercase tracking-wider font-bold",
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-600"
                  : "bg-white/[0.04] border-white/10 text-[#00F0FF]"
              )}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    "px-4 py-3 border-r last:border-r-0",
                    isLight ? "border-slate-100" : "border-white/5"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={clsx(
              "divide-y font-sans text-xs",
              isLight ? "divide-slate-100" : "divide-white/5"
            )}
          >
            {data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                className={clsx(
                  "transition-colors",
                  isLight
                    ? idx % 2 === 0
                      ? "bg-white hover:bg-orange-50/40"
                      : "bg-slate-50/50 hover:bg-orange-50/40"
                    : idx % 2 === 0
                    ? "bg-transparent hover:bg-white/[0.05]"
                    : "bg-white/[0.02] hover:bg-white/[0.05]"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      "px-4 py-3.5 border-r last:border-r-0",
                      isLight
                        ? "border-slate-100 text-slate-800"
                        : "border-white/5 text-slate-200 font-medium"
                    )}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Pixel Cards View */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className={clsx(
              "p-4 rounded-xl shadow-sm border flex flex-col gap-2",
              isLight
                ? "bg-white border-slate-200"
                : "bg-[#060D1A]/90 border-white/10 backdrop-blur-xl"
            )}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={clsx(
                  "flex items-center justify-between text-xs border-b pb-1.5 last:border-b-0 last:pb-0",
                  isLight ? "border-slate-100" : "border-white/10"
                )}
              >
                <span
                  className={clsx(
                    "font-rajdhani text-[11px] uppercase font-bold",
                    isLight ? "text-[#FF5A16]" : "text-[#00F0FF]"
                  )}
                >
                  {col.header}
                </span>
                <span
                  className={clsx(
                    "font-sans font-medium",
                    isLight ? "text-slate-800" : "text-white"
                  )}
                >
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
