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
        allocated: false,
        accommodation: null,
        message: "No athlete record linked.",
      });
    }

    // Find active accommodation allocation
    const allocation = await prisma.accommodationAllocation.findFirst({
      where: {
        participantId: participant.id,
        status: "ACTIVE",
      },
      include: {
        bed: {
          include: {
            room: {
              include: {
                hostel: true,
                floor: true,
              },
            },
          },
        },
      },
    });

    // Check separate accommodation payment status
    const accommLedger = await prisma.feeLedger.findFirst({
      where: {
        participantId: participant.id,
        category: "ACCOMMODATION",
      },
    });

    if (!allocation) {
      return NextResponse.json({
        success: true,
        allocated: false,
        accommodation: null,
        paymentStatus: accommLedger ? accommLedger.status : "NO PAYMENT RECORD",
        message: "NOT ALLOCATED: Accommodation allocation pending warden desk assignment.",
      });
    }

    const bed = allocation.bed;
    const room = bed.room;
    const hostel = room.hostel;
    const floor = room.floor;

    // Fetch roommates in the same room (privacy-limited: names and institution only)
    const otherBedsInRoom = await prisma.accommodationAllocation.findMany({
      where: {
        bed: { roomId: room.id },
        status: "ACTIVE",
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            institution: true,
            category: true,
          },
        },
        bed: {
          select: {
            bedNumber: true,
          },
        },
      },
    });

    const roomOccupants = otherBedsInRoom.map((alloc) => ({
      bedNumber: alloc.bed.bedNumber,
      name: alloc.participant ? alloc.participant.name : "Occupied",
      institution: alloc.participant ? alloc.participant.institution : "—",
      isMe: alloc.participant?.id === participant.id,
    }));

    return NextResponse.json({
      success: true,
      allocated: true,
      accommodation: {
        hostelName: hostel.name,
        hostelCode: hostel.code,
        genderAllowed: hostel.genderAllowed,
        floorName: floor ? floor.name : room.floorNumber || "Floor 1",
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        roomCapacity: room.capacity,
        checkInDate: allocation.checkInDate,
        status: allocation.status,
        wardenDeskNotice:
          "Room keys and linen kits must be collected in person at Hostel Reception upon arrival.",
        roomOccupants,
      },
      paymentStatus: accommLedger
        ? {
            amountDue: accommLedger.amountDue,
            amountPaid: accommLedger.amountPaid,
            balance: accommLedger.balance,
            status: accommLedger.status,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/accommodation:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
