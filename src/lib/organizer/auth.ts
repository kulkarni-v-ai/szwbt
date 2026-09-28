import { NextRequest, NextResponse } from "next/server";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";

export interface OrganizerAuthResult {
  isAuthorized: boolean;
  context?: UserContext;
  errorResponse?: NextResponse;
}

/**
 * Authoritatively verifies that the authenticated user has ORGANIZER (or SUPER_ADMIN) clearance.
 * Strictly blocks unauthorized roles (Participant, Team Manager, Volunteer, etc.) with 403 Forbidden.
 */
export function verifyOrganizerClearance(context: UserContext): OrganizerAuthResult {
  const isOrganizer = context.roles.includes(ROLES.ORGANIZER);
  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);

  if (!isOrganizer && !isSuperAdmin) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Only authorized Tournament Organizers or Super Administrators can access the operations command center.",
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
