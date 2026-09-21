"use client";

import React, { useState, useEffect } from "react";
import { EmailOTPInput } from "./EmailOTPInput";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Mail, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface OTPVerificationProps {
  email: string;
  onEmailChange: (email: string) => void;
  onVerified: () => void;
}

export type OTPState =
  | "IDLE"
  | "SENDING"
  | "OTP_SENT"
  | "VERIFYING"
  | "VERIFIED"
  | "INVALID"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "ERROR";

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onEmailChange,
  onVerified,
}) => {
  const [state, setState] = useState<OTPState>("IDLE");
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      setState("ERROR");
      return;
    }

    setState("SENDING");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setState("OTP_SENT");
        setCooldown(60);
      } else {
        if (data.cooldownLeft) setCooldown(data.cooldownLeft);
        setErrorMessage(data.error || "Failed to send verification code.");
        setState(res.status === 429 ? "TOO_MANY_ATTEMPTS" : "ERROR");
      }
    } catch (err) {
      setErrorMessage("Network error connecting to verification server.");
      setState("ERROR");
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      setErrorMessage("Please enter all 6 digits.");
      return;
    }

    setState("VERIFYING");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (data.success && data.verified) {
        setState("VERIFIED");
        onVerified();
      } else {
        setErrorMessage(data.error || "Invalid verification code.");
        setState("INVALID");
      }
    } catch (err) {
      setErrorMessage("Network error during verification.");
      setState("ERROR");
    }
  };

  if (state === "VERIFIED") {
    return (
      <div className="p-4 bg-pixel-dark border-2 border-pixel-green text-pixel-green font-sans text-xs flex items-center justify-between shadow-pixel">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-pixel-green animate-bounce" />
          <div>
            <p className="font-pixel text-xs">EMAIL VERIFIED</p>
            <p className="text-pixel-cream font-mono text-[11px]">{email}</p>
          </div>
        </div>
        <PixelBadge variant="green">VERIFIED</PixelBadge>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-pixel-black border-2 border-pixel-gray-800 shadow-pixel">
      {/* Email Input & Request Trigger */}
      <div className="flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1 w-full">
          <PixelInput
            label="EMAIL ADDRESS FOR VERIFICATION"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="athlete@institution.edu"
            disabled={state === "SENDING" || state === "VERIFYING"}
          />
        </div>

        <PixelButton
          type="button"
          variant="primary"
          size="md"
          glow={state === "IDLE"}
          onClick={handleSendOTP}
          disabled={state === "SENDING" || cooldown > 0}
          className="shrink-0"
        >
          {state === "SENDING" ? (
            <span>SENDING...</span>
          ) : cooldown > 0 ? (
            <span>RESEND ({cooldown}s)</span>
          ) : (
            <span>SEND OTP CODE</span>
          )}
        </PixelButton>
      </div>

      {/* OTP Code Input Box when sent */}
      {(state === "OTP_SENT" || state === "VERIFYING" || state === "INVALID" || state === "EXPIRED") && (
        <div className="mt-2 p-4 bg-pixel-dark border border-pixel-orange-fiery/40 animate-[pixelPulse_0.3s_ease-out]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-[10px] text-pixel-orange-bright">
              ENTER 6-DIGIT VERIFICATION CODE
            </span>
            <span className="font-mono text-[10px] text-pixel-amber">
              SENT TO: {email}
            </span>
          </div>

          <EmailOTPInput
            value={otp}
            onChange={setOtp}
            disabled={state === "VERIFYING"}
            error={state === "INVALID"}
          />

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-pixel-gray-800">
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={cooldown > 0}
              className="font-pixel text-[10px] text-pixel-orange-bright hover:underline disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{cooldown > 0 ? `RESEND COOLDOWN (${cooldown}s)` : "RESEND NEW CODE"}</span>
            </button>

            <PixelButton
              variant="primary"
              size="sm"
              glow
              onClick={handleVerifyOTP}
              disabled={otp.length < 6 || state === "VERIFYING"}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>VERIFY CODE</span>
            </PixelButton>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3 bg-pixel-red/20 border border-pixel-red text-pixel-red font-pixel text-[10px] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
