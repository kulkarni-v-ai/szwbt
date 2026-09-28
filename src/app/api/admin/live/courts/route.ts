import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/live/courts
 * Fetch all configured courts with their operational state.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const courts = await prisma.court.findMany({
        orderBy: { courtNumber: "asc" },
      });

      return NextResponse.json({
        success: true,
        data: courts,
      });
    } catch (error: any) {
      console.error("[GET /api/admin/live/courts] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_READ],
  }
);

/**
 * POST /api/admin/live/courts
 * Add a new court to the tournament venue configuration.
 * Clearance: LIVE_OPERATE or SUPER_ADMIN or TOURNAMENT_ADMIN.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { courtNumber, umpire } = body;

      if (!courtNumber || typeof courtNumber !== "string" || !courtNumber.trim()) {
        return NextResponse.json(
          { success: false, error: "Court number is required (e.g. 'Court 09')." },
          { status: 400 }
        );
      }

      const formattedNumber = courtNumber.trim();

      // Check unique
      const existing = await prisma.court.findUnique({
        where: { courtNumber: formattedNumber },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Court '${formattedNumber}' already exists.` },
          { status: 409 }
        );
      }

      const court = await prisma.court.create({
        data: {
          courtNumber: formattedNumber,
          umpire: umpire?.trim() || null,
          status: "READY",
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "COURT_CREATED",
        resourceType: "court",
        resourceId: court.id,
        metadata: {
          courtNumber: court.courtNumber,
          umpire: court.umpire,
        },
      });

      return NextResponse.json(
        { success: true, message: `Court '${formattedNumber}' successfully created.`, data: court },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("[POST /api/admin/live/courts] Error:", error);
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
