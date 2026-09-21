"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { TRANSPORT_ROUTES_DATA } from "@/data/transportation";
import { Bus, MapPin, Users, Clock } from "lucide-react";

export default function TransportAdminDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "transport_admin")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="ACTIVE VEHICLES" value="3 SHUTTLES" subtext="Routes 01 - 03" icon={<Bus className="w-5 h-5" />} accent="orange" />
        <PixelStat label="TOTAL ROUTES" value="3 ROUTES" subtext="Airport, Arena & Hostels" icon={<MapPin className="w-5 h-5" />} accent="amber" />
        <PixelStat label="PASSENGERS TODAY" value="81 PASSENGERS" subtext="Manifest Logged" icon={<Users className="w-5 h-5" />} accent="green" />
        <PixelStat label="SHUTTLE FREQUENCY" value="15 MINS" subtext="Peak Hours Active" icon={<Clock className="w-5 h-5" />} accent="cyan" />
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="font-pixel text-xs text-pixel-orange-bright uppercase">
          LIVE SHUTTLE ROUTES & FLEET STATUS
        </h2>

        {TRANSPORT_ROUTES_DATA.map((route) => (
          <PixelCard key={route.id} headerTitle={route.routeName} headerBadge={route.status} glow={route.status === "EN ROUTE"}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2 font-sans text-xs">
              <div>
                <p className="font-pixel text-[10px] text-pixel-amber">VEHICLE DETAILS</p>
                <p className="font-mono text-pixel-cream font-bold">{route.vehicleNo}</p>
                <p className="text-pixel-gray-400">Driver: {route.driverName} ({route.driverPhone})</p>
              </div>

              <div>
                <p className="font-pixel text-[10px] text-pixel-amber">PICKUP POINTS</p>
                <p className="text-pixel-cream">{route.pickupPoints.join(" ➔ ")}</p>
                <p className="text-pixel-gray-400">Timing: {route.timing}</p>
              </div>

              <div>
                <p className="font-pixel text-[10px] text-pixel-amber">SEAT CAPACITY</p>
                <p className="font-pixel text-xs text-pixel-green">{route.capacity}</p>
                <PixelBadge variant={route.status === "ACTIVE" ? "green" : route.status === "EN ROUTE" ? "orange" : "dark"}>
                  {route.status}
                </PixelBadge>
              </div>
            </div>
          </PixelCard>
        ))}
      </div>
    </DashboardShell>
  );
}
