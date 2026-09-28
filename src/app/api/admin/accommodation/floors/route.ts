import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/admin/accommodation/floors
 * Creates a new Floor record under a Hostel.
 * Super Admin clearance only.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { hostelId, name, floorNumber, status } = body;

      if (!hostelId || !name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Hostel ID and Floor Name are required." },
          { status: 400 }
        );
      }

      // Check hostel exists
      const hostel = await prisma.hostel.findUnique({
        where: { id: hostelId },
      });

      if (!hostel) {
        return NextResponse.json(
          { success: false, error: "Hostel not found." },
          { status: 404 }
        );
      }

      // Check duplicate floor name in this hostel
      const existing = await prisma.floor.findUnique({
        where: {
          hostelId_name: {
            hostelId,
            name: name.trim(),
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Floor '${name.trim()}' already exists in this hostel.` },
          { status: 409 }
        );
      }

      const floor = await prisma.floor.create({
        data: {
          hostelId,
          name: name.trim(),
          floorNumber: floorNumber !== undefined ? Number(floorNumber) : 0,
          status: status || "ACTIVE",
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "FLOOR_CREATED",
        resourceType: "accommodation",
        resourceId: floor.id,
        metadata: {
          hostelId,
          hostelName: hostel.name,
          name: floor.name,
          floorNumber: floor.floorNumber,
        },
      });

      return NextResponse.json({
        success: true,
        floor,
        message: "Floor created successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to create floor." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
