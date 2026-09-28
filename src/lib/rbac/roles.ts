/**
 * Centralized Role Registry & Baseline Permission Definitions
 * Source of truth for roles and their architectural permissions.
 */

import { PERMISSIONS, PermissionCode } from "./permissions";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TOURNAMENT_ADMIN: "TOURNAMENT_ADMIN",
  REGISTRATION_STAFF: "REGISTRATION_STAFF",
  ACCOMMODATION_STAFF: "ACCOMMODATION_STAFF",
  TRANSPORT_STAFF: "TRANSPORT_STAFF",
  FINANCE_STAFF: "FINANCE_STAFF",
  MATCH_OFFICIAL: "MATCH_OFFICIAL",
  ORGANIZER: "ORGANIZER",
  OPERATIONS_STAFF: "OPERATIONS_STAFF",
  COMMUNICATIONS_STAFF: "COMMUNICATIONS_STAFF",
  REPORTS_STAFF: "REPORTS_STAFF",
  VOLUNTEER: "VOLUNTEER",
  TEAM_MANAGER: "TEAM_MANAGER",
  PARTICIPANT: "PARTICIPANT",
  SUPPORT_STAFF: "SUPPORT_STAFF",
  DOCUMENT_SCANNER: "DOCUMENT_SCANNER",
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

export interface RoleDefinition {
  name: RoleName;
  displayName: string;
  description: string;
  defaultPermissions: PermissionCode[];
}

