"use client";

import React from "react";
import { RoomItem } from "@/data/rooms";
import { BedCard } from "./BedCard";
import { BedItem } from "@/data/beds";
import { PixelBadge } from "@/components/pixel/PixelBadge";

interface RoomCardProps {
  room: RoomItem;
  hostelName: string;
  onAllocateBed?: (bed: BedItem, room: RoomItem) => void;
  onMoveBed?: (bed: BedItem, room: RoomItem) => void;
  onVacateBed?: (bed: BedItem, room: RoomItem) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  hostelName,
  onAllocateBed,
  onMoveBed,
  onVacateBed,
}) => {
  const occupiedCount = room.beds.filter((b) => b.status === "OCCUPIED").length;
  const isFull = occupiedCount === room.capacity;

  return (
    <div className="bg-pixel-dark border-2 border-pixel-gray-800 p-4 shadow-pixel flex flex-col gap-3">
      {/* Room Header */}
      <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-pixel-orange-bright font-bold">
              {room.roomNumber}
            </span>
            <span className="font-pixel text-[9px] text-pixel-gray-400">
              [{room.floor}]
            </span>
          </div>
          <span className="font-sans text-[10px] text-pixel-gray-400 uppercase">
            4-BED ROOM MATRIX
          </span>
        </div>

        <PixelBadge variant={isFull ? "orange" : occupiedCount > 0 ? "yellow" : "green"}>
          {occupiedCount} / 4 OCCUPIED
        </PixelBadge>
      </div>

      {/* 4-Bed Layout Grid */}
      <div className="grid grid-cols-2 gap-2 my-1">
        {room.beds.map((bed) => (
          <BedCard
            key={bed.id}
            bed={bed}
            roomNumber={room.roomNumber}
            hostelName={hostelName}
            onAllocate={(b) => onAllocateBed && onAllocateBed(b, room)}
            onMove={(b) => onMoveBed && onMoveBed(b, room)}
            onVacate={(b) => onVacateBed && onVacateBed(b, room)}
          />
        ))}
      </div>
    </div>
  );
};
