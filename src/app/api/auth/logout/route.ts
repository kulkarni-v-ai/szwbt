import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/rbac/token";
import { authenticateRequest } from "@/lib/rbac/guard";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (authResult.authenticated) {
    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "USER_LOGOUT",
      resourceType: "auth",
      resourceId: authResult.context.user.id,
    });
  }

  const response = NextResponse.json({
    success: true,
    message: "Session terminated successfully.",
  });

  clearSessionCookie(response);
  return response;
}
