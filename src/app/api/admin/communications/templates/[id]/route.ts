import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const template = await prisma.communicationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Template does not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/templates/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
        { success: false, error: "403 Forbidden: Insufficient clearance to update communication templates." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const template = await prisma.communicationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Template does not exist." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, subject, bodyTemplate, category, priority, audience, channels, description } = body;

    // STRICT ZERO TRANSPORT PAYMENT RULE
    const textToCheck = `${name ?? template.name} ${subject ?? template.subject} ${bodyTemplate ?? template.bodyTemplate}`.toLowerCase();
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

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (subject !== undefined) updateData.subject = subject.trim();
    if (bodyTemplate !== undefined) updateData.bodyTemplate = bodyTemplate.trim();
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (audience !== undefined) updateData.audience = audience;
    if (channels !== undefined) updateData.channels = channels;
    if (description !== undefined) updateData.description = description?.trim() || null;

    const updated = await prisma.communicationTemplate.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "TEMPLATE_UPDATED",
      resourceType: "communication_template",
      resourceId: id,
      metadata: { code: updated.code, name: updated.name },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    console.error("Error in PATCH /api/admin/communications/templates/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
        { success: false, error: "403 Forbidden: Insufficient clearance to delete communication templates." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const template = await prisma.communicationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Template does not exist." },
        { status: 404 }
      );
    }

    await prisma.communicationTemplate.delete({
      where: { id },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "TEMPLATE_DELETED",
      resourceType: "communication_template",
      resourceId: id,
      metadata: { code: template.code, name: template.name },
    });

    return NextResponse.json({ success: true, message: "Template deleted successfully." });
  } catch (err: any) {
    console.error("Error in DELETE /api/admin/communications/templates/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
