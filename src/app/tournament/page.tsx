"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Tournament3DCanvas } from "@/components/tournament/Tournament3DCanvas";
import {
  FileText, MapPin, CheckCircle2, ChevronRight, X,
  Shield, Trophy, Calendar, Users, Award, Scale, HelpCircle,
  Menu, BarChart2, Zap
} from "lucide-react";

export default function TournamentPage() {
  const [selectedRule, setSelectedRule] = useState<number | null>(null);
  const [activeVenueTab, setActiveVenueTab] = useState<"amphi" | "facade" | "campus">("amphi");
  const [venuePhotoTheme, setVenuePhotoTheme] = useState<"pixel" | "real">("pixel");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalSection, setModalSection] = useState<string | null>(null);
  const [heroTheme, setHeroTheme] = useState<"pixel-campus" | "real-campus" | "arena">("pixel-campus");

  const rulesData = [
    {
      id: 1,
      title: "Tournament Rules",
      fullTitle: "Tournament Rules & Match Format",
      icon: Shield,
      summary: "BWF Standard Laws of Badminton. Best of 3 games to 21 rally points.",
      details: "All matches are conducted strictly under the official Badminton World Federation (BWF) rally points scoring system. Each game is played to 21 points (sudden death capped at 30 points). An interval of 60 seconds is permitted when the leading score reaches 11 points, and a 120-second interval between games. Match scheduling and court allotments are governed by the Chief Referee.",
    },
    {
      id: 2,
      title: "Player Eligibility",
      fullTitle: "Player Eligibility & Verification",
      icon: Users,
      summary: "Verified collegiate student & registered state athletes across South Zone.",
      details: "Tournament participation is open to full-time enrolled collegiate students or registered state badminton athletes affiliated with accredited colleges/universities in Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, and Telangana. Individual registrations are managed via the Official Registration Team. Physical university ID cards and official digital accreditation passes are required at court call.",
    },
    {
      id: 3,
      title: "Code of Conduct",
      fullTitle: "Code of Conduct & Sportsmanship",
      icon: FileText,
      summary: "Strict zero-tolerance policy for misconduct, referee authority, anti-doping.",
      details: "All players, team managers, and coaches must uphold the highest standards of athletic sportsmanship and BWF integrity codes. Disciplinary sanctions including official warnings, yellow/red cards, or immediate tournament disqualification will be strictly enforced by the Disciplinary Committee for audible obscenity, equipment abuse, or intentional delay of game.",
    },
    {
      id: 4,
      title: "Equipment Standards",
      fullTitle: "Equipment & Uniform Standards",
      icon: Trophy,
      summary: "Yonex AS-30 feather shuttles, approved non-marking gum rubber court shoes.",
      details: "The official tournament match shuttlecock is the Yonex Aerosensa 30 (AS-30) grade feather shuttle. All competitors must wear certified non-marking gum-rubber indoor badminton shoes on wooden synthetic courts. Playing jerseys must display player surnames and respective collegiate acronyms on the back in compliance with tournament uniform regulations.",
    },
    {
      id: 5,
      title: "Protests & Appeals",
      fullTitle: "Protests & Disciplinary Appeals",
      icon: Scale,
      summary: "Formal written appeals submitted within 30 minutes of match completion.",
      details: "Formal protests concerning points of tournament law or player eligibility must be submitted in writing by the certified Team Manager to the Chief Tournament Referee within 30 minutes of match conclusion, accompanied by an official appeal fee of ₹ 1,000 (refundable if the protest is upheld). The Referee's determination on matters of fact is final and binding.",
    },
  ];

  const venueImages = {
    amphi: {
      pixel: "/arena-amphitheatre-pixel.jpg",
      real: "/arena-amphitheatre.jpg",
      title: "AMPHITHEATRE & SUNKEN ARENA ENTRY",
      desc: "Dr. Prabhakar Kore Sports Arena's iconic sunken plaza with curved black canopy, illuminated red portal, and tiered stone seating wrapped in grass earth berms.",
      meta: "CAPACITY: 2,500+ SPECTATORS",
    },
    facade: {
      pixel: "/arena-facade-pixel.jpg",
      real: "/arena-facade.webp",
      title: "INDOOR BADMINTON ARENA FACADE",
      desc: "Architectural pleated black metal panel facade with angular cantilevered red entrance soffit and BVB / KLE Tech emblem, housing 8 BWF-standard courts.",
      meta: "8 REGULATION WOODEN COURTS",
    },
    campus: {
      pixel: "/college-campus-pixel.jpg",
      real: "/college-campus.webp",
      title: "KLE TECH UNIVERSITY HERITAGE CAMPUS",
      desc: "Historic landmark university administrative building with neoclassical pediment, ionic colonnade wings, and championship avenue.",
      meta: "HOST UNIVERSITY • HUBBALLI, KA",
    },
  };

  const navLinks = [
    { label: "HOME", path: "/" },
    { label: "TOURNAMENT", path: "/tournament", active: true },
    { label: "SCHEDULE", path: "/schedule" },
    { label: "RESULTS", path: "/results" },
    { label: "EXPERIENCE", path: "/about" },
    { label: "ABOUT", path: "/contact" },
  ];

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#FF5A16] selection:text-white">

      {/* ═════════════════════════════════════════════════════════════════
          TOP NAVIGATION BAR (MATCHING REFERENCE IMAGE 02. TOURNAMENT)
          ═════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#050914]/95 backdrop-blur-md border-b border-[#18D8D0]/30 select-none">
        <div className="max-w-[1536px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5">

          {/* Logo & Championship Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 32 32" className="w-7 h-7 drop-shadow-[0_0_8px_rgba(24,216,208,0.5)]">
                <circle cx="16" cy="10" r="5" fill="#FF5A16" />
                <circle cx="16" cy="10" r="2.5" fill="#FFF" />
                <path d="M11 13 L8 27 L24 27 L21 13Z" fill="#F4E6CE" />
                <line x1="13" y1="14" x2="11" y2="26" stroke="#18D8D0" strokeWidth="1" />
                <line x1="16" y1="14" x2="16" y2="26" stroke="#18D8D0" strokeWidth="1" />
                <line x1="19" y1="14" x2="21" y2="26" stroke="#18D8D0" strokeWidth="1" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-pixel text-xs sm:text-sm text-[#F4E6CE] font-bold tracking-tight leading-tight group-hover:text-[#18D8D0] transition-colors">
                SOUTH ZONE
              </span>
              <span className="font-pixel text-[8px] sm:text-[9px] text-[#91A0AE] tracking-wider">
                WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
              </span>
            </div>
          </Link>

          {/* Navigation Links (TOURNAMENT is active with orange highlight & underline) */}
          <nav className="hidden lg:flex items-center gap-7 font-pixel text-[10px] tracking-wider">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`relative py-1 transition-colors duration-200 ${link.active
                  ? "text-[#FF5A16] font-bold"
                  : "text-[#91A0AE] hover:text-[#18D8D0]"
                  }`}
              >
                {link.label}
                {link.active && (
                  <motion.div
                    className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-[#FF5A16]"
                    layoutId="tournamentNavIndicator"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Action: Mobile Menu */}
          <div className="flex items-center gap-3 sm:gap-4">

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-[#18D8D0] hover:text-[#FF5A16] transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden bg-[#07101D] border-t border-[#18D8D0]/30"
            >
              <div className="flex flex-col gap-3 p-4 font-pixel text-xs text-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={link.active ? "text-[#FF5A16] font-bold" : "text-[#F4E6CE] hover:text-[#18D8D0]"}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ═════════════════════════════════════════════════════════════════
          MAIN TOURNAMENT PAGE CONTENT CONTAINER
          ═════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1536px] mx-auto w-full px-3 sm:px-5 lg:px-8 pt-4 pb-14 z-10 space-y-6">

        {/* ═════════════════════════════════════════════════════════════════
            02. HERO SECTION — EXACT RECONSTRUCTION TO REFERENCE IMAGE
            (Twilight Sunset, KLE Tech Arena, Women Play Lead Inspire, South Zone Athletes)
            ═════════════════════════════════════════════════════════════════ */}
        <section className="relative w-full border-2 border-[#18D8D0]/60 bg-[#07101D] shadow-[0_0_30px_rgba(24,216,208,0.18)] overflow-hidden rounded-xs min-h-[380px] sm:min-h-[420px] lg:min-h-[460px] flex flex-col justify-between">

          {/* Authentic Arena Pixel Background */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/arena-amphitheatre-pixel.jpg"
              alt="KLE Tech Arena - South Zone Women's Badminton Championship 2026"
              fill
              priority
              className="object-cover object-center pixelated"
            />
            {/* Subtle Gradient Veil for Perfect Text Contrast without altering the artwork */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050914]/85 via-[#050914]/30 to-transparent lg:w-3/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050914]/70 via-transparent to-[#050914]/30" />
          </div>

          {/* Three.js 3D Floating Embers, Stars & Parallax Depth Canvas */}
          <Tournament3DCanvas className="z-10" />

          {/* Hero Content Overlay (DOM text perfectly aligned to Reference Board 02) */}
          <div className="relative z-20 p-4 sm:p-6 lg:p-8 flex flex-col justify-between flex-1">

            {/* Top Row: Editorial Tag on Left, South Women Stronger Together on Right */}
            <div className="flex items-start justify-between">
              {/* Top-Left Tag */}
              <div className="font-pixel text-[9px] sm:text-[10px] text-[#18D8D0] tracking-widest leading-relaxed uppercase select-none">
                <p>DISCIPLINE</p>
                <p>CREATES</p>
                <p>CHAMPIONS</p>
                <div className="w-6 h-[2px] bg-[#18D8D0]/50 mt-1" />
              </div>

              {/* Top-Right Tag */}
              <div className="font-pixel text-[9px] sm:text-[10px] text-[#18D8D0] tracking-widest leading-relaxed uppercase text-right select-none">
                <p>SOUTH</p>
                <p>WOMEN</p>
                <p>STRONGER</p>
                <p>TOGETHER</p>
                <div className="w-6 h-[2px] bg-[#18D8D0]/50 mt-1 ml-auto" />
              </div>
            </div>

            {/* Middle Row: Massive Tournament Title Stack */}
            <div className="my-auto max-w-xl py-3 sm:py-4">
              <span className="font-rajdhani text-xl sm:text-2xl text-white font-bold tracking-wider block mb-1">
                THE
              </span>
              <h1
                className="font-rajdhani text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none mb-2 bg-gradient-to-r from-white via-[#00F0FF] to-[#0077FE] bg-clip-text text-transparent"
                style={{
                  filter: "drop-shadow(0 0 25px rgba(0,240,255,0.4))",
                }}
              >
                TOURNAMENT
              </h1>
              <p className="font-rajdhani text-xs sm:text-sm text-[#FFD700] font-bold tracking-wider uppercase mb-3">
                SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
              </p>
              <div className="font-rajdhani text-xs sm:text-sm text-[#00F0FF] tracking-wider uppercase space-y-0.5 font-bold">
                <p>MORE THAN A GAME.</p>
                <p className="text-[#FFD700]">A STRONGER TOMORROW.</p>
              </div>
            </div>

            {/* Bottom Row of Hero: Left & Right Vertical Banner Annotations */}
            <div className="flex flex-wrap items-end justify-between font-rajdhani text-xs text-slate-400 select-none pt-2 gap-2">
              <div className="px-3 py-1 bg-[#050914]/80 border border-[#00F0FF]/40 text-[#00F0FF] tracking-wider uppercase backdrop-blur-md rounded-full shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                WOMEN EMPOWER SPORTS
              </div>

              <div className="px-3 py-1 bg-[#050914]/80 border border-[#FFD700]/40 text-[#FFD700] tracking-wider uppercase backdrop-blur-md rounded-full shadow-[0_0_12px_rgba(255,215,0,0.2)]">
                SAME COURT. DIFFERENT STORIES.
              </div>
            </div>

          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            THE 6 STRUCTURED REFERENCE PANELS (2 ROWS × 3 COLUMNS)
            EXACT TO REFERENCE IMAGE 02. TOURNAMENT:
            Row 1: 01. TOURNAMENT OVERVIEW | 02. VENUE | 03. WOMEN'S CATEGORIES
            Row 2: 04. TOURNAMENT TIMELINE | 05. RULES & REGULATIONS | 06. PARTICIPATION
            ═════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* ─────────────────────────────────────────────────────────────
              PANEL 01: 01. TOURNAMENT OVERVIEW
              ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.08)] relative overflow-hidden rounded-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16]" />
                  <h2 className="font-pixel text-[10px] sm:text-xs text-[#18D8D0] font-bold uppercase tracking-wider">
                    01. TOURNAMENT OVERVIEW
                  </h2>
                </div>
                <button
                  onClick={() => setModalSection("01. TOURNAMENT OVERVIEW")}
                  className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-[#050914] font-pixel text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  MORE &gt;
                </button>
              </div>

              {/* Top Document Icon & Main Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 border border-[#18D8D0] bg-[#050914] flex items-center justify-center text-[#18D8D0] shrink-0 shadow-[2px_2px_0px_#000]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base text-[#F4E6CE] font-bold uppercase leading-tight">
                    A BIGGER PLATFORM FOR BRIGHTER TOMORROW
                  </h3>
                </div>
              </div>

              {/* Exact reference paragraph */}
              <p className="font-sans text-xs text-[#91A0AE] leading-relaxed mb-4">
                The South Zone Women&apos;s Badminton Championship 2026 brings together talented players, institutions and communities from across the southern region to compete, connect and create new opportunities.
              </p>
            </div>

            {/* Bottom Bar: SPORT UNITES. OPPORTUNITY ELEVATES. */}
            <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between font-pixel text-[8px] text-[#18D8D0]">
              <span className="tracking-wider">SPORT UNITES. OPPORTUNITY ELEVATES.</span>
              <span className="text-[#FF5A16]">SZWBT &apos;26</span>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PANEL 02: 02. VENUE (KLE TECH ARENA SHOWCASE WITH REAL CAMPUS IMAGES)
              ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.08)] relative overflow-hidden rounded-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16]" />
                  <h2 className="font-pixel text-[10px] sm:text-xs text-[#18D8D0] font-bold uppercase tracking-wider">
                    02. VENUE
                  </h2>
                </div>
                <button
                  onClick={() => setModalSection("02. VENUE")}
                  className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-[#050914] font-pixel text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  MORE &gt;
                </button>
              </div>

              {/* Pin Icon & Venue Subtitle */}
              <div className="flex items-center gap-1.5 mb-1 text-[#18D8D0]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <h3 className="font-pixel text-xs text-[#18D8D0] font-bold uppercase">
                  KLE TECH ARENA
                </h3>
              </div>
              <p className="font-pixel text-[8px] text-[#91A0AE] uppercase tracking-wider mb-3">
                A WORLD-CLASS STAGE FOR EXTRAORDINARY TALENT
              </p>

              {/* Venue Illustration & Facilities Grid */}
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* Left 7 cols: Image card with switcher */}
                <div className="col-span-7 flex flex-col gap-1.5">
                  <div className="relative aspect-[16/10] w-full border border-[#18D8D0]/50 overflow-hidden bg-[#050914] group">
                    <Image
                      src={
                        activeVenueTab === "amphi"
                          ? (venuePhotoTheme === "pixel" ? "/arena-amphitheatre-pixel.jpg" : "/arena-amphitheatre.jpg")
                          : activeVenueTab === "facade"
                            ? (venuePhotoTheme === "pixel" ? "/arena-facade-pixel.jpg" : "/arena-facade.webp")
                            : (venuePhotoTheme === "pixel" ? "/college-campus-pixel.jpg" : "/college-campus.webp")
                      }
                      alt="KLE Tech Arena Venue"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#050914]/90 border-t border-[#18D8D0]/30 px-2 py-0.5 text-center font-pixel text-[7px] text-[#18D8D0] uppercase tracking-wider">
                      KLE TECH ARENA
                    </div>
                  </div>

                  {/* Switcher buttons for original campus/arena photos */}
                  <div className="flex items-center justify-between text-[7px] font-pixel gap-1">
                    <button
                      onClick={() => setActiveVenueTab("amphi")}
                      className={`px-1.5 py-0.5 border cursor-pointer ${activeVenueTab === "amphi" ? "bg-[#18D8D0] text-black border-[#18D8D0]" : "text-[#91A0AE] border-[#1e2638]"}`}
                    >
                      AMPHI
                    </button>
                    <button
                      onClick={() => setActiveVenueTab("facade")}
                      className={`px-1.5 py-0.5 border cursor-pointer ${activeVenueTab === "facade" ? "bg-[#18D8D0] text-black border-[#18D8D0]" : "text-[#91A0AE] border-[#1e2638]"}`}
                    >
                      FACADE
                    </button>
                    <button
                      onClick={() => setActiveVenueTab("campus")}
                      className={`px-1.5 py-0.5 border cursor-pointer ${activeVenueTab === "campus" ? "bg-[#18D8D0] text-black border-[#18D8D0]" : "text-[#91A0AE] border-[#1e2638]"}`}
                    >
                      CAMPUS
                    </button>
                    <button
                      onClick={() => setVenuePhotoTheme(venuePhotoTheme === "pixel" ? "real" : "pixel")}
                      className="px-1 py-0.5 bg-[#FF5A16] text-black border border-black font-bold cursor-pointer"
                      title="Toggle Pixel Art vs Real Photo"
                    >
                      {venuePhotoTheme === "pixel" ? "REAL" : "PIXEL"}
                    </button>
                  </div>
                </div>

                {/* Right 5 cols: Reference Facilities List */}
                <div className="col-span-5 flex flex-col gap-1.5 font-pixel text-[8px] text-[#F4E6CE]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#18D8D0]">🏸</span>
                    <span>Premium Courts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#18D8D0]">🏟️</span>
                    <span>Spectator Seating</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#18D8D0]">👥</span>
                    <span>Athlete Facilities</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#18D8D0]">🚌</span>
                    <span>Transport Access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#18D8D0]">🛡️</span>
                    <span>Safe &amp; Secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between font-pixel text-[8px] text-[#91A0AE] mt-3">
              <span>HUBBALLI, KARNATAKA</span>
              <span className="text-[#18D8D0]">BWF RATIFIED ARENA</span>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PANEL 03: 03. WOMEN'S CATEGORIES
              ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.08)] relative overflow-hidden rounded-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16]" />
                  <h2 className="font-pixel text-[10px] sm:text-xs text-[#18D8D0] font-bold uppercase tracking-wider">
                    03. WOMEN&apos;S CATEGORIES
                  </h2>
                </div>
                <button
                  onClick={() => setModalSection("03. WOMEN'S CATEGORIES")}
                  className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-[#050914] font-pixel text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  MORE &gt;
                </button>
              </div>

              {/* 4 Colored Category Cards matching Reference Image */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {/* 1. Women's Singles (Blue card) */}
                <div className="bg-[#3D85C6] p-1.5 rounded-xs flex flex-col items-center justify-between min-h-[92px] text-center shadow-[1px_1px_0px_#000]">
                  <div className="relative w-full h-11 flex items-center justify-center">
                    <Image src="/cat-singles.png" alt="Women's Singles" fill className="object-contain" />
                  </div>
                  <span className="font-pixel text-[7px] text-[#050914] font-bold uppercase leading-tight mt-1">
                    WOMEN&apos;S<br />SINGLES
                  </span>
                </div>

                {/* 2. Women's Doubles (Magenta card) */}
                <div className="bg-[#E06666] p-1.5 rounded-xs flex flex-col items-center justify-between min-h-[92px] text-center shadow-[1px_1px_0px_#000]">
                  <div className="relative w-full h-11 flex items-center justify-center">
                    <Image src="/cat-doubles.png" alt="Women's Doubles" fill className="object-contain" />
                  </div>
                  <span className="font-pixel text-[7px] text-[#050914] font-bold uppercase leading-tight mt-1">
                    WOMEN&apos;S<br />DOUBLES
                  </span>
                </div>

                {/* 3. Mixed Doubles (Amber card) */}
                <div className="bg-[#F6B26B] p-1.5 rounded-xs flex flex-col items-center justify-between min-h-[92px] text-center shadow-[1px_1px_0px_#000]">
                  <div className="relative w-full h-11 flex items-center justify-center">
                    <Image src="/cat-mixed.png" alt="Mixed Doubles" fill className="object-contain" />
                  </div>
                  <span className="font-pixel text-[7px] text-[#050914] font-bold uppercase leading-tight mt-1">
                    MIXED<br />DOUBLES<br />(OPTIONAL)
                  </span>
                </div>

                {/* 4. Institution Teams (Teal card) */}
                <div className="bg-[#45818E] p-1.5 rounded-xs flex flex-col items-center justify-between min-h-[92px] text-center shadow-[1px_1px_0px_#000]">
                  <div className="relative w-full h-11 flex items-center justify-center">
                    <Image src="/cat-teams.png" alt="Institution Teams" fill className="object-contain" />
                  </div>
                  <span className="font-pixel text-[7px] text-[#050914] font-bold uppercase leading-tight mt-1">
                    INSTITUTION<br />TEAMS
                  </span>
                </div>
              </div>
            </div>

            {/* Quote + Shuttlecock Graphic on Bottom Right */}
            <div className="pt-2 border-t border-[#1e2638] flex items-center justify-between">
              <p className="font-pixel text-[8px] text-[#18D8D0] italic">
                &quot;DIFFERENT CATEGORIES.<br />ONE SHARED PASSION.&quot;
              </p>
              <div className="relative w-12 h-8">
                <Image src="/cat-shuttlecock.png" alt="Pixel Shuttlecock" fill className="object-contain" />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PANEL 04: 04. TOURNAMENT TIMELINE
              ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.08)] relative overflow-hidden rounded-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16]" />
                  <h2 className="font-pixel text-[10px] sm:text-xs text-[#18D8D0] font-bold uppercase tracking-wider">
                    04. TOURNAMENT TIMELINE
                  </h2>
                </div>
                <button
                  onClick={() => setModalSection("04. TOURNAMENT TIMELINE")}
                  className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-[#050914] font-pixel text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  MORE &gt;
                </button>
              </div>

              {/* 5 Connected Milestones */}
              <div className="relative py-2 my-2">
                {/* Horizontal Cyan Connecting Line */}
                <div className="absolute top-[48px] left-4 right-4 h-[2px] bg-[#18D8D0]" />

                <div className="grid grid-cols-5 gap-1 text-center relative z-10">
                  {/* Node 1: Official University Intake */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 text-[#18D8D0] flex items-center justify-center mb-1">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-pixel text-[7px] text-[#F4E6CE] font-bold leading-tight h-6 flex items-center justify-center">
                      OFFICIAL INTAKE
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#18D8D0] border-2 border-[#050914] my-1 shadow-[0_0_8px_#18D8D0]" />
                    <span className="font-pixel text-[7px] text-[#91A0AE]">TBA</span>
                  </div>

                  {/* Node 2: Team Confirmation */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 text-[#18D8D0] flex items-center justify-center mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-pixel text-[7px] text-[#F4E6CE] font-bold leading-tight h-6 flex items-center justify-center">
                      TEAM CONFIRMATION
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#18D8D0] border-2 border-[#050914] my-1 shadow-[0_0_8px_#18D8D0]" />
                    <span className="font-pixel text-[7px] text-[#91A0AE]">TBA</span>
                  </div>

                  {/* Node 3: Match Schedule */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 text-[#18D8D0] flex items-center justify-center mb-1">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="font-pixel text-[7px] text-[#F4E6CE] font-bold leading-tight h-6 flex items-center justify-center">
                      MATCH SCHEDULE
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#18D8D0] border-2 border-[#050914] my-1 shadow-[0_0_8px_#18D8D0]" />
                    <span className="font-pixel text-[7px] text-[#91A0AE]">TBA</span>
                  </div>

                  {/* Node 4: Tournament Days */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 text-[#18D8D0] flex items-center justify-center mb-1">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="font-pixel text-[7px] text-[#F4E6CE] font-bold leading-tight h-6 flex items-center justify-center">
                      TOURNAMENT DAYS
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#18D8D0] border-2 border-[#050914] my-1 shadow-[0_0_8px_#18D8D0]" />
                    <span className="font-pixel text-[7px] text-[#91A0AE]">TBA</span>
                  </div>

                  {/* Node 5: Finals & Awards */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 text-[#18D8D0] flex items-center justify-center mb-1">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="font-pixel text-[7px] text-[#F4E6CE] font-bold leading-tight h-6 flex items-center justify-center">
                      FINALS &amp; AWARDS
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#18D8D0] border-2 border-[#050914] my-1 shadow-[0_0_8px_#18D8D0]" />
                    <span className="font-pixel text-[7px] text-[#91A0AE]">TBA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: //// PATHWAY OF DEDICATION TO GLORY. //// */}
            <div className="pt-3 border-t border-[#1e2638] text-center font-pixel text-[8px] text-[#18D8D0] tracking-widest">
              //// PATHWAY OF DEDICATION TO GLORY. ////
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PANEL 05: 05. RULES & REGULATIONS
              ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.08)] relative overflow-hidden rounded-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16]" />
                  <h2 className="font-pixel text-[10px] sm:text-xs text-[#18D8D0] font-bold uppercase tracking-wider">
                    05. RULES &amp; REGULATIONS
                  </h2>
                </div>
                <button
                  onClick={() => setModalSection("05. RULES & REGULATIONS")}
                  className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-[#050914] font-pixel text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  MORE &gt;
                </button>
              </div>

              {/* 5 Rules Rows with Icons & View Details > */}
              <div className="divide-y divide-[#1e2638] font-pixel text-[8px] sm:text-[9px]">
                {rulesData.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={rule.id}
                      onClick={() => setSelectedRule(rule.id)}
                      className="py-2 flex items-center justify-between hover:bg-[#18D8D0]/5 px-1 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-[#F4E6CE] group-hover:text-[#18D8D0] transition-colors">
                        <Icon className="w-3.5 h-3.5 text-[#18D8D0]" />
                        <span>{rule.title}</span>
                      </div>
                      <span className="text-[#18D8D0] group-hover:text-[#FF5A16] flex items-center gap-1 transition-colors">
                        <span>View Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Bar: FAIR PLAY BUILDS GREATER PLAYERS. + slashes */}
            <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between font-pixel text-[8px] mt-2">
              <span className="text-[#18D8D0] tracking-wider">FAIR PLAY BUILDS GREATER PLAYERS.</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="inline-block w-1 h-2.5 bg-[#FF5A16]" style={{ transform: "skewX(-25deg)" }} />
                ))}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PANEL 06: 06. PARTICIPATION
              ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.08)] relative overflow-hidden rounded-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16]" />
                  <h2 className="font-pixel text-[10px] sm:text-xs text-[#18D8D0] font-bold uppercase tracking-wider">
                    06. PARTICIPATION
                  </h2>
                </div>
                <button
                  onClick={() => setModalSection("06. PARTICIPATION")}
                  className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#18D8D0] hover:text-[#050914] font-pixel text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  MORE &gt;
                </button>
              </div>

              {/* Title & Tagline */}
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 border border-[#18D8D0] bg-[#050914] flex items-center justify-center text-[#18D8D0] shrink-0 shadow-[2px_2px_0px_#000]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-xs sm:text-sm text-[#F4E6CE] font-bold uppercase leading-tight">
                    BE PART OF SOMETHING BIGGER
                  </h3>
                  <p className="font-pixel text-[7.5px] text-[#18D8D0] uppercase tracking-wider mt-0.5">
                    FOR PLAYERS. FOR INSTITUTIONS. FOR A STRONGER TOMORROW.
                  </p>
                </div>
              </div>

              {/* Checklist items matching Reference Image */}
              <ul className="space-y-1.5 font-sans text-xs text-[#91A0AE] my-3">
                {[
                  "Open to institutions across South Zone",
                  "Multiple participation categories",
                  "Safe, secure and well-organized environment",
                  "Accommodation and transportation support",
                  "A platform to showcase talent and build future opportunities",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#18D8D0] font-bold text-xs shrink-0 mt-0.5">✔</span>
                    <span className="leading-snug text-[11px] sm:text-xs">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Meta */}
            <div className="pt-2.5 border-t border-[#1e2638] flex items-center justify-between font-pixel text-[8px] text-[#91A0AE]">
              <span>KLE TECH UNIVERSITY</span>
              <span className="text-[#18D8D0]">OCT 18 – 21, 2026</span>
            </div>
          </div>

        </div>

      </main>

      {/* ═════════════════════════════════════════════════════════════════
          BOTTOM BROADCAST TICKER & FOOTER
          (EXACT TO REFERENCE: Shuttlecock, Tournament branding, Sport Unites, Discipline Today, Champion Tomorrow, Socials)
          ═════════════════════════════════════════════════════════════════ */}
      <footer className="sticky bottom-0 z-50 bg-[#050914]/95 backdrop-blur-md border-t border-[#18D8D0]/40 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between font-pixel text-[8px] sm:text-[9px] gap-2 select-none">

        {/* Left: Shuttlecock + Championship Title */}
        <div className="flex items-center gap-2 text-[#18D8D0]">
          <span>🏸</span>
          <span className="text-[#F4E6CE] tracking-wider">
            SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
          </span>
        </div>

        {/* Center: Slogan + Progress Indicator */}
        <div className="hidden md:flex items-center gap-3 text-[#18D8D0]">
          <span className="text-[#91A0AE]">|</span>
          <span className="tracking-widest">SPORT UNITES. OPPORTUNITY ELEVATES.</span>
          <div className="w-16 h-[2px] bg-[#18D8D0]/30 overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 w-6 bg-[#18D8D0]"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* Right: Discipline Today / Champion Tomorrow + Socials */}
        <div className="flex items-center gap-4 ml-auto sm:ml-0">
          <div className="hidden sm:flex items-center gap-2">
            <span>🏸</span>
            <span className="text-[#18D8D0]">DISCIPLINE TODAY</span>
            <span className="text-[#FF7A1A]">CHAMPION TOMORROW</span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2.5 text-[#F4E6CE] hover:text-[#18D8D0] transition-colors">
            <span className="cursor-pointer hover:text-[#18D8D0]" title="Instagram">📷</span>
            <span className="cursor-pointer hover:text-[#18D8D0]" title="YouTube">📺</span>
            <span className="cursor-pointer hover:text-[#18D8D0]" title="X / Twitter">✖</span>
            <span className="cursor-pointer hover:text-[#18D8D0]" title="Facebook">📘</span>
          </div>
        </div>
      </footer>

      {/* ═════════════════════════════════════════════════════════════════
          INTERACTIVE DETAILS MODAL (FOR RULES & MORE BUTTONS)
          ═════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {(selectedRule !== null || modalSection !== null) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setSelectedRule(null);
              setModalSection(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#07101D] border-2 border-[#18D8D0] p-6 max-w-xl w-full shadow-[0_0_30px_rgba(24,216,208,0.3)] relative"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedRule(null);
                  setModalSection(null);
                }}
                className="absolute top-4 right-4 p-1 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] hover:bg-[#FF5A16] hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Content for Rules */}
              {selectedRule !== null && (() => {
                const rule = rulesData.find(r => r.id === selectedRule);
                if (!rule) return null;
                const Icon = rule.icon;
                return (
                  <div>
                    <div className="flex items-center gap-3 border-b border-[#18D8D0]/30 pb-3 mb-4">
                      <div className="w-10 h-10 border border-[#18D8D0] bg-[#050914] flex items-center justify-center text-[#18D8D0]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-pixel text-[9px] text-[#FF5A16] uppercase">
                          OFFICIAL CHAMPIONSHIP BYLAWS
                        </span>
                        <h3 className="font-display text-lg text-[#F4E6CE] font-bold">
                          {rule.fullTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="p-3 bg-[#050914] border border-[#18D8D0]/30 mb-4 font-pixel text-[10px] text-[#18D8D0]">
                      {rule.summary}
                    </div>

                    <p className="font-sans text-sm text-[#91A0AE] leading-relaxed mb-6">
                      {rule.details}
                    </p>

                    <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between font-pixel text-[9px] text-[#91A0AE]">
                      <span>BWF STANDARD / SZWBT 2026</span>
                      <button
                        onClick={() => setSelectedRule(null)}
                        className="px-4 py-1.5 bg-[#18D8D0] text-[#050914] font-bold hover:bg-[#FF5A16] transition-colors cursor-pointer"
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Content for General Panels */}
              {modalSection !== null && (
                <div>
                  <div className="flex items-center gap-2 border-b border-[#18D8D0]/30 pb-3 mb-4">
                    <span className="w-2.5 h-2.5 bg-[#FF5A16]" />
                    <h3 className="font-display text-lg text-[#F4E6CE] font-bold uppercase">
                      {modalSection}
                    </h3>
                  </div>

                  {modalSection === "02. VENUE" && (
                    <div className="space-y-4">
                      <div className="relative aspect-video w-full border border-[#18D8D0]/50 overflow-hidden">
                        <Image
                          src={venueImages[activeVenueTab][venuePhotoTheme]}
                          alt="Venue Full Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <h4 className="font-display text-base text-[#18D8D0] font-bold">
                        {venueImages[activeVenueTab].title}
                      </h4>
                      <p className="font-sans text-sm text-[#91A0AE] leading-relaxed">
                        {venueImages[activeVenueTab].desc}
                      </p>
                      <div className="font-pixel text-[10px] text-[#FF5A16]">
                        {venueImages[activeVenueTab].meta}
                      </div>
                    </div>
                  )}

                  {modalSection === "01. TOURNAMENT OVERVIEW" && (
                    <div className="space-y-3 font-sans text-sm text-[#91A0AE] leading-relaxed">
                      <p>
                        The South Zone Women&apos;s Badminton Championship 2026 is an accredited premier inter-university and state championship hosted at KLE Technological University, Hubballi, Karnataka.
                      </p>
                      <p>
                        Sanctioned under national university sports federation rules, the championship brings together elite collegiate women athletes representing universities across Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, and Telangana.
                      </p>
                      <div className="p-3 bg-[#050914] border border-[#18D8D0]/40 font-pixel text-[10px] text-[#18D8D0]">
                        DATES: OCTOBER 18 – 21, 2026 • VENUE: KLE TECH ARENA
                      </div>
                    </div>
                  )}

                  {modalSection === "03. WOMEN'S CATEGORIES" && (
                    <div className="space-y-3 font-sans text-sm text-[#91A0AE]">
                      <p>
                        Official competition events include Women&apos;s Singles (WS-Open, WS-U19), Women&apos;s Doubles (WD-Open, WD-U19), Mixed Doubles (Exhibition/Optional), and the prestigious Inter-University Team Championship Trophy ties.
                      </p>
                      <p>
                        All ties feature 5 matches (3 Singles, 2 Doubles) conducted under standard BWF team championship regulations.
                      </p>
                    </div>
                  )}

                  {modalSection === "04. TOURNAMENT TIMELINE" && (
                    <div className="space-y-2 font-pixel text-xs text-[#91A0AE]">
                      <div className="p-2 bg-[#050914] border border-[#18D8D0]/30 flex justify-between">
                        <span className="text-[#F4E6CE]">Registration Committee Intake:</span>
                        <span className="text-[#18D8D0]">TBA</span>
                      </div>
                      <div className="p-2 bg-[#050914] border border-[#18D8D0]/30 flex justify-between">
                        <span className="text-[#F4E6CE]">Team Roster Confirmation:</span>
                        <span className="text-[#18D8D0]">TBA</span>
                      </div>
                      <div className="p-2 bg-[#050914] border border-[#18D8D0]/30 flex justify-between">
                        <span className="text-[#F4E6CE]">Fixtures &amp; Court Draw Release:</span>
                        <span className="text-[#18D8D0]">TBA</span>
                      </div>
                      <div className="p-2 bg-[#050914] border border-[#18D8D0]/30 flex justify-between">
                        <span className="text-[#F4E6CE]">Opening Ceremony &amp; Ties:</span>
                        <span className="text-[#18D8D0]">TBA</span>
                      </div>
                    </div>
                  )}

                  {modalSection === "06. PARTICIPATION" && (
                    <div className="space-y-3 font-sans text-sm text-[#91A0AE]">
                      <p>
                        All accredited universities and colleges across South India are invited to participate. Team registrations are coordinated directly via the designated SZWBT Registration Team.
                      </p>
                      <p>
                        Complimentary campus hostel accommodation (Shalmala Female Athlete Hostel) and dedicated Hubballi Junction/Airport shuttle transit are provided for all registered teams and officials.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 pt-3 border-t border-[#1e2638] flex justify-end">
                    <button
                      onClick={() => setModalSection(null)}
                      className="px-4 py-1.5 bg-[#18D8D0] text-[#050914] font-pixel text-xs font-bold hover:bg-[#FF5A16] transition-colors cursor-pointer"
                    >
                      CLOSE
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
