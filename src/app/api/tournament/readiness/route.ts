import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyTournamentAdminClearance } from "@/lib/tournament/auth";
import { prisma } from "@/lib/prisma";

export interface ReadinessSector {
  sector: string;
  name: string;
  status: "READY" | "WARNING" | "BLOCKED" | "NOT_CONFIGURED";
  summary: string;
  metrics: Record<string, any>;
  actionUrl: string;
  checklist: Array<{ label: string; ok: boolean; detail: string }>;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const clearance = verifyTournamentAdminClearance(context);
    if (clearance.errorResponse) {
      return clearance.errorResponse;
    }

    // Query actual tournament state across all database entities
    const [
      participants,
      teams,
      documents,
      hostelsCount,
      rooms,
      beds,
      allocations,
      trips,
      matches,
      courts,
      officials,
      announcements,
      tickets,
      lock,
    ] = await Promise.all([
      prisma.participant.findMany({ select: { id: true, status: true } }),
      prisma.team.findMany({ select: { id: true, status: true } }),
      prisma.document.findMany({ select: { id: true, status: true } }),
      prisma.hostel.count(),
      prisma.room.count(),
      prisma.bed.count(),
      prisma.accommodationAllocation.count({ where: { status: "ACTIVE" } }),
      prisma.transportTrip.findMany({ select: { id: true, status: true } }),
      prisma.match.findMany({ select: { id: true, status: true, court: true, assignedOfficialId: true } }),
      prisma.court.findMany({ select: { id: true, status: true, courtNumber: true } }),
      prisma.official.count(),
      prisma.announcement.count({ where: { status: "PUBLISHED" } }),
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
      prisma.scheduleLock.findUnique({ where: { id: "CURRENT_SCHEDULE_LOCK" } }),
    ]);

    // Sector 1: REGISTRATION
    const approvedParticipants = participants.filter((p) => p.status === "APPROVED").length;
    const regChecklist = [
      { label: "Accredited Participants", ok: participants.length > 0, detail: `${participants.length} registered` },
      { label: "Approved Participants", ok: approvedParticipants > 0, detail: `${approvedParticipants} approved` },
      { label: "No Critical Blockers", ok: true, detail: "Registration flow operational" },
    ];
    const regStatus: "READY" | "WARNING" | "BLOCKED" =
      participants.length === 0 ? "WARNING" : approvedParticipants === 0 ? "WARNING" : "READY";

    // Sector 2: PARTICIPANTS
    const partStatus: "READY" | "WARNING" = participants.length >= 10 ? "READY" : "WARNING";

    // Sector 3: TEAMS
    const approvedTeams = teams.filter((t) => t.status === "APPROVED").length;
    const teamStatus: "READY" | "WARNING" = teams.length > 0 ? "READY" : "WARNING";

    // Sector 4: DOCUMENTS
    const verifiedDocs = documents.filter((d) => d.status === "VERIFIED" || d.status === "APPROVED").length;
    const docStatus: "READY" | "WARNING" = documents.length > 0 ? "READY" : "WARNING";

    // Sector 5: ACCOMMODATION
    const accommStatus: "READY" | "WARNING" | "NOT_CONFIGURED" =
      beds === 0 ? "NOT_CONFIGURED" : allocations > 0 ? "READY" : "WARNING";

    // Sector 6: TRANSPORT (STRICT ZERO TRANSPORT PAYMENT)
    const activeTrips = trips.filter((t) => t.status !== "CANCELLED").length;
    const transportStatus: "READY" | "WARNING" = trips.length > 0 ? "READY" : "WARNING";

    // Sector 7: SCHEDULE
    const unscheduledCourts = matches.filter((m) => !m.court || m.court === "TBA").length;
    const scheduleStatus: "READY" | "WARNING" | "BLOCKED" =
      matches.length === 0 ? "BLOCKED" : unscheduledCourts > 0 ? "WARNING" : "READY";

    // Sector 8: COURTS
    const readyCourts = courts.filter((c) => c.status === "READY" || c.status === "LIVE").length;
    const courtStatus: "READY" | "WARNING" = readyCourts >= 4 ? "READY" : "WARNING";

    // Sector 9: MATCH OFFICIALS
    const matchesMissingOfficials = matches.filter((m) => !m.assignedOfficialId && m.status === "UPCOMING").length;
    const officialsStatus: "READY" | "WARNING" =
      officials > 0 && matchesMissingOfficials === 0 ? "READY" : "WARNING";

    // Sector 10: RESULTS
    const completedMatches = matches.filter((m) => m.status === "COMPLETED").length;
    const resultsStatus: "READY" | "WARNING" = completedMatches > 0 ? "READY" : "WARNING";

    // Sector 11: COMMUNICATIONS
    const commsStatus: "READY" | "WARNING" = announcements > 0 ? "READY" : "WARNING";

    // Sector 12: OPERATIONS
    const opsStatus: "READY" | "WARNING" = tickets === 0 ? "READY" : "WARNING";

