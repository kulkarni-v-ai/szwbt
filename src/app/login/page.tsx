"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArcadeNav } from "@/components/navigation/ArcadeNav";
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { sanitizeRedirectUrl } from "@/lib/rbac/routes";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams?.get("returnTo");

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedCred = credential.trim();
    const trimmedPass = password.trim();

    if (!trimmedCred || !trimmedPass) {
      setErrorMsg("Please provide your official credential and security passcode.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: trimmedCred,
          password: trimmedPass,
          returnTo: rawReturnTo || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Authentication failed. Access denied.");
        setLoading(false);
        return;
      }

      // Safe Open-Redirect Defense: Strictly validate return target
      const targetUrl = sanitizeRedirectUrl(data.user?.targetUrl, "/admin");
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 400);
    } catch (err: any) {
      setErrorMsg("Failed to connect to authentication server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#FF5A16] selection:text-white">
      <ArcadeNav />

      {/* Main Terminal Viewport */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-12 z-10 flex flex-col justify-center">
        
        {/* Terminal Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#07101D] border border-[#18D8D0]/40 text-[#18D8D0] font-pixel text-[10px] tracking-wider mb-3 shadow-[2px_2px_0px_#000]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#18D8D0] animate-ping" />
            <span>AUTHENTICATED ACCESS GATEWAY</span>
          </div>
          
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#F4E6CE] font-bold tracking-tight uppercase">
            SZWBT 2026 <span className="text-[#FF5A16]">OPERATIONS PORTAL</span>
          </h1>
          
          <p className="font-sans text-xs sm:text-sm text-[#91A0AE] max-w-md mt-1.5">
            Restricted operations portal for accredited championship personnel, university officials, and match controllers.
          </p>
        </div>

        {/* Master Login HUD Card */}
        <div className="relative bg-[#07101D] border-2 border-[#18D8D0]/60 shadow-[0_0_35px_rgba(24,216,208,0.12)] rounded-lg overflow-hidden">
          
          {/* Subtle Ambient Background Watermark */}
          <div className="absolute inset-0 pointer-events-none z-0 opacity-15">
            <Image
              src="/college-campus-pixel.jpg"
              alt=""
              fill
              className="object-cover object-center filter contrast-125"
            />
            <div className="absolute inset-0 bg-[#07101D]/90" />
          </div>

          <div className="relative z-10 p-6 sm:p-9">
            
            {/* Security Status Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#18D8D0]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#FF5A16]/10 border border-[#FF5A16]/30 flex items-center justify-center text-[#FF5A16]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-pixel text-sm sm:text-base text-[#F4E6CE] font-bold">
                    OFFICIAL AUTHENTICATION
                  </h2>
                  <p className="font-sans text-[11px] text-[#91A0AE]">
                    256-Bit Encrypted Session
                  </p>
                </div>
              </div>

              <div className="px-2.5 py-1 bg-[#050914] border border-emerald-500/40 text-emerald-400 font-pixel text-[9px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYSTEM ONLINE</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 bg-rose-950/70 border border-rose-500 text-rose-200 font-sans text-xs flex items-center gap-2.5 rounded"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Credential / Email Field */}
              <div>
                <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-2">
                  OFFICIAL CREDENTIAL / EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#91A0AE]" />
                  <input
                    type="text"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    placeholder="official@szwbt2026.edu or username"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#050914] border-2 border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] font-sans text-sm rounded outline-none transition-colors shadow-inner placeholder:text-[#91A0AE]/50"
                  />
                </div>
              </div>

              {/* Password / Passcode Field */}
              <div>
                <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-2">
                  SECURITY PASSCODE / PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#91A0AE]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security passcode..."
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#050914] border-2 border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] font-sans text-sm rounded outline-none transition-colors shadow-inner placeholder:text-[#91A0AE]/50"
                  />
                </div>
              </div>

              {/* Session persistence */}
              <div className="flex items-center justify-between font-sans text-xs pt-1">
                <label className="flex items-center gap-2 text-[#91A0AE] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-[#FF5A16] rounded"
                  />
                  <span>Persist session on this device</span>
                </label>
                <span className="text-[#91A0AE] text-[11px]">
                  Internal Portal
                </span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#FF5A16] hover:bg-[#d94e16] disabled:opacity-50 text-white font-pixel text-xs sm:text-sm font-bold tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-[3px_3px_0px_#000] cursor-pointer rounded"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AUTHENTICATING ACCESS...</span>
                  </>
                ) : (
                  <>
                    <span>AUTHENTICATE & ENTER PORTAL</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Notice */}
            <div className="mt-6 pt-4 border-t border-[#18D8D0]/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#91A0AE]">
              <span>KLE Technological University Secretariat</span>
              <Link href="/tournament" className="text-[#18D8D0] hover:text-[#FF5A16] hover:underline font-pixel text-[9px] transition-colors">
                TOURNAMENT DRAWS & RULES &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Terminal Footer Strip */}
      <footer className="w-full bg-[#050914] border-t border-[#18D8D0]/30 py-3 px-4 sm:px-8 z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[#91A0AE] font-pixel">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="flex items-center gap-4 text-[#FF5A16]">
          <span>DISCIPLINE TODAY</span>
          <span>&bull;</span>
          <span>CHAMPION TOMORROW</span>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050914] text-[#F4E6CE] font-sans flex items-center justify-center">
          <span className="font-pixel text-xs text-[#18D8D0] animate-pulse">LOADING ACCESS PORTAL...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

