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

    const venueAreas = await prisma.venueArea.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      venueAreas,
      total: venueAreas.length,
    });
  } catch (error: any) {
    console.error("Operations venue list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load venue areas." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const { id, status, notes, inCharge } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing mandatory fields: id, status." },
        { status: 400 }
      );
    }

    const existingArea = await prisma.venueArea.findUnique({ where: { id } });
    if (!existingArea) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Venue area does not exist." },
        { status: 404 }
      );
    }

    const updatedArea = await prisma.venueArea.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(inCharge !== undefined ? { inCharge } : {}),
      },
    });

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "VENUE_STATUS_CHANGED",
      resourceType: "venue",
      resourceId: id,
      metadata: {
        areaName: updatedArea.name,
        previousStatus: existingArea.status,
        newStatus: updatedArea.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Venue area '${updatedArea.name}' status set to ${updatedArea.status}.`,
      venueArea: updatedArea,
    });
  } catch (error: any) {
    console.error("Operations venue update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update venue area status." },
      { status: 500 }
    );
  }
}
