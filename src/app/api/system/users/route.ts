import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyUserManagementClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";
import { ROLES } from "@/lib/rbac/roles";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const roleFilter = searchParams.get("role")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const institutionFilter = searchParams.get("institution")?.trim() || "";
    const stateFilter = searchParams.get("state")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Multi-field search: Name, Email, Mobile/Phone, User ID, Participant ID, Institution, State
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        { participantId: { contains: search, mode: "insensitive" } },
        { institution: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { badge: { contains: search, mode: "insensitive" } },
      ];
    }

    // Role filter
    if (roleFilter && roleFilter !== "ALL") {
      where.userRoles = {
        some: {
          role: { name: roleFilter },
        },
      };
    }

    // Account Status filter (ACTIVE vs DISABLED vs SUSPENDED vs PENDING)
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE") {
        where.isActive = true;
      } else if (statusFilter === "DISABLED" || statusFilter === "SUSPENDED") {
        where.isActive = false;
      }
    }

    // Institution filter
    if (institutionFilter && institutionFilter !== "ALL") {
      where.institution = { contains: institutionFilter, mode: "insensitive" };
    }

    // State filter
    if (stateFilter && stateFilter !== "ALL") {
      where.state = { contains: stateFilter, mode: "insensitive" };
    }

    const [users, totalCount, activeCount, disabledCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          institution: true,
          state: true,
          badge: true,
          targetUrl: true,
          isActive: true,
          lastLoginAt: true,
          participantId: true,
          teamId: true,
          sessionVersion: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true, displayName: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, isActive: true } }),
      prisma.user.count({ where: { ...where, isActive: false } }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone || null,
      institution: u.institution || null,
      state: u.state || null,
      badge: u.badge || "OFFICIAL",
      targetUrl: u.targetUrl,
      isActive: u.isActive,
      status: u.isActive ? "ACTIVE" : "DISABLED",
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null, // Never fabricate!
      participantId: u.participantId || null,
      teamId: u.teamId || null,
      sessionVersion: u.sessionVersion,
      roles: u.userRoles.map((ur) => ur.role.name),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalCount,
      metrics: {
        total: totalCount,
        active: activeCount,
        disabled: disabledCount,
      },
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/users:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const {
      email,
      name,
      phone,
      state,
      institution,
      role,
      roles,
      badge = "OFFICIAL",
      targetUrl = "/dashboard",
      status = "ACTIVE",
    } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: "Validation failed: Email and full name are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A user account with email '${cleanEmail}' already exists.` },
        { status: 409 }
      );
    }

    // Collect roles to assign
    const rolesToAssign: string[] = [];
    if (Array.isArray(roles) && roles.length > 0) {
      rolesToAssign.push(...roles);
    } else if (role) {
      rolesToAssign.push(role);
    } else {
      rolesToAssign.push(ROLES.VOLUNTEER);
    }

    // Role Escalation Safety Guard: Only an existing SUPER_ADMIN can assign SUPER_ADMIN role
    if (rolesToAssign.includes(ROLES.SUPER_ADMIN) && !context.roles.includes(ROLES.SUPER_ADMIN)) {
      return NextResponse.json(
        {
          success: false,
          error: "Privilege Escalation Violation: Only existing Super Administrators can grant the SUPER_ADMIN role.",
        },
        { status: 403 }
      );
    }

    // Fetch database role records
    const dbRoles = await prisma.role.findMany({
      where: { name: { in: rolesToAssign } },
    });

    if (dbRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed: No valid system roles specified." },
        { status: 400 }
      );
    }

    const isActive = status !== "DISABLED" && status !== "SUSPENDED";
    // Provision initial auth credential (never returned plaintext)
    const initialCredentialHash = "szwbt2026pass";

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: cleanEmail,
          name: name.trim(),
          phone: phone ? phone.trim() : null,
          state: state ? state.trim() : null,
          institution: institution ? institution.trim() : null,
          passwordHash: initialCredentialHash,
          badge,
          targetUrl,
          isActive,
        },
      });

      for (const r of dbRoles) {
        await tx.userRole.create({
          data: {
            userId: u.id,
            roleId: r.id,
          },
        });
      }

      return u;
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "USER_CREATED",
      resourceType: "user",
      resourceId: newUser.id,
      metadata: {
        email: newUser.email,
        name: newUser.name,
        roles: dbRoles.map((r) => r.name),
        institution: newUser.institution,
        state: newUser.state,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        institution: newUser.institution,
        state: newUser.state,
        badge: newUser.badge,
        roles: dbRoles.map((r) => r.name),
        isActive: newUser.isActive,
        status: newUser.isActive ? "ACTIVE" : "DISABLED",
        createdAt: newUser.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error in POST /api/system/users:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
