import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/transport/vehicles
 * Returns all fleet vehicles with real physical capacity and current assignment status.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const vehicles = await prisma.transportVehicle.findMany({
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
        orderBy: { registrationNumber: "asc" },
      });

      const formatted = vehicles.map((v) => ({
        id: v.id,
        registrationNumber: v.registrationNumber,
        type: v.type,
        capacity: v.capacity, // Strictly derived from physical vehicle
        status: v.status,
        makeModel: v.makeModel,
        currentTrip: v.trips[0] || null,
        createdAt: v.createdAt.toISOString(),
      }));

      return NextResponse.json({
        success: true,
        vehicles: formatted,
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/vehicles:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch vehicles." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);

/**
 * POST /api/transport/vehicles
 * Register a new fleet vehicle with backend-enforced physical capacity.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { registrationNumber, type, capacity, makeModel, status } = body;

      if (!registrationNumber || !type || !capacity) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: registrationNumber, type, capacity." },
          { status: 400 }
        );
      }

      const parsedCapacity = parseInt(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        return NextResponse.json(
          { success: false, error: "Capacity must be a positive number." },
          { status: 400 }
        );
      }

      const existing = await prisma.transportVehicle.findUnique({
        where: { registrationNumber },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Vehicle ${registrationNumber} is already registered.` },
          { status: 409 }
        );
      }

      const newVehicle = await prisma.transportVehicle.create({
        data: {
          registrationNumber,
          type,
          capacity: parsedCapacity,
          makeModel: makeModel || null,
          status: status || "AVAILABLE",
        },
      });

      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "VEHICLE_ASSIGNED",
        resourceType: "transport",
        resourceId: newVehicle.id,
        metadata: { registrationNumber, type, capacity: parsedCapacity },
      });

      return NextResponse.json({ success: true, vehicle: newVehicle });
    } catch (error: any) {
      console.error("Error in POST /api/transport/vehicles:", error);
      return NextResponse.json(
        { success: false, error: "Failed to register vehicle: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_MANAGE_VEHICLE],
  }
);
