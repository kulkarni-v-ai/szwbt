import crypto from "crypto";

export interface OTPSession {
  email: string;
  hashedOtp: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  verified: boolean;
}

// Global server-side memory store for OTP sessions
const globalOtpStore = new Map<string, OTPSession>();

export function generateSecureOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function createOTPSession(email: string, rawOtp: string): { success: boolean; cooldownLeft?: number; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  const cooldownMs = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000;
  const expiryMs = Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000;

  const existing = globalOtpStore.get(normalizedEmail);
  if (existing) {
    const timeSinceLast = now - existing.lastSentAt;
    if (timeSinceLast < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - timeSinceLast) / 1000);
      return { success: false, cooldownLeft: remainingSec, error: `Please wait ${remainingSec}s before requesting a new code.` };
    }
  }

  const hashedOtp = hashOTP(rawOtp);
  const session: OTPSession = {
    email: normalizedEmail,
    hashedOtp,
    expiresAt: now + expiryMs,
    lastSentAt: now,
    attempts: 0,
    verified: false,
  };

  globalOtpStore.set(normalizedEmail, session);
  return { success: true };
}

export function verifyOTPSession(email: string, userEnteredOtp: string): { success: boolean; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const session = globalOtpStore.get(normalizedEmail);
  const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
  const now = Date.now();

  if (!session) {
    return { success: false, error: "No verification code requested for this email." };
  }

  if (now > session.expiresAt) {
    globalOtpStore.delete(normalizedEmail);
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (session.attempts >= maxAttempts) {
    globalOtpStore.delete(normalizedEmail);
    return { success: false, error: "Too many failed attempts. Please request a new verification code." };
  }

  session.attempts += 1;

  const inputHash = hashOTP(userEnteredOtp.trim());
  if (inputHash !== session.hashedOtp) {
    const remaining = maxAttempts - session.attempts;
    return { success: false, error: `Invalid verification code. ${remaining} attempts remaining.` };
  }

  // Success: mark verified
  session.verified = true;
  globalOtpStore.set(normalizedEmail, session);
  return { success: true };
}

export function isEmailVerified(email: string): boolean {
  const session = globalOtpStore.get(email.trim().toLowerCase());
  return session ? session.verified : false;
}
