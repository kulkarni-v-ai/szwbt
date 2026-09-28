"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { 
  Mail, Phone, MapPin, Send, ChevronRight, X, MessageSquare, 
  HelpCircle, CheckCircle2, ShieldCheck, Clock, Building, Zap, 
  Sparkles, Radio, PhoneCall, AlertCircle
} from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("GENERAL");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const categories = [
    { id: "GENERAL", label: "General Inquiries", desc: "General championship queries & public information" },
    { id: "REGISTRATION", label: "Registration & Team Verification", desc: "Eligibility, documents & university squad validation" },
    { id: "ACCOMMODATION", label: "Hostel & Room Allocation", desc: "Shalmala & Vindhya hostels, check-in & meals" },
    { id: "TRANSPORT", label: "Campus Transit & Shuttles", desc: "Hubballi Junction pickup & daily court transfers" },
    { id: "MEDIA", label: "Press & Live Broadcast Media", desc: "Broadcast press passes & streaming permissions" },
  ];

  const channels = [
    {
      icon: Mail,
      title: "EMAIL ASSISTANCE",
      value: "support@southzone2026.in",
      sub: "Average response under 45 mins",
      accent: "#FF5A16",
    },
    {
      icon: PhoneCall,
      title: "HELPDESK HOTLINE",
      value: "+91 836 2378 123",
      sub: "08:00 AM – 10:00 PM IST Daily",
      accent: "#FF7A1A",
    },
    {
      icon: AlertCircle,
      title: "EMERGENCY & MEDICAL",
      value: "+91 94808 11222",
      sub: "24/7 Rapid Physio & Emergency",
      accent: "#EA580C",
    },
    {
      icon: MapPin,
      title: "CAMPUS DESK",
      value: "Ground Floor, Rm 104",
      sub: "Dr. P. Kore Sports Arena, KLE Tech",
      accent: "#FF5A16",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col justify-between selection:bg-[#FF5A16] selection:text-white">

      <ArcadeNav />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 my-4 z-10 pb-16">
        
        {/* ═══ MASTER HERO BANNER (WHITE & ORANGE THEME) ═══ */}
        <div className="relative border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-white to-orange-50/50 p-6 sm:p-10 rounded-2xl shadow-md mb-8 overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Heading & Description */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 border border-orange-300 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-pulse" />
                  <span className="font-rajdhani text-[11px] text-[#FF5A16] font-bold tracking-wider uppercase">
                    TOURNAMENT HELPDESK
                  </span>
                </div>
                <span className="font-rajdhani text-xs text-orange-800 uppercase font-bold tracking-wider">
                  SOUTH ZONE 2026 &bull; 24/7 SUPPORT
                </span>
              </div>

              <h1 className="font-rajdhani text-4xl sm:text-6xl text-slate-900 font-black tracking-tight mb-2 uppercase">
                CONTACT <span className="text-[#FF5A16]">CHAMPIONSHIP DESK</span>
              </h1>

              <p className="font-rajdhani text-xs sm:text-sm text-[#FF5A16] font-bold tracking-[0.2em] uppercase mb-4">
                QUESTIONS TODAY. STRONGER TOMORROW.
              </p>

              <p className="font-sans text-xs sm:text-sm text-slate-700 max-w-xl leading-relaxed">
                Connect directly with the championship organizing committee, technical officials, accommodation supervisors, and ground transit dispatchers at the Dr. Prabhakar Kore Sports Complex, KLE Technological University.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#contact-form"
                  className="px-5 py-2.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>TRANSMIT INQUIRY</span>
                </a>
                <a
                  href="tel:+918362378123"
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-rajdhani text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-xs"
                >
                  <Phone className="w-4 h-4 text-[#FF5A16]" />
                  <span>CALL +91 836 2378 123</span>
                </a>
              </div>
            </div>

            {/* Right Column: Key Hours & Verification Badge */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <span className="font-rajdhani text-xs font-bold text-[#FF5A16] uppercase tracking-wider">DESK SCHEDULE</span>
                  <span className="font-rajdhani text-[11px] text-emerald-800 font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                    LIVE RESPONSE
                  </span>
                </div>

                <div className="space-y-3 font-sans text-xs">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <Clock className="w-4 h-4 text-[#FF5A16] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-rajdhani font-bold text-xs text-slate-900 uppercase tracking-wider">OPERATING HOURS</div>
                      <div className="text-slate-600 text-[11px]">08:00 AM – 10:00 PM IST (Daily during Oct 17–21)</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <Building className="w-4 h-4 text-[#FF5A16] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-rajdhani font-bold text-xs text-slate-900 uppercase tracking-wider">OPERATIONS LOCATION</div>
                      <div className="text-slate-600 text-[11px]">Ground Floor, Rm 104 &bull; Dr. P. Kore Arena</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-rajdhani font-bold text-xs text-slate-900 uppercase tracking-wider">SAFETY &amp; MEDICAL WING</div>
                      <div className="text-slate-600 text-[11px]">24/7 Dedicated Sports Physio &amp; Doctor on Call</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between font-rajdhani text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5A16]" />
                    VERIFIED DESK
                  </span>
                  <span className="text-[#FF5A16] font-bold">KLE TECH ARENA HQ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 4 DIRECT CHANNEL CARDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {channels.map((ch, idx) => {
            const Icon = ch.icon;
            return (
              <div 
                key={idx}
                className="bg-white border-2 border-slate-200 hover:border-[#FF5A16] p-5 rounded-2xl shadow-md hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-3.5 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Icon className="w-5 h-5 text-[#FF5A16]" />
                  </div>
                  <div>
                    <p className="font-rajdhani text-[11px] text-[#FF5A16] font-bold tracking-wider uppercase">{ch.title}</p>
                    <p className="font-rajdhani text-sm sm:text-base text-slate-900 font-extrabold leading-tight mt-0.5">{ch.value}</p>
                  </div>
                </div>
                <p className="font-sans text-xs text-slate-600 mt-2 border-t border-slate-100 pt-2 leading-tight">
                  {ch.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* ═══ MAIN CONTACT LAYOUT ═══ */}
        <div id="contact-form" className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Left Column: Category Selector & Direct Details */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="font-rajdhani text-xs font-bold text-slate-900 uppercase tracking-wider">
                  SELECT INQUIRY SECTOR
                </span>
                <span className="font-rajdhani text-[10px] text-orange-800 font-bold uppercase px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                  5 CHANNELS
                </span>
              </div>

              <div className="flex flex-col gap-2.5 font-rajdhani text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`p-3 text-left border-2 rounded-xl transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? "bg-[#FF5A16] text-white border-[#FF5A16] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300 hover:text-slate-900"
                    }`}
                  >
                    <div className="font-black text-xs uppercase tracking-wide flex items-center justify-between">
                      <span>&bull; {cat.label}</span>
                      {activeCategory === cat.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={`font-sans text-[11px] mt-1 leading-snug ${
                      activeCategory === cat.id ? "text-white/90" : "text-slate-600"
                    }`}>
                      {cat.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry Form */}
          <div className="lg:col-span-8">
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="font-rajdhani text-2xl font-black text-slate-900 uppercase tracking-tight">
                    TRANSMIT INQUIRY DISPATCH
                  </h2>
                  <p className="font-sans text-xs text-slate-600 mt-0.5">
                    Sector Selected: <span className="font-bold text-[#FF5A16]">{categories.find(c => c.id === activeCategory)?.label}</span>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 font-rajdhani text-xs font-bold uppercase tracking-wider">
                  DIRECT ESCALATION
                </span>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-50 border border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-rajdhani text-2xl font-black text-slate-900 uppercase">
                    INQUIRY TRANSMITTED SUCCESSFULLY
                  </h3>
                  <p className="font-sans text-xs text-slate-600 max-w-md mx-auto">
                    Your inquiry has been assigned ticket reference <span className="font-mono font-bold text-[#FF5A16]">SZ26-INQ-{Math.floor(1000 + Math.random() * 9000)}</span>. Our desk liaison will respond within 45 minutes.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-6 py-2 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-bold uppercase rounded-xl transition-all shadow-sm"
                  >
                    TRANSMIT ANOTHER MESSAGE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        FULL NAME *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kulkarni"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        EMAIL ADDRESS *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. ramesh@university.ac.in"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        PHONE / WHATSAPP NUMBER *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98450 12345"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        INSTITUTION / AFFILIATION
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bangalore University"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      INQUIRY MESSAGE &bull; PLEASE SPECIFY DETAILS *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please provide specifics regarding your match timing, room booking, transit query, or team verification..."
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 placeholder:text-slate-400 rounded-xl p-3.5 text-xs transition-colors focus:outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="font-rajdhani text-[11px] text-slate-500">
                      * All submissions verified by Tournament Committee Desk
                    </span>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>DISPATCH TRANSMISSION</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
