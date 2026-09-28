"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { ArrowLeft, User, QrCode } from "lucide-react";

export default function PassengerResourceDetailPage({ params }: { params: Promise<{ participantId: string }> }) {
  const { participantId } = use(params);
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "transport_admin")!;
  const [participant, setParticipant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPassenger() {
      try {
        const res = await fetch(`/api/transport/passengers/search?q=${participantId}`);
        const data = await res.json();
        if (res.ok && data.success && data.participants?.length > 0) {
          setParticipant(data.participants[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPassenger();
  }, [participantId]);

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
              <span className="font-pixel text-[10px] text-[#FFA826]">ATHLETE DISPATCH RECORD</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-pixel">
                RBAC PROTECTED
              </span>
            </div>
            <h1 className="text-xl font-bold text-white uppercase">{participant?.name || participantId}</h1>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#18D8D0] font-pixel text-xs animate-pulse">
            LOADING PASSENGER PROFILE...
          </div>
        ) : participant ? (
          <div className="bg-[#050914] border-2 border-[#18D8D0] p-5 shadow-[4px_4px_0px_#000] space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">PLAYER ID:</span>
                <strong className="text-[#FFA826] text-sm font-pixel">{participant.playerId}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">INSTITUTION:</span>
                <strong className="text-white">{participant.institution}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">CATEGORY:</span>
                <strong className="text-neutral-200">{participant.category}</strong>
              </div>
              <div>
                <span className="text-[9px] font-pixel text-neutral-400 block">TEAM:</span>
                <strong className="text-[#18D8D0]">{participant.team?.name || "Independent"}</strong>
              </div>
            </div>

            {/* Current Transport Assignment */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 text-xs">
              <div className="font-pixel text-[10px] text-[#FFA826] mb-2">TRANSPORT BOOKING STATUS:</div>
              {participant.currentAssignment ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div><span className="text-neutral-400">Trip:</span> <strong>{participant.currentAssignment.tripCode}</strong></div>
                  <div><span className="text-neutral-400">Pickup:</span> <strong>{participant.currentAssignment.pickupPoint}</strong></div>
                  <div><span className="text-neutral-400">Vehicle:</span> <strong>{participant.currentAssignment.vehicleNo}</strong></div>
                  <div><span className="text-neutral-400">Status:</span> <strong className="text-emerald-400">{participant.currentAssignment.boardingStatus}</strong></div>
                </div>
              ) : (
                <span className="text-neutral-500">No transport trip currently assigned.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-neutral-900 border border-neutral-800 text-xs">Participant not found.</div>
        )}
      </div>
    </DashboardShell>
  );
}
