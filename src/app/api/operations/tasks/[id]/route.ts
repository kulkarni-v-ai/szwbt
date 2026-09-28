import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
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

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const { id } = await params;

    const task = await prisma.volunteerTask.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
        assignment: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Operational task record not found." },
        { status: 404 }
      );
    }

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
    console.error("Operations task detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load operational task detail." },
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

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const { id } = await params;
    const body = await req.json();
    const { status, priority, blockedReason, assignedUserId } = body;

    const existingTask = await prisma.volunteerTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Operational task not found." },
        { status: 404 }
      );
    }

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
    if (priority) updateData.priority = priority;
    if (blockedReason !== undefined) updateData.blockedReason = blockedReason;

    if (assignedUserId) {
      updateData.userId = assignedUserId;
      const targetUser = await prisma.user.findUnique({ where: { id: assignedUserId } });
      if (targetUser) {
        updateData.assignedStaffName = targetUser.name;
      }
    }

    const updatedTask = await prisma.volunteerTask.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
        assignment: true,
      },
    });

    const auditAction =
      status === "COMPLETED"
        ? "TASK_COMPLETED"
        : status === "IN_PROGRESS"
        ? "TASK_STARTED"
        : "TASK_UPDATED";

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: auditAction,
      resourceType: "volunteer_task",
      resourceId: id,
      metadata: {
        previousStatus: existingTask.status,
        newStatus: updatedTask.status,
        priority: updatedTask.priority,
        blockedReason: updatedTask.blockedReason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Task ${id} successfully updated: ${auditAction}.`,
      task: updatedTask,
    });
  } catch (error: any) {
    console.error("Operations task update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update operational task." },
      { status: 500 }
    );
  }
}
