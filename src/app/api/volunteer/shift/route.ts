import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyVolunteerClearance } from "@/lib/volunteer/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const userId = authResult.context.user.id;

    const latestShift = await prisma.volunteerShift.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      shift: latestShift || {
        status: "NOT_STARTED",
        startedAt: null,
        endedAt: null,
      },
    });
  } catch (error: any) {
    console.error("Volunteer shift get error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load shift status." },
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

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const userId = authResult.context.user.id;
    const body = await req.json();
    const { action, notes } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing shift action parameter." },
        { status: 400 }
      );
    }

    let updatedShift;
    let auditAction = "SHIFT_UPDATED";

    const currentShift = await prisma.volunteerShift.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (action === "START_SHIFT") {
      updatedShift = await prisma.volunteerShift.create({
        data: {
          userId,
          status: "ON_SHIFT",
          startedAt: new Date(),
          notes: notes || "Shift initiated by volunteer",
        },
      });
      auditAction = "SHIFT_STARTED";
    } else if (action === "END_SHIFT") {
      if (currentShift && currentShift.status !== "COMPLETED") {
        updatedShift = await prisma.volunteerShift.update({
          where: { id: currentShift.id },
          data: {
            status: "COMPLETED",
            endedAt: new Date(),
            notes: notes || currentShift.notes,
          },
        });
      } else {
        updatedShift = await prisma.volunteerShift.create({
          data: {
            userId,
            status: "COMPLETED",
            startedAt: new Date(),
            endedAt: new Date(),
            notes: notes || "Shift closed directly",
          },
        });
      }
      auditAction = "SHIFT_ENDED";
    } else if (action === "BREAK") {
      if (currentShift) {
        updatedShift = await prisma.volunteerShift.update({
          where: { id: currentShift.id },
          data: { status: "BREAK", notes: notes || "Break interval" },
        });
      }
    } else if (action === "RESUME") {
      if (currentShift) {
        updatedShift = await prisma.volunteerShift.update({
          where: { id: currentShift.id },
          data: { status: "ON_SHIFT", notes: notes || "Resumed from break" },
        });
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Invalid shift action: ${action}` },
        { status: 400 }
      );
    }

    await logAuditEvent({
      actorUserId: userId,
      actorEmail: authResult.context.user.email,
      action: auditAction,
      resourceType: "volunteer_shift",
      resourceId: updatedShift ? updatedShift.id : userId,
      metadata: { action, status: updatedShift?.status },
    });

    return NextResponse.json({
      success: true,
      message: `Shift action ${action} recorded. Status is now ${updatedShift?.status}.`,
      shift: updatedShift,
    });
  } catch (error: any) {
    console.error("Volunteer shift post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update volunteer shift." },
      { status: 500 }
    );
  }
}
