"use client";

import React from "react";
import { User, Plus, MoveRight, UserMinus, Shield, CheckCircle2 } from "lucide-react";

export interface BedData {
  id: string;
  bedNumber: string;
  status: string; // "AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"
  occupant?: {
    allocationId?: string;
    id: string;
    name: string;
    playerId?: string;
    gender: string;
    institution: string;
    state?: string;
    role: string;
    teamName: string;
    allocatedBy?: string;
    checkInDate?: string;
  } | null;
}

interface BedCardProps {
  bed: BedData;
  roomNumber: string;
  hostelName: string;
  onAllocate?: (bed: BedData) => void;
  onMove?: (bed: BedData) => void;
  onVacate?: (bed: BedData) => void;
  onViewDetails?: (bed: BedData) => void;
}

export const BedCard: React.FC<BedCardProps> = ({
  bed,
  roomNumber,
  hostelName,
  onAllocate,
  onMove,
  onVacate,
  onViewDetails,
}) => {
  const isAvailable = bed.status === "AVAILABLE";
  const isOccupied = bed.status === "OCCUPIED";
  const isReserved = bed.status === "RESERVED";
  const isMaintenance = bed.status === "MAINTENANCE";

  return (
    <div
      className={`p-3 rounded-xl border transition-all flex flex-col justify-between min-h-[125px] shadow-2xs ${
        isOccupied
          ? "bg-emerald-50/20 border-emerald-300"
          : isAvailable
          ? "bg-white border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/10"
          : isReserved
          ? "bg-amber-50/40 border-amber-300"
          : "bg-slate-100 border-slate-200 opacity-60"
      }`}
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 font-pixel">
        <span className="text-xs text-slate-900 font-bold tracking-wider">
          {bed.bedNumber}
        </span>
        <span
          className={`text-[8px] px-2 py-0.5 uppercase tracking-wider font-bold rounded border ${
            isOccupied
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : isAvailable
              ? "bg-slate-100 text-slate-600 border-slate-200"
              : isReserved
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : "bg-rose-100 text-rose-800 border-rose-300"
          }`}
        >
          {isOccupied ? "● OCCUPIED" : isAvailable ? "○ AVAILABLE" : bed.status}
        </span>
      </div>

      {/* Content Body */}
      {isOccupied && bed.occupant ? (
        <div className="text-xs space-y-1 my-0.5">
          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{bed.occupant.name}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="text-[#FF5A16] font-semibold">{bed.occupant.role}</span>
            <span>{bed.occupant.gender}</span>
          </div>

          <div className="text-[10px] text-slate-500 truncate font-sans">
            {bed.occupant.teamName || bed.occupant.institution}
          </div>

          {/* Action buttons for occupied bed */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 font-pixel text-[9px]">
            {onMove && (
              <button
                type="button"
                onClick={() => onMove(bed)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                title="Transfer person to another room/bed"
              >
                <MoveRight className="w-3 h-3" />
                <span>MOVE</span>
              </button>
            )}

            {onVacate && (
              <button
                type="button"
                onClick={() => onVacate(bed)}
                className="text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors ml-auto"
                title="Vacate and release this bed"
              >
                <UserMinus className="w-3 h-3" />
                <span>VACATE</span>
              </button>
            )}
          </div>
        </div>
      ) : isAvailable ? (
        <div className="flex flex-col items-center justify-center my-auto py-1 space-y-2">
          <span className="font-mono text-[10px] text-slate-400">Vacant & Clean</span>
          {onAllocate && (
            <button
              type="button"
              onClick={() => onAllocate(bed)}
              className="w-full py-1.5 px-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white rounded-lg font-pixel text-[9px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>ALLOCATE BED</span>
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-4 font-pixel text-[9px] text-slate-400 uppercase tracking-wider">
          {isReserved ? "★ RESERVED FOR TEAM" : "⚠ OUT OF SERVICE"}
        </div>
      )}
    </div>
  );
};
