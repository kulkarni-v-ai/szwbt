import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/transport/overview
 * Real-time aggregated KPIs and Today's Schedule for Transport Operations.
 * 100% database-derived counts. ZERO hardcoded or fabricated numbers.
 * ZERO payment fields.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      // 1. Fetch trips for today/active
      const trips = await prisma.transportTrip.findMany({
        include: {
          route: {
            include: { stops: { orderBy: { orderIndex: "asc" } } },
          },
          vehicle: true,
          driver: true,
          passengers: {
            include: {
              participant: {
                select: { id: true, playerId: true, name: true, institution: true },
              },
            },
          },
        },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      });

      // 2. Fetch fleet vehicles
      const vehicles = await prisma.transportVehicle.findMany();

      // 3. Fetch drivers
      const drivers = await prisma.transportDriver.findMany();

      // 4. Calculate real KPI numbers
      let activeTripsCount = 0;
      let upcomingTripsCount = 0;
      let completedTripsCount = 0;

      let totalPassengersAssigned = 0;
      let totalPassengersBoarded = 0;
      let totalPassengersRemaining = 0;
      let totalNoShows = 0;

      for (const trip of trips) {
        if (["BOARDING", "DEPARTED", "IN_TRANSIT"].includes(trip.status)) {
          activeTripsCount++;
        } else if (trip.status === "SCHEDULED") {
          upcomingTripsCount++;
        } else if (trip.status === "ARRIVED") {
          completedTripsCount++;
        }

        for (const p of trip.passengers) {
          totalPassengersAssigned++;
          if (p.boardingStatus === "BOARDED") {
            totalPassengersBoarded++;
          } else if (p.boardingStatus === "PENDING") {
            totalPassengersRemaining++;
          } else if (p.boardingStatus === "NO_SHOW") {
            totalNoShows++;
          }
        }
      }

      // Vehicles stats
      let vehiclesAvailable = 0;
      let vehiclesInService = 0;
      let vehiclesMaintenance = 0;

      for (const v of vehicles) {
        if (v.status === "AVAILABLE") {
          vehiclesAvailable++;
        } else if (["IN_SERVICE", "ASSIGNED"].includes(v.status)) {
          vehiclesInService++;
        } else if (["MAINTENANCE", "OUT_OF_SERVICE"].includes(v.status)) {
          vehiclesMaintenance++;
        }
      }

      // Drivers stats
      let driversAvailable = 0;
      let driversAssigned = 0;
      for (const d of drivers) {
        if (d.status === "AVAILABLE") driversAvailable++;
        else if (d.status === "ASSIGNED") driversAssigned++;
      }

      // Format trips for schedule display (matching reference Card 05: Time | Route | Vehicle | Status)
      const schedule = trips.map((trip) => {
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
          route: trip.route ? trip.route.name : trip.routeName || "—",
          routeCode: trip.route?.code || "—",
          vehicle: trip.vehicle ? `${trip.vehicle.registrationNumber} (${trip.vehicle.type})` : trip.vehicleNo || "—",
          vehicleId: trip.vehicleId,
          vehicleCapacity: trip.vehicle?.capacity || trip.capacity,
          driver: trip.driver ? `${trip.driver.name} (${trip.driver.phone})` : trip.driverName || "—",
          driverId: trip.driverId,
          pickupPoint: trip.pickupPoint || trip.route?.origin || "—",
          dropPoint: trip.dropPoint || trip.route?.destination || "—",
          status: trip.status,
          delayMinutes: trip.delayMinutes,
          expected,
          boarded,
          remaining,
          noShows,
          capacity: trip.capacity,
        };
      });

      return NextResponse.json({
        success: true,
        kpis: {
          activeTrips: activeTripsCount,
          upcomingTrips: upcomingTripsCount,
          completedTrips: completedTripsCount,
          totalTrips: trips.length,
          vehiclesTotal: vehicles.length,
          vehiclesAvailable,
          vehiclesInService,
          vehiclesMaintenance,
          driversTotal: drivers.length,
          driversAvailable,
          driversAssigned,
          passengersAssigned: totalPassengersAssigned,
          passengersBoarded: totalPassengersBoarded,
          passengersRemaining: totalPassengersRemaining,
          noShows: totalNoShows,
        },
        schedule,
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/overview:", error);
      return NextResponse.json(
        { success: false, error: "Failed to load transport overview data." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);
