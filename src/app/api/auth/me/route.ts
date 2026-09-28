import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { context } = authResult;

  return NextResponse.json({
    success: true,
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name,
      badge: context.user.badge,
      targetUrl: context.user.targetUrl,
      participantId: context.user.participantId,
      teamId: context.user.teamId,
      officialId: context.user.officialId,
      roles: context.roles,
      permissions: context.permissions,
    },
  });
}
