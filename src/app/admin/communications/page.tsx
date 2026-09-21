"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelSelect } from "@/components/pixel/PixelSelect";
import { PixelButton } from "@/components/pixel/PixelButton";
import { Megaphone, CheckCircle2 } from "lucide-react";

export default function CommunicationsDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "communications")!;
  const [sent, setSent] = useState(false);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="max-w-2xl mx-auto">
        <PixelCard headerTitle="ANNOUNCEMENT & BROADCAST COMPOSER" headerBadge="BROADCAST HUD" glow>
          {sent ? (
            <div className="p-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-pixel-green mx-auto animate-bounce" />
              <h3 className="font-display text-xl text-pixel-cream">BROADCAST TRANSMITTED!</h3>
              <p className="font-sans text-xs text-pixel-gray-400">BROADCAST DELIVERED VIA SMTP & WEB BULLETIN.</p>
              <PixelButton variant="primary" size="md" onClick={() => setSent(false)}>
                COMPOSE NEW BROADCAST
              </PixelButton>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="flex flex-col gap-4 my-2">
              <PixelInput label="ANNOUNCEMENT TITLE" placeholder="e.g. Schedule Update for Court 03" required />
              <PixelSelect
                label="TARGET AUDIENCE"
                options={[
                  { label: "ALL PARTICIPANTS & MANAGERS", value: "ALL" },
                  { label: "TEAM MANAGERS ONLY", value: "MANAGERS" },
                  { label: "MATCH OFFICIALS & UMPIRES", value: "OFFICIALS" },
                  { label: "ON-GROUND VOLUNTEERS", value: "VOLUNTEERS" },
                ]}
              />
              <PixelSelect
                label="DELIVERY CHANNEL"
                options={[
                  { label: "WEB PORTAL + REAL SMTP EMAIL + PUSH NOTIFICATION", value: "ALL_CHANNELS" },
                  { label: "WEB ANNOUNCEMENT BULLETIN ONLY", value: "WEB_ONLY" },
                  { label: "WHATSAPP BROADCAST MATRIX", value: "WHATSAPP" },
                ]}
              />
              <div className="flex flex-col gap-1.5">
                <label className="font-pixel text-[11px] text-pixel-orange-bright uppercase">MESSAGE CONTENT</label>
                <textarea
                  rows={4}
                  className="w-full bg-pixel-black text-pixel-cream font-sans text-sm p-3 border-2 border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none"
                  placeholder="Type broadcast message details..."
                  required
                />
              </div>
              <PixelButton type="submit" variant="primary" size="lg" glow>
                <Megaphone className="w-4 h-4" />
                <span>TRANSMIT BROADCAST NOW</span>
              </PixelButton>
            </form>
          )}
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
