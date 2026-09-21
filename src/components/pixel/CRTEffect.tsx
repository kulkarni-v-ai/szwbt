"use client";

import React, { useState, useEffect } from "react";
import { Monitor } from "lucide-react";

export const CRTEffect: React.FC = () => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("szwbt_crt_enabled");
    if (stored !== null) {
      setEnabled(stored === "true");
    }
  }, []);

  const toggleCRT = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    localStorage.setItem("szwbt_crt_enabled", String(nextState));
  };

  return (
    <>
      {enabled && (
        <>
          <div className="crt-overlay" />
          <div className="crt-vignette" />
        </>
      )}

      {/* Floating CRT Toggle Button */}
      <button
        onClick={toggleCRT}
        title={enabled ? "Disable CRT Retro Effect" : "Enable CRT Retro Effect"}
        className="fixed bottom-4 right-4 z-[10000] p-2.5 bg-pixel-black border-2 border-pixel-orange-fiery text-pixel-orange-bright shadow-pixel-sm hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 font-pixel text-[10px] cursor-pointer"
      >
        <Monitor className={`w-4 h-4 ${enabled ? "text-pixel-green animate-pulse" : "text-pixel-gray-500"}`} />
        <span className="hidden sm:inline">{enabled ? "CRT ON" : "CRT OFF"}</span>
      </button>
    </>
  );
};
