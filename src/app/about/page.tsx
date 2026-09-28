"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import {
  Shield, Trophy, Users, Globe, X, ChevronRight,
  MapPin, CheckCircle2, Zap, Activity, Building, Award, Sparkles
} from "lucide-react";

export default function AboutPage() {
  const metrics = [
    {
      icon: Globe,
      value: " 5 STATES & 1 UT",
      label: "SOUTHERN REGION",
      sub: "Karnataka, TN, Kerala, AP, Telangana",
      accent: "#FF5A16",
    },
    {
      icon: Shield,
      value: "90+ INSTITUTIONS",
      label: "UNIVERSITIES & COLLEGES",
      sub: "Collegiate delegations & varsity teams",
      accent: "#FF5A16",
    },
    {
      icon: Trophy,
      value: "1,000+ ATHLETES",
      label: "FEMALE PARTICIPANTS",
      sub: "Top ranked badminton contenders",
      accent: "#EA580C",
    },
    {
      icon: Zap,
      value: "4 BWF COURTS",
      label: "TOURNAMENT MATS",
      sub: "1200-lux glare-free broadcast arena",
      accent: "#FF5A16",
    },
  ];

  const pillars = [
    {
      badge: "IDENTITY & PURPOSE",
      title: "OUR VISION & EMPOWERMENT",
      description:
        "The South Zone Women's Badminton Championship 2026 is dedicated to elevating collegiate female athletes across Southern India by delivering an Olympic-grade competition platform, transparent digital scoring, and an inspiring environment for sportsmanship.",
      points: [
        "AIU-sanctioned pathway toward National University Games selection",
        "Dedicated sports medicine, physio recovery lounges, and nutritional stations",
        "Equal opportunity, dignity, and zero-tolerance code of sporting conduct",
      ],
    },
    {
      badge: "HOST EXCELLENCE",
      title: "WORLD-CLASS ARENA INFRASTRUCTURE",
      description:
        "Hosted at the Dr. Prabhakar Kore Sports Complex at KLE Technological University, Hubballi. The facility features a high-ceiling championship hall equipped with 8 Yonex synthetic courts and tournament-grade illumination.",
      points: [
        "4 tournament-standard badminton courts with professional shock-absorption mats",
        "500+ spectator tiered seating capacity and VIP media commentary box",
        "Dedicated warm-up gymnasium and tactical review zones",
      ],
    },
    {
      badge: "COLLEGIATE HOSPITALITY",
      title: "CAMPUS & HOSTEL LOGISTICS",
      description:
        "We ensure visiting teams and officials experience seamless hospitality from arrival to departure. Dedicated athlete wings at Shalmala and Vindhya Hostels offer comfortable accommodations, nutritious meal plans, and secure keycard access.",
      points: [
        "Exclusive lodging wings for teams, coaches, and team managers",
        "Campus transit shuttles connecting Hubballi Central Junction & the venue",
        "24/7 security escort, campus health center, and emergency medical support",
      ],
    },
    {
      badge: "FAIR PLAY & INTEGRITY",
      title: "TECHNICAL COMMISSION & PROTOCOLS",
      description:
        "Governed in strict accordance with Badminton World Federation (BWF) statutes and Association of Indian Universities (AIU) competition guidelines. Certified national-grade referees and automated digital scoreboards ensure unbiased outcomes.",
      points: [
        "Qualified BAI / BWF certified chief referee and court umpires",
        "Tablet-based umpire scoring consoles synced to real-time live telemetry",
        "Tamper-evident match result archival and verified electronic draw boards",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col justify-between selection:bg-[#FF5A16] selection:text-white">

      <ArcadeNav />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 my-4 z-10 pb-16">

        {/* ═══ MASTER HERO BANNER (WHITE & ORANGE ACCENT) ═══ */}
        <div className="relative border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-white to-orange-50/50 p-6 sm:p-10 rounded-2xl shadow-md mb-8 overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 border border-orange-300 rounded-full text-xs font-bold text-[#FF5A16] tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-pulse" />
                OFFICIAL TOURNAMENT COMPENDIUM
              </span>
              <span className="text-xs font-bold text-orange-800 tracking-wider uppercase hidden sm:inline">
                OCTOBER 18–21, 2026
              </span>
            </div>

            <h1 className="font-rajdhani text-3xl sm:text-5xl lg:text-6xl text-slate-900 font-black tracking-tight uppercase leading-none mb-3">
              ABOUT THE <span className="text-[#FF5A16]">CHAMPIONSHIP</span>
            </h1>

            <p className="font-rajdhani text-xs sm:text-sm text-[#FF5A16] font-bold uppercase tracking-wider mb-3">
              SOUTH ZONE INTER-UNIVERSITY WOMEN&apos;S BADMINTON TOURNAMENT &bull; HUBBALLI
            </p>

            <p className="font-sans text-xs sm:text-sm text-slate-700 leading-relaxed max-w-2xl">
              Bringing together over 1,000 elite female student-athletes, coaches, and university delegations across Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, Kerala, and Puducherry for the apex inter-collegiate badminton crown.
            </p>
          </div>
        </div>

        {/* ═══ 4 METRICS CARDS (WHITE & ORANGE THEME) ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="bg-white border-2 border-slate-200 hover:border-[#FF5A16] p-5 rounded-2xl shadow-md hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Icon className="w-5 h-5 text-[#FF5A16]" />
                  </div>
                  <div>
                    <p className="font-rajdhani text-2xl sm:text-3xl text-slate-900 font-black leading-none">{m.value}</p>
                    <p className="font-rajdhani text-[11px] text-[#FF5A16] font-bold tracking-wider uppercase mt-0.5">{m.label}</p>
                  </div>
                </div>
                <p className="font-sans text-xs text-slate-600 mt-2.5 border-t border-slate-100 pt-2 leading-relaxed">
                  {m.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* ═══ 4-GRID CONTENT PILLARS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-slate-200 hover:border-orange-400 rounded-2xl p-6 sm:p-7 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <span className="font-rajdhani text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 shadow-xs">
                    {pillar.badge}
                  </span>
                  <span className="font-rajdhani text-xs text-slate-500 font-bold tracking-wider">
                    0{idx + 1} // PROTOCOL
                  </span>
                </div>

                <h2 className="font-rajdhani text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2.5">
                  {pillar.title}
                </h2>

                <p className="font-sans text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">
                  {pillar.description}
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3.5 mt-2">
                {pillar.points.map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-700 font-sans">
                    <CheckCircle2 className="w-4 h-4 text-[#FF5A16] shrink-0 mt-0.5" />
                    <span className="leading-snug">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ HOST CAMPUS SPOTLIGHT ═══ */}
        <div className="relative border-2 border-orange-200 rounded-2xl p-6 sm:p-8 bg-white shadow-md overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <span className="font-rajdhani text-xs text-[#FF5A16] uppercase font-bold tracking-widest flex items-center gap-1.5">
                <Building className="w-4 h-4" />
                VENUE PARTNER &amp; CAMPUS EMBASSY
              </span>
              <h2 className="font-rajdhani text-2xl sm:text-3xl text-slate-900 font-black uppercase">
                KLE TECHNOLOGICAL UNIVERSITY, HUBBALLI
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-700 leading-relaxed max-w-2xl">
                Renowned for academic rigor, innovation, and sporting distinction, KLE Technological University provides a cutting-edge campus setting for the 2026 Championship. Equipped with world-class indoor sports pavilions, residential dining, and high-speed medical assistance.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 font-sans text-xs text-slate-700">
                <span className="flex items-center gap-1.5 text-slate-900 font-semibold">
                  <MapPin className="w-4 h-4 text-[#FF5A16]" />
                  Vidyanagar, Hubballi, Karnataka 580031
                </span>
                <span className="text-orange-700 font-bold font-rajdhani tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                  AIU AFFILIATED ZONE
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-end">
              <Link
                href="/tournament"
                className="w-full sm:w-auto px-6 py-3 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani font-black text-xs uppercase tracking-wider rounded-xl transition-all text-center shadow-sm"
              >
                EXPLORE TOURNAMENT DETAILS &gt;
              </Link>
            </div>
          </div>
        </div>

      </main>

      {/* BOTTOM BROADCAST TICKER */}
      <footer className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between font-rajdhani text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-2 text-[#FF5A16]">
          <span>🏸</span>
          <span className="text-slate-900 font-bold tracking-wider">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[#FF5A16] font-bold tracking-wider">
          <span className="text-orange-700">DISCIPLINE TODAY</span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-[#FF5A16]">CHAMPION TOMORROW</span>
        </div>
      </footer>
    </div>
  );
}
