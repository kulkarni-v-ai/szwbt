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
    const search = searchParams.get("search");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");
    const audience = searchParams.get("audience");
    const creator = searchParams.get("creator");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (audience && audience !== "ALL") {
      where.targetAudience = audience;
    }

    if (channel && channel !== "ALL") {
      where.channels = { contains: channel, mode: "insensitive" };
    }

    if (creator && creator.trim()) {
      where.OR = [
        { authorEmail: { contains: creator.trim(), mode: "insensitive" } },
        { authorName: { contains: creator.trim(), mode: "insensitive" } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          where.createdAt.gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          where.createdAt.lte = toDate;
        }
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const existingOr = where.OR || [];
      where.OR = [
        ...existingOr,
        { id: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { authorEmail: { contains: q, mode: "insensitive" } },
        { targetAudience: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          deliveries: {
            take: 5,
            select: {
              id: true,
              channel: true,
              recipient: true,
              status: true,
              sentAt: true,
              deliveredAt: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/history:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
