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

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { teamCode: { contains: q, mode: "insensitive" } },
        { institution: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
      ];
    }
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        members: {
          include: {
            participant: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        bedAllocations: {
          where: { status: "ACTIVE" },
        },
        transportBookings: true,
      },
      orderBy: { name: "asc" },
    });

    const formatted = teams.map((t) => {
      const totalMembers = t.members.length;
      const accreditedMembers = t.members.filter(
        (m) => m.participant.status === "APPROVED"
      ).length;

      return {
        id: t.id,
        teamCode: t.teamCode,
        name: t.name,
        institution: t.institution,
        state: t.state,
        managerName: t.managerName || "Not Designated",
        managerPhone: t.managerPhone || "—",
        captainName: t.captainName || "Not Designated",
        status: t.status,
        memberCount: totalMembers,
        accreditedCount: accreditedMembers,
        bedAllocationsCount: t.bedAllocations.length,
        transportBookingsCount: t.transportBookings.length,
        teamQrToken: t.teamQrToken,
      };
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      teams: formatted,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/teams:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
