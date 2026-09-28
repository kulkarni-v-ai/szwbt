import { NextResponse } from "next/server";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";

export interface OperationsAuthResult {
  isAuthorized: boolean;
  context?: UserContext;
  errorResponse?: NextResponse;
}

/**
 * Authoritatively verifies that the authenticated user has OPERATIONS_STAFF (or SUPER_ADMIN) clearance.
 * Strictly blocks unauthorized roles (Participant, Team Manager, Volunteer, etc.) with 403 Forbidden.
 */
export function verifyOperationsClearance(context: UserContext): OperationsAuthResult {
  const isOperationsStaff = context.roles.includes(ROLES.OPERATIONS_STAFF);
  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);

  if (!isOperationsStaff && !isSuperAdmin) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Only authorized On-Ground Operations Staff or Super Administrators can access the operations command center.",
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
