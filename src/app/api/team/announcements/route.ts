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

    // Query announcements targeted to ALL or TEAMS
    const announcements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        targetAudience: { in: ["ALL", "TEAMS"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const categoryMap = (title: string, content: string): string => {
      const lower = (title + " " + content).toLowerCase();
      if (lower.includes("match") || lower.includes("fixture") || lower.includes("court") || lower.includes("draw")) return "MATCH";
      if (lower.includes("transport") || lower.includes("bus") || lower.includes("shuttle") || lower.includes("airport")) return "TRANSPORT";
      if (lower.includes("hostel") || lower.includes("room") || lower.includes("bed") || lower.includes("dining") || lower.includes("meal")) return "ACCOMMODATION";
      if (lower.includes("register") || lower.includes("document") || lower.includes("fee") || lower.includes("payment")) return "REGISTRATION";
      if (lower.includes("pass") || lower.includes("security") || lower.includes("urgent") || lower.includes("meeting") || lower.includes("briefing")) return "IMPORTANT";
      return "GENERAL";
    };

    const formatted = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      targetAudience: a.targetAudience,
      category: categoryMap(a.title, a.content),
      authorEmail: a.authorEmail,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({
      success: true,
      totalCount: formatted.length,
      announcements: formatted,
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/announcements:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
