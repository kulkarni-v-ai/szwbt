import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyReportsClearance } from "@/lib/reports/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const body = await req.json().catch(() => ({}));
    const reportType = (body.reportType || "REGISTRATION").toUpperCase();
    const format = (body.format || "CSV").toUpperCase(); // "CSV" | "JSON"
    const filters = body.filters || {};
    const requestedColumns = Array.isArray(body.columns) && body.columns.length > 0 ? body.columns : null;

    // 1. Verify clearance for the specific report type
    const reportsAuth = verifyReportsClearance(context, reportType);
    if (reportsAuth.errorResponse) {
      return reportsAuth.errorResponse;
    }

    // 2. Verify Export Capability
    if (!reportsAuth.canExport) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance for data export (REPORTS_EXPORT required)." },
        { status: 403 }
      );
    }

    let records: Record<string, any>[] = [];

    // 3. Fetch real records based on reportType
    switch (reportType) {
      case "REGISTRATION":
      case "TEAMS": {
        const teams = await prisma.team.findMany({
          take: 500,
          orderBy: { name: "asc" },
          include: { _count: { select: { members: true, bedAllocations: true, transportBookings: true } } },
        });
        records = teams.map((t) => ({
          Team_Code: t.teamCode,
          Team_Name: t.name,
          Institution: t.institution,
          State: t.state,
          Manager_Name: t.managerName || "N/A",
          Captain_Name: t.captainName || "N/A",
          Member_Count: t._count.members,
          Beds_Allocated: t._count.bedAllocations,
          Transport_Assigned: t._count.transportBookings,
          Status: t.status,
          Registration_Date: t.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "PARTICIPANTS": {
        const participants = await prisma.participant.findMany({
          take: 500,
          orderBy: { createdAt: "desc" },
          include: {
            teamMemberships: { include: { team: { select: { name: true, teamCode: true } } } },
          },
        });
        records = participants.map((p) => ({
          Player_ID: p.playerId,
          Full_Name: p.name,
          Institution: p.institution,
          State: p.state,
          Category: p.category,
          Gender: p.gender || "FEMALE",
          Status: p.status,
          Team_Code: p.teamMemberships[0]?.team?.teamCode || "N/A",
          Team_Name: p.teamMemberships[0]?.team?.name || "Independent",
          Registered_At: p.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "ACCOMMODATION": {
        const beds = await prisma.bed.findMany({
          take: 500,
          orderBy: [{ room: { hostel: { name: "asc" } } }, { room: { roomNumber: "asc" } }, { bedNumber: "asc" }],
          include: {
            room: { include: { hostel: true, floor: true } },
            allocations: {
              where: { status: "ACTIVE" },
              include: { participant: { select: { name: true, playerId: true } } },
            },
          },
        });
        records = beds.map((b) => ({
          Hostel: b.room.hostel.name,
          Floor: b.room.floor?.name || b.room.floorNumber || "Ground Floor",
          Room_Number: b.room.roomNumber,
          Bed_Number: b.bedNumber,
          Capacity: b.room.capacity,
          Bed_Status: b.status,
          Occupant_Name: b.allocations[0]?.participant?.name || "None",
          Occupant_ID: b.allocations[0]?.participant?.playerId || "None",
        }));
        break;
      }

      case "TRANSPORT": {
        // STRICT ZERO PAYMENT TRANSPORT REPORT
        const trips = await prisma.transportTrip.findMany({
          take: 500,
          orderBy: { scheduledTime: "asc" },
          include: {
            route: true,
            vehicle: true,
            driver: true,
            passengers: { select: { boardingStatus: true } },
          },
        });
        records = trips.map((t) => ({
          Trip_Code: t.tripCode,
          Route: t.route?.name || t.routeName || "Official Shuttle Route",
          Scheduled_Date: t.scheduledDate,
          Scheduled_Time: t.scheduledTime,
          Vehicle_Reg: t.vehicle?.registrationNumber || t.vehicleNo || "KA-25-SZ-001",
          Driver_Name: t.driver?.name || t.driverName || "Official Driver",
          Assigned_Passengers: t.passengers.length,
          Boarded_Count: t.passengers.filter((p) => p.boardingStatus === "BOARDED").length,
          No_Show_Count: t.passengers.filter((p) => p.boardingStatus === "NO_SHOW").length,
          Status: t.status,
          Fare_Type: "COMPLIMENTARY_UNIVERSITY_SERVICE", // Explicit Zero Payment
        }));
        break;
      }

      case "FINANCE": {
        if (!reportsAuth.hasFinanceAccess) {
          return NextResponse.json(
            { success: false, error: "403 Forbidden: Finance clearance required." },
            { status: 403 }
          );
        }
        const txns = await prisma.paymentTransaction.findMany({
          take: 500,
          orderBy: { createdAt: "desc" },
        });
        records = txns.map((t) => ({
          Transaction_ID: t.internalTxnId,
          Receipt_Number: t.receiptNumber || "N/A",
          Category: t.category,
          Entity_Type: t.entityType,
          Amount_INR: t.amount,
          Payment_Method: t.method,
          UTR_Reference: t.utr || "N/A",
          Operator_Email: t.operatorEmail,
          Status: t.status,
          Date: t.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "MATCHES": {
        const matches = await prisma.match.findMany({
          take: 500,
          orderBy: [{ dayId: "asc" }, { time: "asc" }],
          include: { day: true },
        });
        records = matches.map((m) => ({
          Match_Number: m.matchNumber,
          Tournament_Day: m.day.dayNumber,
          Scheduled_Time: m.time,
          Court: m.court,
          Category: m.category,
          Player_A: m.playerA,
          Institution_A: m.institutionA,
          Player_B: m.playerB,
          Institution_B: m.institutionB,
          Score: m.scoreA && m.scoreB ? `${m.scoreA} - ${m.scoreB}` : "TBD",
          Winner: m.winner || "N/A",
          Status: m.status,
          Published: m.isPublished ? "YES" : "NO",
        }));
        break;
      }

      case "SUPPORT": {
        const tickets = await prisma.supportTicket.findMany({
          take: 500,
          orderBy: { createdAt: "desc" },
        });
        records = tickets.map((t) => ({
          Ticket_Number: t.ticketNumber,
          Subject: t.subject,
          Requester: t.requesterName || t.requesterEmail,
          Requester_Type: t.requesterType,
          Category: t.category,
          Priority: t.priority,
          Status: t.status,
          Assigned_Agent: t.assignedAgentName || "Unassigned",
          Created_At: t.createdAt.toISOString().split("T")[0],
          Resolved_At: t.resolvedAt ? t.resolvedAt.toISOString().split("T")[0] : "N/A",
        }));
        break;
      }

      case "AUDIT": {
        if (!reportsAuth.hasAuditAccess) {
          return NextResponse.json(
            { success: false, error: "403 Forbidden: AUDIT_READ required." },
            { status: 403 }
          );
        }
        const logs = await prisma.auditLog.findMany({
          take: 500,
          orderBy: { timestamp: "desc" },
        });
        records = logs.map((l) => ({
          Timestamp: l.timestamp.toISOString(),
          Actor: l.actorEmail,
          Action: l.action,
          Resource_Type: l.resourceType,
          Resource_ID: l.resourceId || "N/A",
          Request_ID: l.requestId || "N/A",
        }));
        break;
      }

      default: {
        return NextResponse.json(
          { success: false, error: `Invalid report type for export: ${reportType}` },
          { status: 400 }
        );
      }
    }

    // 4. Filter columns if requested
    if (requestedColumns && records.length > 0) {
      records = records.map((r) => {
        const filtered: Record<string, any> = {};
        for (const col of requestedColumns) {
          if (r[col] !== undefined) {
            filtered[col] = r[col];
          }
        }
        return filtered;
      });
    }

    // 5. Record Export in ReportExportLog & AuditLog
    await Promise.all([
      prisma.reportExportLog.create({
        data: {
          reportType,
          format,
          actorEmail: context.user.email,
          filters: JSON.stringify(filters),
          recordCount: records.length,
        },
      }),
      logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "REPORT_EXPORTED",
        resourceType: "report",
        resourceId: reportType,
        metadata: {
          format,
          recordCount: records.length,
        },
      }),
    ]);

    const timestamp = Date.now();
    const filename = `szwbt-report-${reportType.toLowerCase()}-${timestamp}.${format.toLowerCase()}`;

    // 6. Return formatted CSV or JSON stream
    if (format === "JSON") {
      return new NextResponse(JSON.stringify(records, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Build CSV
    if (records.length === 0) {
      return new NextResponse("NO_DATA_AVAILABLE", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const headers = Object.keys(records[0]);
    const csvRows = [
      headers.join(","),
      ...records.map((r) =>
        headers
          .map((h) => {
            const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
            // Escape commas, quotes and newlines
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      ),
    ];

    return new NextResponse(csvRows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Error in POST /api/reports/export:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
