"use client";

import React, { useState } from "react";
import { BedItem } from "@/data/beds";
import { RoomItem } from "@/data/rooms";
import { Participant } from "@/data/participants";
import { PersonSearch } from "./PersonSearch";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { X, CheckCircle2, User, Home } from "lucide-react";

interface AllocationDrawerProps {
  bed: BedItem;
  room: RoomItem;
  hostelName: string;
  onClose: () => void;
  onConfirmAllocation: (person: Participant, bed: BedItem, room: RoomItem) => void;
}

export const AllocationDrawer: React.FC<AllocationDrawerProps> = ({
  bed,
  room,
  hostelName,
  onClose,
  onConfirmAllocation,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<Participant | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-pixel-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="max-w-lg w-full bg-pixel-dark border-4 border-pixel-orange-fiery p-6 shadow-pixel-orange relative animate-[pixelPulse_0.2s_ease-out]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-pixel-black text-pixel-gray-400 hover:text-white border border-pixel-gray-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 border-b-2 border-pixel-orange-fiery pb-3 mb-4">
          <Home className="w-6 h-6 text-pixel-orange-fiery" />
          <div>
            <h3 className="font-display text-lg text-pixel-cream font-bold">
              ALLOCATE BED — {bed.bedNumber}
            </h3>
            <p className="font-sans text-xs text-pixel-gray-400">
              {hostelName} • ROOM {room.roomNumber} ({room.floor})
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
            <PixelCard headerTitle="CONFIRM BED ALLOCATION DETAILS" headerBadge="REVIEW">
              <div className="space-y-2 my-2">
                <div className="flex justify-between">
                  <span className="text-pixel-gray-400">SELECTED PERSON:</span>
                  <span className="font-pixel text-xs text-pixel-cream">{selectedPerson.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-gray-400">ID / ROLE:</span>
                  <span className="font-mono text-pixel-amber">{selectedPerson.playerId} ({selectedPerson.category})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pixel-gray-400">INSTITUTION:</span>
                  <span className="text-pixel-cream">{selectedPerson.institution}</span>
                </div>
                <div className="flex justify-between border-t border-pixel-gray-800 pt-2">
                  <span className="text-pixel-gray-400">DESTINATION:</span>
                  <span className="font-pixel text-xs text-pixel-orange-bright">
                    {hostelName} • ROOM {room.roomNumber} • {bed.bedNumber}
                  </span>
                </div>
              </div>
            </PixelCard>

            <div className="flex items-center justify-between pt-2">
              <PixelButton variant="dark" size="sm" onClick={() => setSelectedPerson(null)}>
                CHANGE PERSON
              </PixelButton>

              <PixelButton
                variant="primary"
                size="md"
                glow
                onClick={() => onConfirmAllocation(selectedPerson, bed, room)}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM ALLOCATION</span>
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
