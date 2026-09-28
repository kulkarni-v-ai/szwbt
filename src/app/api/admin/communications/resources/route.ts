import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const commAuth = verifyCommunicationsClearance(context);
    if (commAuth.errorResponse) {
      return commAuth.errorResponse;
    }

    const [teams, courts, hostels, venues] = await Promise.all([
      prisma.team.findMany({
        select: { id: true, teamCode: true, name: true, institution: true },
        take: 30,
        orderBy: { name: "asc" },
      }),
      prisma.court.findMany({
        select: { id: true, courtNumber: true, status: true },
        orderBy: { courtNumber: "asc" },
      }),
      prisma.hostel.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.venueArea.findMany({
        select: { id: true, name: true, category: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      resources: {
        teams: teams.map((t) => ({ label: `${t.teamCode} — ${t.name} (${t.institution})`, value: `team:${t.teamCode}` })),
        courts: courts.map((c) => ({ label: `${c.courtNumber} [${c.status}]`, value: `court:${c.courtNumber}` })),
        hostels: hostels.map((h) => ({ label: `${h.name} (${h.code || "HOSTEL"})`, value: `hostel:${h.code || h.name}` })),
        venues: venues.map((v) => ({ label: `${v.name} [${v.category}]`, value: `venue:${v.name}` })),
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/resources:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
