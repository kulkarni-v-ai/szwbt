import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/transport/drivers
 * Returns all registered drivers with active trip assignments.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const drivers = await prisma.transportDriver.findMany({
        include: {
          trips: {
            where: {
              status: { in: ["SCHEDULED", "BOARDING", "DEPARTED", "IN_TRANSIT"] },
            },
            select: {
              id: true,
              tripCode: true,
              routeName: true,
              scheduledTime: true,
              status: true,
            },
            take: 1,
            orderBy: { scheduledTime: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      const formatted = drivers.map((d) => ({
        id: d.id,
        driverCode: d.driverCode,
        name: d.name,
        phone: d.phone,
        licenseNumber: d.licenseNumber,
        status: d.status,
        currentTrip: d.trips[0] || null,
        createdAt: d.createdAt.toISOString(),
      }));

      return NextResponse.json({
        success: true,
        drivers: formatted,
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/drivers:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch drivers." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);

/**
 * POST /api/transport/drivers
 * Register a new driver.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { name, phone, licenseNumber, status } = body;

      if (!name || !phone || !licenseNumber) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: name, phone, licenseNumber." },
          { status: 400 }
        );
      }

      const driverCount = await prisma.transportDriver.count();
      const driverCode = `DRV-${String(driverCount + 1).padStart(2, "0")}`;

      const newDriver = await prisma.transportDriver.create({
        data: {
          driverCode,
          name,
          phone,
          licenseNumber,
          status: status || "AVAILABLE",
        },
      });

      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "DRIVER_ASSIGNED",
        resourceType: "transport",
        resourceId: newDriver.id,
        metadata: { driverCode, name, phone },
      });

      return NextResponse.json({ success: true, driver: newDriver });
    } catch (error: any) {
      console.error("Error in POST /api/transport/drivers:", error);
      return NextResponse.json(
        { success: false, error: "Failed to register driver: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_MANAGE_DRIVER],
  }
);
