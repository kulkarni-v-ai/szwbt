import { NextResponse } from "next/server";
import { UserContext, hasPermission } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export interface ReportsClearanceResult {
  authorized: boolean;
  user: UserContext["user"];
  canRead: boolean;
  canExport: boolean;
  hasFinanceAccess: boolean;
  hasAuditAccess: boolean;
  accessibleCategories: string[];
  errorResponse?: NextResponse;
}

export const ALL_REPORT_CATEGORIES = [
  "REGISTRATION",
  "PARTICIPANTS",
  "TEAMS",
  "ACCOMMODATION",
  "TRANSPORT",
  "FINANCE",
  "MATCHES",
  "RESULTS",
  "OPERATIONS",
  "SUPPORT",
  "COMMUNICATIONS",
  "AUDIT",
] as const;

export type ReportCategory = typeof ALL_REPORT_CATEGORIES[number];

/**
 * Verifies that the user has clearance to access the Reports & Analytics Center.
 * Authorized roles: SUPER_ADMIN, TOURNAMENT_ADMIN, REPORTS_STAFF, ORGANIZER, or users with REPORTS_READ.
 * Enforces strict category-level restrictions for sensitive domains like FINANCE and AUDIT.
 */
export function verifyReportsClearance(
  context: UserContext | null | undefined,
  requestedCategory?: string
): ReportsClearanceResult {
  if (!context || !context.user) {
    return {
      authorized: false,
      user: null as any,
      canRead: false,
      canExport: false,
      hasFinanceAccess: false,
      hasAuditAccess: false,
      accessibleCategories: [],
      errorResponse: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session credentials required." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const isTournamentAdmin = context.roles.includes(ROLES.TOURNAMENT_ADMIN);
  const isReportsStaff = context.roles.includes(ROLES.REPORTS_STAFF);
  const isOrganizer = context.roles.includes(ROLES.ORGANIZER);
  const isFinanceStaff = context.roles.includes(ROLES.FINANCE_STAFF);

  const hasReportsRead = hasPermission(context, PERMISSIONS.REPORTS_READ);
  const hasReportsExport = hasPermission(context, PERMISSIONS.REPORTS_EXPORT);
  const hasFinanceRead = hasPermission(context, PERMISSIONS.FINANCE_READ) || hasPermission(context, PERMISSIONS.FINANCE_REPORT) || isFinanceStaff;
  const hasAuditRead = hasPermission(context, PERMISSIONS.AUDIT_READ);

  const baseAuthorized = isSuperAdmin || isTournamentAdmin || isReportsStaff || isOrganizer || hasReportsRead;

  if (!baseAuthorized) {
    return {
      authorized: false,
      user: context.user,
      canRead: false,
      canExport: false,
      hasFinanceAccess: false,
      hasAuditAccess: false,
      accessibleCategories: [],
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Insufficient clearance for Reports & Analytics Center.",
        },
        { status: 403 }
      ),
    };
  }

  // Calculate accessible categories based on granular permissions
  const accessibleCategories: string[] = [
    "REGISTRATION",
    "PARTICIPANTS",
    "TEAMS",
    "ACCOMMODATION",
    "TRANSPORT",
    "MATCHES",
    "RESULTS",
    "OPERATIONS",
    "SUPPORT",
    "COMMUNICATIONS",
  ];

  if (isSuperAdmin || hasFinanceRead) {
    accessibleCategories.push("FINANCE");
  }

  if (isSuperAdmin || hasAuditRead) {
    accessibleCategories.push("AUDIT");
  }

  // If a specific category was requested, strictly check permission for it
  if (requestedCategory) {
    const cat = requestedCategory.toUpperCase();
    if (cat === "FINANCE" && !isSuperAdmin && !hasFinanceRead) {
      return {
        authorized: false,
        user: context.user,
        canRead: false,
        canExport: false,
        hasFinanceAccess: false,
        hasAuditAccess: isSuperAdmin || hasAuditRead,
        accessibleCategories,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "403 Forbidden: Finance reports require dedicated Finance clearance (FINANCE_READ or FINANCE_REPORT).",
          },
          { status: 403 }
        ),
      };
    }

    if (cat === "AUDIT" && !isSuperAdmin && !hasAuditRead) {
      return {
        authorized: false,
        user: context.user,
        canRead: false,
        canExport: false,
        hasFinanceAccess: isSuperAdmin || hasFinanceRead,
        hasAuditAccess: false,
        accessibleCategories,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "403 Forbidden: Tamper-evident Audit reports require AUDIT_READ clearance.",
          },
          { status: 403 }
        ),
      };
    }
  }

  return {
    authorized: true,
    user: context.user,
    canRead: true,
    canExport: isSuperAdmin || hasReportsExport,
    hasFinanceAccess: isSuperAdmin || hasFinanceRead,
    hasAuditAccess: isSuperAdmin || hasAuditRead,
    accessibleCategories,
  };
}
