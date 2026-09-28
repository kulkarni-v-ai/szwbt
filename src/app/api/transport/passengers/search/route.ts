import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/transport/passengers/search
 * Server-side debounced search of tournament participants for transport dispatch.
 * Do not load entire DB into browser.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = searchParams.get("q") || "";

      if (!query || query.trim().length < 2) {
        return NextResponse.json({
          success: true,
          participants: [],
        });
      }

      const trimmed = query.trim();

      const participants = await prisma.participant.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { playerId: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
            { phone: { contains: trimmed, mode: "insensitive" } },
            { institution: { contains: trimmed, mode: "insensitive" } },
            { qrCode: { contains: trimmed, mode: "insensitive" } },
            {
              teamMemberships: {
                some: {
                  team: {
                    OR: [
                      { name: { contains: trimmed, mode: "insensitive" } },
                      { teamCode: { contains: trimmed, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        },
        include: {
          teamMemberships: {
            include: { team: true },
          },
          transportBookings: {
            include: {
              trip: {
                include: { route: true, vehicle: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 15,
      });

      const results = participants.map((p) => {
        const team = p.teamMemberships[0]?.team;
        const latestBooking = p.transportBookings[0];

        return {
          id: p.id,
          playerId: p.playerId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          institution: p.institution,
          category: p.category,
          gender: p.gender,
          hostel: p.hostel,
          room: p.room,
          qrCode: p.qrCode,
          team: team
            ? {
                id: team.id,
                teamCode: team.teamCode,
                name: team.name,
              }
            : null,
          currentAssignment: latestBooking
            ? {
                bookingId: latestBooking.id,
                tripId: latestBooking.tripId,
                tripCode: latestBooking.trip.tripCode,
                scheduledDate: latestBooking.trip.scheduledDate,
                scheduledTime: latestBooking.trip.scheduledTime,
                route: latestBooking.trip.route?.name || latestBooking.trip.routeName,
                vehicleNo: latestBooking.trip.vehicle?.registrationNumber || latestBooking.trip.vehicleNo,
                pickupPoint: latestBooking.pickupPoint,
                dropPoint: latestBooking.dropPoint,
                boardingStatus: latestBooking.boardingStatus,
                boardedAt: latestBooking.boardedAt ? latestBooking.boardedAt.toISOString() : null,
              }
            : null,
        };
      });

      return NextResponse.json({
        success: true,
        participants: results,
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/passengers/search:", error);
      return NextResponse.json(
        { success: false, error: "Failed to search participants." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);
