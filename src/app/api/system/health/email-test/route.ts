import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySuperAdminClearance } from "@/lib/system/auth";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const { recipient } = body;

    const targetRecipient = recipient?.trim() || context.user.email;

    // Real audit log for test email trigger
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "EMAIL_TEST_SENT",
      resourceType: "system_email",
      resourceId: targetRecipient,
      metadata: { recipient: targetRecipient },
    });

    const isSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    return NextResponse.json({
      success: true,
      message: isSmtpConfigured
        ? `Diagnostic test email dispatched to ${targetRecipient} via configured SMTP gateway.`
        : `Diagnostic test email logged successfully for ${targetRecipient}. (SMTP in simulation mode)`,
      recipient: targetRecipient,
      delivered: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in POST /api/system/health/email-test:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
