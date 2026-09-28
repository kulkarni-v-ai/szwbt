import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    // Fetch volunteers and operations personnel
    const staffMembers = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ["VOLUNTEER", "OPERATIONS_STAFF"] },
            },
          },
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        badge: true,
        userRoles: {
          include: { role: true },
        },
        volunteerShifts: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        volunteerAssignments: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        volunteerTasks: {
          where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "BLOCKED"] } },
          select: { id: true, title: true, priority: true, status: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedStaff = staffMembers.map((sm) => {
      const latestShift = sm.volunteerShifts[0];
      const activeAssignment = sm.volunteerAssignments.find(
        (a) => a.status === "ACTIVE" || a.status === "ASSIGNED"
      );

      let currentStatus = "AVAILABLE";
      if (latestShift?.status === "ON_SHIFT") {
        currentStatus = sm.volunteerTasks.length > 0 ? "ON TASK" : "ASSIGNED";
      } else if (latestShift?.status === "BREAK") {
        currentStatus = "BREAK";
      } else if (latestShift?.status === "COMPLETED") {
        currentStatus = "OFF SHIFT";
      }

      return {
        id: sm.id,
        name: sm.name,
        email: sm.email,
        badge: sm.badge || "STAFF",
        role: sm.userRoles.map((ur) => ur.role.displayName).join(", "),
        currentStatus,
        shift: latestShift ? latestShift.status : "NOT_STARTED",
        activeAssignment: activeAssignment
          ? {
              id: activeAssignment.id,
              title: activeAssignment.title,
              venue: activeAssignment.venue,
              area: activeAssignment.area,
              shift: `${activeAssignment.shiftStart} — ${activeAssignment.shiftEnd}`,
              supervisor: activeAssignment.supervisor,
            }
          : null,
        activeTasksCount: sm.volunteerTasks.length,
      };
    });

    return NextResponse.json({
      success: true,
      staff: formattedStaff,
      total: formattedStaff.length,
    });
  } catch (error: any) {
    console.error("Operations staff list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load staff roster." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const body = await req.json();
    const { userId, title, venue, area, reportingPoint, shiftStart, shiftEnd, supervisor, instructions } = body;

    if (!userId || !title || !venue || !area || !shiftStart || !shiftEnd) {
      return NextResponse.json(
        { success: false, error: "Missing required assignment fields." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Target personnel user not found." },
        { status: 404 }
      );
    }

    const assignment = await prisma.volunteerAssignment.create({
      data: {
        userId,
        title: title.trim(),
        venue: venue.trim(),
        area: area.trim(),
        reportingPoint: reportingPoint?.trim() || "Operations Desk",
        shiftStart: shiftStart.trim(),
        shiftEnd: shiftEnd.trim(),
        date: "2026-10-18",
        supervisor: supervisor?.trim() || authResult.context.user.name,
        status: "ASSIGNED",
        instructions: instructions?.trim() || "Report on time and verify field checklist.",
      },
    });

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "STAFF_ASSIGNED",
      resourceType: "volunteer_assignment",
      resourceId: assignment.id,
      metadata: {
        assignedUser: targetUser.email,
        title: assignment.title,
        area: assignment.area,
        shift: `${assignment.shiftStart} — ${assignment.shiftEnd}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Operational assignment created for ${targetUser.name}.`,
      assignment,
    });
  } catch (error: any) {
    console.error("Operations staff assignment creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create staff assignment." },
      { status: 500 }
    );
  }
}
