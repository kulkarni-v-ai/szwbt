"use client";

import React, { useState } from "react";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelSelect } from "@/components/pixel/PixelSelect";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { User, Users, Home, Bus, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else setCompleted(true);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-pixel-black text-pixel-cream font-sans flex flex-col">
      <ArcadeNav />

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 my-6">
        <div className="flex items-center justify-between border-b-2 border-pixel-orange-fiery pb-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-pixel-cream font-bold">
              REGISTRATION PORTAL
            </h1>
            <p className="font-sans text-xs text-pixel-gray-400">
              PROVISIONAL MULTI-STEP UI SHELL (NO BUSINESS LOGIC ASSERTED)
            </p>
          </div>
          <PixelBadge variant="orange">STEP 0{step} / 05</PixelBadge>
        </div>

        {/* Multi-step Stepper Indicator */}
        <div className="grid grid-cols-5 gap-2 mb-8 text-center font-pixel text-[9px]">
          {[
            { id: 1, label: "01 PERSONAL" },
            { id: 2, label: "02 TEAM" },
            { id: 3, label: "03 ROOMS" },
            { id: 4, label: "04 TRANSPORT" },
            { id: 5, label: "05 REVIEW" },
          ].map((s) => (
            <div
              key={s.id}
              className={`p-2 border transition-all ${
                step === s.id
                  ? "bg-pixel-orange-fiery text-black border-black font-bold"
                  : step > s.id
                  ? "bg-pixel-gray-800 text-pixel-green border-pixel-green"
                  : "bg-pixel-dark text-pixel-gray-500 border-pixel-gray-800"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <PixelCard headerTitle={`REGISTRATION STEP 0${step}`} headerBadge="PROVISIONAL UI">
          {completed ? (
            <div className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-pixel-green mx-auto animate-bounce" />
              <h3 className="font-display text-xl text-pixel-cream">REGISTRATION SUBMITTED (DEMO)</h3>
              <p className="font-sans text-xs text-pixel-gray-400">
                PROVISIONAL ENTRY RECEIVED. FINAL WORKFLOW & DOCUMENT VERIFICATION BINDING TOMORROW.
              </p>
              <PixelButton variant="primary" size="md" onClick={() => { setStep(1); setCompleted(false); }}>
                RESTART DEMO FORM
              </PixelButton>
            </div>
          ) : (
            <div className="flex flex-col gap-4 my-2">
              {step === 1 && (
                <>
                  <PixelInput label="FULL NAME" placeholder="Enter athlete name" />
                  <PixelInput label="CONTACT EMAIL" placeholder="Enter contact email" />
                  <PixelSelect
                    label="COMPETITION CATEGORY"
                    options={[
                      { label: "Men's Singles U-19", value: "MS-U19" },
                      { label: "Women's Singles U-19", value: "WS-U19" },
                      { label: "Men's Doubles Open", value: "MD-OPEN" },
                    ]}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <PixelInput label="INSTITUTION / UNIVERSITY" placeholder="Enter institution name" />
                  <PixelInput label="TEAM MANAGER NAME" placeholder="Enter manager name" />
                  <PixelSelect
                    label="STATE REGION"
                    options={[
                      { label: "Karnataka", value: "KA" },
                      { label: "Tamil Nadu", value: "TN" },
                      { label: "Kerala", value: "KL" },
                      { label: "Telangana", value: "TS" },
                      { label: "Andhra Pradesh", value: "AP" },
                    ]}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <PixelSelect
                    label="ACCOMMODATION NEEDED?"
                    options={[
                      { label: "YES — ATHLETE HOSTEL REQUESTED", value: "YES" },
                      { label: "NO — SELF ARRANGED", value: "NO" },
                    ]}
                  />
                  <PixelInput label="NUMBER OF ROOMS" placeholder="e.g. 2 Rooms" />
                </>
              )}

              {step === 4 && (
                <>
                  <PixelSelect
                    label="SHUTTLE TRANSPORT NEEDED?"
                    options={[
                      { label: "YES — CAMPUS & ARENA EXPRESS", value: "YES" },
                      { label: "NO — OWN TRANSPORT", value: "NO" },
                    ]}
                  />
                  <PixelInput label="ARRIVAL POINT" placeholder="e.g. Central Station / Airport" />
                </>
              )}

              {step === 5 && (
                <div className="p-4 bg-pixel-black border border-pixel-gray-800 font-sans text-xs space-y-2">
                  <p className="font-pixel text-[10px] text-pixel-orange-bright">SUMMARY REVIEW (DEMO):</p>
                  <p>• Category: MS-U19 / WS-U19</p>
                  <p>• Institution: Sample University</p>
                  <p>• Accommodation: Requested</p>
                  <p>• Transport: Campus Express Shuttle</p>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-pixel-gray-800">
                <PixelButton variant="dark" size="sm" onClick={handlePrev} disabled={step === 1}>
                  <ChevronLeft className="w-4 h-4" /> PREVIOUS
                </PixelButton>

                <PixelButton variant="primary" size="sm" glow onClick={handleNext}>
                  {step === 5 ? "SUBMIT DEMO" : "NEXT STEP"} <ChevronRight className="w-4 h-4" />
                </PixelButton>
              </div>
            </div>
          )}
        </PixelCard>
      </main>
    </div>
  );
}
