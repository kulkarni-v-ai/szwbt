/**
 * Granular Permissions Registry (RESOURCE + ACTION)
 * Central source of truth for all system permissions.
 */

export const PERMISSIONS = {
  // Registration
  REGISTRATION_READ: "registration:read",
  REGISTRATION_CREATE: "registration:create",
  REGISTRATION_UPDATE: "registration:update",
  REGISTRATION_COMPLETE: "registration:complete",

  // Participants
  PARTICIPANT_READ: "participant:read",
  PARTICIPANT_CREATE: "participant:create",
  PARTICIPANT_UPDATE: "participant:update",

  // Teams
  TEAM_READ: "team:read",
  TEAM_CREATE: "team:create",
  TEAM_UPDATE: "team:update",

  // Documents
  DOCUMENT_READ: "document:read",
  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_PROCESS: "document:process",
  DOCUMENT_VERIFY: "document:verify",
  DOCUMENT_DELETE: "document:delete",

  // Accommodation
  ACCOMMODATION_READ: "accommodation:read",
  ACCOMMODATION_ALLOCATE: "accommodation:allocate",
  ACCOMMODATION_MOVE: "accommodation:move",
  ACCOMMODATION_VACATE: "accommodation:vacate",
  ACCOMMODATION_CONFIGURE: "accommodation:configure",

  // Transport (Zero-Payment University Operations)
  TRANSPORT_READ: "transport:read",
  TRANSPORT_CREATE: "transport:create",
  TRANSPORT_UPDATE: "transport:update",
  TRANSPORT_ASSIGN: "transport:assign",
  TRANSPORT_BOARD: "transport:board",
  TRANSPORT_BOARDING: "transport:boarding",
  TRANSPORT_MANAGE_VEHICLE: "transport:manage_vehicle",
  TRANSPORT_MANAGE_DRIVER: "transport:manage_driver",
  TRANSPORT_MANAGE_ROUTE: "transport:manage_route",
  TRANSPORT_VIEW_HISTORY: "transport:view_history",

  // Payments & Finance
  PAYMENT_READ: "payment:read",
  PAYMENT_CREATE: "payment:create",
  PAYMENT_UPDATE: "payment:update",
  PAYMENT_REFUND: "payment:refund",
  FINANCE_READ: "finance:read",
  FINANCE_REPORT: "finance:report",
  FINANCE_CREATE_PAYMENT: "finance:create_payment",
  FINANCE_UPDATE_PAYMENT: "finance:update_payment",
  FINANCE_REFUND: "finance:refund",
  FINANCE_EXPORT: "finance:export",

  // Matches, Scoring & Results
  MATCH_READ: "match:read",
  MATCH_CREATE: "match:create",
  MATCH_UPDATE: "match:update",
  MATCH_ASSIGN_OFFICIAL: "match:assign_official",
  SCORING_READ: "scoring:read",
  SCORING_UPDATE: "scoring:update",
  SCORING_SUBMIT: "scoring:submit",
  RESULT_READ: "result:read",
  RESULT_SUBMIT: "result:submit",
  RESULT_UPDATE: "result:update",
  LIVE_READ: "live:read",
  LIVE_OPERATE: "live:operate",

  // Announcements
  ANNOUNCEMENT_READ: "announcement:read",
  ANNOUNCEMENT_CREATE: "announcement:create",
  ANNOUNCEMENT_UPDATE: "announcement:update",
  ANNOUNCEMENT_PUBLISH: "announcement:publish",

  // Reporting
  REPORTS_READ: "reports:read",
  REPORTS_EXPORT: "reports:export",

  // User & Role Management
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DISABLE: "users:disable",
  ROLES_READ: "roles:read",
  ROLES_CREATE: "roles:create",
  ROLES_UPDATE: "roles:update",
  ROLES_ASSIGN: "roles:assign",

  // Audit & System
  AUDIT_READ: "audit:read",
  ADMIN_READ: "admin:read",
  SYSTEM_READ: "system:read",
  SYSTEM_CONFIGURE: "system:configure",

  // Institution Master Data
  INSTITUTION_READ: "institution:read",
  INSTITUTION_MANAGE: "institution:manage",

  // Support & Help Desk
  SUPPORT_READ: "support:read",
  SUPPORT_CREATE: "support:create",
  SUPPORT_UPDATE: "support:update",
  SUPPORT_ASSIGN: "support:assign",
  SUPPORT_RESOLVE: "support:resolve",
  SUPPORT_CLOSE: "support:close",
  SUPPORT_ESCALATE: "support:escalate",
  SUPPORT_COMMENT: "support:comment",

  // Tournament Administration
  TOURNAMENT_READ: "tournament:read",
  TOURNAMENT_UPDATE: "tournament:update",
  TOURNAMENT_CONFIGURE: "tournament:configure",
  CATEGORY_MANAGE: "category:manage",
  EVENT_MANAGE: "event:manage",
  COURT_MANAGE: "court:manage",
  SCHEDULE_MANAGE: "schedule:manage",
  SCHEDULE_LOCK: "schedule:lock",
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  resource: string;
  action: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Registration
  { code: PERMISSIONS.REGISTRATION_READ, resource: "registration", action: "read", description: "View desk registrations" },
  { code: PERMISSIONS.REGISTRATION_CREATE, resource: "registration", action: "create", description: "Create new desk registrations" },
  { code: PERMISSIONS.REGISTRATION_UPDATE, resource: "registration", action: "update", description: "Update existing registration details" },
  { code: PERMISSIONS.REGISTRATION_COMPLETE, resource: "registration", action: "complete", description: "Finalize registration and issue team QR pass" },

  // Participant
  { code: PERMISSIONS.PARTICIPANT_READ, resource: "participant", action: "read", description: "View athlete profiles and contact data" },
  { code: PERMISSIONS.PARTICIPANT_CREATE, resource: "participant", action: "create", description: "Register new athlete record" },
  { code: PERMISSIONS.PARTICIPANT_UPDATE, resource: "participant", action: "update", description: "Update athlete details" },

  // Team
  { code: PERMISSIONS.TEAM_READ, resource: "team", action: "read", description: "View team details and rosters" },
  { code: PERMISSIONS.TEAM_CREATE, resource: "team", action: "create", description: "Register new institution team" },
  { code: PERMISSIONS.TEAM_UPDATE, resource: "team", action: "update", description: "Modify team roster and contacts" },

  // Document
  { code: PERMISSIONS.DOCUMENT_READ, resource: "document", action: "read", description: "View and inspect athlete verification documents" },
  { code: PERMISSIONS.DOCUMENT_UPLOAD, resource: "document", action: "upload", description: "Capture or upload verification documents" },
  { code: PERMISSIONS.DOCUMENT_PROCESS, resource: "document", action: "process", description: "Process uploaded documents into PDF" },
  { code: PERMISSIONS.DOCUMENT_VERIFY, resource: "document", action: "verify", description: "Verify and approve captured documents" },
  { code: PERMISSIONS.DOCUMENT_DELETE, resource: "document", action: "delete", description: "Remove invalidated verification documents" },

  // Accommodation
  { code: PERMISSIONS.ACCOMMODATION_READ, resource: "accommodation", action: "read", description: "View hostel occupancy and bed matrices" },
  { code: PERMISSIONS.ACCOMMODATION_ALLOCATE, resource: "accommodation", action: "allocate", description: "Allocate room beds to athletes and managers" },
  { code: PERMISSIONS.ACCOMMODATION_MOVE, resource: "accommodation", action: "move", description: "Transfer athlete between rooms/beds" },
  { code: PERMISSIONS.ACCOMMODATION_VACATE, resource: "accommodation", action: "vacate", description: "Check out and vacate hostel bed" },
  { code: PERMISSIONS.ACCOMMODATION_CONFIGURE, resource: "accommodation", action: "configure", description: "Super Admin configuration of hostels, floors, rooms, and beds" },

  // Transport 
  { code: PERMISSIONS.TRANSPORT_READ, resource: "transport", action: "read", description: "View shuttle routes, vehicles and schedules" },
  { code: PERMISSIONS.TRANSPORT_CREATE, resource: "transport", action: "create", description: "Schedule new shuttle route or trip" },
  { code: PERMISSIONS.TRANSPORT_UPDATE, resource: "transport", action: "update", description: "Modify shuttle timings and vehicles" },
  { code: PERMISSIONS.TRANSPORT_ASSIGN, resource: "transport", action: "assign", description: "Assign participant to transport trip and pickup point" },
  { code: PERMISSIONS.TRANSPORT_BOARD, resource: "transport", action: "board", description: "Verify QR and mark participant as boarded" },
  { code: PERMISSIONS.TRANSPORT_BOARDING, resource: "transport", action: "boarding", description: "Mark passenger boarding on manifest" },
  { code: PERMISSIONS.TRANSPORT_MANAGE_VEHICLE, resource: "transport", action: "manage_vehicle", description: "Register, modify and maintain fleet vehicles" },
  { code: PERMISSIONS.TRANSPORT_MANAGE_DRIVER, resource: "transport", action: "manage_driver", description: "Register, assign and manage drivers" },
  { code: PERMISSIONS.TRANSPORT_MANAGE_ROUTE, resource: "transport", action: "manage_route", description: "Create and update routes and pickup stops" },
  { code: PERMISSIONS.TRANSPORT_VIEW_HISTORY, resource: "transport", action: "view_history", description: "Inspect past trips, logs, and passenger audits" },

  // Payment & Finance
  { code: PERMISSIONS.PAYMENT_READ, resource: "payment", action: "read", description: "View financial payment records" },
  { code: PERMISSIONS.PAYMENT_CREATE, resource: "payment", action: "create", description: "Record cash or UPI transaction" },
  { code: PERMISSIONS.PAYMENT_UPDATE, resource: "payment", action: "update", description: "Adjust transaction metadata" },
  { code: PERMISSIONS.PAYMENT_REFUND, resource: "payment", action: "refund", description: "Process refund transaction" },
  { code: PERMISSIONS.FINANCE_READ, resource: "finance", action: "read", description: "View comprehensive treasury ledgers" },
  { code: PERMISSIONS.FINANCE_REPORT, resource: "finance", action: "report", description: "Generate financial audit balance sheets" },
  { code: PERMISSIONS.FINANCE_CREATE_PAYMENT, resource: "finance", action: "create_payment", description: "Record treasury payment transaction" },
  { code: PERMISSIONS.FINANCE_UPDATE_PAYMENT, resource: "finance", action: "update_payment", description: "Modify treasury payment transaction" },
  { code: PERMISSIONS.FINANCE_REFUND, resource: "finance", action: "refund", description: "Authorize and process financial refund" },
  { code: PERMISSIONS.FINANCE_EXPORT, resource: "finance", action: "export", description: "Export treasury reconciliation data to CSV/reports" },

  // Match & Officiating
  { code: PERMISSIONS.MATCH_READ, resource: "match", action: "read", description: "View court schedule and fixtures" },
  { code: PERMISSIONS.MATCH_CREATE, resource: "match", action: "create", description: "Schedule new tournament match" },
  { code: PERMISSIONS.MATCH_UPDATE, resource: "match", action: "update", description: "Update court assignments and match timings" },
  { code: PERMISSIONS.MATCH_ASSIGN_OFFICIAL, resource: "match", action: "assign_official", description: "Assign umpire or referee to match" },
  { code: PERMISSIONS.SCORING_READ, resource: "scoring", action: "read", description: "View live court scoreboard" },
  { code: PERMISSIONS.SCORING_UPDATE, resource: "scoring", action: "update", description: "Increment or undo court live points" },
  { code: PERMISSIONS.SCORING_SUBMIT, resource: "scoring", action: "submit", description: "Submit completed set or match score" },
  { code: PERMISSIONS.RESULT_READ, resource: "result", action: "read", description: "View official match outcome" },
  { code: PERMISSIONS.RESULT_SUBMIT, resource: "result", action: "submit", description: "Post verified match result" },
  { code: PERMISSIONS.RESULT_UPDATE, resource: "result", action: "update", description: "Amend disputed match result" },
  { code: PERMISSIONS.LIVE_READ, resource: "live", action: "read", description: "View live court matrix and match operations" },
  { code: PERMISSIONS.LIVE_OPERATE, resource: "live", action: "operate", description: "Operate live court console, assign courts and intervene" },

  // Announcements
  { code: PERMISSIONS.ANNOUNCEMENT_READ, resource: "announcement", action: "read", description: "View official broadcasts" },
  { code: PERMISSIONS.ANNOUNCEMENT_CREATE, resource: "announcement", action: "create", description: "Draft tournament announcement" },
  { code: PERMISSIONS.ANNOUNCEMENT_UPDATE, resource: "announcement", action: "update", description: "Edit announcement draft" },
  { code: PERMISSIONS.ANNOUNCEMENT_PUBLISH, resource: "announcement", action: "publish", description: "Broadcast live announcement" },

  // Reports
  { code: PERMISSIONS.REPORTS_READ, resource: "reports", action: "read", description: "View tournament analytics and logs" },
  { code: PERMISSIONS.REPORTS_EXPORT, resource: "reports", action: "export", description: "Export CSV / PDF summaries" },

  // User & Role Management
  { code: PERMISSIONS.USERS_READ, resource: "users", action: "read", description: "View system user accounts" },
  { code: PERMISSIONS.USERS_CREATE, resource: "users", action: "create", description: "Provision new staff account" },
  { code: PERMISSIONS.USERS_UPDATE, resource: "users", action: "update", description: "Modify staff profile" },
  { code: PERMISSIONS.USERS_DISABLE, resource: "users", action: "disable", description: "Deactivate or ban user account" },
  { code: PERMISSIONS.ROLES_READ, resource: "roles", action: "read", description: "View roles and assigned permissions" },
  { code: PERMISSIONS.ROLES_CREATE, resource: "roles", action: "create", description: "Create customized role" },
  { code: PERMISSIONS.ROLES_UPDATE, resource: "roles", action: "update", description: "Modify role permissions" },
  { code: PERMISSIONS.ROLES_ASSIGN, resource: "roles", action: "assign", description: "Assign or revoke roles from users" },

  // Audit & System
  { code: PERMISSIONS.AUDIT_READ, resource: "audit", action: "read", description: "Inspect tamper-evident audit logs" },
  { code: PERMISSIONS.ADMIN_READ, resource: "admin", action: "read", description: "Access central administrative operations portal" },
  { code: PERMISSIONS.SYSTEM_READ, resource: "system", action: "read", description: "View infrastructure telemetry" },
  { code: PERMISSIONS.SYSTEM_CONFIGURE, resource: "system", action: "configure", description: "Modify system configuration, accommodation setup, and master data" },

  // Institution Master Data
  { code: PERMISSIONS.INSTITUTION_READ, resource: "institution", action: "read", description: "View institution/university master list" },
  { code: PERMISSIONS.INSTITUTION_MANAGE, resource: "institution", action: "manage", description: "Upload CSV, create, update, activate/deactivate institutions" },
  { code: PERMISSIONS.SUPPORT_READ, resource: "support", action: "read", description: "View support cases and queues" },
  { code: PERMISSIONS.SUPPORT_CREATE, resource: "support", action: "create", description: "Open new support case" },
  { code: PERMISSIONS.SUPPORT_UPDATE, resource: "support", action: "update", description: "Update support case metadata" },
  { code: PERMISSIONS.SUPPORT_ASSIGN, resource: "support", action: "assign", description: "Assign case to support staff" },
  { code: PERMISSIONS.SUPPORT_RESOLVE, resource: "support", action: "resolve", description: "Resolve and conclude support case" },
  { code: PERMISSIONS.SUPPORT_CLOSE, resource: "support", action: "close", description: "Archive and close support case" },
  { code: PERMISSIONS.SUPPORT_ESCALATE, resource: "support", action: "escalate", description: "Escalate case to specialized department" },
  { code: PERMISSIONS.SUPPORT_COMMENT, resource: "support", action: "comment", description: "Post public reply or internal staff note" },

  // Tournament Administration
  { code: PERMISSIONS.TOURNAMENT_READ, resource: "tournament", action: "read", description: "Access tournament administration command center" },
  { code: PERMISSIONS.TOURNAMENT_UPDATE, resource: "tournament", action: "update", description: "Update tournament lifecycle and settings" },
  { code: PERMISSIONS.TOURNAMENT_CONFIGURE, resource: "tournament", action: "configure", description: "Modify competition configuration" },
  { code: PERMISSIONS.CATEGORY_MANAGE, resource: "category", action: "manage", description: "Manage tournament categories" },
  { code: PERMISSIONS.EVENT_MANAGE, resource: "event", action: "manage", description: "Manage tournament competitive events" },
  { code: PERMISSIONS.COURT_MANAGE, resource: "court", action: "manage", description: "Configure match arena courts" },
  { code: PERMISSIONS.SCHEDULE_MANAGE, resource: "schedule", action: "manage", description: "Manage fixtures and schedule assignments" },
  { code: PERMISSIONS.SCHEDULE_LOCK, resource: "schedule", action: "lock", description: "Lock or unlock tournament schedule" },
];
