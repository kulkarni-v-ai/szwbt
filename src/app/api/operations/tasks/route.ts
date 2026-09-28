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

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;
    if (category && category !== "ALL") where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.volunteerTask.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
        assignment: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      tasks,
      total: tasks.length,
    });
  } catch (error: any) {
    console.error("Operations tasks list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to query operational tasks." },
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
    const {
      title,
      description = "",
      location,
      priority = "NORMAL",
      dueTime,
      scheduledTime,
      category = "VENUE",
      instructions,
      assignedUserId,
    } = body;

    if (!title || !location || !dueTime) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing mandatory fields: title, location, dueTime.",
        },
        { status: 400 }
      );
    }

    // Determine assignee (default to current user or specified volunteer)
    let targetUserId = assignedUserId;
    let assignedStaffName = authResult.context.user.name;

    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      if (targetUser) {
        assignedStaffName = targetUser.name;
      }
    } else {
      // Find an active volunteer or assign to current user
      const defaultVol = await prisma.user.findFirst({
        where: { userRoles: { some: { role: { name: "VOLUNTEER" } } } },
      });
      targetUserId = defaultVol ? defaultVol.id : authResult.context.user.id;
      assignedStaffName = defaultVol ? defaultVol.name : authResult.context.user.name;
    }

    const task = await prisma.volunteerTask.create({
      data: {
        userId: targetUserId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        priority: priority.trim().toUpperCase(),
        dueTime: dueTime.trim(),
        scheduledTime: scheduledTime?.trim() || null,
        category: category.trim().toUpperCase(),
        instructions: instructions?.trim() || null,
        status: "ASSIGNED",
        createdById: authResult.context.user.id,
        assignedStaffName,
      },
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
      },
    });

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "TASK_CREATED",
      resourceType: "volunteer_task",
      resourceId: task.id,
      metadata: {
        title: task.title,
        priority: task.priority,
        location: task.location,
        assignee: assignedStaffName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Operational task successfully created and queued.",
      task,
    });
  } catch (error: any) {
    console.error("Operations task creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch operational task." },
      { status: 500 }
    );
  }
}
