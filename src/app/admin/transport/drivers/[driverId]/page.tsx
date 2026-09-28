"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { ArrowLeft, User, Phone } from "lucide-react";

export default function DriverResourceDetailPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = use(params);
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "transport_admin")!;
  const [driver, setDriver] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDrivers() {
      try {
        const res = await fetch("/api/transport/drivers");
        const data = await res.json();
        if (res.ok && data.success) {
          const found = data.drivers.find((d: any) => d.id === driverId || d.driverCode === driverId);
          setDriver(found || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDrivers();
  }, [driverId]);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-5 text-neutral-100 font-mono">
        <div className="flex items-center gap-3 border-b border-[#18D8D0]/30 pb-3">
          <Link
            href="/admin/transport"
            className="p-1.5 bg-[#050914] border border-neutral-700 hover:border-[#18D8D0] text-neutral-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] text-[#FFA826]">CHAUFFEUR RECORD</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-pixel">
                RBAC PROTECTED
              </span>
            </div>
            <h1 className="text-xl font-bold text-white uppercase">{driver?.name || driverId}</h1>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#18D8D0] font-pixel text-xs animate-pulse">
            LOADING DRIVER RECORD...
          </div>
        ) : driver ? (
          <div className="bg-[#050914] border-2 border-[#18D8D0] p-5 shadow-[4px_4px_0px_#000] space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">DRIVER CODE:</span>
                <strong className="text-[#FFA826] text-sm font-pixel">{driver.driverCode}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">PHONE:</span>
                <strong className="text-white text-sm">{driver.phone}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">LICENSE:</span>
                <strong className="text-neutral-200">{driver.licenseNumber}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">DUTY STATUS:</span>
                <strong className="text-emerald-400">{driver.status}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-neutral-900 border border-neutral-800 text-xs">Driver not found.</div>
        )}
      </div>
    </DashboardShell>
  );
}
