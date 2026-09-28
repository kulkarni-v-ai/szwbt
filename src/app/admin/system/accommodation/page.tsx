"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  Building2, Plus, Home, Layers, Bed, Users, ShieldAlert,
  CheckCircle2, X, RefreshCw, Edit3, ArrowRight, Loader2, Sparkles
} from "lucide-react";

interface HostelSummary {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  genderAllowed: string;
  floorsCount: number;
  roomsCount: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}

export default function AccommodationSystemConfigPage() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "super_admin")!;
  const { user, hasPermission } = useAuth();

  const [hostels, setHostels] = useState<HostelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [isAddHostelOpen, setIsAddHostelOpen] = useState(false);
  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);

  // Add Hostel Form
  const [hostelName, setHostelName] = useState("");
  const [hostelCode, setHostelCode] = useState("");
  const [hostelDesc, setHostelDesc] = useState("");
  const [hostelGender, setHostelGender] = useState("ANY");
  const [submittingHostel, setSubmittingHostel] = useState(false);

  // Add Floor Form
  const [floorHostelId, setFloorHostelId] = useState("");
  const [floorName, setFloorName] = useState("");
  const [floorNumber, setFloorNumber] = useState(0);
  const [submittingFloor, setSubmittingFloor] = useState(false);

  // Add Room Form
  const [roomHostelId, setRoomHostelId] = useState("");
  const [roomFloorId, setRoomFloorId] = useState("");
  const [roomFloorsList, setRoomFloorsList] = useState<{ id: string; name: string }[]>([]);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomDisplayName, setRoomDisplayName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState(5);
  const [roomStatus, setRoomStatus] = useState("ACTIVE");
  const [submittingRoom, setSubmittingRoom] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accommodation/hostels");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.hostels)) {
          setHostels(data.hostels);
          if (data.hostels.length > 0 && !floorHostelId) {
            setFloorHostelId(data.hostels[0].id);
            setRoomHostelId(data.hostels[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load hostels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  // When roomHostelId changes, load its floors for the room creation form
  useEffect(() => {
    if (!roomHostelId) return;
    fetch(`/api/admin/accommodation/hostels/${roomHostelId}/floors`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.floors)) {
          setRoomFloorsList(data.floors);
          if (data.floors.length > 0) {
            setRoomFloorId(data.floors[0].id);
          } else {
            setRoomFloorId("");
          }
        }
      })
      .catch((err) => console.error("Failed to load floors for hostel:", err));
  }, [roomHostelId]);

  // Handle Add Hostel Submit
  const handleAddHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelName.trim()) {
      showToast("Hostel name is required", "error");
      return;
    }

    setSubmittingHostel(true);
    try {
      const res = await fetch("/api/admin/accommodation/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hostelName,
          code: hostelCode,
          description: hostelDesc,
          genderAllowed: hostelGender,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("HOSTEL CREATED SUCCESSFULLY");
        setIsAddHostelOpen(false);
        setHostelName("");
        setHostelCode("");
        setHostelDesc("");
        fetchHostels();
      } else {
        showToast(data.error || "Failed to create hostel", "error");
      }
    } catch (err: any) {
      showToast("Network error creating hostel", "error");
    } finally {
      setSubmittingHostel(false);
    }
  };

  // Handle Add Floor Submit
  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorHostelId || !floorName.trim()) {
      showToast("Hostel and Floor Name are required", "error");
      return;
    }

    setSubmittingFloor(true);
    try {
      const res = await fetch("/api/admin/accommodation/floors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: floorHostelId,
          name: floorName,
          floorNumber,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("FLOOR ADDED SUCCESSFULLY");
        setIsAddFloorOpen(false);
        setFloorName("");
        fetchHostels();
      } else {
        showToast(data.error || "Failed to create floor", "error");
      }
    } catch (err) {
      showToast("Network error creating floor", "error");
    } finally {
      setSubmittingFloor(false);
    }
  };

  // Handle Add Room Submit
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomHostelId || !roomNumber.trim()) {
      showToast("Hostel and Room Number are required", "error");
      return;
    }

    setSubmittingRoom(true);
    try {
      const res = await fetch("/api/admin/accommodation/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: roomHostelId,
          floorId: roomFloorId || undefined,
          roomNumber,
          displayName: roomDisplayName || roomNumber,
          capacity: roomCapacity,
          status: roomStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ROOM ${roomNumber} CONFIGURED WITH ${roomCapacity} BEDS!`);
        setIsAddRoomOpen(false);
        setRoomNumber("");
        setRoomDisplayName("");
        fetchHostels();
      } else {
        showToast(data.error || "Failed to create room", "error");
      }
    } catch (err) {
      showToast("Network error creating room", "error");
    } finally {
      setSubmittingRoom(false);
    }
  };

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 pb-20 text-[#F4E6CE]">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 border-2 shadow-[4px_4px_0px_#000] flex items-center gap-3 select-none ${
              toast.type === "success"
                ? "bg-[#07101D] border-emerald-500 text-emerald-300"
                : "bg-[#07101D] border-rose-500 text-rose-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            )}
            <span className="font-pixel text-xs">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Strip */}
        <div className="bg-[#07101D] border-2 border-[#18D8D0]/40 p-4 sm:p-6 shadow-[3px_3px_0px_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="font-pixel text-[9px] text-[#18D8D0] tracking-widest uppercase mb-1">
              SYSTEM CONFIGURATION • SUPER ADMIN CLEARANCE
            </div>
            <h1 className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold tracking-tight">
              ACCOMMODATION <span className="text-[#FF5A16]">CONFIGURATION</span>
            </h1>
            <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
              Manage hostels, floors, rooms and beds dynamically. ZERO hardcoded numbers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                fetchHostels();
                showToast("Refreshed accommodation structure from database");
              }}
              className="p-2.5 bg-[#050914] hover:bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-xs cursor-pointer shadow-[2px_2px_0px_#000]"
              title="Refresh structure"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* [+ ADD HOSTEL] */}
            <button
              onClick={() => setIsAddHostelOpen(true)}
              className="px-3.5 py-2.5 bg-[#050914] hover:bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/60 font-pixel text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ADD HOSTEL</span>
            </button>

            {/* [+ ADD FLOOR] */}
            <button
              onClick={() => setIsAddFloorOpen(true)}
              className="px-3.5 py-2.5 bg-[#050914] hover:bg-[#07101D] text-amber-400 border border-amber-500/60 font-pixel text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ADD FLOOR</span>
            </button>

            {/* [+ ADD ROOM] */}
            <button
              onClick={() => setIsAddRoomOpen(true)}
              className="px-4 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white border-2 border-black font-pixel text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000]"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD ROOM</span>
            </button>
          </div>
        </div>

        {/* Hostel List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#FF5A16]" />
              <h2 className="font-pixel text-base text-[#F4E6CE] font-bold">
                HOSTEL RESIDENTIAL COMPLEXES ({hostels.length})
              </h2>
            </div>
            <span className="font-pixel text-[9px] text-[#18D8D0]">
              SOURCE OF TRUTH: POSTGRESQL
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-[#07101D] border border-white/10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF5A16]" />
              <span className="font-pixel text-xs text-[#91A0AE]">
                LOADING ACCOMMODATION TOPOLOGY...
              </span>
            </div>
          ) : hostels.length === 0 ? (
            <div className="p-12 text-center bg-[#07101D] border border-white/10 font-pixel text-xs text-[#91A0AE]">
              NO HOSTELS CONFIGURED YET. CLICK [+ ADD HOSTEL] TO GET STARTED.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hostels.map((h) => (
                <div
                  key={h.id}
                  className="bg-[#07101D] border-2 border-[#18D8D0]/40 p-5 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-4 transition-all hover:border-[#FF5A16]"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-pixel text-lg text-[#F4E6CE] font-bold">
                            {h.name}
                          </h3>
                          <span
                            className={`font-pixel text-[8px] px-2 py-0.5 border ${
                              h.status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                                : "bg-rose-950 text-rose-300 border-rose-500"
                            }`}
                          >
                            {h.status}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[#18D8D0]">
                          CODE: {h.code} • RESTRICTION: {h.genderAllowed}
                        </span>
                      </div>
                    </div>

                    <p className="font-sans text-xs text-[#91A0AE] mb-4">
                      {h.description || "No description provided."}
                    </p>

                    {/* Numerical Matrix */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-[#050914] border border-white/10 font-pixel text-center mb-4">
                      <div>
                        <span className="text-[8px] text-[#91A0AE] block">FLOORS</span>
                        <span className="text-sm text-[#F4E6CE] font-bold">
                          {h.floorsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#91A0AE] block">ROOMS</span>
                        <span className="text-sm text-[#F4E6CE] font-bold">
                          {h.roomsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#91A0AE] block">TOTAL BEDS</span>
                        <span className="text-sm text-[#18D8D0] font-bold">
                          {h.totalBeds}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#050914] border border-white/10 font-pixel text-center text-xs">
                      <div>
                        <span className="text-[8px] text-[#91A0AE] block">OCCUPIED BEDS</span>
                        <span className="text-emerald-400 font-bold">
                          {h.occupiedBeds} ({h.occupancyRate}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#91A0AE] block">AVAILABLE BEDS</span>
                        <span className="text-[#18D8D0] font-bold">
                          {h.availableBeds}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <Link
                      href={`/admin/system/accommodation/${h.id}`}
                      className="px-4 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider shadow-[2px_2px_0px_#000] border border-black flex items-center gap-1.5"
                    >
                      <span>MANAGE ROOMS &amp; BEDS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href={`/admin/system/accommodation/${h.id}`}
                      className="px-3 py-2 bg-[#050914] hover:bg-[#07101D] text-[#91A0AE] hover:text-white border border-white/20 font-pixel text-xs"
                    >
                      EDIT CONFIG
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: ADD HOSTEL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isAddHostelOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-[#07101D] border-4 border-[#18D8D0] p-5 shadow-[5px_5px_0px_#000] relative">
              <button
                onClick={() => setIsAddHostelOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b-2 border-[#18D8D0] pb-3 mb-4">
                <Building2 className="w-5 h-5 text-[#18D8D0]" />
                <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold">
                  CREATE HOSTEL RESIDENTIAL WING
                </h3>
              </div>

              <form onSubmit={handleAddHostel} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    HOSTEL NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={hostelName}
                    onChange={(e) => setHostelName(e.target.value)}
                    placeholder="e.g. Kaveri Hostel / Sports Complex Block"
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none focus:border-[#FF5A16]"
                  />
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    HOSTEL CODE *
                  </label>
                  <input
                    type="text"
                    required
                    value={hostelCode}
                    onChange={(e) => setHostelCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KAVERI or BLOCK-C"
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    ELIGIBILITY RESTRICTION
                  </label>
                  <select
                    value={hostelGender}
                    onChange={(e) => setHostelGender(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none"
                  >
                    <option value="FEMALE">WOMEN PARTICIPANTS &amp; OFFICIALS ONLY</option>
                    <option value="MALE">MEN MANAGERS &amp; OFFICIALS ONLY</option>
                    <option value="ANY">ANY (OPEN HOUSING)</option>
                  </select>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#18D8D0] uppercase block mb-1">
                    DESCRIPTION
                  </label>
                  <textarea
                    rows={2}
                    value={hostelDesc}
                    onChange={(e) => setHostelDesc(e.target.value)}
                    placeholder="Residential notes, location guidelines..."
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddHostelOpen(false)}
                    className="px-3 py-2 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 font-pixel text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingHostel}
                    className="px-4 py-2 bg-[#18D8D0] hover:bg-[#15bfb8] text-black font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingHostel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>CREATE HOSTEL</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 2: ADD FLOOR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isAddFloorOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-[#07101D] border-4 border-amber-500 p-5 shadow-[5px_5px_0px_#000] relative">
              <button
                onClick={() => setIsAddFloorOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b-2 border-amber-500 pb-3 mb-4">
                <Layers className="w-5 h-5 text-amber-500" />
                <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold">
                  ADD FLOOR TO HOSTEL
                </h3>
              </div>

              <form onSubmit={handleAddFloor} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="font-pixel text-[9px] text-amber-400 uppercase block mb-1">
                    TARGET HOSTEL *
                  </label>
                  <select
                    value={floorHostelId}
                    onChange={(e) => setFloorHostelId(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  >
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-amber-400 uppercase block mb-1">
                    FLOOR NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. Ground Floor, 2nd Floor, North Wing, Block B"
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none"
                  />
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-amber-400 uppercase block mb-1">
                    SORT ORDER / LEVEL NUMBER
                  </label>
                  <input
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddFloorOpen(false)}
                    className="px-3 py-2 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 font-pixel text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFloor}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingFloor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>ADD FLOOR</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 3: ADD ROOM */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isAddRoomOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-[#07101D] border-4 border-[#FF5A16] p-5 shadow-[5px_5px_0px_#000] relative">
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b-2 border-[#FF5A16] pb-3 mb-4">
                <Home className="w-5 h-5 text-[#FF5A16]" />
                <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold">
                  CONFIGURE NEW ROOM &amp; BEDS
                </h3>
              </div>

              <form onSubmit={handleAddRoom} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="font-pixel text-[9px] text-[#FF5A16] uppercase block mb-1">
                    HOSTEL *
                  </label>
                  <select
                    value={roomHostelId}
                    onChange={(e) => setRoomHostelId(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  >
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#FF5A16] uppercase block mb-1">
                    FLOOR
                  </label>
                  <select
                    value={roomFloorId}
                    onChange={(e) => setRoomFloorId(e.target.value)}
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                  >
                    {roomFloorsList.length === 0 ? (
                      <option value="">No floors configured</option>
                    ) : (
                      roomFloorsList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#FF5A16] uppercase block mb-1">
                    ROOM NUMBER / NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 101, A-204, G-001, Suite-3"
                    className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none focus:border-[#FF5A16]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-pixel text-[9px] text-[#FF5A16] uppercase block mb-1">
                      BED CAPACITY *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={roomCapacity}
                      onChange={(e) => setRoomCapacity(Number(e.target.value))}
                      className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 font-mono outline-none"
                    />
                    <span className="font-sans text-[10px] text-[#91A0AE] block mt-0.5">
                      Auto-creates {roomCapacity} beds
                    </span>
                  </div>

                  <div>
                    <label className="font-pixel text-[9px] text-[#FF5A16] uppercase block mb-1">
                      ROOM STATUS
                    </label>
                    <select
                      value={roomStatus}
                      onChange={(e) => setRoomStatus(e.target.value)}
                      className="w-full bg-[#050914] text-[#F4E6CE] border border-white/20 p-2 outline-none"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddRoomOpen(false)}
                    className="px-3 py-2 bg-[#050914] text-[#91A0AE] hover:text-white border border-white/20 font-pixel text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRoom}
                    className="px-4 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingRoom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>CREATE ROOM &amp; BEDS</span>
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
