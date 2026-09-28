import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/rbac/guard";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/me/sessions/revoke
 * Revokes an active session or all other sessions for the authenticated user.
 * Users CANNOT revoke another user's session.
 */
export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { context } = authResult;
  const userId = context.user.id;

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "400 Bad Request: Malformed JSON." },
        { status: 400 }
      );
    }

    const { sessionId, allOthers } = body;

    // Mode A: Revoke all other sessions
    if (allOthers === true) {
      // Increment user's session version to invalidate older tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          sessionVersion: { increment: 1 },
        },
      });

      // Delete non-current session records
      await prisma.userSession.deleteMany({
        where: {
          userId,
          isCurrent: false,
        },
      });

      await logAuditEvent({
        actorUserId: userId,
        actorEmail: context.user.email,
        action: "SESSION_REVOKED",
        resourceType: "auth_session",
        resourceId: "ALL_OTHER_SESSIONS",
        metadata: {
          scope: "ALL_OTHER_SESSIONS",
          action: "SIGN_OUT_ALL_OTHER_SESSIONS",
        },
      });

      return NextResponse.json({
        success: true,
        message: "All other active sessions have been terminated successfully.",
      });
    }

    // Mode B: Revoke a specific session
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { success: false, error: "400 Bad Request: sessionId or allOthers flag is required." },
        { status: 400 }
      );
    }

    // Strict ownership verification: Session MUST belong to current user
    const targetSession = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!targetSession) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Session does not exist." },
        { status: 404 }
      );
    }

    if (targetSession.userId !== userId) {
      // Forbidden: cannot revoke another user's session
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Cannot revoke a session belonging to another user." },
        { status: 403 }
      );
    }

    // Delete session
    await prisma.userSession.delete({
      where: { id: sessionId },
    });

    await logAuditEvent({
      actorUserId: userId,
      actorEmail: context.user.email,
      action: "SESSION_REVOKED",
      resourceType: "auth_session",
      resourceId: sessionId,
      metadata: {
        device: targetSession.device,
        browser: targetSession.browser,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully.",
      revokedSessionId: sessionId,
    });
  } catch (error: any) {
    console.error("[SESSION REVOKE ERROR]", error);
    return NextResponse.json(
      { success: false, error: "500 Internal Server Error: Failed to revoke session." },
      { status: 500 }
    );
  }
}
