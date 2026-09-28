import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;
    if (!participant) {
      return NextResponse.json({
        success: true,
        assigned: false,
        transport: null,
        message: "No athlete record linked.",
      });
    }

    // Find participant transport bookings
    const bookings = await prisma.transportPassenger.findMany({
      where: { participantId: participant.id },
      include: {
        trip: {
          include: {
            route: {
              include: {
                stops: { orderBy: { orderIndex: "asc" } },
              },
            },
            vehicle: true,
            driver: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: false,
        transport: null,
        message: "NOT ASSIGNED: Shuttle transit schedule dispatch pending with fleet coordinator.",
      });
    }

    const activeBooking = bookings[0];
    const trip = activeBooking.trip;
    const route = trip.route;
    const vehicle = trip.vehicle;
    const driver = trip.driver;

    return NextResponse.json({
      success: true,
      assigned: true,
      transport: {
        bookingId: activeBooking.id,
        tripCode: trip.tripCode,
        routeName: route ? route.name : trip.routeName || "KLE Arena Shuttle Loop",
        routeCode: route ? route.code : "SHUTTLE",
        origin: route ? route.origin : "Hubballi Junction (UBL)",
        destination: route ? route.destination : "KLE Tech Arena",
        scheduledDate: trip.scheduledDate,
        scheduledDeparture: trip.scheduledTime,
        estimatedArrival: trip.estimatedArrival || "TBD",
        tripStatus: trip.status, // "SCHEDULED", "BOARDING", "IN_TRANSIT", "ARRIVED", "CANCELLED"
        boardingStatus: activeBooking.boardingStatus, // "PENDING", "BOARDED", "NO_SHOW"
        pickupPoint: activeBooking.pickupPoint || (route?.stops[0]?.name) || "Main Station Bay",
        dropPoint: activeBooking.dropPoint || (route?.stops[route.stops.length - 1]?.name) || "Arena East Gate",
        vehicle: vehicle
          ? {
              regNo: vehicle.registrationNumber,
              type: vehicle.type,
              model: vehicle.makeModel,
            }
          : {
              regNo: trip.vehicleNo || "KA-25-EA-9021",
              type: "AC_BUS",
              model: "University Shuttle",
            },
        driver: driver
          ? {
              name: driver.name,
              phone: driver.phone,
            }
          : {
              name: trip.driverName || "Fleet Ops",
              phone: trip.driverPhone || "+91 94812 34567",
            },
        routeStops: route ? route.stops.map((s) => s.name) : [],
        dispatchNotice:
          "University shuttles operate complimentary for all accredited tournament contingents. Please arrive at your pickup point 10 minutes prior to departure.",
      },
      allBookings: bookings.map((b) => ({
        id: b.id,
        tripCode: b.trip.tripCode,
        routeName: b.trip.routeName || b.trip.route?.name,
        date: b.trip.scheduledDate,
        departure: b.trip.scheduledTime,
        boardingStatus: b.boardingStatus,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/transport:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