export const ROLE_DEFINITIONS: Record<RoleName, RoleDefinition> = {
  SUPER_ADMIN: {
    name: ROLES.SUPER_ADMIN,
    displayName: "Super Administrator",
    description: "Unrestricted administrative clearance across all tournament operations and system configurations.",
    defaultPermissions: Object.values(PERMISSIONS),
  },

  TOURNAMENT_ADMIN: {
    name: ROLES.TOURNAMENT_ADMIN,
    displayName: "Tournament Administrator",
    description: "Fixtures, court schedules, match management, teams, operations, and announcements.",
    defaultPermissions: [
      PERMISSIONS.ADMIN_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.TEAM_UPDATE,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.REGISTRATION_UPDATE,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.MATCH_CREATE,
      PERMISSIONS.MATCH_UPDATE,
      PERMISSIONS.MATCH_ASSIGN_OFFICIAL,
      PERMISSIONS.SCORING_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.RESULT_SUBMIT,
      PERMISSIONS.RESULT_UPDATE,
      PERMISSIONS.LIVE_READ,
      PERMISSIONS.LIVE_OPERATE,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.ANNOUNCEMENT_CREATE,
      PERMISSIONS.ANNOUNCEMENT_UPDATE,
      PERMISSIONS.ANNOUNCEMENT_PUBLISH,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.TOURNAMENT_READ,
      PERMISSIONS.TOURNAMENT_UPDATE,
      PERMISSIONS.TOURNAMENT_CONFIGURE,
      PERMISSIONS.CATEGORY_MANAGE,
      PERMISSIONS.EVENT_MANAGE,
      PERMISSIONS.COURT_MANAGE,
      PERMISSIONS.SCHEDULE_MANAGE,
      PERMISSIONS.SCHEDULE_LOCK,
    ],
  },

  REGISTRATION_STAFF: {
    name: ROLES.REGISTRATION_STAFF,
    displayName: "Registration Desk Staff",
    description: "On-site desk operations: register athletes one-by-one, capture photos, generate QR passes, record registration fees, initial accommodation allocation.",
    defaultPermissions: [
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.REGISTRATION_CREATE,
      PERMISSIONS.REGISTRATION_UPDATE,
      PERMISSIONS.REGISTRATION_COMPLETE,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.PARTICIPANT_CREATE,
      PERMISSIONS.PARTICIPANT_UPDATE,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.TEAM_CREATE,
      PERMISSIONS.TEAM_UPDATE,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.DOCUMENT_PROCESS,
      PERMISSIONS.DOCUMENT_VERIFY,
      PERMISSIONS.PAYMENT_READ,
      PERMISSIONS.PAYMENT_CREATE,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.ACCOMMODATION_ALLOCATE,
      PERMISSIONS.INSTITUTION_READ,
    ],
  },

  ACCOMMODATION_STAFF: {
    name: ROLES.ACCOMMODATION_STAFF,
    displayName: "Accommodation Staff",
    description: "Hostel logistics: Shalmala & Vindhya 5-bed room and bed allocations, check-ins, vacating, and room transfers.",
    defaultPermissions: [
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.ACCOMMODATION_ALLOCATE,
      PERMISSIONS.ACCOMMODATION_MOVE,
      PERMISSIONS.ACCOMMODATION_VACATE,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.PAYMENT_READ,
      PERMISSIONS.PAYMENT_CREATE,
    ],
  },

  TRANSPORT_STAFF: {
    name: ROLES.TRANSPORT_STAFF,
    displayName: "Transport Staff",
    description: "Fleet logistics, route stops, driver assignments, passenger manifests, and QR boarding verification. Free university-provided transport.",
    defaultPermissions: [
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.TRANSPORT_CREATE,
      PERMISSIONS.TRANSPORT_UPDATE,
      PERMISSIONS.TRANSPORT_ASSIGN,
      PERMISSIONS.TRANSPORT_BOARD,
      PERMISSIONS.TRANSPORT_BOARDING,
      PERMISSIONS.TRANSPORT_MANAGE_VEHICLE,
      PERMISSIONS.TRANSPORT_MANAGE_DRIVER,
      PERMISSIONS.TRANSPORT_MANAGE_ROUTE,
      PERMISSIONS.TRANSPORT_VIEW_HISTORY,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
    ],
  },

  FINANCE_STAFF: {
    name: ROLES.FINANCE_STAFF,
    displayName: "Finance & Treasury Staff",
    description: "Treasury audit, ledger reconciliations, UTR transaction search, and financial reporting.",
    defaultPermissions: [
      PERMISSIONS.PAYMENT_READ,
      PERMISSIONS.PAYMENT_CREATE,
      PERMISSIONS.PAYMENT_UPDATE,
      PERMISSIONS.PAYMENT_REFUND,
      PERMISSIONS.FINANCE_READ,
      PERMISSIONS.FINANCE_REPORT,
      PERMISSIONS.FINANCE_CREATE_PAYMENT,
      PERMISSIONS.FINANCE_UPDATE_PAYMENT,
      PERMISSIONS.FINANCE_REFUND,
      PERMISSIONS.FINANCE_EXPORT,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
    ],
  },

  MATCH_OFFICIAL: {
    name: ROLES.MATCH_OFFICIAL,
    displayName: "Match Official / Umpire",
    description: "Court officiating, point-by-point live score increments, and match result submissions for assigned matches.",
    defaultPermissions: [
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.SCORING_READ,
      PERMISSIONS.SCORING_UPDATE,
      PERMISSIONS.SCORING_SUBMIT,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.RESULT_SUBMIT,
    ],
  },

  ORGANIZER: {
    name: ROLES.ORGANIZER,
    displayName: "Tournament Organizer",
    description: "Executive HUD, VIP hospitality, broadcast feeds, arena overview, and announcements.",
    defaultPermissions: [
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.ANNOUNCEMENT_CREATE,
      PERMISSIONS.ANNOUNCEMENT_UPDATE,
      PERMISSIONS.ANNOUNCEMENT_PUBLISH,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.PARTICIPANT_READ,
    ],
  },

  OPERATIONS_STAFF: {
    name: ROLES.OPERATIONS_STAFF,
    displayName: "On-Ground Operations",
    description: "Field venue check-ins, match operations command, court telemetry, and rapid issue escalations.",
    defaultPermissions: [
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.LIVE_READ,
      PERMISSIONS.LIVE_OPERATE,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.MATCH_UPDATE,
      PERMISSIONS.COURT_MANAGE,
      PERMISSIONS.SCHEDULE_MANAGE,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.DOCUMENT_VERIFY,
    ],
  },

  COMMUNICATIONS_STAFF: {
    name: ROLES.COMMUNICATIONS_STAFF,
    displayName: "Communications Staff",
    description: "Tournament public announcements, broadcast alerts, and media press notices.",
    defaultPermissions: [
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.ANNOUNCEMENT_CREATE,
      PERMISSIONS.ANNOUNCEMENT_UPDATE,
      PERMISSIONS.ANNOUNCEMENT_PUBLISH,
      PERMISSIONS.REPORTS_READ,
    ],
  },

  REPORTS_STAFF: {
    name: ROLES.REPORTS_STAFF,
    displayName: "Reporting Staff",
    description: "Analytics compilation, match statistical sheets, and exportable reports.",
    defaultPermissions: [
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.FINANCE_REPORT,
    ],
  },

  VOLUNTEER: {
    name: ROLES.VOLUNTEER,
    displayName: "Field Volunteer",
    description: "Assigned on-ground tasks, shuttle passenger assistance, and public announcement access.",
    defaultPermissions: [
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.MATCH_READ,
    ],
  },

  TEAM_MANAGER: {
    name: ROLES.TEAM_MANAGER,
    displayName: "Team Manager",
    description: "Institution roster management, team match fixtures, and accommodation passes for their own team.",
    defaultPermissions: [
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.TEAM_UPDATE,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.PAYMENT_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
    ],
  },

  PARTICIPANT: {
    name: ROLES.PARTICIPANT,
    displayName: "Participant / Athlete",
    description: "Personal athlete dashboard, digital pass, court schedule, and allocated hostel bed info.",
    defaultPermissions: [
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
    ],
  },

  SUPPORT_STAFF: {
    name: ROLES.SUPPORT_STAFF,
    displayName: "Support & Help Desk",
    description: "Participant query resolutions, directions, and general assistance.",
    defaultPermissions: [
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_CREATE,
      PERMISSIONS.SUPPORT_UPDATE,
      PERMISSIONS.SUPPORT_ASSIGN,
      PERMISSIONS.SUPPORT_RESOLVE,
      PERMISSIONS.SUPPORT_CLOSE,
      PERMISSIONS.SUPPORT_ESCALATE,
      PERMISSIONS.SUPPORT_COMMENT,
    ],
  },

  DOCUMENT_SCANNER: {
    name: ROLES.DOCUMENT_SCANNER,
    displayName: "Document Scanner",
    description: "Mobile phone-first document scanning: scan participant QR, capture and verify identity documents using phone camera.",
    defaultPermissions: [
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.DOCUMENT_PROCESS,
      PERMISSIONS.DOCUMENT_VERIFY,
      PERMISSIONS.INSTITUTION_READ,
    ],
  },
};
