"use client";

import React from "react";
import { Home, Key, Building2, ShieldCheck, Users } from "lucide-react";

export interface DynamicHostelItem {
  id: string;
  name: string;
  code: string;
  genderAllowed?: string;
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyPercent?: number;
}

interface HostelStatData {
  total: number;
  occupied: number;
  available: number;
  ratePercent?: number;
}

interface HostelSelectorProps {
  selectedHostelId: string;
  onSelectHostel: (id: string) => void;
  hostels?: DynamicHostelItem[];
  shalmalaStats?: HostelStatData;
  vindhyaStats?: HostelStatData;
}

export const HostelSelector: React.FC<HostelSelectorProps> = ({
  selectedHostelId,
  onSelectHostel,
  hostels = [],
  shalmalaStats = { total: 0, occupied: 0, available: 0 },
  vindhyaStats = { total: 0, occupied: 0, available: 0 },
}) => {
  // If dynamic hostels are available from backend, render them dynamically
  const displayHostels =
    hostels.length > 0
      ? hostels
      : [
          {
            id: "SHALMALA",
            name: "SHALMALA HOSTEL",
            code: "SHALMALA",
            genderAllowed: "FEMALE",
            totalFloors: 3,
            totalRooms: 12,
            totalBeds: shalmalaStats.total,
            occupiedBeds: shalmalaStats.occupied,
            availableBeds: shalmalaStats.available,
            occupancyPercent: shalmalaStats.ratePercent,
          },
          {
            id: "VINDHYA",
            name: "VINDHYA BOYS HOSTEL",
            code: "VINDHYA",
            genderAllowed: "MALE",
            totalFloors: 2,
            totalRooms: 8,
            totalBeds: vindhyaStats.total,
            occupiedBeds: vindhyaStats.occupied,
            availableBeds: vindhyaStats.available,
            occupancyPercent: vindhyaStats.ratePercent,
          },
        ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-${Math.min(displayHostels.length, 3)} gap-4 mb-6`}>
      {displayHostels.map((h) => {
        const isSelected = selectedHostelId === h.id || selectedHostelId === h.code;
        const isWomen = h.genderAllowed === "FEMALE";
        const isMen = h.genderAllowed === "MALE";

        return (
          <div
            key={h.id}
            onClick={() => onSelectHostel(h.id)}
            className={`p-4 sm:p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
              isSelected
                ? "bg-orange-50/30 border-2 border-[#FF5A16] shadow-sm"
                : "bg-white border-2 border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected
                      ? "bg-orange-100 text-[#FF5A16] border border-orange-300"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {isWomen ? <Home className="w-5 h-5" /> : isMen ? <Key className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-pixel text-sm sm:text-base text-slate-900 font-bold tracking-wider">
                    {h.name.toUpperCase()}
                  </h3>
                  <span
                    className={`font-pixel text-[8px] uppercase tracking-widest block font-medium ${
                      isWomen ? "text-orange-600" : isMen ? "text-indigo-600" : "text-slate-500"
                    }`}
                  >
                    {isWomen
                      ? "WOMEN ATHLETES & FEMALE OFFICIALS"
                      : isMen
                      ? "MALE TEAM MANAGERS & SUPPORT STAFF"
                      : "GENERAL ACCOMMODATION WING"}
                  </span>
                </div>
              </div>

              <span
                className={`font-pixel text-[8px] px-2 py-0.5 rounded border ${
                  isSelected
                    ? "bg-[#FF5A16] text-white border-orange-600 font-bold shadow-xs"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {isSelected ? "● SELECTED" : "SELECT"}
              </span>
            </div>

            <p className="font-sans text-xs text-slate-500 mb-4 leading-relaxed">
              {h.totalFloors} Floors • {h.totalRooms} Rooms configured.
            </p>

            {/* Dynamic Occupancy Strip */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-pixel text-center">
              <div>
                <span className="text-[8px] text-slate-500 uppercase block font-medium">TOTAL BEDS</span>
                <span className="text-xs sm:text-sm text-slate-900 font-bold">
                  {h.totalBeds !== undefined ? h.totalBeds : "—"}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 uppercase block font-medium">OCCUPIED</span>
                <span className="text-xs sm:text-sm text-amber-600 font-bold">
                  {h.occupiedBeds !== undefined ? h.occupiedBeds : "—"}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 uppercase block font-medium">AVAILABLE</span>
                <span className="text-xs sm:text-sm text-emerald-600 font-bold">
                  {h.availableBeds !== undefined ? h.availableBeds : "—"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
