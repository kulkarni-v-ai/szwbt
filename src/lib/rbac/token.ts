/**
 * Secure Session Token Management (HMAC-SHA256 Signed)
 * Pure Node.js crypto implementation for server-side stateless/state-backed sessions.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "szwbt_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "szwbt-2026-super-secure-production-secret-key-9281726";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionVersion: number;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Creates an HMAC-SHA256 signed session token
 */
export function createSessionToken(payload: {
  userId: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  sessionVersion?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    userId: payload.userId,
    email: payload.email.toLowerCase().trim(),
    roles: payload.roles || [],
    permissions: payload.permissions || [],
    sessionVersion: payload.sessionVersion ?? 1,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_SECONDS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts session token from incoming NextRequest (Cookie or Bearer Authorization)
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  // 1. Try HTTP-only Cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie) return cookie;

  // 2. Try Authorization Bearer Header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Sets session cookie on a NextResponse
 */
export function attachSessionCookie(res: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

/**
 * Clears session cookie on logout
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
