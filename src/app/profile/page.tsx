"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";

export default function ProfileDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "profile")!;

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <PixelCard headerTitle="USER PROFILE & ACCREDITATION SETTINGS" headerBadge="USER ID">
          <div className="flex items-center gap-4 border-b border-pixel-gray-800 pb-4 mb-4">
            <div className="w-16 h-16 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-xl text-pixel-orange-bright">
              OP
            </div>
            <div>
              <h3 className="font-pixel text-sm text-pixel-cream">OPERATOR PRO</h3>
              <p className="font-sans text-xs text-pixel-gray-400">KARNATAKA STATE UNIVERSITY • FULL OPERATOR</p>
              <PixelBadge variant="orange" className="mt-1">ADMINISTRATOR PERMISSION</PixelBadge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PixelInput label="FULL DISPLAY NAME" defaultValue="Operator Pro" />
            <PixelInput label="EMAIL ADDRESS" defaultValue="operator@szwbt2026.org" />
            <PixelInput label="INSTITUTION / BODY" defaultValue="Karnataka State University" />
            <PixelInput label="ROLE PERMISSION" defaultValue="SUPER ADMIN OPERATOR" disabled />
          </div>

          <div className="mt-6 pt-4 border-t border-pixel-gray-800 flex justify-end">
            <PixelButton variant="primary" size="md" glow>
              SAVE PROFILE PREFERENCES
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    </DashboardShell>
  );
}
