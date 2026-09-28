import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

const VALID_COURT_STATUSES = ["READY", "LIVE", "BREAK", "DELAYED", "MAINTENANCE", "UNAVAILABLE"];

/**
 * PATCH /api/admin/live/courts/[id]
 * Update operational court status or designated umpire.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { status, umpire } = body;

      const court = await prisma.court.findUnique({
        where: { id },
      });

      if (!court) {
        return NextResponse.json(
          { success: false, error: "Court not found." },
          { status: 404 }
        );
      }

      if (status && !VALID_COURT_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${VALID_COURT_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      const updated = await prisma.court.update({
        where: { id },
        data: {
          status: status || court.status,
          umpire: umpire !== undefined ? (umpire?.trim() || null) : court.umpire,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "COURT_UPDATED",
        resourceType: "court",
        resourceId: id,
        metadata: {
          previousStatus: court.status,
          newStatus: updated.status,
          previousUmpire: court.umpire,
          newUmpire: updated.umpire,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Court '${court.courtNumber}' updated to ${updated.status}.`,
        data: updated,
      });
    } catch (error: any) {
      console.error("[PATCH /api/admin/live/courts/[id]] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_OPERATE],
  }
);

/**
 * DELETE /api/admin/live/courts/[id]
 * Remove court if no active or scheduled matches are assigned.
 */
export const DELETE = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const court = await prisma.court.findUnique({
        where: { id },
      });

      if (!court) {
        return NextResponse.json(
          { success: false, error: "Court not found." },
          { status: 404 }
        );
      }

      // Check if matches are actively on this court
      const activeMatch = await prisma.match.findFirst({
        where: {
          court: { equals: court.courtNumber, mode: "insensitive" },
          status: { in: ["LIVE", "PAUSED", "UPCOMING", "READY"] },
        },
      });

      if (activeMatch) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot delete court '${court.courtNumber}' while matches (${activeMatch.matchNumber}) are scheduled or active on it.`,
          },
          { status: 409 }
        );
      }

      await prisma.court.delete({ where: { id } });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "COURT_DELETED",
        resourceType: "court",
        resourceId: id,
        metadata: { courtNumber: court.courtNumber },
      });

      return NextResponse.json({
        success: true,
        message: `Court '${court.courtNumber}' successfully deleted.`,
      });
    } catch (error: any) {
      console.error("[DELETE /api/admin/live/courts/[id]] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_OPERATE],
  }
);
