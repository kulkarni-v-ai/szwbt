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
}

export function PixelTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "NO DATA AVAILABLE — PLACEHOLDER",
  className,
}: PixelTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-pixel-gray-800 bg-pixel-black/60 font-pixel text-xs text-pixel-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={clsx("w-full", className)}>
      {/* Desktop Pixel Table */}
      <div className="hidden md:block overflow-x-auto border-2 border-pixel-gray-800 bg-pixel-dark shadow-pixel">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-pixel-black border-b-2 border-pixel-gray-800 font-pixel text-[10px] text-pixel-orange-bright uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 border-r border-pixel-gray-800/50 last:border-r-0">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pixel-gray-800/60 font-sans text-xs">
            {data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                className={clsx(
                  "hover:bg-pixel-orange-fiery/10 transition-colors",
                  idx % 2 === 0 ? "bg-pixel-dark" : "bg-pixel-black/40"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 border-r border-pixel-gray-800/40 last:border-r-0 text-pixel-cream">
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
            className="p-4 bg-pixel-dark border-2 border-pixel-gray-800 shadow-pixel-sm flex flex-col gap-2"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between text-xs border-b border-pixel-gray-800/40 pb-1.5 last:border-b-0 last:pb-0">
                <span className="font-pixel text-[9px] text-pixel-orange-bright uppercase">
                  {col.header}
                </span>
                <span className="font-sans text-pixel-cream font-medium">
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
