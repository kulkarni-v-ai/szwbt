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
      regStatusCounts,
      categoryCounts,
      stateCounts,
      matchStatusCounts,
      hostels,
      allocatedBedsCount,
      totalBedsCount,
    ] = await Promise.all([
      prisma.participant.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.participant.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
      prisma.participant.groupBy({
        by: ["state"],
        _count: { id: true },
      }),
      prisma.match.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.hostel.findMany({
        include: {
          rooms: {
            include: {
              beds: {
                include: {
                  allocations: { where: { status: "ACTIVE" } },
                },
              },
            },
          },
        },
      }),
      prisma.accommodationAllocation.count({ where: { status: "ACTIVE" } }),
      prisma.bed.count(),
    ]);

    const hostelOccupancy = hostels.map((h) => {
      let cap = 0;
      let occ = 0;
      h.rooms.forEach((r) => {
        cap += r.beds.length;
        r.beds.forEach((b) => {
          if (b.allocations.length > 0) occ++;
        });
      });
      return {
        name: h.name,
        capacity: cap,
        occupied: occ,
        available: Math.max(0, cap - occ),
        rate: cap > 0 ? Math.round((occ / cap) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      registrationDistribution: regStatusCounts.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      categoryDistribution: categoryCounts.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      stateDistribution: stateCounts.map((s) => ({
        state: s.state,
        count: s._count.id,
      })),
      matchDistribution: matchStatusCounts.map((m) => ({
        status: m.status,
        count: m._count.id,
      })),
      accommodation: {
        totalBeds: totalBedsCount,
        allocatedBeds: allocatedBedsCount,
        hostels: hostelOccupancy,
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/reports:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
