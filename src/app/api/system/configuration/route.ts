import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySuperAdminClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const adminAuth = verifySuperAdminClearance(context);
    if (adminAuth.errorResponse) {
      return adminAuth.errorResponse;
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Sanitized settings - NEVER return secrets or credentials
    const sanitizedSettings = settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      category: s.category,
      description: s.description,
      isPublic: s.isPublic,
      updatedBy: s.updatedBy || "System Core",
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      settings: sanitizedSettings,
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/configuration:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const adminAuth = verifySuperAdminClearance(context);
    if (adminAuth.errorResponse) {
      return adminAuth.errorResponse;
    }

    if (!adminAuth.canConfigure) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance for system configuration modification." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { key, value } = body;

    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { success: false, error: "Validation failed: 'key' and 'value' strings are required." },
        { status: 400 }
      );
    }

    // STRICT ZERO TRANSPORT PAYMENT RULE
    if (
      key.toLowerCase().includes("transport") &&
      (key.toLowerCase().includes("fee") ||
        key.toLowerCase().includes("payment") ||
        value.toLowerCase().includes("paid") ||
        value.toLowerCase().includes("charge"))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Charter Violation: Championship transport is university-provided and complimentary. Transport fees or payments cannot be configured.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        updatedBy: context.user.email,
      },
      create: {
        key,
        value,
        category: key.split(".")[0]?.toUpperCase() || "GENERAL",
        description: `Configured key: ${key}`,
        updatedBy: context.user.email,
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "SYSTEM_CONFIGURATION_CHANGED",
      resourceType: "system_setting",
      resourceId: updated.key,
      metadata: { key: updated.key, value: updated.value },
    });

    return NextResponse.json({
      success: true,
      setting: updated,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/system/configuration:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
