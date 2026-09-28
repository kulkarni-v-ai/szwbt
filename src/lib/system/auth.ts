import { NextResponse } from "next/server";
import { UserContext, hasPermission } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export interface SuperAdminClearanceResult {
  authorized: boolean;
  user: UserContext["user"];
  isSuperAdmin: boolean;
  canConfigure: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageHousing: boolean;
  canViewAudit: boolean;
  errorResponse?: NextResponse;
}

/**
 * Authoritatively verifies Super Admin clearance for System Health & Administration.
 * Authorized roles: SUPER_ADMIN (or users with PERMISSIONS.SYSTEM_READ / PERMISSIONS.ADMIN_READ).
 * Strictly rejects unauthorized users (e.g., support staff, organizers, volunteers, athletes) with HTTP 403 Forbidden.
 */
export function verifySuperAdminClearance(
  context: UserContext | null | undefined
): SuperAdminClearanceResult {
  if (!context || !context.user) {
    return {
      authorized: false,
      user: null as any,
      isSuperAdmin: false,
      canConfigure: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageHousing: false,
      canViewAudit: false,
      errorResponse: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session credentials required." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const hasSystemRead = hasPermission(context, PERMISSIONS.SYSTEM_READ);
  const hasAdminRead = hasPermission(context, PERMISSIONS.ADMIN_READ);
  const hasSystemConfigure = hasPermission(context, PERMISSIONS.SYSTEM_CONFIGURE);

  const authorized = isSuperAdmin || hasSystemRead || hasAdminRead || hasSystemConfigure;

  if (!authorized) {
    return {
      authorized: false,
      user: context.user,
      isSuperAdmin: false,
      canConfigure: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageHousing: false,
      canViewAudit: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance. Super Administrator authority required.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: context.user,
    isSuperAdmin,
    canConfigure: isSuperAdmin || hasSystemConfigure,
    canManageUsers: isSuperAdmin || hasPermission(context, PERMISSIONS.USERS_UPDATE),
    canManageRoles: isSuperAdmin || hasPermission(context, PERMISSIONS.ROLES_ASSIGN),
    canManageHousing: isSuperAdmin || hasPermission(context, PERMISSIONS.ACCOMMODATION_CONFIGURE),
    canViewAudit: isSuperAdmin || hasPermission(context, PERMISSIONS.AUDIT_READ),
  };
}

/**
 * Authoritatively verifies clearance for Super Admin User Management (/admin/system/users).
 * Strict RBAC: Only SUPER_ADMIN (or users explicitly granted USERS_UPDATE + ROLES_ASSIGN)
 * strictly rejects unauthorized roles (TOURNAMENT_ADMIN, REGISTRATION_STAFF, VOLUNTEER, PARTICIPANT, etc.) with HTTP 403 Forbidden.
 */
export function verifyUserManagementClearance(
  context: UserContext | null | undefined
): {
  authorized: boolean;
  user: UserContext["user"];
  isSuperAdmin: boolean;
  errorResponse?: NextResponse;
} {
  if (!context || !context.user) {
    return {
      authorized: false,
      user: null as any,
      isSuperAdmin: false,
      errorResponse: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session credentials required." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const hasUserUpdate = hasPermission(context, PERMISSIONS.USERS_UPDATE);
  const hasRolesAssign = hasPermission(context, PERMISSIONS.ROLES_ASSIGN);

  // Strictly SUPER_ADMIN or both USERS_UPDATE and ROLES_ASSIGN
  const authorized = isSuperAdmin || (hasUserUpdate && hasRolesAssign);

  if (!authorized) {
    return {
      authorized: false,
      user: context.user,
      isSuperAdmin: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance. Super Administrator authority required for user management.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: context.user,
    isSuperAdmin,
  };
}
