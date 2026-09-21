"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { IntroCanvas } from "@/components/intro/IntroCanvas";
import { IntroOverlay } from "@/components/intro/IntroOverlay";
import { PixelCourt } from "@/components/court/PixelCourt";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelStat } from "@/components/pixel/PixelStat";
import { TOURNAMENT_DATA, CATEGORIES_DATA } from "@/data/tournament";
import { MATCHES_DATA } from "@/data/schedule";
import { Zap, Trophy, Flame, Users, Calendar, MapPin, ChevronRight, Shield, ArrowUpRight } from "lucide-react";

export default function Home() {
  const [currentScene, setCurrentScene] = useState(1);
  const [introCompleted, setIntroCompleted] = useState(false);

  const handleSkipIntro = () => {
    setCurrentScene(8);
    setIntroCompleted(true);
  };

  const handleEnterArena = () => {
    setIntroCompleted(true);
    const el = document.getElementById("scroll-levels");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-pixel-black text-pixel-cream font-sans">
      {/* 8-Scene Cinematic Landing Intro Container */}
      {!introCompleted && (
        <div className="relative w-full h-screen overflow-hidden">
          <IntroCanvas currentScene={currentScene} />
          <IntroOverlay
            currentScene={currentScene}
            onSetScene={setCurrentScene}
            onSkipIntro={handleSkipIntro}
            onEnterArena={handleEnterArena}
          />
        </div>
      )}

      {/* Main Website View */}
      <div id="scroll-levels" className="relative z-30">
        <ArcadeNav />

        {/* Hero Banner Section */}
        <section className="relative py-16 px-4 bg-gradient-to-b from-pixel-navy/80 via-pixel-black to-pixel-black border-b-2 border-pixel-gray-800">
          <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
            <PixelBadge variant="orange" pulse className="mb-4">
              SOUTH ZONE 2026 — 16-BIT RETRO ARCADE EXPERIENCE
            </PixelBadge>

            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl text-pixel-cream font-extrabold tracking-tight mb-4 text-pixel-glow">
              SOUTH ZONE <span className="text-pixel-orange-fiery">BADMINTON</span> CHAMPIONSHIP 2026
            </h1>

            <p className="font-pixel text-xs sm:text-sm text-pixel-amber max-w-2xl mb-8">
              {TOURNAMENT_DATA.tagline}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <PixelButton variant="primary" size="lg" glow>
                  <span>REGISTER TODAY</span>
                  <ChevronRight className="w-4 h-4" />
                </PixelButton>
              </Link>
              <Link href="/schedule">
                <PixelButton variant="dark" size="lg">
                  <span>VIEW SCHEDULE</span>
                  <Calendar className="w-4 h-4 text-pixel-amber" />
                </PixelButton>
              </Link>
            </div>
          </div>
        </section>

        {/* LEVEL 01 — THE ARRIVAL */}
        <section className="py-16 px-4 border-b-2 border-pixel-gray-800 bg-pixel-black/60">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <span className="font-pixel text-xs text-pixel-orange-bright">LEVEL 01</span>
              <span className="text-pixel-gray-600">/</span>
              <h2 className="font-display text-xl sm:text-2xl text-pixel-cream uppercase">
                THE ARRIVAL & LORE
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PixelCard headerTitle="TOURNAMENT DATES" headerBadge="VENUE">
                <div className="flex items-center gap-3 my-2">
                  <Calendar className="w-6 h-6 text-pixel-orange-fiery" />
                  <div>
                    <p className="font-pixel text-sm text-pixel-amber">{TOURNAMENT_DATA.dates}</p>
                    <p className="font-sans text-xs text-pixel-gray-400">DATES SUBJECT TO FINAL RELEASE</p>
                  </div>
                </div>
              </PixelCard>

              <PixelCard headerTitle="OFFICIAL VENUE" headerBadge="LOCATION">
                <div className="flex items-center gap-3 my-2">
                  <MapPin className="w-6 h-6 text-pixel-orange-fiery" />
                  <div>
                    <p className="font-pixel text-sm text-pixel-amber">{TOURNAMENT_DATA.venue}</p>
                    <p className="font-sans text-xs text-pixel-gray-400">CENTRAL BADMINTON ARENA</p>
                  </div>
                </div>
              </PixelCard>

              <PixelCard headerTitle="ORGANIZING BODY" headerBadge="STATUS">
                <div className="flex items-center gap-3 my-2">
                  <Trophy className="w-6 h-6 text-pixel-orange-fiery" />
                  <div>
                    <p className="font-pixel text-sm text-pixel-amber">{TOURNAMENT_DATA.organizer}</p>
                    <p className="font-sans text-xs text-pixel-gray-400">{TOURNAMENT_DATA.status}</p>
                  </div>
                </div>
              </PixelCard>
            </div>
          </div>
        </section>

        {/* LEVEL 02 — THE COURT */}
        <section className="py-16 px-4 border-b-2 border-pixel-gray-800 bg-pixel-navy/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-pixel text-xs text-pixel-orange-bright">LEVEL 02</span>
              <span className="text-pixel-gray-600">/</span>
              <h2 className="font-display text-xl sm:text-2xl text-pixel-cream uppercase">
                THE PARALLAX ARENA COURT
              </h2>
            </div>
            <p className="font-sans text-xs text-pixel-gray-400 mb-6 max-w-2xl">
              Experience the 16-bit badminton court with live spotlight illumination, animated net, and dynamic rally simulation.
            </p>

            <PixelCourt />
          </div>
        </section>

        {/* LEVEL 03 — THE ATHLETES */}
        <section className="py-16 px-4 border-b-2 border-pixel-gray-800 bg-pixel-black/80">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <span className="font-pixel text-xs text-pixel-orange-bright">LEVEL 03</span>
              <span className="text-pixel-gray-600">/</span>
              <h2 className="font-display text-xl sm:text-2xl text-pixel-cream uppercase">
                THE PIXEL ATHLETES
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <PixelCard headerTitle="WARRIOR STANCE" headerBadge="WS-U19" interactive>
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-20 h-20 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-2xl text-pixel-orange-bright mb-3">
                    🏃
                  </div>
                  <h3 className="font-pixel text-sm text-pixel-cream mb-1">ANANYA SHARMA</h3>
                  <p className="font-sans text-xs text-pixel-gray-400">KARNATAKA STATE UNIVERSITY</p>
                </div>
              </PixelCard>

              <PixelCard headerTitle="SMASH PRECISION" headerBadge="WS-U19" interactive>
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-20 h-20 bg-pixel-amber/20 border-2 border-pixel-amber flex items-center justify-center font-pixel text-2xl text-pixel-amber mb-3">
                    🏸
                  </div>
                  <h3 className="font-pixel text-sm text-pixel-cream mb-1">PRIYA NAIR</h3>
                  <p className="font-sans text-xs text-pixel-gray-400">KERALA SPORTS ACADEMY</p>
                </div>
              </PixelCard>

              <PixelCard headerTitle="DOUBLES SYNERGY" headerBadge="WD-OPEN" interactive>
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-20 h-20 bg-pixel-green/20 border-2 border-pixel-green flex items-center justify-center font-pixel text-2xl text-pixel-green mb-3">
                    ⚡
                  </div>
                  <h3 className="font-pixel text-sm text-pixel-cream mb-1">KAVYA SUNDARAM</h3>
                  <p className="font-sans text-xs text-pixel-gray-400">TAMIL NADU INSTITUTE</p>
                </div>
              </PixelCard>
            </div>
          </div>
        </section>

        {/* LEVEL 04 — THE TOURNAMENT */}
        <section className="py-16 px-4 border-b-2 border-pixel-gray-800 bg-pixel-black/60">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <span className="font-pixel text-xs text-pixel-orange-bright">LEVEL 04</span>
              <span className="text-pixel-gray-600">/</span>
              <h2 className="font-display text-xl sm:text-2xl text-pixel-cream uppercase">
                CATEGORIES & COMPETITION
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORIES_DATA.slice(0, 4).map((cat) => (
                <PixelCard key={cat.id} headerTitle={cat.code} headerBadge={cat.type}>
                  <div className="flex flex-col gap-2 my-2">
                    <h4 className="font-pixel text-xs text-pixel-cream">{cat.name}</h4>
                    <p className="font-sans text-xs text-pixel-gray-400">MAX ENTRIES: {cat.maxEntries}</p>
                    <p className="font-sans text-xs text-pixel-amber">FEE: {cat.fee}</p>
                  </div>
                </PixelCard>
              ))}
            </div>
          </div>
        </section>

        {/* LEVEL 05 — THE EXPERIENCE */}
        <section className="py-16 px-4 border-b-2 border-pixel-gray-800 bg-pixel-navy/40">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <span className="font-pixel text-xs text-pixel-orange-bright">LEVEL 05</span>
              <span className="text-pixel-gray-600">/</span>
              <h2 className="font-display text-xl sm:text-2xl text-pixel-cream uppercase">
                ARCADE TELEMETRY & STATS
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PixelStat label="CATEGORIES" value={TOURNAMENT_DATA.totalCategories} accent="orange" icon={<Trophy className="w-5 h-5" />} />
              <PixelStat label="PARTICIPANTS" value={TOURNAMENT_DATA.totalParticipants} accent="amber" icon={<Users className="w-5 h-5" />} />
              <PixelStat label="MATCHES" value={TOURNAMENT_DATA.totalMatches} accent="green" icon={<Flame className="w-5 h-5" />} />
              <PixelStat label="ACTIVE COURTS" value={TOURNAMENT_DATA.activeCourts} accent="cyan" icon={<Zap className="w-5 h-5" />} />
            </div>
          </div>
        </section>

        {/* LEVEL 06 — THE COMPETITION */}
        <section className="py-16 px-4 border-b-2 border-pixel-gray-800 bg-pixel-black/80">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-xs text-pixel-orange-bright">LEVEL 06</span>
                <span className="text-pixel-gray-600">/</span>
                <h2 className="font-display text-xl sm:text-2xl text-pixel-cream uppercase">
                  SCOREBOARD PREVIEW
                </h2>
              </div>
              <Link href="/matches" className="font-pixel text-[10px] text-pixel-orange-bright hover:underline flex items-center gap-1">
                <span>VIEW ALL MATCHES</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MATCHES_DATA.slice(0, 2).map((m) => (
                <PixelCard key={m.id} headerTitle={m.court} headerBadge={m.status}>
                  <div className="flex flex-col gap-3 my-2">
                    <div className="flex items-center justify-between bg-pixel-black p-2 border border-pixel-gray-800">
                      <span className="font-pixel text-xs text-pixel-cream">{m.playerA}</span>
                      <span className="font-pixel text-base text-pixel-orange-bright">{m.scoreA.join(" - ")}</span>
                    </div>
                    <div className="flex items-center justify-between bg-pixel-black p-2 border border-pixel-gray-800">
                      <span className="font-pixel text-xs text-pixel-cream">{m.playerB}</span>
                      <span className="font-pixel text-base text-pixel-orange-bright">{m.scoreB.join(" - ")}</span>
                    </div>
                  </div>
                </PixelCard>
              ))}
            </div>
          </div>
        </section>

        {/* LEVEL 07 — ENTER THE ARENA & FOOTER */}
        <section className="py-20 px-4 bg-pixel-black text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            <PixelBadge variant="orange" pulse>LEVEL 07</PixelBadge>
            <h2 className="font-display text-3xl sm:text-4xl text-pixel-cream font-bold uppercase text-pixel-glow">
              READY TO CLAIM YOUR PLACE ON COURT?
            </h2>
            <p className="font-sans text-xs sm:text-sm text-pixel-gray-400 max-w-xl">
              Access participant tools, team management hubs, and role control centers across all 18 visual operational dashboards.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mt-2">
              <Link href="/register">
                <PixelButton variant="primary" size="lg" glow>
                  BEGIN REGISTRATION →
                </PixelButton>
              </Link>
              <Link href="/admin">
                <PixelButton variant="dark" size="lg">
                  <Shield className="w-4 h-4 text-pixel-amber" />
                  <span>EXPLORE 18 DASHBOARDS</span>
                </PixelButton>
              </Link>
            </div>
          </div>

          <footer className="mt-20 pt-8 border-t border-pixel-gray-800 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-pixel-gray-500 font-pixel gap-4">
            <p>© 2026 SOUTH ZONE BADMINTON CHAMPIONSHIP.</p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-pixel-orange-bright">ABOUT</Link>
              <Link href="/contact" className="hover:text-pixel-orange-bright">CONTACT</Link>
              <Link href="/admin" className="hover:text-pixel-orange-bright">DASHBOARDS</Link>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
