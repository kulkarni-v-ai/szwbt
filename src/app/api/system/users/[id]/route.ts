import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyUserManagementClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";
import { ROLES } from "@/lib/rbac/roles";

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
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        sessions: {
          orderBy: { lastActiveAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    // 1. Calculate Access Matrix: Group permissions by resource
    const resourceActionMap = new Map<string, Set<string>>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const { resource, action } = rp.permission;
        if (!resourceActionMap.has(resource)) {
          resourceActionMap.set(resource, new Set());
        }
        resourceActionMap.get(resource)!.add(action);
      }
    }

    const accessMatrix = Array.from(resourceActionMap.entries()).map(([resource, actionsSet]) => ({
      resource: resource.toUpperCase(),
      actions: Array.from(actionsSet).sort(),
    })).sort((a, b) => a.resource.localeCompare(b.resource));

    // 2. Fetch Team Association where authorized (if TEAM_MANAGER or PARTICIPANT or linked team)
    let teamAssociation = null;
    if (user.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { id: true, teamCode: true, name: true, institution: true, state: true },
      });
      if (team) {
        teamAssociation = {
          teamId: team.id,
          teamCode: team.teamCode,
          teamName: team.name,
          institution: team.institution,
          category: "Institution Team",
          role: "TEAM_MANAGER",
        };
      }
    } else if (user.participantId) {
      const participant = await prisma.participant.findUnique({
        where: { id: user.participantId },
        select: {
          id: true,
          playerId: true,
          name: true,
          institution: true,
          category: true,
          teamMemberships: {
            include: { team: true },
            take: 1,
          },
        },
      });
      if (participant) {
        const primaryTeam = participant.teamMemberships[0]?.team;
        teamAssociation = {
          teamId: primaryTeam?.id || null,
          teamCode: primaryTeam?.teamCode || "N/A",
          teamName: primaryTeam?.name || "Independent Contingent",
          institution: participant.institution,
          category: participant.category,
          role: "ATHLETE",
          playerId: participant.playerId,
        };
      }
    }

    // 3. Format Safe Active Sessions (NEVER expose session tokens or secrets!)
    const safeSessions = user.sessions.map((s, idx) => ({
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

    // 4. Audit History (Administrative actions targeting or performed by this user)
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actorEmail: user.email },
          { resourceId: user.id },
          { metadata: { contains: user.email } },
        ],
      },
      take: 20,
      orderBy: { timestamp: "desc" },
    });

    const safeAuditHistory = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorEmail: log.actorEmail,
      resourceType: log.resourceType,
      timestamp: log.timestamp.toISOString(),
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        institution: user.institution || null,
        state: user.state || null,
        badge: user.badge || "OFFICIAL",
        targetUrl: user.targetUrl,
        isActive: user.isActive,
        status: user.isActive ? "ACTIVE" : "DISABLED",
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null, // Never fabricate!
        sessionVersion: user.sessionVersion,
        roles: user.userRoles.map((ur) => ur.role.name),
        participantId: user.participantId || null,
        teamId: user.teamId || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessMatrix,
      teamAssociation,
      sessions: safeSessions,
      auditHistory: safeAuditHistory,
      recentActivity: safeAuditHistory,
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/users/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
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
    const { isActive, roles, badge, name, phone, institution, state, targetUrl } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target user account not found." }, { status: 404 });
    }

    // 1. Safety Guard: Disabling/Enabling User
    if (typeof isActive === "boolean") {
      if (!isActive && targetUser.id === context.user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Safety Violation: You cannot deactivate your own administrative account.",
          },
          { status: 400 }
        );
      }

      // Check if disabling the last active super admin
      const isTargetSuperAdmin = targetUser.userRoles.some((ur) => ur.role.name === ROLES.SUPER_ADMIN);
      if (!isActive && isTargetSuperAdmin) {
        const activeSuperAdminCount = await prisma.userRole.count({
          where: {
            role: { name: ROLES.SUPER_ADMIN },
            user: { isActive: true },
          },
        });
        if (activeSuperAdminCount <= 1) {
          return NextResponse.json(
            {
              success: false,
              error: "At least one active Super Admin must remain.",
            },
            { status: 400 }
          );
        }
      }

      // If user is disabled, immediately revoke sessions by bumping sessionVersion and deleting session records
      if (!isActive) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id },
            data: {
              isActive: false,
              sessionVersion: { increment: 1 },
            },
          }),
          prisma.userSession.deleteMany({
            where: { userId: id },
          }),
        ]);
      } else {
        await prisma.user.update({
          where: { id },
          data: { isActive: true },
        });
      }

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: isActive ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED",
        resourceType: "user",
        resourceId: targetUser.id,
        metadata: {
          targetEmail: targetUser.email,
          previousState: targetUser.isActive ? "ACTIVE" : "DISABLED",
          newState: isActive ? "ACTIVE" : "DISABLED",
          sessionsRevoked: !isActive,
        },
      });
    }

    // 2. Safety Guard: Roles Assignment & Last Super Admin Protection
    if (Array.isArray(roles)) {
      const wantsSuperAdmin = roles.includes(ROLES.SUPER_ADMIN);

      // Role escalation guard: Only existing Super Admins can grant SUPER_ADMIN
      if (wantsSuperAdmin && !context.roles.includes(ROLES.SUPER_ADMIN)) {
        return NextResponse.json(
          {
            success: false,
            error: "Privilege Escalation Violation: Only existing Super Administrators can grant the SUPER_ADMIN role.",
          },
          { status: 403 }
        );
      }

      // If removing SUPER_ADMIN from target user, ensure at least one other active Super Admin remains!
      const targetCurrentlySuperAdmin = targetUser.userRoles.some((ur) => ur.role.name === ROLES.SUPER_ADMIN);
      if (targetCurrentlySuperAdmin && !wantsSuperAdmin) {
        const activeSuperAdminCount = await prisma.userRole.count({
          where: {
            role: { name: ROLES.SUPER_ADMIN },
            user: { isActive: true },
          },
        });
        if (activeSuperAdminCount <= 1) {
          return NextResponse.json(
            {
              success: false,
              error: "At least one active Super Admin must remain.",
            },
            { status: 400 }
          );
        }
      }

      // Fetch all roles to assign
      const dbRoles = await prisma.role.findMany({
        where: { name: { in: roles } },
      });

      if (dbRoles.length === 0) {
        return NextResponse.json(
          { success: false, error: "Validation failed: At least one valid system role must be assigned." },
          { status: 400 }
        );
      }

      // Transaction: clear existing and re-assign
      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: targetUser.id } });
        for (const r of dbRoles) {
          await tx.userRole.create({
            data: {
              userId: targetUser.id,
              roleId: r.id,
            },
          });
        }
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ROLE_ASSIGNED",
        resourceType: "user",
        resourceId: targetUser.id,
        metadata: {
          targetEmail: targetUser.email,
          previousRoles: targetUser.userRoles.map((ur) => ur.role.name),
          newRoles: roles,
        },
      });
    }

    // 3. Update Basic Information if provided
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (typeof phone === "string") updateData.phone = phone.trim() || null;
    if (typeof institution === "string") updateData.institution = institution.trim() || null;
    if (typeof state === "string") updateData.state = state.trim() || null;
    if (badge) updateData.badge = badge;
    if (targetUrl) updateData.targetUrl = targetUrl;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "USER_UPDATED",
        resourceType: "user",
        resourceId: targetUser.id,
        metadata: {
          targetEmail: targetUser.email,
          updatedFields: Object.keys(updateData),
        },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated!.id,
        email: updated!.email,
        name: updated!.name,
        phone: updated!.phone,
        institution: updated!.institution,
        state: updated!.state,
        badge: updated!.badge,
        isActive: updated!.isActive,
        status: updated!.isActive ? "ACTIVE" : "DISABLED",
        roles: updated!.userRoles.map((ur) => ur.role.name),
        updatedAt: updated!.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/system/users/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
