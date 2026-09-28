import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOrganizerClearance } from "@/lib/organizer/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const orgAuth = verifyOrganizerClearance(context);
    if (orgAuth.errorResponse) {
      return orgAuth.errorResponse;
    }

    const [
      totalTrips,
      scheduledTrips,
      boardingTrips,
      inTransitTrips,
      arrivedTrips,
      delayedTrips,
      totalPassengers,
      boardedPassengers,
      tripsList,
    ] = await Promise.all([
      prisma.transportTrip.count(),
      prisma.transportTrip.count({ where: { status: "SCHEDULED" } }),
      prisma.transportTrip.count({ where: { status: "BOARDING" } }),
      prisma.transportTrip.count({ where: { status: "IN_TRANSIT" } }),
      prisma.transportTrip.count({ where: { status: "ARRIVED" } }),
      prisma.transportTrip.count({ where: { status: "DELAYED" } }),
      prisma.transportPassenger.count(),
      prisma.transportPassenger.count({ where: { boardingStatus: "BOARDED" } }),
      prisma.transportTrip.findMany({
        include: {
          route: { include: { stops: { orderBy: { orderIndex: "asc" } } } },
          vehicle: true,
          driver: true,
          passengers: true,
        },
        orderBy: { scheduledTime: "asc" },
      }),
    ]);

    const formattedTrips = tripsList.map((trip) => ({
      id: trip.id,
      tripCode: trip.tripCode,
      scheduledDate: trip.scheduledDate,
      departureTime: trip.scheduledTime,
      estimatedArrival: trip.estimatedArrival || "TBD",
      routeName: trip.route ? trip.route.name : trip.routeName || "Campus Loop",
      routeOrigin: trip.route?.origin || "Hubballi Junction (UBL)",
      routeDestination: trip.route?.destination || "KLE Tech Arena",
      status: trip.status,
      delayMinutes: trip.delayMinutes,
      vehicleRegNo: trip.vehicle ? trip.vehicle.registrationNumber : trip.vehicleNo || "KA-25-EA-9021",
      vehicleType: trip.vehicle?.type || "AC_BUS",
      driverName: trip.driver ? trip.driver.name : trip.driverName || "Fleet Ops",
      driverPhone: trip.driver ? trip.driver.phone : trip.driverPhone || "+91 94812 34567",
      capacity: trip.capacity,
      passengerCount: trip.passengers.length,
      boardedCount: trip.passengers.filter((p) => p.boardingStatus === "BOARDED").length,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalTrips,
        scheduledTrips,
        boardingTrips,
        inTransitTrips,
        arrivedTrips,
        delayedTrips,
        totalPassengers,
        boardedPassengers,
        serviceNotice:
          "All campus shuttle fleets operate complimentary for accredited participants and officials under university sponsorship. Zero transport fare policy enforced.",
      },
      trips: formattedTrips,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/transport:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
