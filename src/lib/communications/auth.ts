import { NextResponse } from "next/server";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/service";

export interface CommunicationsClearanceResult {
  authorized: boolean;
  user: UserContext["user"];
  canCreate: boolean;
  canPublish: boolean;
  canEmergency: boolean;
  errorResponse?: NextResponse;
}

/**
 * Authoritative verification of user clearance for Communications & Announcements Center.
 * Authorized roles: SUPER_ADMIN, COMMUNICATIONS_STAFF, ORGANIZER (with announcement permissions).
 * Rejects unauthorized users (Participant, Team Manager, Volunteer, etc.) with HTTP 403 Forbidden.
 */
export function verifyCommunicationsClearance(
  context: UserContext | null | undefined
): CommunicationsClearanceResult {
  if (!context || !context.user) {
    return {
      authorized: false,
      user: null as any,
      canCreate: false,
      canPublish: false,
      canEmergency: false,
      errorResponse: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session token required." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const isCommStaff = context.roles.includes(ROLES.COMMUNICATIONS_STAFF);
  const isOrganizer = context.roles.includes(ROLES.ORGANIZER);

  const hasReadPermission = hasPermission(context, PERMISSIONS.ANNOUNCEMENT_READ);

  const authorized = isSuperAdmin || isCommStaff || (isOrganizer && hasReadPermission);

  if (!authorized) {
    return {
      authorized: false,
      user: context.user,
      canCreate: false,
      canPublish: false,
      canEmergency: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance for Communications & Announcements Center.",
        },
        { status: 403 }
      ),
    };
  }

  const canCreate = isSuperAdmin || isCommStaff || hasPermission(context, PERMISSIONS.ANNOUNCEMENT_CREATE);
  const canPublish = isSuperAdmin || isCommStaff || hasPermission(context, PERMISSIONS.ANNOUNCEMENT_PUBLISH);
  const canEmergency = isSuperAdmin || (isCommStaff && canPublish);

  return {
    authorized: true,
    user: context.user,
    canCreate,
    canPublish,
    canEmergency,
  };
}
