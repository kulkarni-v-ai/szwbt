"use client";

import React, { useState } from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 my-6">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pixel-orange-fiery pb-4">
          <Mail className="w-8 h-8 text-pixel-orange-fiery animate-bounce" />
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-pixel-cream font-bold">
              ARCADE SUPPORT & CONTACT
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              SUBMIT INQUIRIES TO THE TOURNAMENT HELPDESK OPERATORS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PixelCard headerTitle="SEND MESSAGE" headerBadge="FORM">
            {submitted ? (
              <div className="p-6 text-center text-pixel-green font-pixel text-xs space-y-2">
                <p>✓ TRANSMISSION RECEIVED!</p>
                <p className="text-pixel-cream font-sans text-xs">OPERATORS WILL RESPOND SHORTLY. (DEMO FORM)</p>
                <PixelButton variant="dark" size="sm" onClick={() => setSubmitted(false)}>
                  SEND ANOTHER
                </PixelButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <PixelInput label="YOUR NAME" placeholder="e.g. Player Alpha" required />
                <PixelInput label="INSTITUTION / EMAIL" placeholder="e.g. alpha@institution.edu" required />
                <div className="flex flex-col gap-1.5">
                  <label className="font-pixel text-[11px] text-pixel-orange-bright uppercase">MESSAGE</label>
                  <textarea
                    rows={4}
                    className="w-full bg-pixel-black text-pixel-cream font-sans text-sm p-3 border-2 border-pixel-gray-700 focus:border-pixel-orange-fiery focus:outline-none"
                    placeholder="Type your inquiry..."
                    required
                  />
                </div>
                <PixelButton type="submit" variant="primary" size="md" glow>
                  <span>TRANSMIT MESSAGE</span>
                  <Send className="w-4 h-4" />
                </PixelButton>
              </form>
            )}
          </PixelCard>

          <PixelCard headerTitle="DIRECT CHANNELS" headerBadge="CONTACT">
            <div className="flex flex-col gap-4 font-sans text-xs">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-pixel-orange-fiery" />
                <div>
                  <p className="font-pixel text-[10px] text-pixel-amber">EMAIL DESK</p>
                  <p className="text-pixel-cream">support@szwbt2026.demo (DEMO)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-pixel-orange-fiery" />
                <div>
                  <p className="font-pixel text-[10px] text-pixel-amber">HELPLINE</p>
                  <p className="text-pixel-cream">+91 00000 00000 (DEMO)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-pixel-orange-fiery" />
                <div>
                  <p className="font-pixel text-[10px] text-pixel-amber">OFFICIAL ARENA</p>
                  <p className="text-pixel-cream">COMING SOON — SOUTH ZONE</p>
                </div>
              </div>
            </div>
          </PixelCard>
        </div>
      </main>
    </div>
  );
}
