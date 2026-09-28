/**
 * Centralized Canonical Route Registry & Authorization Configuration
 * Single source of truth for all application routes, required permissions,
 * and open redirect sanitization.
 */

import { PERMISSIONS, PermissionCode } from "./permissions";
import { ROLES, RoleName } from "./roles";

// Explicit Public Routes List
export const PUBLIC_ROUTES = [
  "/",
  "/tournament",
  "/schedule",
  "/matches",
  "/results",
  "/about",
  "/contact",
  "/announcements",
  "/register",
  "/login",
  "/403",
  "/404",
] as const;

// Explicit Protected Routes List
export const PROTECTED_ROUTES = [
  "/admin",
  "/admin/registrations",
  "/admin/accommodation",
  "/admin/transport",
  "/admin/finance",
  "/admin/live",
  "/admin/communications",
  "/admin/communications/announcements",
  "/admin/communications/create",
  "/admin/communications/templates",
  "/admin/communications/scheduled",
  "/admin/communications/history",
  "/admin/communications/delivery",
  "/admin/communications/emergency",
  "/admin/reports",
  "/admin/system",
  "/admin/system/users",
  "/admin/system/institutions",
  "/admin/system/accommodation",
  "/admin/tournament",
  "/official",
  "/organizer",
  "/operations",
  "/volunteer",
  "/support",
  "/team",
  "/dashboard",
  "/profile",
  "/scanner",
] as const;

