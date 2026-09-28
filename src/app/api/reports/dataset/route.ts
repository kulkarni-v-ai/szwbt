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
    const { searchParams } = new URL(req.url);

    const category = (searchParams.get("category") || "REGISTRATION").toUpperCase();
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const state = searchParams.get("state")?.trim() || "";
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    // Verify clearance for the specific requested category
    const reportsAuth = verifyReportsClearance(context, category);
    if (reportsAuth.errorResponse) {
      return reportsAuth.errorResponse;
    }

    let records: any[] = [];
    let totalCount = 0;
    let summaryMetrics: Record<string, any> = {};

    switch (category) {
      case "REGISTRATION": {
        const where: any = {};
        if (status) where.status = status;
        if (state) where.state = { contains: state, mode: "insensitive" };
        if (search) {
          where.OR = [
            { teamCode: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { institution: { contains: search, mode: "insensitive" } },
          ];
        }

        const [teams, count, statusGroups] = await Promise.all([
          prisma.team.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { members: true } },
            },
          }),
          prisma.team.count({ where }),
          prisma.team.groupBy({ by: ["status"], _count: true }),
        ]);

        records = teams.map((t) => ({
          id: t.id,
          identifier: t.teamCode,
          name: t.name,
          institution: t.institution,
          state: t.state,
          manager: t.managerName || "N/A",
          captain: t.captainName || "N/A",
          memberCount: t._count.members,
          status: t.status,
          createdAt: t.createdAt,
        }));
        totalCount = count;
        summaryMetrics = {
          statusBreakdown: statusGroups.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count }), {}),
        };
        break;
      }

      case "PARTICIPANTS": {
        const where: any = {};
        if (status) where.status = status;
        if (state) where.state = { contains: state, mode: "insensitive" };
        if (search) {
          where.OR = [
            { playerId: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { institution: { contains: search, mode: "insensitive" } },
          ];
        }

        const [participants, count, stateGroups] = await Promise.all([
          prisma.participant.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              documents: {
                select: { type: true, status: true }, // NEVER expose filePath or binaries
              },
              teamMemberships: {
                include: { team: { select: { teamCode: true, name: true } } },
              },
            },
          }),
          prisma.participant.count({ where }),
          prisma.participant.groupBy({ by: ["state"], _count: true }),
        ]);

        records = participants.map((p) => {
          // Document readiness metadata only
          const docReadiness = p.documents.reduce((acc: any, d) => {
            acc[d.type] = d.status;
            return acc;
          }, {});

          return {
            id: p.id,
            identifier: p.playerId,
            name: p.name,
            institution: p.institution,
            state: p.state,
            category: p.category,
            status: p.status,
            team: p.teamMemberships[0]?.team?.name || "Independent",
            teamCode: p.teamMemberships[0]?.team?.teamCode || "N/A",
            documentReadiness: docReadiness,
            createdAt: p.createdAt,
          };
        });
        totalCount = count;
        summaryMetrics = {
          stateBreakdown: stateGroups.reduce((acc, curr) => ({ ...acc, [curr.state]: curr._count }), {}),
        };
        break;
      }

      case "TEAMS": {
        const where: any = {};
        if (status) where.status = status;
        if (state) where.state = { contains: state, mode: "insensitive" };
        if (search) {
          where.OR = [
            { teamCode: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { institution: { contains: search, mode: "insensitive" } },
          ];
        }

        const [teams, count] = await Promise.all([
          prisma.team.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
            include: {
              _count: { select: { members: true, bedAllocations: true, transportBookings: true } },
            },
          }),
          prisma.team.count({ where }),
        ]);

        records = teams.map((t) => ({
          id: t.id,
          identifier: t.teamCode,
          name: t.name,
          institution: t.institution,
          state: t.state,
          manager: t.managerName || "N/A",
          managerPhone: t.managerPhone || "N/A",
          captain: t.captainName || "N/A",
          memberCount: t._count.members,
          bedsAllocated: t._count.bedAllocations,
          transportAssigned: t._count.transportBookings,
          status: t.status,
          createdAt: t.createdAt,
        }));
        totalCount = count;
        break;
      }

      case "ACCOMMODATION": {
        const where: any = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { bedNumber: { contains: search, mode: "insensitive" } },
            { room: { roomNumber: { contains: search, mode: "insensitive" } } },
            { room: { hostel: { name: { contains: search, mode: "insensitive" } } } },
          ];
        }

        const [beds, count, bedStatusCounts] = await Promise.all([
          prisma.bed.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ room: { hostel: { name: "asc" } } }, { room: { roomNumber: "asc" } }, { bedNumber: "asc" }],
            include: {
              room: {
                include: {
                  hostel: true,
                  floor: true,
                },
              },
              allocations: {
                where: { status: "ACTIVE" },
                include: {
                  participant: { select: { playerId: true, name: true, institution: true } },
                  team: { select: { teamCode: true, name: true } },
                },
              },
            },
          }),
          prisma.bed.count({ where }),
          prisma.bed.groupBy({ by: ["status"], _count: true }),
        ]);

        records = beds.map((b) => {
          const activeAlloc = b.allocations[0];
          return {
            id: b.id,
            identifier: `${b.room.hostel.code || "HST"}-${b.room.roomNumber}-${b.bedNumber}`,
            hostelName: b.room.hostel.name,
            hostelGender: b.room.hostel.genderAllowed || "ANY",
            floorName: b.room.floor?.name || b.room.floorNumber || "Ground Floor",
            roomNumber: b.room.roomNumber,
            roomCapacity: b.room.capacity,
            bedNumber: b.bedNumber,
            status: b.status,
            occupantName: activeAlloc?.participant?.name || activeAlloc?.team?.name || "None",
            occupantId: activeAlloc?.participant?.playerId || activeAlloc?.team?.teamCode || "N/A",
            institution: activeAlloc?.participant?.institution || "N/A",
            checkInDate: activeAlloc?.checkInDate || null,
          };
        });
        totalCount = count;
        summaryMetrics = {
          bedStatusCounts: bedStatusCounts.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count }), {}),
        };
        break;
      }

      case "TRANSPORT": {
        // STRICT ZERO PAYMENT TRANSPORT REPORTING
        const where: any = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { tripCode: { contains: search, mode: "insensitive" } },
            { routeName: { contains: search, mode: "insensitive" } },
            { vehicleNo: { contains: search, mode: "insensitive" } },
            { driverName: { contains: search, mode: "insensitive" } },
          ];
        }

        const [trips, count] = await Promise.all([
          prisma.transportTrip.findMany({
            where,
            skip,
            take: limit,
            orderBy: { scheduledTime: "asc" },
            include: {
              route: true,
              vehicle: true,
              driver: true,
              passengers: {
                select: { boardingStatus: true },
              },
            },
          }),
          prisma.transportTrip.count({ where }),
        ]);

        records = trips.map((t) => {
          const totalPassengers = t.passengers.length;
          const boarded = t.passengers.filter((p) => p.boardingStatus === "BOARDED").length;
          const noShow = t.passengers.filter((p) => p.boardingStatus === "NO_SHOW").length;

          return {
            id: t.id,
            identifier: t.tripCode,
            routeName: t.route?.name || t.routeName || "Scheduled Route",
            scheduledDate: t.scheduledDate,
            scheduledTime: t.scheduledTime,
            vehicleNo: t.vehicle?.registrationNumber || t.vehicleNo || "KA-25-SZ-001",
            driverName: t.driver?.name || t.driverName || "Assigned Driver",
            capacity: t.vehicle?.capacity || t.capacity,
            passengersAssigned: totalPassengers,
            boardedCount: boarded,
            noShowCount: noShow,
            status: t.status,
            // ZERO TRANSPORT PAYMENT: Explicit contract metadata
            fareType: "FREE_COMPLIMENTARY",
          };
        });
        totalCount = count;
        break;
      }

      case "FINANCE": {
        // STRICT AUTHORIZATION CHECK
        if (!reportsAuth.hasFinanceAccess) {
          return NextResponse.json(
            { success: false, error: "403 Forbidden: Finance clearance required." },
            { status: 403 }
          );
        }

        const where: any = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { internalTxnId: { contains: search, mode: "insensitive" } },
            { receiptNumber: { contains: search, mode: "insensitive" } },
            { utr: { contains: search, mode: "insensitive" } },
          ];
        }

        const [txns, count, totalAggregate] = await Promise.all([
          prisma.paymentTransaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.paymentTransaction.count({ where }),
          prisma.paymentTransaction.aggregate({
            _sum: { amount: true },
            where,
          }),
        ]);

        records = txns.map((t) => ({
          id: t.id,
          identifier: t.internalTxnId,
          receiptNumber: t.receiptNumber || "N/A",
          category: t.category,
          amount: t.amount,
          method: t.method,
          utr: t.utr || "N/A",
          operatorEmail: t.operatorEmail,
          status: t.status,
          createdAt: t.createdAt,
        }));
        totalCount = count;
        summaryMetrics = {
          totalAmount: totalAggregate._sum.amount || 0,
        };
        break;
      }

      case "MATCHES": {
        const where: any = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { matchNumber: { contains: search, mode: "insensitive" } },
            { playerA: { contains: search, mode: "insensitive" } },
            { playerB: { contains: search, mode: "insensitive" } },
            { court: { contains: search, mode: "insensitive" } },
          ];
        }

        const [matches, count] = await Promise.all([
          prisma.match.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ dayId: "asc" }, { time: "asc" }],
            include: { day: true },
          }),
          prisma.match.count({ where }),
        ]);

        records = matches.map((m) => ({
          id: m.id,
          identifier: m.matchNumber,
          tournamentDay: m.day.dayNumber,
          time: m.time,
          court: m.court,
          category: m.category,
          playerA: m.playerA,
          institutionA: m.institutionA,
          playerB: m.playerB,
          institutionB: m.institutionB,
          score: m.scoreA && m.scoreB ? `${m.scoreA} - ${m.scoreB}` : "TBD",
          winner: m.winner || "N/A",
          status: m.status,
          isPublished: m.isPublished,
        }));
        totalCount = count;
        break;
      }

      case "RESULTS": {
        const where: any = { status: "COMPLETED" };
        if (search) {
          where.OR = [
            { matchNumber: { contains: search, mode: "insensitive" } },
            { playerA: { contains: search, mode: "insensitive" } },
            { playerB: { contains: search, mode: "insensitive" } },
          ];
        }

        const [results, count] = await Promise.all([
          prisma.match.findMany({
            where,
            skip,
            take: limit,
            orderBy: { updatedAt: "desc" },
            include: { day: true },
          }),
          prisma.match.count({ where }),
        ]);

        records = results.map((m) => ({
          id: m.id,
          identifier: m.matchNumber,
          category: m.category,
          court: m.court,
          playerA: m.playerA,
          playerB: m.playerB,
          winner: m.winner === "PLAYER_A" ? m.playerA : m.winner === "PLAYER_B" ? m.playerB : "Official Pending",
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          isPublished: m.isPublished,
          completedAt: m.actualEndTime || m.updatedAt,
        }));
        totalCount = count;
        break;
      }

      case "OPERATIONS": {
        const [tasks, issues] = await Promise.all([
          prisma.volunteerTask.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.volunteerIssue.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
        ]);

        records = [
          ...tasks.map((t) => ({
            id: t.id,
            type: "TASK",
            identifier: `TSK-${t.id.slice(-6).toUpperCase()}`,
            title: t.title,
            category: t.category,
            priority: t.priority,
            location: t.location,
            status: t.status,
            createdAt: t.createdAt,
          })),
          ...issues.map((i) => ({
            id: i.id,
            type: "INCIDENT",
            identifier: `INC-${i.id.slice(-6).toUpperCase()}`,
            title: i.title,
            category: i.category,
            priority: i.priority,
            location: i.location,
            status: i.status,
            createdAt: i.createdAt,
          })),
        ].slice(0, limit);
        totalCount = records.length;
        break;
      }

      case "SUPPORT": {
        const where: any = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { ticketNumber: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
            { requesterEmail: { contains: search, mode: "insensitive" } },
          ];
        }

        const [tickets, count, statusGroups] = await Promise.all([
          prisma.supportTicket.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.supportTicket.count({ where }),
          prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
        ]);

        records = tickets.map((t) => ({
          id: t.id,
          identifier: t.ticketNumber,
          subject: t.subject,
          requester: t.requesterName || t.requesterEmail,
          requesterType: t.requesterType,
          category: t.category,
          priority: t.priority,
          status: t.status,
          assignedAgent: t.assignedAgentName || "Unassigned",
          createdAt: t.createdAt,
          resolvedAt: t.resolvedAt || null,
        }));
        totalCount = count;
        summaryMetrics = {
          statusBreakdown: statusGroups.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count }), {}),
        };
        break;
      }

      case "COMMUNICATIONS": {
        const where: any = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ];
        }

        const [announcements, count] = await Promise.all([
          prisma.announcement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.announcement.count({ where }),
        ]);

        records = announcements.map((a) => ({
          id: a.id,
          identifier: `BC-${a.id.slice(-6).toUpperCase()}`,
          title: a.title,
          category: a.category,
          priority: a.priority,
          targetAudience: a.targetAudience,
          channels: a.channels,
          status: a.status,
          deliveryStatus: a.deliveryStatus,
          recipientCount: a.recipientCount,
          publishedAt: a.publishedAt,
        }));
        totalCount = count;
        break;
      }

      case "AUDIT": {
        // STRICT AUDIT AUTHORIZATION
        if (!reportsAuth.hasAuditAccess) {
          return NextResponse.json(
            { success: false, error: "403 Forbidden: Tamper-evident Audit reports require AUDIT_READ clearance." },
            { status: 403 }
          );
        }

        const where: any = {};
        if (search) {
          where.OR = [
            { actorEmail: { contains: search, mode: "insensitive" } },
            { action: { contains: search, mode: "insensitive" } },
            { resourceType: { contains: search, mode: "insensitive" } },
          ];
        }

        const [logs, count] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
          }),
          prisma.auditLog.count({ where }),
        ]);

        records = logs.map((l) => ({
          id: l.id,
          identifier: `AUD-${l.id.slice(-6).toUpperCase()}`,
          timestamp: l.timestamp,
          actor: l.actorEmail,
          action: l.action,
          resourceType: l.resourceType,
          resourceId: l.resourceId || "N/A",
          requestId: l.requestId || "N/A",
        }));
        totalCount = count;
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid report category: ${category}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      category,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      summaryMetrics,
      records,
    });
  } catch (err: any) {
    console.error("Error in GET /api/reports/dataset:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
