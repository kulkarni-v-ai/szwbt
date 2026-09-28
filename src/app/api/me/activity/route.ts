import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/rbac/guard";

// Self-service safe action types to display in personal account activity
const PERSONAL_SAFE_ACTIONS = new Set([
  "USER_LOGIN",
  "USER_LOGOUT",
  "PROFILE_UPDATED",
  "NOTIFICATION_PREFERENCES_UPDATED",
  "SESSION_REVOKED",
  "ACCOUNT_SECURITY_ACTION",
  "PASSWORD_CHANGED",
]);

/**
 * GET /api/me/activity
 * Retrieves the authenticated user's personal security & account audit events.
 * Strict isolation: Users can never view another user's activity.
 */
export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { context } = authResult;
  const userId = context.user.id;
  const email = context.user.email.toLowerCase().trim();

  try {
    const rawLogs = await prisma.auditLog.findMany({
      where: {
        OR: [{ actorUserId: userId }, { actorEmail: email }],
      },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    const safeActivity = rawLogs.map((log) => {
      let desc = "Account security event";
      switch (log.action) {
        case "USER_LOGIN":
          desc = "Successful authentication via Identity Provider";
          break;
        case "USER_LOGOUT":
          desc = "Secure session sign-out";
          break;
        case "PROFILE_UPDATED":
          desc = "Personal profile information updated";
          break;
        case "NOTIFICATION_PREFERENCES_UPDATED":
          desc = "Notification delivery preferences saved";
          break;
        case "SESSION_REVOKED":
          desc = "Session termination action executed";
          break;
        case "ACCOUNT_SECURITY_ACTION":
          desc = "Account security setting verified";
          break;
        default:
          desc = `Authorized action: ${log.action.replace(/_/g, " ").toLowerCase()}`;
      }

      return {
        id: log.id,
        action: log.action,
        description: desc,
        resourceType: log.resourceType,
        timestamp: log.timestamp,
      };
    });

    return NextResponse.json({
      success: true,
      activity: safeActivity,
      count: safeActivity.length,
    });
  } catch (error: any) {
    console.error("[ACTIVITY GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: "500 Internal Server Error: Failed to load account activity." },
      { status: 500 }
    );
  }
}
