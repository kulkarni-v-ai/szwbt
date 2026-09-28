import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOrganizerClearance } from "@/lib/organizer/auth";
import { hasPermission } from "@/lib/rbac/service";
import { PERMISSIONS } from "@/lib/rbac/permissions";
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

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });

    const canCreate = hasPermission(context, PERMISSIONS.ANNOUNCEMENT_CREATE);
    const canPublish = hasPermission(context, PERMISSIONS.ANNOUNCEMENT_PUBLISH);

    return NextResponse.json({
      success: true,
      canCreate,
      canPublish,
      total: announcements.length,
      publishedCount: announcements.filter((a) => a.isPublished).length,
      announcements,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/announcements:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    if (!hasPermission(context, PERMISSIONS.ANNOUNCEMENT_CREATE)) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to broadcast announcements." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, targetAudience, isPublished } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Title and content are required." },
        { status: 400 }
      );
    }

    const validAudiences = ["ALL", "PARTICIPANTS", "TEAMS", "OFFICIALS", "VOLUNTEERS", "ACCOMMODATION", "TRANSPORT"];
    const audience = validAudiences.includes(targetAudience) ? targetAudience : "ALL";

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        targetAudience: audience,
        isPublished: isPublished !== false,
        authorEmail: context.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (err: any) {
    console.error("Error in POST /api/organizer/announcements:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
