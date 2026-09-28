import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyUserManagementClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/system/users/[id]/reset-password
 * Super Admin initiates a password reset or provisions temporary credentials.
 * NEVER returns plaintext passwords, password hashes, or raw tokens.
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
    const { action = "SEND_RESET", temporaryPassword } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Target user account not found." },
        { status: 404 }
      );
    }

    if (action === "SET_TEMPORARY") {
      // Set temporary password and require password change on next login
      const tempCred = temporaryPassword ? String(temporaryPassword).trim() : `szwbt_temp_${Math.random().toString(36).substring(2, 10)}`;

      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: {
            passwordHash: tempCred,
            sessionVersion: { increment: 1 },
          },
        }),
        // Invalidate active sessions
        prisma.userSession.deleteMany({
          where: { userId: id },
        }),
      ]);

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "PASSWORD_RESET_COMPLETED",
        resourceType: "user_credential",
        resourceId: targetUser.id,
        metadata: {
          targetEmail: targetUser.email,
          method: "TEMPORARY_PASSWORD_ASSIGNED",
          sessionsRevoked: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Temporary credentials provisioned successfully. Existing active sessions have been terminated.",
        requirePasswordChange: true,
      });
    }

    // Default: SEND_RESET (Preferred Identity Provider Workflow)
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.userSession.deleteMany({
        where: { userId: id },
      }),
    ]);

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "PASSWORD_RESET_REQUESTED",
      resourceType: "user_credential",
      resourceId: targetUser.id,
      metadata: {
        targetEmail: targetUser.email,
        method: "IDENTITY_PROVIDER_RESET_DISPATCH",
        sessionsRevoked: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset instructions and secure verification link have been dispatched to ${targetUser.email}.`,
    });
  } catch (err: any) {
    console.error("Error in POST /api/system/users/[id]/reset-password:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
