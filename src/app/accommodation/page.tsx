"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { 
  Home, Building2, Shield, CheckCircle2, ChevronRight, 
  MapPin, Coffee, Wifi, Lock, Users, Sparkles, Phone, AlertCircle 
} from "lucide-react";

type AccommodationTab = "HOSTELS" | "HOTELS" | "GUIDELINES";

export default function AccommodationPage() {
  const [activeTab, setActiveTab] = useState<AccommodationTab>("HOSTELS");
  const [selectedRoomModal, setSelectedRoomModal] = useState<string | null>(null);

  const roomsData = [
    {
      id: "5bed",
      name: "5-Bed Room",
      subtitle: "Shared • Comfortable",
      tag: "STANDARD VARSITY",
      price: "INCLUDED IN REGISTRATION",
      desc: "Spacious five-athlete dorm setup with individual study desks, secure wardrobes, and attached modern washrooms.",
      features: [
        "Biometric card access & 24/7 security",
        "Individual secure lockers & study desks",
        "Attached washroom with solar hot water",
        "High-speed campus Wi-Fi (Wi-Fi 6)",
        "Daily housekeeping & laundry service",
      ],
      block: "Shalmala Female Athlete Hostel",
      distance: "3-minute walk to KLE Tech Arena",
      badgeColor: "#18D8D0",
    },
    {
      id: "2bed",
      name: "2-Bed Room",
      subtitle: "Premium • Limited",
      tag: "TWIN SHARING",
      price: "₹ 600 / NIGHT PER ATHLETE",
      desc: "Enhanced dual occupancy with air-conditioning, twin ergonomic beds, and quiet preparation zone for competitors.",
      features: [
        "Split air-conditioning & soundproofing",
        "Twin orthopedic mattresses for recovery",
        "Ensuite premium bathroom",
        "Dedicated athlete study/lounge access",
        "Complimentary evening sports snack",
      ],
      block: "Vindhya Athlete Residence (Wing B)",
      distance: "5-minute walk to KLE Tech Arena",
      badgeColor: "#FF5A16",
    },
    {
      id: "single",
      name: "Single Room",
      subtitle: "Cozy • Limited",
      tag: "COACHES & OFFICIALS",
      price: "₹ 1,200 / NIGHT",
      desc: "Private executive suite reserved for team coaches, institutional managers, and certified match officials.",
      features: [
        "King-single bed with executive workstation",
        "Smart TV & high-speed dedicated broadband",
        "Attached bath with luxury amenities",
        "Complimentary tournament breakfast buffet",
        "Express laundry & pressing service",
      ],
      block: "KLE Tech Faculty Guest Block",
      distance: "On-Campus (Direct shuttle)",
      badgeColor: "#FF7A1A",
    },
  ];

  const hotelsData = [
    {
      name: "Hotel Naveen Lakeside Hubballi",
      category: "4-Star Partner Hotel",
      distance: "4.5 km from Arena",
      rate: "₹ 3,500 / night (Special Tournament Rate)",
      perks: "Lake view rooms, complimentary breakfast, hourly arena shuttle",
      phone: "+91 836 237 0123",
    },
    {
      name: "The President Hotel Hubballi",
      category: "3-Star Deluxe Partner",
      distance: "3.2 km from Arena",
      rate: "₹ 2,400 / night",
      perks: "City center location, multi-cuisine restaurant, free Wi-Fi",
      phone: "+91 836 225 1111",
    },
    {
      name: "Clarks Inn Hubballi",
      category: "Modern Business Hotel",
      distance: "5.0 km (Airport Corridor)",
      rate: "₹ 2,800 / night",
      perks: "Airport pickup inclusion, gym & fitness center, express checkout",
      phone: "+91 836 221 4444",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-24 z-10">
        
        {/* ═══ MASTER ACCOMMODATION BANNER — EXACT TO REFERENCE 3 (PANEL 07) ═══ */}
        <section className="relative w-full border-2 border-[#18D8D0]/60 bg-[#07101D] shadow-[0_0_30px_rgba(24,216,208,0.12)] mb-8 overflow-hidden rounded-sm">
          {/* Background image: dusk stadium & hostel campus backdrop */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/college-campus-pixel.jpg"
              alt="Campus Residences & Arena"
              fill
              priority
              className="object-cover object-right md:object-center opacity-75 lg:opacity-80 filter contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050914]/90 via-[#050914]/75 to-transparent lg:w-3/4" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07101D] via-transparent to-[#050914]/50" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col justify-between min-h-[360px]">
            {/* Top badges */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#FF5A16] text-black font-pixel text-[10px] font-bold tracking-wider uppercase shadow-[2px_2px_0px_#000]">
                  ACCOMMODATION
                </span>
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-widest">
                  REST WELL. PLAY BETTER.
                </span>
              </div>
              <span className="font-pixel text-[9px] text-[#91A0AE] bg-[#050914]/80 px-2.5 py-1 border border-[#18D8D0]/30">
                A HOME AWAY FROM HOME
              </span>
            </div>

            {/* Main heading */}
            <div className="max-w-xl">
              <h1 className="font-display text-4xl sm:text-6xl text-[#F4E6CE] font-extrabold tracking-tight uppercase leading-none">
                CAMPUS <span className="text-[#FF5A16]">RESIDENCES</span>
              </h1>
              <p className="font-pixel text-xs text-[#18D8D0] mt-2 uppercase tracking-wider">
                SAFE, SECURE &amp; HYGIENIC FEMALE ATHLETE LIVING
              </p>
              <p className="font-sans text-xs sm:text-sm text-[#91A0AE] mt-2 leading-relaxed">
                Comfortable stay for a stronger tomorrow. High-security on-campus hostel blocks reserved exclusively for participating female athletes, managers, and officials.
              </p>
            </div>

            {/* Quick check bullets & quote on right */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#18D8D0]/30 mt-6">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-pixel text-[10px] text-[#18D8D0]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#18D8D0]" />
                  <span>24/7 SECURITY &amp; WARDEN</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#18D8D0]" />
                  <span>SAFE &amp; HYGIENIC FOOD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#18D8D0]" />
                  <span>CLOSE TO ARENA (&lt;5 MIN)</span>
                </div>
              </div>

              <div className="font-pixel text-xs text-[#FF5A16] italic">
                &quot;REST RECOVER PLAY BETTER&quot;
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FILTER TABS: [HOSTELS] [HOTELS] [GUIDELINES] (EXACT TO REFERENCE 3 PANEL 07) ═══ */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {(["HOSTELS", "HOTELS", "GUIDELINES"] as AccommodationTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 sm:px-7 py-2.5 font-pixel text-xs sm:text-sm font-bold tracking-wider uppercase transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[#18D8D0] text-[#050914] border-[#18D8D0] shadow-[3px_3px_0px_#000]"
                    : "bg-[#07101D] text-[#91A0AE] border-[#18D8D0]/40 hover:border-[#18D8D0] hover:text-[#F4E6CE]"
                }`}
              >
                {tab === "HOSTELS" ? "CAMPUS HOSTELS (RECOMMENDED)" : tab === "HOTELS" ? "PARTNER HOTELS" : "RESIDENCE GUIDELINES"}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <AnimatePresence mode="wait">
          {/* TAB 1: HOSTELS (3 ROOM CARDS MATCHING REFERENCE 3 PANEL 07) */}
          {activeTab === "HOSTELS" && (
            <motion.div
              key="HOSTELS"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roomsData.map((room) => (
                  <div
                    key={room.id}
                    className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-6 rounded-sm flex flex-col justify-between shadow-[0_0_20px_rgba(24,216,208,0.1)] hover:border-[#18D8D0] transition-colors"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-4">
                        <span 
                          className="px-2 py-0.5 font-pixel text-[9px] font-bold uppercase rounded-xs"
                          style={{ backgroundColor: room.badgeColor, color: "#000" }}
                        >
                          {room.tag}
                        </span>
                        <span className="font-pixel text-[9px] text-[#91A0AE]">
                          {room.distance}
                        </span>
                      </div>

                      <h3 className="font-display text-2xl text-[#F4E6CE] font-bold">
                        {room.name}
                      </h3>
                      <p className="font-pixel text-xs text-[#18D8D0] mb-2">
                        {room.subtitle}
                      </p>
                      <p className="font-sans text-xs text-[#91A0AE] mb-4 leading-relaxed">
                        {room.desc}
                      </p>

                      <div className="p-2.5 bg-[#050914] border border-[#1e2638] rounded-xs mb-4">
                        <span className="font-pixel text-[9px] text-[#91A0AE] block">RESIDENCE BLOCK:</span>
                        <span className="font-pixel text-[10px] text-[#F4E6CE] font-bold">{room.block}</span>
                      </div>

                      {/* Features list */}
                      <ul className="space-y-2 mb-6 font-sans text-xs text-[#91A0AE]">
                        {room.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#18D8D0] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer price & CTA */}
                    <div className="pt-4 border-t border-[#1e2638]">
                      <div className="font-pixel text-[10px] text-[#FF5A16] mb-3">
                        {room.price}
                      </div>
                      <Link href="/register">
                        <button className="w-full py-2.5 bg-[#18D8D0] text-[#050914] font-pixel text-xs font-bold hover:bg-[#18D8D0]/90 transition-all shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 cursor-pointer">
                          <span>SELECT IN REGISTRATION</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Campus Amenities Summary Box */}
              <div className="p-6 bg-[#07101D] border-2 border-[#18D8D0]/40 rounded-sm">
                <h4 className="font-pixel text-xs text-[#FF5A16] uppercase mb-4">
                  COMPLIMENTARY CAMPUS AMENITIES FOR ALL PARTICIPANTS
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans text-xs text-[#91A0AE]">
                  <div className="flex items-center gap-2 p-3 bg-[#050914] border border-[#1e2638]">
                    <Coffee className="w-4 h-4 text-[#18D8D0]" />
                    <span>3 Nutritious Meals Daily</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-[#050914] border border-[#1e2638]">
                    <Wifi className="w-4 h-4 text-[#18D8D0]" />
                    <span>High-Speed Wi-Fi</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-[#050914] border border-[#1e2638]">
                    <Shield className="w-4 h-4 text-[#18D8D0]" />
                    <span>24/7 Female Security Detail</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-[#050914] border border-[#1e2638]">
                    <Lock className="w-4 h-4 text-[#18D8D0]" />
                    <span>Secure Luggage Cloakroom</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: HOTELS */}
          {activeTab === "HOTELS" && (
            <motion.div
              key="HOTELS"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {hotelsData.map((hotel, idx) => (
                  <div key={idx} className="bg-[#07101D] border-2 border-[#18D8D0]/50 p-6 rounded-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-3 mb-3">
                        <span className="px-2 py-0.5 bg-[#FF5A16] text-black font-pixel text-[9px] font-bold">
                          {hotel.category}
                        </span>
                        <span className="font-pixel text-[9px] text-[#91A0AE]">{hotel.distance}</span>
                      </div>
                      <h3 className="font-display text-xl text-[#F4E6CE] font-bold mb-2">
                        {hotel.name}
                      </h3>
                      <p className="font-pixel text-xs text-[#18D8D0] mb-3">{hotel.rate}</p>
                      <p className="font-sans text-xs text-[#91A0AE] leading-relaxed mb-4">{hotel.perks}</p>
                    </div>
                    <div className="pt-4 border-t border-[#1e2638] flex items-center justify-between font-pixel text-xs">
                      <span className="text-[#91A0AE]">DIRECT CONTACT:</span>
                      <a href={`tel:${hotel.phone}`} className="text-[#FF5A16] hover:underline flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{hotel.phone}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: GUIDELINES */}
          {activeTab === "GUIDELINES" && (
            <motion.div
              key="GUIDELINES"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#07101D] border-2 border-[#18D8D0]/60 p-6 sm:p-10 rounded-sm space-y-6"
            >
              <div className="border-b border-[#18D8D0]/30 pb-4">
                <h3 className="font-display text-2xl text-[#F4E6CE] font-bold">
                  RESIDENCE CODE OF CONDUCT &amp; SAFETY GUIDELINES
                </h3>
                <p className="font-pixel text-xs text-[#18D8D0] mt-1">
                  MANDATORY COMPLIANCE FOR ALL PARTICIPANTS
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs text-[#91A0AE] leading-relaxed">
                <div className="space-y-2 p-4 bg-[#050914] border border-[#1e2638]">
                  <h4 className="font-pixel text-xs text-[#FF5A16]">1. CHECK-IN &amp; ACCREDITATION</h4>
                  <p>Athletes must produce their Digital QR Pass and institutional identity card upon arriving at the Shalmala Hostel reception. Room keys and dining tokens will be issued only to verified participants.</p>
                </div>

                <div className="space-y-2 p-4 bg-[#050914] border border-[#1e2638]">
                  <h4 className="font-pixel text-xs text-[#FF5A16]">2. CURFEW &amp; SECURITY</h4>
                  <p>For athlete recovery and safety, campus hostel gates close at 22:00 IST sharp. Any late return due to scheduled evening matches requires match referee clearance and team manager escort.</p>
                </div>

                <div className="space-y-2 p-4 bg-[#050914] border border-[#1e2638]">
                  <h4 className="font-pixel text-xs text-[#FF5A16]">3. VISITOR RESTRICTIONS</h4>
                  <p>External visitors and male personnel are strictly prohibited inside the female athlete living corridors. Common visiting lobbies are available at the main reception during 08:00 – 19:00 IST.</p>
                </div>

                <div className="space-y-2 p-4 bg-[#050914] border border-[#1e2638]">
                  <h4 className="font-pixel text-xs text-[#FF5A16]">4. MEDICAL &amp; EMERGENCIES</h4>
                  <p>A dedicated medical triage station operates 24/7 on Ground Floor, Shalmala Block. Ambulance service and immediate hospital transfer to KIMS Hubballi are on standing standby.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ═══ BOTTOM BROADCAST TICKER ═══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#050914] border-t border-[#18D8D0]/40 px-4 py-2 flex items-center justify-between font-pixel text-[10px] text-[#91A0AE]">
        <div className="flex items-center gap-2 text-[#18D8D0]">
          <span>🏸</span>
          <span className="text-[#F4E6CE]">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[#FF7A1A]">
          <span>SAFE &amp; HYGIENIC ATHLETE RESIDENCES</span>
          <span className="text-[#F4E6CE]">SHALMALA &amp; VINDHYA BLOCKS</span>
          <span className="text-[#18D8D0]">KLE TECH CAMPUS</span>
        </div>
      </footer>
    </div>
  );
}
