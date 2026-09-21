"use client";

import React from "react";
import Link from "next/link";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelButton } from "@/components/pixel/PixelButton";
import { Zap, Shield, Key } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <PixelCard headerTitle="INSERT COIN TO AUTHENTICATE" headerBadge="ARCADE PORTAL" glow>
            <div className="flex flex-col items-center text-center my-4">
              <Zap className="w-10 h-10 text-pixel-orange-fiery animate-bounce mb-2" />
              <h2 className="font-display text-xl text-pixel-cream font-bold">OPERATOR LOGIN</h2>
              <p className="font-sans text-xs text-pixel-gray-400 mt-1">
                ACCESS DEMO DASHBOARD ECOSYSTEM (18 ROLES MATRIX)
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); window.location.href = "/admin"; }} className="flex flex-col gap-4">
              <PixelInput label="OPERATOR USERNAME / EMAIL" placeholder="operator@szwbt2026.demo" defaultValue="operator@szwbt2026.demo" />
              <PixelInput label="PASSCODE" type="password" placeholder="••••••••" defaultValue="demo1234" />

              <PixelButton type="submit" variant="primary" size="lg" glow className="w-full">
                <span>PRESS START / LOGIN</span>
              </PixelButton>
            </form>

            <div className="mt-6 pt-4 border-t border-pixel-gray-800 text-center">
              <Link href="/admin" className="font-pixel text-[10px] text-pixel-amber hover:text-pixel-orange-bright flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>BYPASS AUTH TO 18 DASHBOARDS MATRIX →</span>
              </Link>
            </div>
          </PixelCard>
        </div>
      </main>
    </div>
  );
}
