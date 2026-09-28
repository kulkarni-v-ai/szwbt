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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const announcementId = searchParams.get("announcementId");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (channel && channel !== "ALL") {
      where.channel = channel;
    }
    if (announcementId) {
      where.announcementId = announcementId;
    }

    const deliveries = await prisma.notificationDelivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            category: true,
            priority: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      total: deliveries.length,
      deliveries,
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/deliveries:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