// Canonical Route Constants & Helpers
export const ROUTES = {
  public: {
    home: () => "/",
    tournament: () => "/tournament",
    schedule: () => "/schedule",
    matches: () => "/matches",
    results: () => "/results",
    about: () => "/about",
    contact: () => "/contact",
    announcements: () => "/announcements",
    register: () => "/register",
    login: (returnTo?: string) => (returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"),
  },

  admin: {
    home: () => "/admin",
    registrations: () => "/admin/registrations",
    accommodation: () => "/admin/accommodation",
    transport: () => "/admin/transport",
    finance: () => "/admin/finance",
    live: () => "/admin/live",
    communications: () => "/admin/communications",
    reports: () => "/admin/reports",
    system: () => "/admin/system",
    tournament: () => "/admin/tournament",
  },

  operational: {
    official: () => "/official",
    organizer: () => "/organizer",
    operations: () => "/operations",
    volunteer: () => "/volunteer",
    support: () => "/support",
  },

  user: {
    team: (teamId?: string) => (teamId ? `/team?teamId=${encodeURIComponent(teamId)}` : "/team"),
    dashboard: (participantId?: string) => (participantId ? `/dashboard?id=${encodeURIComponent(participantId)}` : "/dashboard"),
    profile: () => "/profile",
  },

  error: {
    forbidden: (route?: string, required?: string) => {
      if (!route) return "/403";
      const q = new URLSearchParams();
      q.set("route", route);
      if (required) q.set("required", required);
      return `/403?${q.toString()}`;
    },
    notFound: () => "/404",
  },

  // Direct convenience aliases matching user specification
  official: () => "/official",
  team: (teamId?: string) => (teamId ? `/team?teamId=${encodeURIComponent(teamId)}` : "/team"),
  dashboard: (participantId?: string) => (participantId ? `/dashboard?id=${encodeURIComponent(participantId)}` : "/dashboard"),
  scanner: () => "/scanner",
} as const;

// Lowercase alias matching prompt format
export const routes = ROUTES;

export interface RouteSecurityRequirement {
  path: string;
  requiredPermission: PermissionCode | "";
  allowedRoles?: RoleName[];
  name: string;
}

/**
 * Authoritative Route -> Required Permission Registry
 * Every protected route must be explicitly declared here.
 * NEVER treat URL paths as security. URL manipulation is blocked here.
 */
export const ROUTE_PERMISSIONS: Record<string, RouteSecurityRequirement> = {
  "/admin": {
    path: "/admin",
    requiredPermission: PERMISSIONS.ADMIN_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN],
    name: "Super Admin Command Center",
  },
  "/admin/registrations": {
    path: "/admin/registrations",
    requiredPermission: PERMISSIONS.REGISTRATION_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.REGISTRATION_STAFF, ROLES.DOCUMENT_SCANNER, ROLES.TOURNAMENT_ADMIN],
    name: "Registration Desk Operations",
  },
  "/scanner": {
    path: "/scanner",
    requiredPermission: "",
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.DOCUMENT_SCANNER,
      ROLES.REGISTRATION_STAFF,
      ROLES.TOURNAMENT_ADMIN,
      ROLES.OPERATIONS_STAFF,
      ROLES.VOLUNTEER,
      ROLES.ORGANIZER,
      ROLES.SUPPORT_STAFF,
    ],
    name: "Document Scanner Mobile Interface",
  },
  "/admin/accommodation": {
    path: "/admin/accommodation",
    requiredPermission: PERMISSIONS.ACCOMMODATION_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.ACCOMMODATION_STAFF],
    name: "Accommodation Logistics (5-Bed)",
  },
  "/admin/transport": {
    path: "/admin/transport",
    requiredPermission: PERMISSIONS.TRANSPORT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.TRANSPORT_STAFF],
    name: "Transport & Shuttle Fleet Logistics",
  },
  "/admin/finance": {
    path: "/admin/finance",
    requiredPermission: PERMISSIONS.FINANCE_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.FINANCE_STAFF],
    name: "Finance & Treasury Ledgers",
  },
  "/admin/live": {
    path: "/admin/live",
    requiredPermission: PERMISSIONS.LIVE_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN, ROLES.OPERATIONS_STAFF],
    name: "Live Operations & 8-Court Matrix",
  },
  "/admin/communications": {
    path: "/admin/communications",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF, ROLES.ORGANIZER],
    name: "Communications Command Center",
  },
  "/admin/communications/announcements": {
    path: "/admin/communications/announcements",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF, ROLES.ORGANIZER],
    name: "Communications Announcements Management",
  },
  "/admin/communications/create": {
    path: "/admin/communications/create",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_CREATE,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF],
    name: "Communications Guided Announcement Composer",
  },
  "/admin/communications/templates": {
    path: "/admin/communications/templates",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF, ROLES.ORGANIZER],
    name: "Communications Template Management",
  },
  "/admin/communications/scheduled": {
    path: "/admin/communications/scheduled",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF, ROLES.ORGANIZER],
    name: "Communications Scheduled Broadcasts",
  },
  "/admin/communications/history": {
    path: "/admin/communications/history",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF, ROLES.ORGANIZER],
    name: "Communications Historical Broadcast Log",
  },
  "/admin/communications/delivery": {
    path: "/admin/communications/delivery",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF, ROLES.ORGANIZER],
    name: "Communications Multi-Channel Delivery Monitor",
  },
  "/admin/communications/emergency": {
    path: "/admin/communications/emergency",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_PUBLISH,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.COMMUNICATIONS_STAFF],
    name: "Communications Emergency Broadcast Channel",
  },
  "/admin/reports": {
    path: "/admin/reports",
    requiredPermission: PERMISSIONS.REPORTS_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.REPORTS_STAFF, ROLES.TOURNAMENT_ADMIN],
    name: "Reporting & Tournament Analytics",
  },
  "/admin/system": {
    path: "/admin/system",
    requiredPermission: PERMISSIONS.SYSTEM_CONFIGURE,
    allowedRoles: [ROLES.SUPER_ADMIN],
    name: "System Infrastructure Telemetry",
  },
  "/admin/system/users": {
    path: "/admin/system/users",
    requiredPermission: PERMISSIONS.USERS_UPDATE,
    allowedRoles: [ROLES.SUPER_ADMIN],
    name: "Super Admin User & Account Management",
  },
  "/admin/tournament": {
    path: "/admin/tournament",
    requiredPermission: PERMISSIONS.MATCH_CREATE,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN],
    name: "Tournament Match Control & Draws",
  },
  "/official": {
    path: "/official",
    requiredPermission: PERMISSIONS.SCORING_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.MATCH_OFFICIAL, ROLES.TOURNAMENT_ADMIN],
    name: "Match Official Court Umpire Scoreboard",
  },
  "/organizer": {
    path: "/organizer",
    requiredPermission: PERMISSIONS.ANNOUNCEMENT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.ORGANIZER],
    name: "Tournament Organizer Executive HUD",
  },
  "/operations": {
    path: "/operations",
    requiredPermission: PERMISSIONS.REGISTRATION_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.OPERATIONS_STAFF, ROLES.TOURNAMENT_ADMIN],
    name: "On-Ground Operations Field Desk",
  },
  "/volunteer": {
    path: "/volunteer",
    requiredPermission: PERMISSIONS.TRANSPORT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.VOLUNTEER],
    name: "Volunteer Mobile Field Desk",
  },
  "/support": {
    path: "/support",
    requiredPermission: PERMISSIONS.PARTICIPANT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.SUPPORT_STAFF],
    name: "Participant Query Help Desk",
  },
  "/team": {
    path: "/team",
    requiredPermission: PERMISSIONS.TEAM_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.TEAM_MANAGER],
    name: "Team Manager Institution Hub",
  },
  "/dashboard": {
    path: "/dashboard",
    requiredPermission: PERMISSIONS.PARTICIPANT_READ,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.PARTICIPANT],
    name: "Participant Athlete Personal HUD",
  },
  "/profile": {
    path: "/profile",
    requiredPermission: "",
    allowedRoles: Object.values(ROLES),
    name: "User Security Profile & ID",
  },
  "/admin/system/institutions": {
    path: "/admin/system/institutions",
    requiredPermission: PERMISSIONS.SYSTEM_CONFIGURE,
    allowedRoles: [ROLES.SUPER_ADMIN],
    name: "University & Institution Master Configuration",
  },
  "/admin/system/accommodation": {
    path: "/admin/system/accommodation",
    requiredPermission: PERMISSIONS.ACCOMMODATION_CONFIGURE,
    allowedRoles: [ROLES.SUPER_ADMIN],
    name: "Accommodation System Configuration",
  },
};

