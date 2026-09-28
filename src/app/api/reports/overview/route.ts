import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyReportsClearance } from "@/lib/reports/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const reportsAuth = verifyReportsClearance(context);
    if (reportsAuth.errorResponse) {
      return reportsAuth.errorResponse;
    }

    // 1. Fetch Real Domain Aggregations in Parallel
    const [
      registeredParticipants,
      registeredTeams,
      completedTeams,
      pendingTeams,
      totalBeds,
      occupiedBeds,
      availableBeds,
      reservedBeds,
      maintenanceBeds,
      transportTrips,
      transportPassengers,
      transportBoarded,
      transportNoShows,
      matchesTotal,
      matchesCompleted,
      matchesLive,
      matchesUpcoming,
      pendingResults,
      openSupportTickets,
      resolvedSupportTickets,
      announcementsCount,
      volunteerTasksCount,
      volunteerIssuesCount,
      savedReportsCount,
    ] = await Promise.all([
      prisma.participant.count(),
      prisma.team.count(),
      prisma.team.count({ where: { status: "COMPLETED" } }),
      prisma.team.count({ where: { status: "INCOMPLETE" } }),
      prisma.bed.count(),
      prisma.bed.count({ where: { status: "OCCUPIED" } }),
      prisma.bed.count({ where: { status: "AVAILABLE" } }),
      prisma.bed.count({ where: { status: "RESERVED" } }),
      prisma.bed.count({ where: { status: "MAINTENANCE" } }),
      prisma.transportTrip.count(),
      prisma.transportPassenger.count(),
      prisma.transportPassenger.count({ where: { boardingStatus: "BOARDED" } }),
      prisma.transportPassenger.count({ where: { boardingStatus: "NO_SHOW" } }),
      prisma.match.count(),
      prisma.match.count({ where: { status: "COMPLETED" } }),
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.match.count({ where: { status: "UPCOMING" } }),
      prisma.match.count({ where: { status: "COMPLETED", isPublished: false } }),
      prisma.supportTicket.count({
        where: {
          status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "ESCALATED"] },
        },
      }),
      prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
      prisma.announcement.count({ where: { isPublished: true } }),
      prisma.volunteerTask.count({ where: { status: "COMPLETED" } }),
      prisma.volunteerIssue.count({ where: { status: "OPEN" } }),
      prisma.savedReport.count({ where: { ownerEmail: context.user.email } }),
    ]);

    // 2. Conditional Finance Aggregations (Strict RBAC Protected)
    let financeSummary: any = null;
    if (reportsAuth.hasFinanceAccess) {
      const [totalCollected, cashTotal, upiTotal, categoryBreakdown] = await Promise.all([
        prisma.paymentTransaction.aggregate({
          _sum: { amount: true },
          where: { status: "SUCCESS" },
        }),
        prisma.paymentTransaction.aggregate({
          _sum: { amount: true },
          where: { status: "SUCCESS", method: "CASH" },
        }),
        prisma.paymentTransaction.aggregate({
          _sum: { amount: true },
          where: { status: "SUCCESS", method: "UPI" },
        }),
        prisma.paymentTransaction.groupBy({
          by: ["category"],
          _sum: { amount: true },
          where: { status: "SUCCESS" },
        }),
      ]);

      financeSummary = {
        totalCollected: totalCollected._sum.amount || 0,
        cashCollected: cashTotal._sum.amount || 0,
        upiCollected: upiTotal._sum.amount || 0,
        categories: categoryBreakdown.map((c) => ({
          category: c.category,
          amount: c._sum.amount || 0,
        })),
      };
    }

    // 3. Conditional Audit Aggregations (Strict RBAC Protected)
    let auditSummary: any = null;
    if (reportsAuth.hasAuditAccess) {
      const auditTotal = await prisma.auditLog.count();
      auditSummary = {
        totalAuditEvents: auditTotal,
      };
    }

    // Accommodation occupancy percentage calculation
    const occupancyPercentage =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Registration completion rate
    const registrationCompletionRate =
      registeredTeams > 0 ? Math.round((completedTeams / registeredTeams) * 100) : 0;

    // Log tamper-evident audit trail for report view
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "REPORT_VIEWED",
      resourceType: "report",
      resourceId: "OVERVIEW",
      metadata: {
        accessibleCategoriesCount: reportsAuth.accessibleCategories.length,
        hasFinanceAccess: reportsAuth.hasFinanceAccess,
        hasAuditAccess: reportsAuth.hasAuditAccess,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        name: context.user.name,
        email: context.user.email,
        roles: context.roles,
        canExport: reportsAuth.canExport,
        hasFinanceAccess: reportsAuth.hasFinanceAccess,
        hasAuditAccess: reportsAuth.hasAuditAccess,
        accessibleCategories: reportsAuth.accessibleCategories,
      },
      kpis: {
        registeredParticipants,
        registeredTeams,
        completedTeams,
        pendingTeams,
        registrationCompletionRate,
        accommodation: {
          totalBeds,
          occupiedBeds,
          availableBeds,
          reservedBeds,
          maintenanceBeds,
          occupancyPercentage,
        },
        transport: {
          tripsScheduled: transportTrips,
          passengersAssigned: transportPassengers,
          boardedCount: transportBoarded,
          noShowCount: transportNoShows,
          // ZERO TRANSPORT PAYMENT: Explicit confirmation in contract
          hasPayment: false,
          serviceType: "COMPLIMENTARY_UNIVERSITY_SERVICE",
        },
        matches: {
          total: matchesTotal,
          completed: matchesCompleted,
          live: matchesLive,
          upcoming: matchesUpcoming,
          pendingResults,
        },
        support: {
          openTickets: openSupportTickets,
          resolvedTickets: resolvedSupportTickets,
        },
        operations: {
          volunteerTasksCompleted: volunteerTasksCount,
          volunteerIssuesOpen: volunteerIssuesCount,
        },
        communications: {
          announcementsPublished: announcementsCount,
        },
        savedReportsCount,
        finance: financeSummary,
        audit: auditSummary,
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/reports/overview:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
