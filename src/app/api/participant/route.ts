import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;

    // Handle empty state if no participant record is linked
    if (!participant) {
      return NextResponse.json({
        success: true,
        participant: null,
        message: "No athlete record linked to this authenticated account.",
      });
    }

    const teamMembership = participant.teamMemberships[0];
    const team = teamMembership?.team || null;

    // 1. Calculate Personal KPIs & Statuses
    const registrationStatus = participant.status;

    // Document status
    const totalDocs = participant.documents.length;
    const verifiedDocs = participant.documents.filter(
      (d: any) => d.status === "VERIFIED" || d.status === "READY"
    ).length;
    const documentsStatus =
      totalDocs > 0 && verifiedDocs === totalDocs
        ? "READY"
        : totalDocs > 0
        ? `${verifiedDocs}/${totalDocs} VERIFIED`
        : "NOT CAPTURED";

    // Payments summary (Participant specific + Team ledger fallback)
    const ledgers = participant.paymentLedgers;
    const totalBalance = ledgers.reduce((sum: number, l: any) => sum + (l.balance || 0), 0);
    const paymentsStatus =
      ledgers.length === 0
        ? "NOT AVAILABLE"
        : totalBalance <= 0
        ? "SETTLED"
        : `BAL: ₹${totalBalance.toLocaleString()}`;

    // Accommodation
    const activeBedAlloc = participant.bedAllocations[0] || null;
    const accommodationStatus = activeBedAlloc
      ? `${activeBedAlloc.bed.room.hostel.name} &bull; Room ${activeBedAlloc.bed.room.roomNumber}`
      : "NOT ALLOCATED";

    // Transport
    const activeTransport = participant.transportBookings[0] || null;
    const transportStatus = activeTransport
      ? `${activeTransport.trip.tripCode} &bull; ${activeTransport.boardingStatus}`
      : "NOT ASSIGNED";

    // Matches involving this participant
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { playerA: { contains: participant.name, mode: "insensitive" } },
          { playerB: { contains: participant.name, mode: "insensitive" } },
          { playerA: { contains: participant.playerId, mode: "insensitive" } },
          { playerB: { contains: participant.playerId, mode: "insensitive" } },
        ],
      },
      include: { day: true },
      orderBy: { createdAt: "desc" },
    });

    const liveMatch = matches.find((m) => m.status === "LIVE") || null;
    const upcomingMatches = matches.filter(
      (m) => m.status === "UPCOMING" || m.status === "SCHEDULED" || m.status === "READY"
    );
    const completedMatches = matches.filter((m) => m.status === "COMPLETED");

    // Next upcoming match
    const nextMatch = upcomingMatches[0] || null;

    // 2. Personal Readiness Center Checks
    const readinessChecks = [
      {
        id: "check-registration",
        title: "Registration Verification",
        status: participant.status === "APPROVED" ? "READY" : "PENDING",
        description:
          participant.status === "APPROVED"
            ? "Official tournament accreditation granted by registration desk."
            : "Registration is pending desk verification.",
        action: "VIEW REGISTRATION",
        actionTab: "registration",
      },
      {
        id: "check-documents",
        title: "Verification Documents",
        status: totalDocs > 0 && verifiedDocs === totalDocs ? "READY" : "ACTION REQUIRED",
        description:
          totalDocs > 0 && verifiedDocs === totalDocs
            ? "All student ID, DOB, and medical fitness documents verified."
            : "Original documents must be presented at Registration Desk 02.",
        action: "VIEW DOCUMENTS",
        actionTab: "documents",
      },
      {
        id: "check-payment",
        title: "Applicable Fees",
        status: ledgers.length > 0 && totalBalance <= 0 ? "READY" : totalBalance > 0 ? "ACTION REQUIRED" : "PENDING",
        description:
          totalBalance <= 0
            ? "Registration and accommodation deposits settled."
            : `Outstanding balance of ₹${totalBalance.toLocaleString()} pending desk settlement.`,
        action: "VIEW PAYMENTS",
        actionTab: "payments",
      },
      {
        id: "check-accommodation",
        title: "Hostel & Room Assignment",
        status: activeBedAlloc ? "READY" : "PENDING",
        description: activeBedAlloc
          ? `Allocated to ${activeBedAlloc.bed.room.hostel.name}, Room ${activeBedAlloc.bed.room.roomNumber}, Bed ${activeBedAlloc.bed.bedNumber}.`
          : "Hostel bed allocation pending warden desk assignment.",
        action: "VIEW STAY",
        actionTab: "accommodation",
      },
      {
        id: "check-transport",
        title: "Shuttle Transit Assignment",
        status: activeTransport ? "READY" : "PENDING",
        description: activeTransport
          ? `Assigned to ${activeTransport.trip.routeName || activeTransport.trip.tripCode} (${activeTransport.boardingStatus}).`
          : "Transit shuttle schedule dispatch pending.",
        action: "VIEW SHUTTLES",
        actionTab: "transport",
      },
      {
        id: "check-matches",
        title: "Court Match Schedule",
        status: matches.length > 0 ? "READY" : "PENDING",
        description:
          matches.length > 0
            ? `${matches.length} tournament match ties scheduled for your category.`
            : "Tournament draw fixtures pending publication by referee.",
        action: "VIEW FIXTURES",
        actionTab: "matches",
      },
      {
        id: "check-pass",
        title: "Tournament Pass & Accreditation",
        status: participant.qrCode ? "READY" : "PENDING",
        description: participant.qrCode
          ? "Digital accreditation pass active with cryptographic verification token."
          : "Digital pass generation pending accreditation approval.",
        action: "SHOW PASS",
        actionTab: "pass",
      },
    ];

    // Recent announcements targeted to PARTICIPANTS or ALL
    const recentAnnouncements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        targetAudience: { in: ["ALL", "PARTICIPANTS"] },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        playerId: participant.playerId,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        institution: participant.institution,
        state: participant.state,
        category: participant.category,
        gender: participant.gender,
        status: participant.status,
        qrCode: participant.qrCode,
        team: team
          ? {
              id: team.id,
              teamCode: team.teamCode,
              name: team.name,
              institution: team.institution,
              managerName: team.managerName,
              captainName: team.captainName,
              status: team.status,
              role: teamMembership.role,
            }
          : null,
      },
      kpis: {
        registrationStatus,
        documentsStatus,
        paymentsStatus,
        accommodationStatus,
        transportStatus,
        upcomingMatchesCount: upcomingMatches.length,
      },
      nextMatch: nextMatch
        ? {
            id: nextMatch.id,
            matchNumber: nextMatch.matchNumber,
            category: nextMatch.category,
            court: nextMatch.court,
            time: nextMatch.time,
            date: nextMatch.day ? `${nextMatch.day.dayNumber} (${nextMatch.day.date})` : "OCT 18",
            playerA: nextMatch.playerA,
            institutionA: nextMatch.institutionA,
            playerB: nextMatch.playerB,
            institutionB: nextMatch.institutionB,
            status: nextMatch.status,
          }
        : null,
      liveMatch: liveMatch
        ? {
            id: liveMatch.id,
            matchNumber: liveMatch.matchNumber,
            category: liveMatch.category,
            court: liveMatch.court,
            time: liveMatch.time,
            playerA: liveMatch.playerA,
            institutionA: liveMatch.institutionA,
            playerB: liveMatch.playerB,
            institutionB: liveMatch.institutionB,
            scoreA: liveMatch.scoreA,
            scoreB: liveMatch.scoreB,
            status: liveMatch.status,
          }
        : null,
      readiness: readinessChecks,
      recentAnnouncements,
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
