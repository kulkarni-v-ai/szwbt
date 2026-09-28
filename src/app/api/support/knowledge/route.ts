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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = { isPublished: true };
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { content: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const articles = await prisma.supportKnowledgeArticle.findMany({
      where,
      orderBy: { viewCount: "desc" },
    });

    return NextResponse.json({
      success: true,
      articles,
    });
  } catch (err: any) {
    console.error("Error in GET /api/support/knowledge:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
