"use client";

import React from "react";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Zap, SkipForward, Play, ChevronRight, ChevronDown } from "lucide-react";

interface IntroOverlayProps {
  currentScene: number; // 1 to 8
  onSetScene: (scene: number) => void;
  onSkipIntro: () => void;
  onEnter: () => void;
}

export const SCENE_METADATA = [
  { scene: 1, title: "SCENE 01 — DEEP SPACE", subtitle: "THE UNIVERSE LIES IN SILENCE" },
  { scene: 2, title: "SCENE 02 — THE SHUTTLE", subtitle: "A LEGENDARY OBJECT EMERGES IN THE VOID" },
  { scene: 3, title: "SCENE 03 — METEOR DESCENT", subtitle: "BURNING THROUGH THE ATMOSPHERE AT SUPERSONIC SPEED" },
  { scene: 4, title: "SCENE 04 — ATMOSPHERIC ENTRY", subtitle: "THE SOUTH CONVERGES TOWARD THE ARENA" },
  { scene: 5, title: "SCENE 05 — STADIUM REVEAL", subtitle: "THE PIXEL ARENA SHINES IN FIERY ORANGE LIGHT" },
  { scene: 6, title: "SCENE 06 — THE IMPACT", subtitle: "AN EXPLOSION OF ENERGY SHAKES THE COURT" },
  { scene: 7, title: "SCENE 07 — ATHLETE SMASH", subtitle: "THE ATHLETE STRIKES. THE COURT DECIDES." },
  { scene: 8, title: "SCENE 08 — ACTIVATION", subtitle: "SOUTH ZONE BADMINTON CHAMPIONSHIP 2026" },
];

export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  currentScene,
  onSetScene,
  onSkipIntro,
  onEnter,
}) => {
  const isFinalScene = currentScene === 8;
  const currentMeta = SCENE_METADATA[currentScene - 1] || SCENE_METADATA[0];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 pointer-events-none select-none">
      {/* Top Header: Intro Status & Skip Button */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <PixelBadge variant="orange" pulse>
            CINEMATIC INTRO
          </PixelBadge>
          <span className="font-pixel text-[10px] text-pixel-gray-400 hidden sm:inline">
            [{currentScene} / 8]
          </span>
        </div>

        {!isFinalScene && (
          <button
            onClick={onSkipIntro}
            className="flex items-center gap-1.5 font-pixel text-[10px] text-pixel-orange-bright bg-pixel-black/80 px-3 py-1.5 border border-pixel-orange-fiery hover:bg-pixel-orange-fiery hover:text-black transition-colors cursor-pointer"
          >
            <span>SKIP INTRO</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Middle Content: Scene Subtitle or Final Hero Reveal */}
      {!isFinalScene ? (
        <div className="max-w-2xl mx-auto text-center pointer-events-auto my-auto transition-all duration-300">
          <p className="font-pixel text-xs text-pixel-orange-bright tracking-widest mb-2 animate-pulse">
            {currentMeta.title}
          </p>
          <h2 className="font-display text-xl sm:text-3xl text-pixel-cream font-bold tracking-tight text-pixel-glow uppercase">
            {currentMeta.subtitle}
          </h2>
          <p className="font-pixel text-[9px] text-pixel-gray-500 mt-4">
            [ USE MOUSE / TOUCH TO INFLUENCE THE ORBIT ]
          </p>
        </div>
      ) : (
        /* Scene 08: Website Activation Hero Reveal */
        <div className="max-w-4xl mx-auto text-center pointer-events-auto my-auto flex flex-col items-center gap-6 animate-[pixelPulse_0.5s_ease-out]">
          <PixelBadge variant="orange" pulse className="px-4 py-1 text-xs">
            2026 EDITION — SOUTH ZONE
          </PixelBadge>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl text-pixel-cream font-extrabold tracking-tight text-pixel-glow leading-tight">
            SOUTH ZONE <br />
            <span className="text-pixel-orange-fiery">WOMEN&apos;S BADMINTON</span> CHAMPIONSHIP 2026
          </h1>

          <p className="font-pixel text-xs sm:text-sm text-pixel-amber tracking-widest">
            THE SOUTH CONVERGES. THE COURT DECIDES.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <PixelButton variant="primary" size="lg" glow onClick={onEnter}>
              <span>EXPLORE TOURNAMENT</span>
              <ChevronRight className="w-4 h-4" />
            </PixelButton>

            <PixelButton
              variant="secondary"
              size="lg"
              onClick={() => {
                const el = document.getElementById("scroll-levels");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>EXPLORE</span>
              <ChevronDown className="w-4 h-4" />
            </PixelButton>
          </div>
        </div>
      )}

      {/* Bottom Timeline Controls */}
      <div className="flex items-center justify-between pointer-events-auto border-t border-pixel-gray-800/80 pt-4">
        {/* Scene Dots */}
        <div className="flex items-center gap-2">
          {SCENE_METADATA.map((s) => (
            <button
              key={s.scene}
              onClick={() => onSetScene(s.scene)}
              title={s.title}
              className={`h-2 border transition-all cursor-pointer ${
                currentScene === s.scene
                  ? "w-8 bg-pixel-orange-fiery border-white"
                  : "w-3 bg-pixel-dark border-pixel-gray-700 hover:border-pixel-orange-fiery"
              }`}
            />
          ))}
        </div>

        {/* Scene Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={currentScene <= 1}
            onClick={() => onSetScene(Math.max(1, currentScene - 1))}
            className="font-pixel text-[10px] px-3 py-1 bg-pixel-dark border border-pixel-gray-700 text-pixel-cream disabled:opacity-30 cursor-pointer"
          >
            ◄ PREV
          </button>
          <button
            disabled={currentScene >= 8}
            onClick={() => onSetScene(Math.min(8, currentScene + 1))}
            className="font-pixel text-[10px] px-3 py-1 bg-pixel-orange-fiery text-black border border-black disabled:opacity-30 font-bold cursor-pointer"
          >
            NEXT ►
          </button>
        </div>
      </div>
    </div>
  );
};
