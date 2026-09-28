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

    const announcements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        targetAudience: { in: ["ALL", "PARTICIPANTS"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = announcements.map((a) => {
      // Deduce operational category tag from title/content
      const text = `${a.title} ${a.content}`.toUpperCase();
      let category = "GENERAL";
      if (text.includes("MATCH") || text.includes("COURT") || text.includes("FIXTURE")) {
        category = "MATCH";
      } else if (text.includes("HOSTEL") || text.includes("ROOM") || text.includes("ACCOMMODATION")) {
        category = "ACCOMMODATION";
      } else if (text.includes("BUS") || text.includes("SHUTTLE") || text.includes("TRANSPORT")) {
        category = "TRANSPORT";
      } else if (text.includes("REGISTRATION") || text.includes("DOCUMENT") || text.includes("ACCREDITATION")) {
        category = "REGISTRATION";
      } else if (text.includes("URGENT") || text.includes("MANDATORY") || text.includes("IMPORTANT")) {
        category = "IMPORTANT";
      }

      return {
        id: a.id,
        title: a.title,
        content: a.content,
        category,
        targetAudience: a.targetAudience,
        authorEmail: a.authorEmail,
        createdAt: a.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      announcements: formatted,
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/announcements:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
