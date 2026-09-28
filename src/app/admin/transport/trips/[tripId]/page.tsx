"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import {
  Bus,
  Calendar,
  Clock,
  ArrowLeft,
  MapPin,
  User,
  Phone,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";

export default function TripResourceDetailPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "transport_admin")!;
  const { user, hasPermission } = useAuth();

  const [trip, setTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrip() {
      setLoading(true);
      try {
        const res = await fetch(`/api/transport/trips/${tripId}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setTrip(data.trip);
        } else {
          setError(data.error || "Trip not found or unauthorized.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load trip.");
      } finally {
        setLoading(false);
      }
    }
    loadTrip();
  }, [tripId]);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-5 text-neutral-100 font-mono">
        <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/transport"
              className="p-1.5 bg-[#050914] border border-neutral-700 hover:border-[#18D8D0] text-neutral-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[10px] text-[#FFA826] uppercase">RESOURCE INSPECTION</span>
                <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-pixel">
                  RBAC PROTECTED
                </span>
              </div>
              <h1 className="text-xl font-bold text-white uppercase">
                TRIP {trip?.tripCode || tripId}
              </h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#18D8D0] font-pixel text-xs animate-pulse">
            AUTHENTICATING RESOURCE CLEARANCE &amp; LOADING MANIFEST...
          </div>
        ) : error ? (
          <div className="p-4 bg-[#2A0505] border-2 border-rose-500 text-rose-300 text-xs">
            {error}
          </div>
        ) : trip ? (
          <div className="space-y-5">
            {/* Header Telemetry */}
            <div className="bg-[#050914] border-2 border-[#18D8D0] p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-[3px_3px_0px_#000]">
              <div>
                <span className="text-[9px] font-pixel text-[#91A0AE] block">STATUS</span>
                <strong className="text-emerald-400 font-pixel text-sm">{trip.status}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-[#91A0AE] block">DEPARTURE</span>
                <strong className="text-white">{trip.date} • {trip.time}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-[#91A0AE] block">VEHICLE</span>
                <strong className="text-[#18D8D0]">{trip.vehicleNo}</strong> (Cap: {trip.capacity})
              </div>
              <div>
                <span className="text-[9px] font-pixel text-[#91A0AE] block">DRIVER</span>
                <strong className="text-[#F4E6CE]">{trip.driverName}</strong>
              </div>
            </div>

            {/* Manifest */}
            <div className="bg-[#050914] border-2 border-neutral-800 p-4 shadow-[3px_3px_0px_#000]">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                <h3 className="font-pixel text-xs text-[#FFA826]">
                  PASSENGER MANIFEST ({trip.manifest?.length || 0} ASSIGNED)
                </h3>
                <span className="text-xs text-emerald-400 font-pixel">
                  {trip.boarded} / {trip.capacity} BOARDED
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#07101D] text-[#18D8D0] font-pixel text-[9px] border-b border-neutral-800">
                    <tr>
                      <th className="py-2 px-3">PLAYER ID</th>
                      <th className="py-2 px-3">NAME</th>
                      <th className="py-2 px-3">INSTITUTION</th>
                      <th className="py-2 px-3">PICKUP</th>
                      <th className="py-2 px-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {trip.manifest?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-pixel text-[9px] text-[#FFA826]">{p.playerId}</td>
                        <td className="py-2 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-2 px-3">{p.institution}</td>
                        <td className="py-2 px-3">{p.pickupPoint}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 text-[8px] font-pixel ${
                              p.boardingStatus === "BOARDED"
                                ? "bg-emerald-950 text-emerald-400"
                                : "bg-amber-950 text-amber-400"
                            }`}
                          >
                            {p.boardingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
