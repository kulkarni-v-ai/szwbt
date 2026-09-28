import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/transport/trips
 * Paginated and filtered trips list with passenger stats.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const date = searchParams.get("date");
      const routeId = searchParams.get("routeId");
      const search = searchParams.get("search");

      const whereClause: any = {};

      if (status && status !== "ALL") {
        whereClause.status = status;
      }
      if (date) {
        whereClause.scheduledDate = date;
      }
      if (routeId && routeId !== "ALL") {
        whereClause.routeId = routeId;
      }
      if (search) {
        whereClause.OR = [
          { tripCode: { contains: search, mode: "insensitive" } },
          { routeName: { contains: search, mode: "insensitive" } },
          { vehicleNo: { contains: search, mode: "insensitive" } },
          { driverName: { contains: search, mode: "insensitive" } },
        ];
      }

      const trips = await prisma.transportTrip.findMany({
        where: whereClause,
        include: {
          route: {
            include: { stops: { orderBy: { orderIndex: "asc" } } },
          },
          vehicle: true,
          driver: true,
          passengers: {
            select: {
              id: true,
              boardingStatus: true,
            },
          },
        },
        orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "asc" }],
      });

      const formatted = trips.map((trip) => {
        const expected = trip.passengers.length;
        const boarded = trip.passengers.filter((p) => p.boardingStatus === "BOARDED").length;
        const remaining = trip.passengers.filter((p) => p.boardingStatus === "PENDING").length;
        const noShows = trip.passengers.filter((p) => p.boardingStatus === "NO_SHOW").length;

        return {
          id: trip.id,
          tripCode: trip.tripCode,
          date: trip.scheduledDate,
          time: trip.scheduledTime,
          estimatedArrival: trip.estimatedArrival,
          routeId: trip.routeId,
          routeName: trip.route ? trip.route.name : trip.routeName || "—",
          routeCode: trip.route?.code || "—",
          vehicleId: trip.vehicleId,
          vehicleNo: trip.vehicle ? trip.vehicle.registrationNumber : trip.vehicleNo || "—",
          vehicleType: trip.vehicle?.type || "SHUTTLE",
          driverId: trip.driverId,
          driverName: trip.driver ? trip.driver.name : trip.driverName || "—",
          driverPhone: trip.driver ? trip.driver.phone : trip.driverPhone || "—",
          pickupPoint: trip.pickupPoint || trip.route?.origin || "—",
          dropPoint: trip.dropPoint || trip.route?.destination || "—",
          status: trip.status,
          delayMinutes: trip.delayMinutes,
          capacity: trip.capacity,
          expected,
          boarded,
          remaining,
          noShows,
          createdAt: trip.createdAt.toISOString(),
        };
      });

      return NextResponse.json({
        success: true,
        trips: formatted,
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/trips:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch trips." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);

/**
 * POST /api/transport/trips
 * Create a new operational transport trip.
 * Validates vehicle availability, driver availability, and enforces vehicle physical capacity.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const {
        scheduledDate,
        scheduledTime,
        estimatedArrival,
        routeId,
        vehicleId,
        driverId,
        pickupPoint,
        dropPoint,
      } = body;

      if (!scheduledDate || !scheduledTime || !routeId || !vehicleId || !driverId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields: scheduledDate, scheduledTime, routeId, vehicleId, driverId are required.",
          },
          { status: 400 }
        );
      }

      // 1. Fetch Route
      const route = await prisma.transportRoute.findUnique({
        where: { id: routeId },
        include: { stops: true },
      });
      if (!route) {
        return NextResponse.json(
          { success: false, error: "Selected route does not exist." },
          { status: 404 }
        );
      }

      // 2. Fetch Vehicle & derive capacity
      const vehicle = await prisma.transportVehicle.findUnique({
        where: { id: vehicleId },
      });
      if (!vehicle) {
        return NextResponse.json(
          { success: false, error: "Selected vehicle does not exist." },
          { status: 404 }
        );
      }
      if (vehicle.status === "MAINTENANCE" || vehicle.status === "OUT_OF_SERVICE") {
        return NextResponse.json(
          { success: false, error: `Vehicle ${vehicle.registrationNumber} is currently ${vehicle.status.toLowerCase().replace("_", " ")}.` },
          { status: 400 }
        );
      }

      // 3. Prevent Vehicle Overlap on same date & time
      const conflictingVehicleTrip = await prisma.transportTrip.findFirst({
        where: {
          vehicleId: vehicle.id,
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime,
          status: { notIn: ["ARRIVED", "CANCELLED"] },
        },
      });
      if (conflictingVehicleTrip) {
        return NextResponse.json(
          {
            success: false,
            error: `VEHICLE UNAVAILABLE: Vehicle ${vehicle.registrationNumber} is already scheduled for trip ${conflictingVehicleTrip.tripCode} at ${scheduledTime}.`,
          },
          { status: 409 }
        );
      }

      // 4. Fetch Driver
      const driver = await prisma.transportDriver.findUnique({
        where: { id: driverId },
      });
      if (!driver) {
        return NextResponse.json(
          { success: false, error: "Selected driver does not exist." },
          { status: 404 }
        );
      }
      if (driver.status === "UNAVAILABLE" || driver.status === "OFF_DUTY") {
        return NextResponse.json(
          { success: false, error: `Driver ${driver.name} is currently ${driver.status.toLowerCase().replace("_", " ")}.` },
          { status: 400 }
        );
      }

      // 5. Prevent Driver Overlap on same date & time
      const conflictingDriverTrip = await prisma.transportTrip.findFirst({
        where: {
          driverId: driver.id,
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime,
          status: { notIn: ["ARRIVED", "CANCELLED"] },
        },
      });
      if (conflictingDriverTrip) {
        return NextResponse.json(
          {
            success: false,
            error: `DRIVER UNAVAILABLE: Driver ${driver.name} is already assigned to trip ${conflictingDriverTrip.tripCode} at ${scheduledTime}.`,
          },
          { status: 409 }
        );
      }

      // 6. Generate Trip Code
      const tripCount = await prisma.transportTrip.count();
      const tripCode = `TRIP-SZ-${String(tripCount + 1).padStart(3, "0")}`;

      // 7. Create Trip with derived capacity
      const newTrip = await prisma.transportTrip.create({
        data: {
          tripCode,
          scheduledDate,
          scheduledTime,
          estimatedArrival: estimatedArrival || null,
          routeId: route.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          routeName: route.name,
          vehicleNo: vehicle.registrationNumber,
          driverName: driver.name,
          driverPhone: driver.phone,
          pickupPoint: pickupPoint || route.origin,
          dropPoint: dropPoint || route.destination,
          capacity: vehicle.capacity, // STRICTLY derived from vehicle capacity
          status: "SCHEDULED",
        },
        include: {
          route: true,
          vehicle: true,
          driver: true,
        },
      });

      // Update vehicle & driver status to ASSIGNED if available
      if (vehicle.status === "AVAILABLE") {
        await prisma.transportVehicle.update({
          where: { id: vehicle.id },
          data: { status: "ASSIGNED" },
        });
      }
      if (driver.status === "AVAILABLE") {
        await prisma.transportDriver.update({
          where: { id: driver.id },
          data: { status: "ASSIGNED" },
        });
      }

      // 8. Audit Log
      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "TRIP_CREATED",
        resourceType: "transport",
        resourceId: newTrip.id,
        metadata: {
          tripCode: newTrip.tripCode,
          route: route.name,
          vehicle: vehicle.registrationNumber,
          driver: driver.name,
          capacity: vehicle.capacity,
        },
      });

      return NextResponse.json({
        success: true,
        trip: newTrip,
      });
    } catch (error: any) {
      console.error("Error in POST /api/transport/trips:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create trip: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_CREATE],
  }
);
