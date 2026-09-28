import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { validateRoleAssignment, UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

// GET: View all roles, permissions, and users with assigned roles
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
        orderBy: { name: "asc" },
      });

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          badge: true,
          isActive: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const permissions = await prisma.permission.findMany({
        orderBy: { resource: "asc" },
      });

      return NextResponse.json({
        success: true,
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
          description: r.description,
          permissions: r.rolePermissions.map((rp) => rp.permission.code),
        })),
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          badge: u.badge,
          isActive: u.isActive,
          roles: u.userRoles.map((ur) => ur.role.name),
        })),
        permissions: permissions.map((p) => ({
          id: p.id,
          code: p.code,
          resource: p.resource,
          action: p.action,
          description: p.description,
        })),
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { permissions: [PERMISSIONS.ROLES_READ] }
);

// POST: Assign a role to a user (with strict privilege escalation guards)
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { targetUserId, roleName } = body;

      if (!targetUserId || !roleName) {
        return NextResponse.json(
          { success: false, error: "targetUserId and roleName are required." },
          { status: 400 }
        );
      }

      // 1. Enforce Privilege Escalation Safeguards
      const validation = validateRoleAssignment(context, targetUserId, roleName);
      if (!validation.allowed) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 403 }
        );
      }

      // 2. Lookup Target User and Role
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: "Target user not found." },
          { status: 404 }
        );
      }

      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });
      if (!role) {
        return NextResponse.json(
          { success: false, error: `Role '${roleName}' does not exist.` },
          { status: 404 }
        );
      }

      // 3. Assign Role in DB
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: targetUserId,
            roleId: role.id,
          },
        },
        create: {
          userId: targetUserId,
          roleId: role.id,
        },
        update: {},
      });

      // 4. Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ROLE_ASSIGNED",
        resourceType: "role",
        resourceId: role.id,
        metadata: {
          targetUserId,
          targetEmail: targetUser.email,
          roleName,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Role '${roleName}' assigned to user '${targetUser.email}' successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { permissions: [PERMISSIONS.ROLES_ASSIGN] }
);

// DELETE: Remove a role from a user
export const DELETE = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { targetUserId, roleName } = body;

      if (!targetUserId || !roleName) {
        return NextResponse.json(
          { success: false, error: "targetUserId and roleName are required." },
          { status: 400 }
        );
      }

      // 1. Enforce Privilege Escalation Safeguards
      const validation = validateRoleAssignment(context, targetUserId, roleName);
      if (!validation.allowed) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 403 }
        );
      }

      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        return NextResponse.json({ success: false, error: "Role not found." }, { status: 404 });
      }

      await prisma.userRole.deleteMany({
        where: {
          userId: targetUserId,
          roleId: role.id,
        },
      });

      // Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ROLE_REMOVED",
        resourceType: "role",
        resourceId: role.id,
        metadata: {
          targetUserId,
          roleName,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Role '${roleName}' removed successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { permissions: [PERMISSIONS.ROLES_ASSIGN] }
);
