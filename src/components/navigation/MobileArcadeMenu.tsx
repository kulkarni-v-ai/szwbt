"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronRight } from "lucide-react";
import { PUBLIC_NAV_ITEMS } from "./ArcadeNav";

interface MobileArcadeMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

function ShuttlecockLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 14 L14 30 L22 14 Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="0.8"
      />
      <line x1="9" y1="16" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <line x1="14" y1="15" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <line x1="19" y1="16" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <path d="M8.5 19 Q14 21 19.5 19" stroke="#00F0FF" strokeWidth="0.9" fill="none" opacity="0.9" />
      <path d="M10.5 24 Q14 25.5 17.5 24" stroke="#00F0FF" strokeWidth="0.8" fill="none" opacity="0.9" />
      <circle cx="14" cy="9" r="5" fill="#FF5A16" />
      <ellipse cx="14" cy="7.5" rx="3" ry="1.5" fill="#FFA366" opacity="0.8" />
      <path d="M9 10 Q14 12 19 10" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}

export const MobileArcadeMenu: React.FC<MobileArcadeMenuProps> = ({
  isOpen,
  onClose,
}) => {
  const pathname = usePathname();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#040711]/98 backdrop-blur-2xl flex flex-col justify-between p-6 overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative">
        <div className="absolute -left-6 top-0 bottom-0 w-2 bg-[#FF5A16] shadow-[0_0_12px_#FF5A16]" />
        
        <div className="flex items-center gap-3">
          <ShuttlecockLogo className="w-7 h-7 shrink-0" />
          <div>
            <span className="font-rajdhani text-lg text-white font-black tracking-wider block leading-none">
              SOUTH ZONE
            </span>
            <span className="font-rajdhani text-[9px] text-slate-300 font-bold tracking-[0.16em] uppercase">
              CHAMPIONSHIP 2026
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 bg-white/5 border border-white/20 text-white rounded-lg hover:border-[#FF5A16] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Large Navigation Items */}
      <div className="flex flex-col gap-2 my-auto py-6">
        {PUBLIC_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`p-3.5 border-l-2 font-rajdhani text-sm tracking-widest uppercase flex items-center justify-between group transition-all rounded-r-lg ${
                isActive
                  ? "bg-[#FF5A16]/15 border-[#FF5A16] text-[#FF5A16] font-black"
                  : "bg-white/5 border-transparent text-slate-200 hover:text-white hover:border-white/30"
              }`}
            >
              <span>{item.label}</span>
              <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isActive ? "text-[#FF5A16]" : "text-slate-500"}`} />
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between font-rajdhani text-[11px] text-slate-400">
        <span>KLE TECH SPORTS ARENA</span>
        <span className="text-[#FF5A16] font-bold">AIU SANCTIONED</span>
      </div>
    </div>
  );
};
