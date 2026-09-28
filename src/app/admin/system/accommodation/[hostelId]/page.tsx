"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  Building2, Plus, Home, Layers, Bed, Users, ShieldAlert,
  CheckCircle2, X, RefreshCw, Edit3, ArrowLeft, Loader2, Sparkles,
  AlertTriangle, Key
} from "lucide-react";

interface BedInfo {
  id: string;
  bedNumber: string;
  displayName?: string;
  status: string;
  allocations?: {
    id: string;
    participant?: {
      id: string;
      name: string;
      role: string;
    };
    team?: {
      name: string;
    };
  }[];
}

interface RoomInfo {
  id: string;
  roomNumber: string;
  displayName?: string;
  capacity: number;
  status: string;
  floorNumber?: string;
  floorId?: string;
  beds: BedInfo[];
}

interface FloorInfo {
  id: string;
  name: string;
  floorNumber: number;
  status: string;
  rooms: RoomInfo[];
}

interface HostelDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  genderAllowed: string;
  totalFloors: number;
  floors: FloorInfo[];
  rooms: RoomInfo[];
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
}

export default function HostelConfigDetailPage() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "super_admin")!;
  const { user } = useAuth();
  const params = useParams();
  const hostelId = params?.hostelId as string;

  const [hostel, setHostel] = useState<HostelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFloorId, setSelectedFloorId] = useState<string>("ALL");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  // Edit Room Modal
  const [editingRoom, setEditingRoom] = useState<RoomInfo | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editRoomDisplayName, setEditRoomDisplayName] = useState("");
  const [editRoomCapacity, setEditRoomCapacity] = useState(5);
  const [editRoomStatus, setEditRoomStatus] = useState("ACTIVE");
  const [forceOverrideOccupants, setForceOverrideOccupants] = useState(false);
  const [submittingRoomEdit, setSubmittingRoomEdit] = useState(false);

  // Expanded Room for Bed Management
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  // Add Bed Form
  const [newBedNumber, setNewBedNumber] = useState("");
  const [submittingAddBed, setSubmittingAddBed] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchHostelDetail = async () => {
    if (!hostelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accommodation/hostels/${hostelId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hostel) {
          setHostel(data.hostel);
        }
      }
    } catch (err) {
      console.error("Failed to load hostel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelDetail();
  }, [hostelId]);

  // Open Edit Room Modal
  const handleOpenEditRoom = (room: RoomInfo) => {
    setEditingRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditRoomDisplayName(room.displayName || room.roomNumber);
    setEditRoomCapacity(room.capacity);
    setEditRoomStatus(room.status);
    setForceOverrideOccupants(false);
  };

  // Submit Room Edit
  const handleSaveRoomEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setSubmittingRoomEdit(true);
    try {
      const res = await fetch(`/api/admin/accommodation/rooms/${editingRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: editRoomNumber,
          displayName: editRoomDisplayName,
          capacity: editRoomCapacity,
          status: editRoomStatus,
          forceOverrideOccupants,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("ROOM CONFIGURATION UPDATED");
        setEditingRoom(null);
        fetchHostelDetail();
      } else {
        showToast(data.error || "Failed to update room", "error");
      }
    } catch (err: any) {
      showToast("Network error updating room", "error");
    } finally {
      setSubmittingRoomEdit(false);
    }
  };

  // Update Bed Status directly
  const handleUpdateBedStatus = async (bedId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/accommodation/beds/${bedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("BED STATUS UPDATED");
        fetchHostelDetail();
      } else {
        showToast(data.error || "Cannot update bed status", "error");
      }
    } catch (err) {
      showToast("Network error updating bed", "error");
    }
  };

  // Add Bed to Room
  const handleAddBed = async (roomId: string) => {
    if (!newBedNumber.trim()) {
      showToast("Enter a bed number / identifier", "error");
      return;
    }

    setSubmittingAddBed(true);
    try {
      const res = await fetch(`/api/admin/accommodation/rooms/${roomId}/beds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedNumber: newBedNumber.trim(),
          displayName: newBedNumber.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`BED ${newBedNumber} ADDED SUCCESSFULLY`);
        setNewBedNumber("");
        fetchHostelDetail();
      } else {
        showToast(data.error || "Failed to add bed", "error");
      }
    } catch (err) {
      showToast("Network error adding bed", "error");
    } finally {
      setSubmittingAddBed(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell currentRole={currentRole}>
        <div className="p-16 text-center text-[#91A0AE] font-pixel text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF5A16]" />
          <span>LOADING HOSTEL TOPOLOGY...</span>
        </div>
      </DashboardShell>
    );
  }

  if (!hostel) {
    return (
      <DashboardShell currentRole={currentRole}>
        <div className="p-12 text-center text-rose-400 font-pixel text-xs">
          HOSTEL NOT FOUND
        </div>
      </DashboardShell>
    );
  }

  // Filter rooms based on selected floor
  const displayedRooms = hostel.rooms.filter((r) => {
    if (selectedFloorId === "ALL") return true;
    return r.floorId === selectedFloorId || r.floorNumber === selectedFloorId;
  });

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 pb-20 text-[#F4E6CE]">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 border-2 shadow-[4px_4px_0px_#000] flex items-center gap-3 select-none ${
              toast.type === "success"
                ? "bg-[#07101D] border-emerald-500 text-emerald-300"
                : toast.type === "warning"
                ? "bg-[#07101D] border-amber-500 text-amber-300"
                : "bg-[#07101D] border-rose-500 text-rose-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className="font-pixel text-xs">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back Link & Header */}
        <div>
          <Link
            href="/admin/system/accommodation"
            className="inline-flex items-center gap-1.5 font-pixel text-[10px] text-[#18D8D0] hover:text-white mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO ACCOMMODATION OVERVIEW</span>
          </Link>

          <div className="bg-[#07101D] border-2 border-[#18D8D0]/40 p-5 shadow-[3px_3px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[9px] bg-[#FF5A16] text-white px-2 py-0.5 uppercase font-bold">
                  {hostel.code}
                </span>
                <span
                  className={`font-pixel text-[9px] px-2 py-0.5 border ${
                    hostel.status === "ACTIVE"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                      : "bg-rose-950 text-rose-300 border-rose-500"
                  }`}
                >
                  {hostel.status}
                </span>
                <span className="font-mono text-xs text-[#18D8D0]">
                  GENDER: {hostel.genderAllowed}
                </span>
              </div>
              <h1 className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold mt-1">
                {hostel.name}
              </h1>
              <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
                {hostel.description || "Hostel residential block"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-[#050914] border border-white/10 font-pixel text-center">
              <div>
                <span className="text-[8px] text-[#91A0AE] block">ROOMS</span>
                <span className="text-sm sm:text-base text-[#F4E6CE] font-bold">
                  {hostel.rooms.length}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-[#91A0AE] block">OCCUPIED</span>
                <span className="text-sm sm:text-base text-emerald-400 font-bold">
                  {hostel.occupiedBeds}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-[#91A0AE] block">AVAILABLE</span>
                <span className="text-sm sm:text-base text-[#18D8D0] font-bold">
                  {hostel.availableBeds}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floor Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[#07101D] border border-white/10">
          <span className="font-pixel text-[10px] text-[#91A0AE] mr-2">FILTER BY FLOOR:</span>
          <button
            onClick={() => setSelectedFloorId("ALL")}
            className={`px-3 py-1 font-pixel text-[9px] border cursor-pointer ${
              selectedFloorId === "ALL"
                ? "bg-[#FF5A16] text-white border-black font-bold"
                : "bg-[#050914] text-[#91A0AE] border-white/20"
            }`}
          >
            ALL FLOORS ({hostel.rooms.length})
          </button>
          {hostel.floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setSelectedFloorId(floor.id)}
              className={`px-3 py-1 font-pixel text-[9px] border cursor-pointer ${
                selectedFloorId === floor.id
                  ? "bg-[#FF5A16] text-white border-black font-bold"
                  : "bg-[#050914] text-[#91A0AE] border-white/20"
              }`}
            >
              {floor.name.toUpperCase()} ({floor.rooms.length})
            </button>
          ))}
        </div>

        {/* Rooms List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
            <h2 className="font-pixel text-base text-[#F4E6CE] font-bold">
              ROOM CONFIGURATIONS ({displayedRooms.length})
            </h2>
            <span className="font-pixel text-[9px] text-[#18D8D0]">
              CLICK MANAGE BEDS TO ADJUST BED STATUS OR ADD BEDS
            </span>
          </div>

          <div className="space-y-4">
            {displayedRooms.map((room) => {
              const occupiedBedsCount = room.beds.filter((b) => b.status === "OCCUPIED").length;
              const isExpanded = expandedRoomId === room.id;

              return (
                <div
                  key={room.id}
                  className="bg-[#07101D] border-2 border-[#18D8D0]/30 p-4 shadow-[3px_3px_0px_#000] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-base text-[#F4E6CE] font-bold uppercase">
                          ROOM {room.roomNumber}
                        </span>
                        {room.displayName && room.displayName !== room.roomNumber && (
                          <span className="font-mono text-xs text-[#91A0AE]">
                            ({room.displayName})
                          </span>
                        )}
                        <span className="font-pixel text-[8px] bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/30 px-2 py-0.5">
                          {room.floorNumber || "Ground Floor"}
                        </span>
                        <span
                          className={`font-pixel text-[8px] px-2 py-0.5 border ${
                            room.status === "ACTIVE"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                              : "bg-rose-950 text-rose-300 border-rose-500"
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <span className="font-sans text-xs text-[#91A0AE] mt-0.5 block">
                        Capacity: {room.capacity} Beds • {occupiedBedsCount} Occupied • {room.beds.length - occupiedBedsCount} Available
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        className="px-3 py-1.5 bg-[#050914] hover:bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-[10px] flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>EDIT ROOM</span>
                      </button>

                      <button
                        onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                        className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white border border-black font-pixel text-[10px] font-bold shadow-[2px_2px_0px_#000]"
                      >
                        {isExpanded ? "HIDE BEDS" : "MANAGE BEDS (" + room.beds.length + ")"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Bed Grid */}
                  {isExpanded && (
                    <div className="border-t border-white/10 pt-3 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider">
                          BED ALLOCATION STATUS IN ROOM {room.roomNumber}
                        </span>
                        <span className="font-mono text-[10px] text-[#91A0AE]">
                          {room.beds.length} Total Beds Configured
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {room.beds.map((b) => {
                          const isOccupied = b.status === "OCCUPIED";
                          const activeOccupant = b.allocations?.[0];

                          return (
                            <div
                              key={b.id}
                              className={`p-3 border font-sans text-xs flex flex-col justify-between gap-2 shadow-[2px_2px_0px_#000] ${
                                isOccupied
                                  ? "bg-[#050914] border-emerald-500/70"
                                  : "bg-[#050914] border-white/20"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="font-pixel text-xs text-[#F4E6CE] font-bold">
                                    {b.bedNumber}
                                  </span>
                                  <span
                                    className={`font-pixel text-[8px] px-1.5 py-0.5 border ${
                                      isOccupied
                                        ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                                        : b.status === "AVAILABLE"
                                        ? "bg-[#07101D] text-[#18D8D0] border-[#18D8D0]"
                                        : "bg-amber-950 text-amber-300 border-amber-500"
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </div>

                                {isOccupied && activeOccupant?.participant && (
                                  <div className="mt-1 text-[11px] text-[#F4E6CE]">
                                    <div className="font-bold">{activeOccupant.participant.name}</div>
                                    <div className="text-[10px] text-[#91A0AE]">
                                      {activeOccupant.participant.role} • {activeOccupant.team?.name || "Independent"}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                <span className="font-pixel text-[8px] text-[#91A0AE]">
                                  CHANGE STATUS:
                                </span>
                                <select
                                  value={b.status}
                                  onChange={(e) => handleUpdateBedStatus(b.id, e.target.value)}
                                  className="bg-[#07101D] text-[#F4E6CE] border border-white/20 px-2 py-0.5 font-pixel text-[8px] outline-none"
                                >
                                  <option value="AVAILABLE">AVAILABLE</option>
                                  <option value="OCCUPIED">OCCUPIED</option>
                                  <option value="RESERVED">RESERVED</option>
                                  <option value="MAINTENANCE">MAINTENANCE</option>
                                  <option value="INACTIVE">INACTIVE</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Bed to Room Form */}
                      <div className="flex items-center gap-2 p-2 bg-[#050914] border border-white/10 mt-2">
                        <input
                          type="text"
                          value={newBedNumber}
                          onChange={(e) => setNewBedNumber(e.target.value)}
                          placeholder={`e.g. BED ${String(room.beds.length + 1).padStart(2, "0")}`}
                          className="bg-[#07101D] text-[#F4E6CE] border border-white/20 px-3 py-1 font-mono text-xs outline-none flex-1"
                        />
                        <button
                          type="button"
                          disabled={submittingAddBed}
                          onClick={() => handleAddBed(room.id)}
                          className="px-3 py-1 bg-[#18D8D0] hover:bg-[#15bfb8] text-black font-pixel text-[10px] font-bold cursor-pointer shadow-[1px_1px_0px_#000]"
                        >
                          + ADD BED TO ROOM
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL: EDIT ROOM */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {editingRoom && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-[#07101D] border-4 border-[#18D8D0] p-5 shadow-[5px_5px_0px_#000] relative">
              <button
                onClick={() => setEditingRoom(null)}
                className="absolute top-4 right-4 p-1.5 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b-2 border-[#18D8D0] pb-3 mb-4">
                <Edit3 className="w-5 h-5 text-[#18D8D0]" />
                <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold">
                  EDIT ROOM {editingRoom.roomNumber}
                </h3>
              </div>

              <form onSubmit={handleSaveRoomEdit} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    ROOM NUMBER / IDENTIFIER *
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    DISPLAY NAME
                  </label>
                  <input
                    type="text"
                    value={editRoomDisplayName}
                    onChange={(e) => setEditRoomDisplayName(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none"
                  />
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    CAPACITY (BEDS)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editRoomCapacity}
                    onChange={(e) => setEditRoomCapacity(Number(e.target.value))}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  />
                  <span className="font-sans text-[10px] text-[#91A0AE] block mt-0.5">
                    If increased, new beds will be automatically added to this room.
                  </span>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    ROOM STATUS
                  </label>
                  <select
                    value={editRoomStatus}
                    onChange={(e) => setEditRoomStatus(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE (DEACTIVATED)</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                {editRoomStatus === "INACTIVE" && (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/50 space-y-2">
                    <div className="flex items-start gap-2 text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Deactivating this room will prevent new allocations. Existing allocations remain intact.
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-pixel text-[9px] text-amber-300">
                      <input
                        type="checkbox"
                        checked={forceOverrideOccupants}
                        onChange={(e) => setForceOverrideOccupants(e.target.checked)}
                      />
                      <span>CONFIRM DEACTIVATION</span>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingRoom(null)}
                    className="px-3 py-2 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 font-pixel text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRoomEdit}
                    className="px-4 py-2 bg-[#18D8D0] hover:bg-[#15bfb8] text-black font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingRoomEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>SAVE CONFIGURATION</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
