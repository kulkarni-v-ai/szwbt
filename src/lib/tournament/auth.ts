import { NextResponse } from "next/server";
import { UserContext, hasPermission } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export interface TournamentAuthCheck {
  authorized: boolean;
  canConfigure: boolean;
  canManageSchedule: boolean;
  canLockSchedule: boolean;
  canManageCourts: boolean;
  canManageCategories: boolean;
  errorResponse?: NextResponse;
}

export function verifyTournamentAdminClearance(
  context: UserContext | null | undefined
): TournamentAuthCheck {
  if (!context || !context.user) {
    return {
      authorized: false,
      canConfigure: false,
      canManageSchedule: false,
      canLockSchedule: false,
      canManageCourts: false,
      canManageCategories: false,
      errorResponse: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session credentials required." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const isTournamentAdmin = context.roles.includes(ROLES.TOURNAMENT_ADMIN);
  const hasTournamentRead = hasPermission(context, PERMISSIONS.TOURNAMENT_READ);
  const hasAdminRead = hasPermission(context, PERMISSIONS.ADMIN_READ);

  const authorized = isSuperAdmin || isTournamentAdmin || hasTournamentRead || hasAdminRead;

  if (!authorized) {
    return {
      authorized: false,
      canConfigure: false,
      canManageSchedule: false,
      canLockSchedule: false,
      canManageCourts: false,
      canManageCategories: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance. TOURNAMENT_ADMIN role or tournament:read permission required.",
        },
        { status: 403 }
      ),
    };
  }

  const canConfigure =
    isSuperAdmin ||
    isTournamentAdmin ||
    hasPermission(context, PERMISSIONS.TOURNAMENT_CONFIGURE) ||
    hasPermission(context, PERMISSIONS.TOURNAMENT_UPDATE);

  const canManageSchedule =
    isSuperAdmin ||
    isTournamentAdmin ||
    hasPermission(context, PERMISSIONS.SCHEDULE_MANAGE) ||
    hasPermission(context, PERMISSIONS.MATCH_UPDATE);

  const canLockSchedule =
    isSuperAdmin ||
    isTournamentAdmin ||
    hasPermission(context, PERMISSIONS.SCHEDULE_LOCK);

  const canManageCourts =
    isSuperAdmin ||
    isTournamentAdmin ||
    hasPermission(context, PERMISSIONS.COURT_MANAGE);

  const canManageCategories =
    isSuperAdmin ||
    isTournamentAdmin ||
    hasPermission(context, PERMISSIONS.CATEGORY_MANAGE) ||
    hasPermission(context, PERMISSIONS.EVENT_MANAGE);

  return {
    authorized: true,
    canConfigure,
    canManageSchedule,
    canLockSchedule,
    canManageCourts,
    canManageCategories,
  };
}
