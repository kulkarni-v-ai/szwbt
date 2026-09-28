import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySupportClearance } from "@/lib/support/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const supportAuth = verifySupportClearance(context);
    if (supportAuth.errorResponse) {
      return supportAuth.errorResponse;
    }

    const [participants, teams, courts, hostels] = await Promise.all([
      prisma.participant.findMany({
        select: { id: true, name: true, email: true, institution: true },
        take: 30,
        orderBy: { name: "asc" },
      }),
      prisma.team.findMany({
        select: { id: true, teamCode: true, name: true, institution: true },
        take: 20,
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
    ]);

    return NextResponse.json({
      success: true,
      resources: {
        participants: participants.map((p) => ({
          label: `${p.name} (${p.institution}) — ${p.email}`,
          value: p.id,
          email: p.email,
          name: p.name,
        })),
        teams: teams.map((t) => ({
          label: `${t.teamCode}: ${t.name} (${t.institution})`,
          value: t.teamCode,
        })),
        courts: courts.map((c) => ({
          label: `${c.courtNumber} [${c.status}]`,
          value: c.courtNumber,
        })),
        hostels: hostels.map((h) => ({
          label: `${h.name} (${h.code || "HOSTEL"})`,
          value: h.code || h.name,
        })),
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/support/resources:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
