"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelTabs } from "@/components/pixel/PixelTabs";
import { HostelSelector } from "@/components/accommodation/HostelSelector";
import { RoomCard } from "@/components/accommodation/RoomCard";
import { AllocationDrawer } from "@/components/accommodation/AllocationDrawer";
import { HOSTELS_DATA, INITIAL_ROOMS_DATA, INITIAL_ALLOCATION_HISTORY, AllocationHistoryItem } from "@/data/accommodation";
import { RoomItem } from "@/data/rooms";
import { BedItem } from "@/data/beds";
import { PARTICIPANTS_DATA, Participant } from "@/data/participants";
import { Home, Key, UserCheck, AlertTriangle, Search, MoveRight, UserMinus } from "lucide-react";

export default function AccommodationAdminDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "accommodation_admin")!;

  const [selectedHostelId, setSelectedHostelId] = useState<"SHALMALA" | "VINDHYA">("SHALMALA");
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [rooms, setRooms] = useState<RoomItem[]>(INITIAL_ROOMS_DATA);
  const [history, setHistory] = useState<AllocationHistoryItem[]>(INITIAL_ALLOCATION_HISTORY);

  // Active drawer state
  const [allocatingState, setAllocatingState] = useState<{ bed: BedItem; room: RoomItem } | null>(null);

  const currentHostel = HOSTELS_DATA.find((h) => h.id === selectedHostelId)!;

  // Filtered rooms for active hostel & floor
  const filteredRooms = rooms.filter((r) => {
    if (r.hostelId !== selectedHostelId) return false;
    if (selectedFloor !== "ALL" && r.floor !== selectedFloor) return false;
    return true;
  });

  // Calculate Hostel Statistics
  const getHostelStats = (hostelId: "SHALMALA" | "VINDHYA") => {
    const hostelRooms = rooms.filter((r) => r.hostelId === hostelId);
    let total = 0;
    let occupied = 0;
    hostelRooms.forEach((r) => {
      total += r.capacity;
      occupied += r.beds.filter((b) => b.status === "OCCUPIED").length;
    });
    return { total, occupied, available: total - occupied };
  };

  const shalmalaStats = getHostelStats("SHALMALA");
  const vindhyaStats = getHostelStats("VINDHYA");

  // Confirm Bed Allocation Handler
  const handleConfirmAllocation = (person: Participant, bed: BedItem, room: RoomItem) => {
    setRooms((prevRooms) =>
      prevRooms.map((r) => {
        if (r.id !== room.id) return r;
        return {
          ...r,
          beds: r.beds.map((b) => {
            if (b.id !== bed.id) return b;
            return {
              ...b,
              status: "OCCUPIED",
              occupant: {
                id: person.id,
                name: person.name,
                role: person.category,
                team: person.institution,
                institution: person.institution,
                gender: person.gender,
              },
            };
          }),
        };
      })
    );

    // Record audit history
    const newLog: AllocationHistoryItem = {
      id: `h-${Date.now()}`,
      personName: person.name,
      hostelName: currentHostel.name,
      roomNumber: room.roomNumber,
      bedNumber: bed.bedNumber,
      action: "ALLOCATED",
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
      operator: "Operator Demo",
    };
    setHistory([newLog, ...history]);
    setAllocatingState(null);
  };

  // Vacate Bed Handler
  const handleVacateBed = (bed: BedItem, room: RoomItem) => {
    const occupantName = bed.occupant?.name || "Occupant";
    if (!confirm(`Are you sure you want to vacate ${bed.bedNumber} in Room ${room.roomNumber}?`)) return;

    setRooms((prevRooms) =>
      prevRooms.map((r) => {
        if (r.id !== room.id) return r;
        return {
          ...r,
          beds: r.beds.map((b) => {
            if (b.id !== bed.id) return b;
            return { ...b, status: "AVAILABLE", occupant: undefined };
          }),
        };
      })
    );

    setHistory([
      {
        id: `h-${Date.now()}`,
        personName: occupantName,
        hostelName: currentHostel.name,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        action: "VACATED",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
        operator: "Operator Demo",
      },
      ...history,
    ]);
  };

  return (
    <DashboardShell currentRole={currentRole}>
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat
          label="SHALMALA HOSTEL"
          value={`${shalmalaStats.occupied} / ${shalmalaStats.total} BEDS`}
          subtext="Participants & Female Managers"
          icon={<Home className="w-5 h-5" />}
          accent="orange"
        />
        <PixelStat
          label="VINDHYA BOYS HOSTEL"
          value={`${vindhyaStats.occupied} / ${vindhyaStats.total} BEDS`}
          subtext="Male Managers & Support Staff"
          icon={<Key className="w-5 h-5" />}
          accent="amber"
        />
        <PixelStat
          label="TOTAL VACANT BEDS"
          value={`${shalmalaStats.available + vindhyaStats.available} VACANT`}
          subtext="Ready for Allocation"
          icon={<UserCheck className="w-5 h-5" />}
          accent="green"
        />
        <PixelStat
          label="ROOM CAPACITY"
          value="4 BEDS / ROOM"
          subtext="Standard 4-Bed Layout"
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="cyan"
        />
      </div>

      {/* Hostel Selector Cards (Shalmala vs Vindhya Boys) */}
      <HostelSelector
        selectedHostelId={selectedHostelId}
        onSelectHostel={(id) => {
          setSelectedHostelId(id);
          setSelectedFloor("ALL");
        }}
        shalmalaStats={shalmalaStats}
        vindhyaStats={vindhyaStats}
      />

      {/* Floor Filter Tabs */}
      <div className="mb-6">
        <PixelTabs
          tabs={[
            { id: "ALL", label: "ALL FLOORS" },
            ...currentHostel.floors.map((f) => ({ id: f, label: f })),
          ]}
          activeTab={selectedFloor}
          onChange={setSelectedFloor}
        />
      </div>

      {/* 4-Bed Room Grid Matrix */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-xs text-pixel-orange-bright uppercase">
            {currentHostel.name} — 4-BED ROOM MATRIX ({filteredRooms.length} ROOMS)
          </h2>
          <PixelBadge variant="orange">4 BEDS PER ROOM</PixelBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              hostelName={currentHostel.name}
              onAllocateBed={(bed, r) => setAllocatingState({ bed, room: r })}
              onVacateBed={(bed, r) => handleVacateBed(bed, r)}
            />
          ))}
        </div>
      </div>

      {/* Allocation History Audit Log */}
      <PixelCard headerTitle="ACCOMMODATION ALLOCATION AUDIT LOG" headerBadge="HISTORY">
        <div className="space-y-2 font-sans text-xs my-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-pixel-black border border-pixel-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <p className="font-pixel text-xs text-pixel-cream font-bold">{item.personName}</p>
                <p className="text-pixel-gray-400">
                  {item.hostelName} • Room {item.roomNumber} ({item.bedNumber})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <PixelBadge variant={item.action === "ALLOCATED" ? "green" : item.action === "VACATED" ? "red" : "orange"}>
                  {item.action}
                </PixelBadge>
                <span className="font-mono text-[10px] text-pixel-amber">{item.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </PixelCard>

      {/* Active Allocation Drawer Modal */}
      {allocatingState && (
        <AllocationDrawer
          bed={allocatingState.bed}
          room={allocatingState.room}
          hostelName={currentHostel.name}
          onClose={() => setAllocatingState(null)}
          onConfirmAllocation={handleConfirmAllocation}
        />
      )}
    </DashboardShell>
  );
}
