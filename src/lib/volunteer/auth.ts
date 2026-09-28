import { NextResponse } from "next/server";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";

export interface VolunteerAuthResult {
  isAuthorized: boolean;
  context?: UserContext;
  errorResponse?: NextResponse;
}

/**
 * Authoritatively verifies that the authenticated user has VOLUNTEER (or SUPER_ADMIN) clearance.
 * Strictly blocks unauthorized roles with 403 Forbidden.
 */
export function verifyVolunteerClearance(context: UserContext): VolunteerAuthResult {
  const isVolunteer = context.roles.includes(ROLES.VOLUNTEER);
  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);

  if (!isVolunteer && !isSuperAdmin) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Only authorized Tournament Volunteers or Super Administrators can access the volunteer operations portal.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    isAuthorized: true,
    context,
  };
}
