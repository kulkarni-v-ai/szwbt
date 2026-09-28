import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { selectedTeamId } = teamAuth;
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        members: [],
        message: "No team assigned.",
      });
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: selectedTeamId },
      include: {
        participant: {
          include: {
            documents: {
              select: {
                id: true,
                type: true,
                fileName: true,
                status: true,
                updatedAt: true,
              },
            },
            bedAllocations: {
              where: { status: "ACTIVE" },
              include: {
                bed: {
                  include: {
                    room: {
                      include: {
                        hostel: true,
                      },
                    },
                  },
                },
              },
            },
            transportBookings: {
              include: {
                trip: {
                  include: {
                    route: true,
                    vehicle: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const members = teamMembers.map((tm) => {
      const p = tm.participant;
      const bedAlloc = p.bedAllocations[0];
      const transportBooking = p.transportBookings[0];

      return {
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        institution: p.institution,
        state: p.state,
        category: p.category,
        gender: p.gender,
        registrationStatus: p.status,
        teamRole: tm.role,
        documents: p.documents.map((d) => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          status: d.status,
          updatedAt: d.updatedAt,
        })),
        accommodation: bedAlloc
          ? {
              hostel: bedAlloc.bed.room.hostel.name,
              roomNumber: bedAlloc.bed.room.roomNumber,
              bedNumber: bedAlloc.bed.bedNumber,
              status: bedAlloc.status,
            }
          : {
              hostel: p.hostel || "NOT ALLOCATED",
              roomNumber: p.room || "—",
              bedNumber: "—",
              status: "PENDING",
            },
        transport: transportBooking
          ? {
              tripCode: transportBooking.trip.tripCode,
              routeName: transportBooking.trip.route?.name || transportBooking.trip.routeName || "Official Shuttle",
              pickupPoint: transportBooking.pickupPoint,
              dropPoint: transportBooking.dropPoint,
              boardingStatus: transportBooking.boardingStatus,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      totalCount: members.length,
      members,
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/members:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
