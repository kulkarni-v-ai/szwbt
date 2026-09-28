import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { authorizedTeams, selectedTeamId } = teamAuth;

    // If user has no authorized teams assigned
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        authorizedTeams: [],
        team: null,
        message: "No team assigned to this manager account.",
      });
    }

    // Load full team details with all relationships
    const team = await prisma.team.findUnique({
      where: { id: selectedTeamId },
      include: {
        members: {
          include: {
            participant: {
              include: {
                documents: true,
                bedAllocations: {
                  include: {
                    bed: {
                      include: {
                        room: {
                          include: {
                            hostel: true,
                          },
                        },
                      },
                    },
                  },
                },
                transportBookings: {
                  include: {
                    trip: {
                      include: {
                        route: true,
                        vehicle: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        bedAllocations: {
          include: {
            bed: {
              include: {
                room: {
                  include: {
                    hostel: true,
                  },
                },
              },
            },
          },
        },
        transportBookings: {
          include: {
            trip: {
              include: {
                route: true,
                vehicle: true,
              },
            },
          },
        },
        paymentLedgers: true,
      },
    });

    if (!team) {
      return NextResponse.json({
        success: false,
        error: "404 Not Found: Selected team could not be found.",
      }, { status: 404 });
    }

    // 1. Operational KPI calculations
    const memberCount = team.members.length;
    
    // Documents status
    let totalDocs = 0;
    let verifiedDocs = 0;
    team.members.forEach((m) => {
      m.participant.documents.forEach((d) => {
        totalDocs++;
        if (d.status === "VERIFIED" || d.status === "READY") {
          verifiedDocs++;
        }
      });
    });
    const documentsStatus =
      totalDocs > 0 && verifiedDocs === totalDocs
        ? "READY"
        : totalDocs > 0
        ? `${verifiedDocs}/${totalDocs} VERIFIED`
        : "NOT CAPTURED";

    // Payments summary from FeeLedgers
    const regLedger = team.paymentLedgers.find((l) => l.category === "REGISTRATION");
    const accLedger = team.paymentLedgers.find((l) => l.category === "ACCOMMODATION");
    const mtcLedger = team.paymentLedgers.find((l) => l.category === "MATCH");

    const totalBalance = team.paymentLedgers.reduce((sum, l) => sum + (l.balance || 0), 0);
    const paymentsStatus =
      team.paymentLedgers.length === 0
        ? "NOT AVAILABLE"
        : totalBalance <= 0
        ? "SETTLED"
        : `BAL: ₹${totalBalance.toLocaleString()}`;

    // Accommodation count
    const allocatedBeds = team.members.filter((m) =>
      m.participant.bedAllocations.some((a) => a.status === "ACTIVE")
    ).length;
    const accommodationStatus =
      memberCount > 0 ? `${allocatedBeds}/${memberCount} ALLOCATED` : "NOT ALLOCATED";

    // Transport count
    const bookedTransport = team.members.filter((m) =>
      m.participant.transportBookings.length > 0
    ).length;
    const transportStatus =
      memberCount > 0 ? `${bookedTransport}/${memberCount} ASSIGNED` : "NOT ASSIGNED";

    // Matches for this team or institution
    const memberNames = team.members.map((m) => m.participant.name);
    const teamMatches = await prisma.match.findMany({
      where: {
        OR: [
          { institutionA: { contains: team.institution, mode: "insensitive" } },
          { institutionB: { contains: team.institution, mode: "insensitive" } },
          { playerA: { in: memberNames } },
          { playerB: { in: memberNames } },
          { playerA: { contains: team.name, mode: "insensitive" } },
          { playerB: { contains: team.name, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const upcomingMatches = teamMatches.filter(
      (m) => m.status === "UPCOMING" || m.status === "SCHEDULED" || m.status === "READY"
    );
    const liveMatch = teamMatches.find((m) => m.status === "LIVE") || null;
    const recentResults = teamMatches.filter((m) => m.status === "COMPLETED");

    // 2. Authoritative Readiness Center Checks
    const readinessChecks = [
      {
        id: "check-registration",
        title: "Team Registration",
        status: team.status === "COMPLETED" ? "READY" : team.status === "PENDING_VERIFICATION" ? "PENDING" : "ACTION REQUIRED",
        description:
          team.status === "COMPLETED"
            ? "Team accreditation and institution verification completed."
            : "Registration is pending final verification by the secretariat desk.",
        action: "VIEW REGISTRATION",
        actionTab: "registration",
      },
      {
        id: "check-members",
        title: "Participant Records",
        status: memberCount >= 2 ? "READY" : "PENDING",
        description: `${memberCount} accredited contingent members registered on active roster.`,
        action: "MANAGE ROSTER",
        actionTab: "members",
      },
      {
        id: "check-documents",
        title: "Required Documents",
        status: totalDocs > 0 && verifiedDocs === totalDocs ? "READY" : "PENDING",
        description:
          totalDocs > 0 && verifiedDocs === totalDocs
            ? "All participant identity and fitness documents verified by desk."
            : "Documents pending physical capture or desk verification.",
        action: "VIEW DOCUMENTS",
        actionTab: "documents",
      },
      {
        id: "check-payment",
        title: "Registration Payments",
        status:
          team.paymentLedgers.length > 0 && totalBalance <= 0
            ? "READY"
            : totalBalance > 0
            ? "ACTION REQUIRED"
            : "PENDING",
        description:
          totalBalance <= 0
            ? "All tournament entry and lodging ledgers reconciled."
            : `Outstanding balance of ₹${totalBalance.toLocaleString()} requires desk settlement.`,
        action: "VIEW LEDGER",
        actionTab: "payments",
      },
      {
        id: "check-accommodation",
        title: "Accommodation Allocation",
        status: allocatedBeds === memberCount && memberCount > 0 ? "READY" : "PENDING",
        description:
          allocatedBeds === memberCount && memberCount > 0
            ? "All contingent athletes allocated to hostel rooms."
            : `${memberCount - allocatedBeds} contingent members awaiting hostel room assignment.`,
        action: "VIEW ROOMS",
        actionTab: "accommodation",
      },
      {
        id: "check-transport",
        title: "Transport Assignment",
        status: bookedTransport > 0 ? "READY" : "PENDING",
        description:
          bookedTransport > 0
            ? "University shuttle routes and pickup stops assigned."
            : "Awaiting transport schedule dispatch from fleet desk.",
        action: "VIEW SHUTTLES",
        actionTab: "transport",
      },
      {
        id: "check-matches",
        title: "Match Schedule",
        status: teamMatches.length > 0 ? "READY" : "PENDING",
        description:
          teamMatches.length > 0
            ? `${teamMatches.length} official match ties published on schedule.`
            : "Draw fixtures pending publication by Chief Referee.",
        action: "VIEW MATCHES",
        actionTab: "matches",
      },
      {
        id: "check-pass",
        title: "Team Pass & Accreditation",
        status: team.teamQrToken ? "READY" : "PENDING",
        description: team.teamQrToken
          ? "Official secure QR pass active for venue and transport access."
          : "Team token generation pending accreditation desk approval.",
        action: "SHOW PASS",
        actionTab: "pass",
      },
    ];

    // Recent announcements
    const recentAnnouncements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        targetAudience: { in: ["ALL", "TEAMS"] },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    return NextResponse.json({
      success: true,
      authorizedTeams,
      selectedTeam: {
        id: team.id,
        teamCode: team.teamCode,
        name: team.name,
        institution: team.institution,
        state: team.state,
        managerName: team.managerName,
        managerPhone: team.managerPhone,
        captainName: team.captainName,
        captainPhone: team.captainPhone,
        status: team.status,
        teamQrToken: team.teamQrToken,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
      kpis: {
        memberCount,
        registrationStatus: team.status,
        documentsStatus,
        paymentsStatus,
        accommodationStatus,
        transportStatus,
        upcomingMatchesCount: upcomingMatches.length,
      },
      readiness: readinessChecks,
      liveMatch,
      upcomingMatchesCount: upcomingMatches.length,
      recentResultsCount: recentResults.length,
      recentAnnouncements,
    });
  } catch (err: any) {
    console.error("Error in GET /api/team:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
