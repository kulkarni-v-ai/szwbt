"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Menu, X, Shield } from "lucide-react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { MobileArcadeMenu } from "./MobileArcadeMenu";

export const PUBLIC_NAV_ITEMS = [
  { label: "HOME", path: "/" },
  { label: "TOURNAMENT", path: "/tournament" },
  { label: "SCHEDULE", path: "/schedule" },
  { label: "RESULTS", path: "/results" },
  { label: "MATCHES", path: "/matches" },
  { label: "ABOUT", path: "/about" },
  { label: "ANNOUNCEMENTS", path: "/announcements" },
  { label: "CONTACT", path: "/contact" },
];

export const ArcadeNav: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-pixel-black/90 backdrop-blur-md border-b-2 border-pixel-orange-fiery px-4 py-3 shadow-pixel-orange select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-pixel-orange-fiery border border-black shadow-pixel-sm group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="font-display text-base text-pixel-cream tracking-tight group-hover:text-pixel-orange-bright transition-colors">
                SOUTH ZONE 2026
              </span>
              <span className="block font-pixel text-[8px] text-pixel-amber">
                BADMINTON CHAMPIONSHIP
              </span>
            </div>
          </Link>

          {/* Desktop HUD Navigation Menu */}
          <div className="hidden lg:flex items-center gap-1 bg-pixel-dark/80 p-1 border border-pixel-gray-800">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`font-pixel text-[10px] uppercase px-3 py-1.5 transition-all duration-150 ${
                    isActive
                      ? "bg-pixel-orange-fiery text-black border border-black font-bold shadow-pixel-sm"
                      : "text-pixel-gray-300 hover:text-pixel-orange-bright hover:bg-pixel-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* CTA & Dashboard Portals */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/register">
              <PixelButton variant="primary" size="sm" glow>
                ENTER ARENA
              </PixelButton>
            </Link>
            <Link href="/admin">
              <PixelButton variant="dark" size="sm">
                <Shield className="w-3.5 h-3.5" />
                <span>DASHBOARDS</span>
              </PixelButton>
            </Link>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 bg-pixel-dark border-2 border-pixel-orange-fiery text-pixel-orange-bright shadow-pixel-sm active:scale-95 transition-transform"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Full-Screen Arcade Mobile Navigation */}
      <MobileArcadeMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
};
