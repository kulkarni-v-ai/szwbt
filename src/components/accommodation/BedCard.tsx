"use client";

import React from "react";
import { BedItem } from "@/data/beds";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { User, Plus, MoveRight, UserMinus, ShieldAlert } from "lucide-react";

interface BedCardProps {
  bed: BedItem;
  roomNumber: string;
  hostelName: string;
  onAllocate?: (bed: BedItem) => void;
  onMove?: (bed: BedItem) => void;
  onVacate?: (bed: BedItem) => void;
}

export const BedCard: React.FC<BedCardProps> = ({
  bed,
  roomNumber,
  hostelName,
  onAllocate,
  onMove,
  onVacate,
}) => {
  const isAvailable = bed.status === "AVAILABLE";
  const isOccupied = bed.status === "OCCUPIED";

  return (
    <div className={`p-3 border-2 transition-all flex flex-col justify-between min-h-[110px] ${
      isOccupied
        ? "bg-pixel-dark border-pixel-orange-fiery/60 shadow-pixel-sm"
        : isAvailable
        ? "bg-pixel-black border-pixel-gray-800 hover:border-pixel-green"
        : "bg-pixel-gray-900 border-pixel-gray-800 opacity-80"
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-1.5 mb-2">
        <span className="font-pixel text-[10px] text-pixel-amber font-bold">
          {bed.bedNumber}
        </span>
        <PixelBadge
          variant={
            isOccupied
              ? "orange"
              : isAvailable
              ? "green"
              : bed.status === "RESERVED"
              ? "yellow"
              : "red"
          }
        >
          {bed.status}
        </PixelBadge>
      </div>

      {/* Content Body */}
      {isOccupied && bed.occupant ? (
        <div className="font-sans text-xs space-y-1 my-1">
          <p className="font-pixel text-[11px] text-pixel-cream font-bold truncate">
            {bed.occupant.name}
          </p>
          <p className="text-[10px] text-pixel-orange-bright font-pixel">
            {bed.occupant.role}
          </p>
          <p className="text-[10px] text-pixel-gray-400 truncate">
            {bed.occupant.team}
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-pixel-gray-800/60 mt-2 font-pixel text-[9px]">
            {onMove && (
              <button
                onClick={() => onMove(bed)}
                className="text-pixel-cyan hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <MoveRight className="w-3 h-3" /> MOVE
              </button>
            )}
            {onVacate && (
              <button
                onClick={() => onVacate(bed)}
                className="text-pixel-red hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
              >
                <UserMinus className="w-3 h-3" /> VACATE
              </button>
            )}
          </div>
        </div>
      ) : isAvailable ? (
        <div className="flex flex-col items-center justify-center my-auto py-2">
          <p className="font-sans text-[11px] text-pixel-gray-500 mb-2">BED VACANT</p>
          {onAllocate && (
            <button
              onClick={() => onAllocate(bed)}
              className="w-full py-1 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery text-pixel-orange-bright hover:text-black font-pixel text-[9px] border border-pixel-orange-fiery font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> ALLOCATE BED
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-2 font-pixel text-[9px] text-pixel-gray-500 uppercase">
          {bed.status}
        </div>
      )}
    </div>
  );
};
