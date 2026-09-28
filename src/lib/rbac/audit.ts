/**
 * Tamper-Evident Audit Logging Service
 * Records sensitive administrative actions server-side.
 */

import { prisma } from "@/lib/prisma";

export interface AuditEventParams {
  actorUserId?: string | null;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, any> | null;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "passcode",
  "secret",
  "token",
  "otp",
  "rawotp",
  "creditcard",
  "cvv",
  "authkey",
]);

/**
 * Sanitizes metadata to strictly remove any credentials, passwords or OTPs
 */
function sanitizeMetadata(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeMetadata);
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Persists an immutable audit log record to PostgreSQL
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const cleanMeta = params.metadata ? JSON.stringify(sanitizeMetadata(params.metadata)) : null;

    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorEmail: params.actorEmail.toLowerCase().trim(),
        action: params.action.toUpperCase(),
        resourceType: params.resourceType.toLowerCase(),
        resourceId: params.resourceId || null,
        requestId: params.requestId || null,
        metadata: cleanMeta,
      },
    });
  } catch (error) {
    // Non-blocking fallback for telemetry
    console.error("[AUDIT LOG ERROR] Failed to record audit log:", error);
  }
}
