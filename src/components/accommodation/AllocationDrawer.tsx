"use client";

import React, { useState } from "react";
import { BedData } from "./BedCard";
import { RoomData } from "./RoomCard";
import { PersonSearch, PersonSearchItem } from "./PersonSearch";
import { X, CheckCircle2, Home, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

interface AllocationDrawerProps {
  bed: BedData;
  room: RoomData;
  hostelName: string;
  preSelectedPerson?: PersonSearchItem | null;
  onClose: () => void;
  onConfirmAllocation: (person: PersonSearchItem, bed: BedData, room: RoomData) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const AllocationDrawer: React.FC<AllocationDrawerProps> = ({
  bed,
  room,
  hostelName,
  preSelectedPerson,
  onClose,
  onConfirmAllocation,
  isSubmitting = false,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchItem | null>(
    preSelectedPerson || null
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="max-w-lg w-full bg-white border-2 border-orange-500 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-slate-900">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-orange-200 pb-3 mb-4">
          <div className="w-8 h-8 bg-orange-100 text-[#FF5A16] border border-orange-300 rounded-xl flex items-center justify-center">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-pixel text-sm sm:text-base text-slate-900 font-bold tracking-wider">
              ALLOCATE BED — {bed.bedNumber}
            </h3>
            <p className="font-sans text-xs text-slate-500">
              {hostelName} • ROOM {room.roomNumber} ({room.floorNumber})
            </p>
          </div>
        </div>

        {!selectedPerson ? (
          <PersonSearch
            hostelId={room.hostelId}
            onSelectPerson={(p) => setSelectedPerson(p)}
          />
        ) : (
          <div className="space-y-4 font-sans text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <span className="font-pixel text-[10px] text-slate-700 uppercase tracking-wider font-semibold">
                  CONFIRM ALLOCATION DOSSIER
                </span>
                <span className="font-pixel text-[8px] bg-orange-50 text-orange-700 border border-orange-200 rounded px-2 py-0.5 font-medium">
                  REVIEW STEP
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">PARTICIPANT:</span>
                  <span className="font-pixel text-xs text-slate-900 font-bold">{selectedPerson.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID / ROLE:</span>
                  <span className="font-mono text-orange-600 font-bold">
                    {selectedPerson.playerId || "REG-ID"} ({selectedPerson.role})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TEAM / INSTITUTION:</span>
                  <span className="text-slate-800 truncate max-w-[200px] text-right font-medium">
                    {selectedPerson.teamName || selectedPerson.institution}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GENDER:</span>
                  <span className="text-slate-700 font-mono">{selectedPerson.gender}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2.5 mt-2">
                  <span className="text-slate-500">ASSIGNED BED:</span>
                  <span className="font-pixel text-xs text-[#FF5A16] font-bold">
                    {hostelName} • ROOM {room.roomNumber} • {bed.bedNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Once confirmed, this bed becomes occupied immediately. The allocation is concurrency-locked and logged in the operational audit trail.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setSelectedPerson(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-pixel text-[10px] tracking-wider cursor-pointer transition-colors"
              >
                CHANGE PERSON
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onConfirmAllocation(selectedPerson, bed, room)}
                className="px-5 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white rounded-lg font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>TRANSACTING ALLOCATION...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>CONFIRM ALLOCATION</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
