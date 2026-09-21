"use client";

import React, { useRef, useEffect } from "react";
import { clsx } from "clsx";

interface EmailOTPInputProps {
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  error?: boolean;
  length?: number;
}

export const EmailOTPInput: React.FC<EmailOTPInputProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  length = 6,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const digits = value.padEnd(length, "").slice(0, length).split("");

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const lastChar = val.slice(-1);

    if (lastChar && !/^\d$/.test(lastChar)) return;

    const newDigits = [...digits];
    newDigits[index] = lastChar || "";
    const newOtp = newDigits.join("");
    onChange(newOtp);

    // Auto-focus next input
    if (lastChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.slice(0, length);
    onChange(newOtp);

    const targetIndex = Math.min(newOtp.length, length - 1);
    inputRefs.current[targetIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 my-4 w-full">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={clsx(
            "w-11 h-14 sm:w-14 sm:h-16 text-center font-mono text-2xl font-bold bg-pixel-black text-pixel-orange-bright border-2 transition-all shadow-pixel-sm focus:outline-none focus:scale-105",
            error
              ? "border-pixel-red text-pixel-red animate-shake"
              : digits[idx]
              ? "border-pixel-orange-fiery bg-pixel-dark"
              : "border-pixel-gray-700 focus:border-pixel-orange-fiery"
          )}
        />
      ))}
    </div>
  );
};
