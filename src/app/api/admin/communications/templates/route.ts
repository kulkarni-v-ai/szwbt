import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const commAuth = verifyCommunicationsClearance(context);
    if (commAuth.errorResponse) {
      return commAuth.errorResponse;
    }

    const templates = await prisma.communicationTemplate.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/templates:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const commAuth = verifyCommunicationsClearance(context);
    if (commAuth.errorResponse) {
      return commAuth.errorResponse;
    }

    if (!commAuth.canCreate) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to create communication templates." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, category = "GENERAL", priority = "NORMAL", audience = "ALL", channels = "IN_APP", subject, bodyTemplate, description } = body;

    if (!name || !code || !subject || !bodyTemplate) {
      return NextResponse.json(
        { success: false, error: "Name, code, subject, and bodyTemplate are required." },
        { status: 400 }
      );
    }

    // STRICT ZERO TRANSPORT PAYMENT RULE
    const textToCheck = `${name || ""} ${subject || ""} ${bodyTemplate || ""}`.toLowerCase();
    if (
      textToCheck.includes("transport") &&
      (textToCheck.includes("fee") ||
        textToCheck.includes("payment") ||
        textToCheck.includes("upi") ||
        textToCheck.includes("utr") ||
        textToCheck.includes("balance") ||
        textToCheck.includes("paid"))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Charter Violation: Championship transport is university-provided and complimentary. Payment requests or fees cannot be sent or templated.",
        },
        { status: 400 }
      );
    }

    const template = await prisma.communicationTemplate.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        priority,
        audience,
        channels,
        subject: subject.trim(),
        bodyTemplate: bodyTemplate.trim(),
        description: description?.trim() || null,
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "TEMPLATE_CREATED",
      resourceType: "communication_template",
      resourceId: template.id,
      metadata: { code: template.code, name: template.name },
    });

    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    console.error("Error in POST /api/admin/communications/templates:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
