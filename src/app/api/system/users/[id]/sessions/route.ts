import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyUserManagementClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/system/users/[id]/sessions
 * Returns active sessions for the specified target user.
 * Tokens and secret credentials are never exposed.
 */
export async function GET(
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
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found." }, { status: 404 });
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { lastActiveAt: "desc" },
    });

    const safeSessions = sessions.map((s, idx) => ({
      id: s.id,
      device: s.device,
      browser: s.browser,
      ipAddress: s.ipAddress || "127.0.0.1",
      location: s.location || "Hubballi, Karnataka, IN",
      isCurrent: idx === 0 || s.isCurrent,
      lastActiveAt: s.lastActiveAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      sessions: safeSessions,
      count: safeSessions.length,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/users/[id]/sessions:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
