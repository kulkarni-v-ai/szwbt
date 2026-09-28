import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/participants
 * Returns registered participants for registration desk and official rosters.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const participants = await prisma.participant.findMany({
      include: {
        institutionRef: {
          select: { id: true, name: true, state: true, institutionCode: true },
        },
        teamMemberships: {
          include: {
            team: {
              select: { id: true, teamCode: true, name: true, institution: true, state: true },
            },
          },
        },
        qrPasses: {
          where: { status: "ACTIVE" },
          take: 1,
        },
        bedAllocations: {
          where: { status: "ACTIVE" },
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
          take: 1,
        },
        documents: {
          select: { id: true, type: true, status: true, fileName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = participants.map((p) => {
      const activeBed = p.bedAllocations[0]?.bed;
      const activeRoom = activeBed?.room;
      const activeHostel = activeRoom?.hostel;
      const activeFloor = activeRoom?.floor;
      const activeQr = p.qrPasses[0]?.token || p.qrCode;

      return {
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        state: p.state,
        institution: p.institution,
        institutionId: p.institutionId,
        category: p.category,
        gender: p.gender,
        status: p.status,
        photoUrl: p.photoUrl,
        hostel: activeHostel?.name || p.hostel || "Shalmala Hostel",
        floor: activeFloor?.name || activeRoom?.floorNumber || "Floor 01",
        room: activeRoom?.roomNumber || p.room || "—",
        bed: activeBed?.bedNumber || "—",
        qrToken: activeQr || `sz26_part_${p.playerId}`,
        documentsStatus:
          p.documents.length > 0 && p.documents.every((d) => d.status === "VERIFIED")
            ? "VERIFIED"
            : p.documents.length > 0
            ? "PENDING"
            : "DOCUMENTS_PENDING",
        createdAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      count: mapped.length,
      participants: mapped,
    });
  } catch (error: any) {
    console.error("[GET /api/participants] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch participants.", details: error.message },
      { status: 500 }
    );
  }
}
