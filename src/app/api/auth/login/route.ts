import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/rbac/service";
import { createSessionToken, attachSessionCookie } from "@/lib/rbac/token";
import { logAuditEvent } from "@/lib/rbac/audit";
import { sanitizeRedirectUrl } from "@/lib/rbac/routes";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, password, returnTo } = body;

    if (!credential || !password) {
      return NextResponse.json(
        { success: false, error: "Credential and security passcode are required." },
        { status: 400 }
      );
    }

    const cleanCred = credential.toLowerCase().trim();

    // 1. Authoritative User Lookup in PostgreSQL
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanCred },
          { name: { equals: cleanCred, mode: "insensitive" } },
        ],
      },
    });

    // Fallback: If user was in legacy Official table but not User, migrate or find
    if (!user) {
      const official = await prisma.official.findFirst({
        where: {
          OR: [
            { email: cleanCred },
            { name: { equals: cleanCred, mode: "insensitive" } },
          ],
        },
      });

      if (official) {
        user = await prisma.user.create({
          data: {
            email: official.email,
            name: official.name,
            passwordHash: official.password,
            badge: official.badge,
            targetUrl: official.targetUrl,
            isActive: true,
          },
        });
      }
    }

    // Invalid credentials
    if (!user || user.passwordHash !== password) {
      return NextResponse.json(
        { success: false, error: "401 Unauthorized: Invalid credential or security passcode." },
        { status: 401 }
      );
    }

    // 2. Check if Account is Active (Disabled User Protection)
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: User account has been deactivated. Contact Super Admin." },
        { status: 403 }
      );
    }

    // 3. Load Authoritative Roles and Permissions
    const context = await getUserContext(user.id);
    if (!context) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Unable to establish user authorization context." },
        { status: 403 }
      );
    }

    // 4. Generate Cryptographically Signed Session Token
    const sessionToken = createSessionToken({
      userId: user.id,
      email: user.email,
      roles: context.roles,
      permissions: context.permissions,
    });

    // 5. Construct Secure Response with HTTP-only Cookie
    const defaultTarget = user.targetUrl || "/admin";
    const finalTarget = returnTo ? sanitizeRedirectUrl(returnTo, defaultTarget) : defaultTarget;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        badge: user.badge,
        targetUrl: finalTarget,
        roles: context.roles,
        permissions: context.permissions,
        participantId: user.participantId,
        teamId: user.teamId,
        officialId: user.officialId,
      },
    });

    attachSessionCookie(response, sessionToken);

    // 6. Record Audit Event
    await logAuditEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "USER_LOGIN",
      resourceType: "auth",
      resourceId: user.id,
      metadata: { roles: context.roles },
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