/**
 * Checks if a path matches any protected route rule.
 */
export function getRouteSecurityRequirement(pathname: string): RouteSecurityRequirement | null {
  // Normalize path (strip trailing slashes unless root)
  const cleanPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Exact match
  if (ROUTE_PERMISSIONS[cleanPath]) {
    return ROUTE_PERMISSIONS[cleanPath];
  }

  // Prefix match for nested admin routes (e.g. /admin/registrations/...)
  for (const [routeKey, config] of Object.entries(ROUTE_PERMISSIONS)) {
    if (cleanPath.startsWith(`${routeKey}/`)) {
      return config;
    }
  }

  return null;
}

/**
 * Validates and sanitizes a returnTo redirect URL to protect against Open Redirect vulnerabilities.
 * Strictly permits only relative internal application paths.
 */
export function sanitizeRedirectUrl(returnTo: string | null | undefined, fallback = "/admin"): string {
  if (!returnTo || typeof returnTo !== "string") {
    return fallback;
  }

  const trimmed = returnTo.trim();

  // Reject empty string
  if (!trimmed) return fallback;

  // Must begin with a single "/"
  if (!trimmed.startsWith("/")) return fallback;

  // Reject protocol-relative URLs (e.g., "//evil.com")
  if (trimmed.startsWith("//")) return fallback;

  // Reject backslashes (e.g., "/\evil.com")
  if (trimmed.includes("\\")) return fallback;

  // Reject URLs containing protocols (e.g., "/http://evil.com")
  if (trimmed.toLowerCase().includes("http:") || trimmed.toLowerCase().includes("https:")) {
    return fallback;
  }

  // Reject "@" characters used in authentication spoofing (e.g., "/@evil.com")
  if (trimmed.includes("@")) return fallback;

  return trimmed;
}

/**
 * Evaluates whether a user context (permissions & roles) is authorized for a given route.
 * URL is NEVER treated as security. Strictly enforces route required permission.
 */
export function checkRouteAuthorization(
  pathname: string,
  userPermissions: string[],
  userRoles: string[]
): { authorized: boolean; requirement: RouteSecurityRequirement | null; reason?: string } {
  const requirement = getRouteSecurityRequirement(pathname);

  // If not a protected route, open access
  if (!requirement) {
    return { authorized: true, requirement: null };
  }

  // Super Admin has global operational clearance
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return { authorized: true, requirement };
  }

  // Pure RBAC: Verify required permission (if route requires a specific permission)
  if (requirement.requiredPermission) {
    const hasPermission = userPermissions.includes(requirement.requiredPermission);
    if (!hasPermission) {
      return {
        authorized: false,
        requirement,
        reason: `Insufficient clearance: missing required permission [${requirement.requiredPermission}] for route '${pathname}'`,
      };
    }
  }

  // Role restriction enforcement if allowedRoles is specified
  if (requirement.allowedRoles && requirement.allowedRoles.length > 0) {
    const hasAllowedRole = requirement.allowedRoles.some((role) => userRoles.includes(role));
    if (!hasAllowedRole) {
      return {
        authorized: false,
        requirement,
        reason: `Insufficient role clearance: route '${pathname}' is restricted to roles [${requirement.allowedRoles.join(", ")}]`,
      };
    }
  }

  return { authorized: true, requirement };
}
