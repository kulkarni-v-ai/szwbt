export interface RoleInfo {
  roleId: string;
  roleName: string;
  path: string;
  badge: string;
  description: string;
  icon: string;
}

export const ROLE_MATRIX: RoleInfo[] = [
  { roleId: "super_admin", roleName: "Super Admin", path: "/admin", badge: "COMMAND CENTER", description: "Global System Overview & Operations Control", icon: "ShieldAlert" },
  { roleId: "tournament_admin", roleName: "Tournament Admin", path: "/admin/tournament", badge: "MATCH CONTROL", description: "Fixtures, Draws, Court Schedules & Match Officiating", icon: "Trophy" },
  { roleId: "registration_admin", roleName: "Registration Admin", path: "/admin/registrations", badge: "VERIFICATION", description: "Player Verification, Document Approvals & Registrations", icon: "UserCheck" },
  { roleId: "accommodation_admin", roleName: "Accommodation Admin", path: "/admin/accommodation", badge: "HOSTEL LOGISTICS", description: "Shalmala & Vindhya Hostels, 4-Bed Room Allocation", icon: "Home" },
  { roleId: "transport_admin", roleName: "Transport Admin", path: "/admin/transport", badge: "FLEET CONTROL", description: "Shuttle Routes, Vehicle Tracking & Passenger Manifests", icon: "Bus" },
  { roleId: "finance_admin", roleName: "Finance Admin", path: "/admin/finance", badge: "TREASURY", description: "Payment Logs, Invoices & Fee Status Summaries", icon: "CreditCard" },
  { roleId: "organizer", roleName: "Organizer", path: "/organizer", badge: "EXECUTIVE HUD", description: "High-level Tournament Analytics & Cross-dept Overview", icon: "Briefcase" },
  { roleId: "volunteer", roleName: "Volunteer", path: "/volunteer", badge: "MOBILE FIELD", description: "On-Ground Task List, Participant Lookup & Quick QR Pass Scanner", icon: "User" },
  { roleId: "team_manager", roleName: "Team Manager", path: "/team", badge: "TEAM HUB", description: "Institution Roster, Team Match Timings & Accommodation Passes", icon: "Users" },
  { roleId: "participant", roleName: "Participant", path: "/dashboard", badge: "PLAYER HUD", description: "Player Pass, Upcoming Match Court Alerts & Digital Pass", icon: "Zap" },
  { roleId: "official", roleName: "Match Official", path: "/official", badge: "COURT UMPIRE", description: "Score Counter, Court Status Update & Match Results Posting", icon: "Activity" },
  { roleId: "operations", roleName: "On-Ground Operations", path: "/operations", badge: "FIELD DESK", description: "QR Check-in Station, Venue Alerts & Rapid Issue Resolver", icon: "QrCode" },
  { roleId: "communications", roleName: "Communications", path: "/admin/communications", badge: "BROADCAST", description: "Announcement Broadcasts, SMS/WhatsApp & Mobile Push HUD", icon: "Megaphone" },
  { roleId: "support", roleName: "Support / Help Desk", path: "/support", badge: "HELP DESK", description: "Participant Tickets, Query Resolutions & Incident Escalations", icon: "HelpCircle" },
  { roleId: "live_ops", roleName: "Live Operations", path: "/admin/live", badge: "MISSION CONTROL", description: "Real-time 8-Court Matrix, Live Streams & Transport Tracking", icon: "Radio" },
  { roleId: "reports", roleName: "Reporting & Analytics", path: "/admin/reports", badge: "ANALYTICS", description: "Exportable Pixel Charts & Performance Summaries", icon: "BarChart3" },
  { roleId: "system_health", roleName: "System Health", path: "/admin/system", badge: "INFRASTRUCTURE", description: "API Status, Database Monitors & Server Telemetry", icon: "Server" },
  { roleId: "profile", roleName: "User Profile", path: "/profile", badge: "ID CARD", description: "Personal Settings, Security Preferences & Security Sessions", icon: "Settings" },
];

export const SYSTEM_SERVICES_DATA = [
  { name: "PRIMARY API ENDPOINT", status: "OPERATIONAL", ping: "24ms", region: "SOUTH-1" },
  { name: "PIXEL DATABASE ENGINE", status: "OPERATIONAL", ping: "12ms", region: "SOUTH-1" },
  { name: "CACHE MATRIX", status: "OPERATIONAL", ping: "4ms", region: "SOUTH-1" },
  { name: "BROADCAST GATEWAY", status: "OPERATIONAL", ping: "38ms", region: "SOUTH-1" },
  { name: "STORAGE VAULT", status: "OPERATIONAL", ping: "18ms", region: "SOUTH-1" },
];