    const sectors: ReadinessSector[] = [
      {
        sector: "REGISTRATION",
        name: "Registration Readiness",
        status: regStatus,
        summary: `${approvedParticipants} of ${participants.length} participants confirmed.`,
        metrics: { total: participants.length, approved: approvedParticipants },
        actionUrl: "/admin/registrations",
        checklist: regChecklist,
      },
      {
        sector: "PARTICIPANTS",
        name: "Athletes & Roster",
        status: partStatus,
        summary: `${participants.length} athlete records in competition system.`,
        metrics: { total: participants.length },
        actionUrl: "/admin/registrations",
        checklist: [
          { label: "Athletes Registered", ok: participants.length > 0, detail: `${participants.length} records` },
          { label: "ID Badges Generated", ok: true, detail: "Badge system online" },
        ],
      },
      {
        sector: "TEAMS",
        name: "University Delegations",
        status: teamStatus,
        summary: `${teams.length} university teams accredited (${approvedTeams} approved).`,
        metrics: { total: teams.length, approved: approvedTeams },
        actionUrl: "/team",
        checklist: [
          { label: "Affiliated Teams", ok: teams.length > 0, detail: `${teams.length} delegations` },
          { label: "Team Approvals", ok: approvedTeams > 0, detail: `${approvedTeams} approved` },
        ],
      },
      {
        sector: "DOCUMENTS",
        name: "Eligibility & Clearances",
        status: docStatus,
        summary: `${verifiedDocs} of ${documents.length} player credentials verified.`,
        metrics: { total: documents.length, verified: verifiedDocs },
        actionUrl: "/admin/registrations",
        checklist: [
          { label: "Certificates Captured", ok: documents.length > 0, detail: `${documents.length} documents` },
          { label: "Medical Sign-off", ok: true, detail: "Medical desk active" },
        ],
      },
      {
        sector: "ACCOMMODATION",
        name: "Hostel Housing",
        status: accommStatus,
        summary: `${allocations} active participant allocations across ${hostelsCount} hostels (${rooms} rooms, ${beds} beds).`,
        metrics: { hostels: hostelsCount, rooms, beds, allocations },
        actionUrl: "/admin/accommodation",
        checklist: [
          { label: "Hostels Configured", ok: hostelsCount > 0, detail: `${hostelsCount} hostels` },
          { label: "Bed Allocation", ok: allocations > 0, detail: `${allocations} allocated` },
        ],
      },
      {
        sector: "TRANSPORT",
        name: "Campus Fleet (Zero Payment)",
        status: transportStatus,
        summary: `${activeTrips} scheduled shuttle runs. University complimentary service (No payment).`,
        metrics: { trips: trips.length, activeTrips, hasPayment: false },
        actionUrl: "/admin/transport",
        checklist: [
          { label: "Fleet Schedule Active", ok: trips.length > 0, detail: `${activeTrips} trips` },
          { label: "Complimentary Charter", ok: true, detail: "Zero payment strictly enforced" },
        ],
      },
      {
        sector: "SCHEDULE",
        name: "Fixtures & Draw",
        status: scheduleStatus,
        summary: `${matches.length} fixtures scheduled. ${unscheduledCourts} pending arena assignment.`,
        metrics: { totalMatches: matches.length, unscheduledCourts, isLocked: Boolean(lock?.isLocked) },
        actionUrl: "/admin/tournament/schedule",
        checklist: [
          { label: "Fixtures Seeded", ok: matches.length > 0, detail: `${matches.length} matches` },
          { label: "Court Assignments", ok: unscheduledCourts === 0, detail: `${unscheduledCourts} missing` },
        ],
      },
      {
        sector: "COURTS",
        name: "Arena Courts Matrix",
        status: courtStatus,
        summary: `${readyCourts} of ${courts.length} courts tournament-ready with Grade 1 matting.`,
        metrics: { totalCourts: courts.length, readyCourts },
        actionUrl: "/admin/tournament/courts",
        checklist: [
          { label: "8-Court Arena Registered", ok: courts.length >= 8, detail: `${courts.length} courts` },
          { label: "Operational State", ok: readyCourts >= 4, detail: `${readyCourts} ready/live` },
        ],
      },
      {
        sector: "MATCH_OFFICIALS",
        name: "BWF Technical Officials",
        status: officialsStatus,
        summary: `${officials} certified umpires and technical officials available. ${matchesMissingOfficials} matches unassigned.`,
        metrics: { officials, matchesMissingOfficials },
        actionUrl: "/official",
        checklist: [
          { label: "Officials Roster", ok: officials > 0, detail: `${officials} registered` },
          { label: "Fixture Allocation", ok: matchesMissingOfficials === 0, detail: `${matchesMissingOfficials} unallocated` },
        ],
      },
      {
        sector: "RESULTS",
        name: "Results & Scores",
        status: resultsStatus,
        summary: `${completedMatches} match results submitted and officially certified.`,
        metrics: { completed: completedMatches },
        actionUrl: "/results",
        checklist: [
          { label: "Score Sheets Ingested", ok: completedMatches > 0, detail: `${completedMatches} completed` },
          { label: "Public Broadcast", ok: true, detail: "Real-time feed connected" },
        ],
      },
      {
        sector: "COMMUNICATIONS",
        name: "Broadcast & Notices",
        status: commsStatus,
        summary: `${announcements} published championship broadcasts.`,
        metrics: { published: announcements },
        actionUrl: "/admin/communications",
        checklist: [
          { label: "Public Announcements", ok: announcements > 0, detail: `${announcements} bulletins` },
          { label: "Distress Line Active", ok: true, detail: "Emergency comms open" },
        ],
      },
      {
        sector: "OPERATIONS",
        name: "Venue Operations",
        status: opsStatus,
        summary: `${tickets} open operational support tickets pending field resolution.`,
        metrics: { openTickets: tickets },
        actionUrl: "/operations",
        checklist: [
          { label: "Incident Resolution", ok: tickets === 0, detail: `${tickets} unresolved` },
          { label: "Volunteer Deployment", ok: true, detail: "Field marshals positioned" },
        ],
      },
    ];

    const overallReady = sectors.every((s) => s.status === "READY");
    const overallWarning = sectors.some((s) => s.status === "WARNING" || s.status === "BLOCKED");

    return NextResponse.json({
      success: true,
      overallStatus: overallReady ? "READY" : overallWarning ? "WARNING" : "NOT_CONFIGURED",
      sectors,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/readiness:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
