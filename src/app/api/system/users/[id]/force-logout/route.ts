import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyUserManagementClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/system/users/[id]/force-logout
 * Super Admin terminates active sessions for a target user.
 * Increments target user's sessionVersion and clears session records.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const adminAuth = verifyUserManagementClearance(context);
    if (adminAuth.errorResponse) {
      return adminAuth.errorResponse;
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { sessionId, allSessions = true } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found." }, { status: 404 });
    }

    if (sessionId) {
      // Revoke single specific session
      await prisma.userSession.deleteMany({
        where: { id: sessionId, userId: id },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "SESSION_REVOKED",
        resourceType: "user_session",
        resourceId: sessionId,
        metadata: {
          targetUserId: targetUser.id,
          targetEmail: targetUser.email,
          scope: "SPECIFIC_SESSION",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Specified session has been revoked.",
        revokedSessionId: sessionId,
      });
    }

    // Default: Force logout / Revoke all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { sessionVersion: { increment: 1 } },
      }),
      prisma.userSession.deleteMany({
        where: { userId: id },
      }),
    ]);

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "FORCE_LOGOUT",
      resourceType: "user_session",
      resourceId: targetUser.id,
      metadata: {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        scope: "ALL_ACTIVE_SESSIONS",
      },
    });

    return NextResponse.json({
      success: true,
      message: `All active sessions for ${targetUser.email} have been revoked. Session version incremented.`,
    });
  } catch (err: any) {
    console.error("Error in POST /api/system/users/[id]/force-logout:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
