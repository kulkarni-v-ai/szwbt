import { NextResponse } from "next/server";
import { UserContext, hasPermission } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export interface SupportClearanceResult {
  authorized: boolean;
  user: UserContext["user"];
  isSupportStaff: boolean;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canResolve: boolean;
  canClose: boolean;
  canEscalate: boolean;
  canComment: boolean;
  errorResponse?: NextResponse;
}

/**
 * Verifies that the user has clearance to access the Support / Help Desk Command Center.
 * Authorized roles: SUPER_ADMIN, SUPPORT_STAFF, TOURNAMENT_ADMIN.
 * Rejects unauthorized users (unauthorized Participant, Volunteer, Team Manager) with HTTP 403 Forbidden.
 */
export function verifySupportClearance(
  context: UserContext | null | undefined
): SupportClearanceResult {
  if (!context || !context.user) {
    return {
      authorized: false,
      user: null as any,
      isSupportStaff: false,
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canAssign: false,
      canResolve: false,
      canClose: false,
      canEscalate: false,
      canComment: false,
      errorResponse: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session token required." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const isSupportStaff = context.roles.includes(ROLES.SUPPORT_STAFF);
  const isTournamentAdmin = context.roles.includes(ROLES.TOURNAMENT_ADMIN);

  const hasReadPerm = hasPermission(context, PERMISSIONS.SUPPORT_READ);

  const authorized = isSuperAdmin || isSupportStaff || isTournamentAdmin || hasReadPerm;

  if (!authorized) {
    return {
      authorized: false,
      user: context.user,
      isSupportStaff: false,
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canAssign: false,
      canResolve: false,
      canClose: false,
      canEscalate: false,
      canComment: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance for Support / Help Desk Command Center.",
        },
        { status: 403 }
      ),
    };
  }

  const canRead = true;
  const canCreate = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_CREATE);
  const canUpdate = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_UPDATE);
  const canAssign = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_ASSIGN);
  const canResolve = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_RESOLVE);
  const canClose = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_CLOSE);
  const canEscalate = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_ESCALATE);
  const canComment = isSuperAdmin || isSupportStaff || hasPermission(context, PERMISSIONS.SUPPORT_COMMENT);

  return {
    authorized: true,
    user: context.user,
    isSupportStaff: isSuperAdmin || isSupportStaff,
    canRead,
    canCreate,
    canUpdate,
    canAssign,
    canResolve,
    canClose,
    canEscalate,
    canComment,
  };
}
