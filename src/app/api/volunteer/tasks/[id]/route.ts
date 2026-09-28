import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyVolunteerClearance } from "@/lib/volunteer/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const { id } = await params;
    const isSuperAdmin = authResult.context.roles.includes("SUPER_ADMIN");
    const currentUserId = authResult.context.user.id;

    const task = await prisma.volunteerTask.findUnique({
      where: { id },
      include: {
        assignment: true,
        user: { select: { id: true, name: true, email: true, badge: true } },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Task does not exist." },
        { status: 404 }
      );
    }

    // STRICT RESOURCE AUTHORIZATION: Volunteer can only access their own tasks
    if (!isSuperAdmin && task.userId !== currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: You are not authorized to view this volunteer task.",
        },
        { status: 403 }
      );
    }

    // Fetch related audit logs for task timeline
    const activityHistory = await prisma.auditLog.findMany({
      where: {
        resourceType: "volunteer_task",
        resourceId: id,
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({
      success: true,
      task,
      activityHistory,
    });
  } catch (error: any) {
    console.error("Volunteer task detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load task details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const { id } = await params;
    const isSuperAdmin = authResult.context.roles.includes("SUPER_ADMIN");
    const currentUserId = authResult.context.user.id;

    const existingTask = await prisma.volunteerTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Task not found." },
        { status: 404 }
      );
    }

    // STRICT RESOURCE AUTHORIZATION: Cannot mutate another volunteer's task
    if (!isSuperAdmin && existingTask.userId !== currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: You cannot modify a task not assigned to you.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, blockedReason } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "IN_PROGRESS" && !existingTask.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }
    if (blockedReason !== undefined) updateData.blockedReason = blockedReason;

    const updatedTask = await prisma.volunteerTask.update({
      where: { id },
      data: updateData,
      include: { assignment: true },
    });

    const auditAction =
      status === "COMPLETED"
        ? "TASK_COMPLETED"
        : status === "IN_PROGRESS"
        ? "TASK_STARTED"
        : "TASK_UPDATED";

    await logAuditEvent({
      actorUserId: currentUserId,
      actorEmail: authResult.context.user.email,
      action: auditAction,
      resourceType: "volunteer_task",
      resourceId: id,
      metadata: {
        previousStatus: existingTask.status,
        newStatus: updatedTask.status,
        title: updatedTask.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Task successfully updated to ${updatedTask.status}.`,
      task: updatedTask,
    });
  } catch (error: any) {
    console.error("Volunteer task update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update volunteer task." },
      { status: 500 }
    );
  }
}
