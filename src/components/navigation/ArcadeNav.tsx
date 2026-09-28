"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MobileArcadeMenu } from "./MobileArcadeMenu";

export const PUBLIC_NAV_ITEMS = [
  { label: "HOME", path: "/" },
  { label: "TOURNAMENT", path: "/tournament" },
  { label: "FIXTURES", path: "/fixtures" },
  { label: "SCHEDULE", path: "/schedule" },
  { label: "RESULTS", path: "/results" },
  { label: "MATCHES", path: "/matches" },
  { label: "ABOUT", path: "/about" },
  { label: "ANNOUNCEMENTS", path: "/announcements" },
  { label: "CONTACT", path: "/contact" },
];

function ShuttlecockLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Feathers Fan */}
      <path
        d="M6 14 L14 30 L22 14 Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="0.8"
      />
      {/* Feather Ribs */}
      <line x1="9" y1="16" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <line x1="14" y1="15" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <line x1="19" y1="16" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      {/* Feather Binding Thread Lines */}
      <path d="M8.5 19 Q14 21 19.5 19" stroke="#00F0FF" strokeWidth="0.9" fill="none" opacity="0.9" />
      <path d="M10.5 24 Q14 25.5 17.5 24" stroke="#00F0FF" strokeWidth="0.8" fill="none" opacity="0.9" />
      {/* Cork Dome */}
      <circle cx="14" cy="9" r="5" fill="#FF5A16" />
      <ellipse cx="14" cy="7.5" rx="3" ry="1.5" fill="#FFA366" opacity="0.8" />
      <path d="M9 10 Q14 12 19 10" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}

export const ArcadeNav: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[#040711]/98 backdrop-blur-2xl border-b border-white/15 px-3 sm:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.85)] select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-[62px] relative">
          {/* Left vertical accent stripe matching reference */}
          <div className="absolute -left-3 sm:-left-6 top-0 bottom-0 w-1.5 sm:w-2 bg-[#FF5A16] shadow-[0_0_12px_rgba(255,90,22,0.9)]" />

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group pl-1">
            <ShuttlecockLogo className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_0_8px_rgba(255,90,22,0.5)]" />
            <div className="flex flex-col">
              <span className="font-rajdhani text-lg sm:text-xl text-white font-black tracking-wider leading-none group-hover:text-[#FF5A16] transition-colors">
                SOUTH ZONE
              </span>
              <span className="font-rajdhani text-[9px] sm:text-[10px] text-slate-300 font-bold tracking-[0.16em] leading-tight uppercase mt-0.5">
                WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 font-rajdhani text-xs sm:text-sm tracking-[0.14em] font-bold uppercase">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative py-2 transition-colors duration-150 ${
                    isActive
                      ? "text-[#FF5A16] font-black"
                      : "text-slate-200 hover:text-[#FF5A16]"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-[#FF5A16] shadow-[0_0_8px_rgba(255,90,22,0.9)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-white bg-white/5 border border-white/10 rounded-lg shadow-sm hover:border-[#FF5A16] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
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
