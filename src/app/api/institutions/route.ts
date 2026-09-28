import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/institutions
 * Public institution listing for registration dropdowns.
 * Supports state filter, search, and status filter.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");
    const search = searchParams.get("q") || searchParams.get("search");
    const status = searchParams.get("status") || "ACTIVE";
    const limit = parseInt(searchParams.get("limit") || "200");

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (state && state !== "ALL") {
      where.state = { equals: state, mode: "insensitive" };
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { institutionCode: { contains: search.trim(), mode: "insensitive" } },
        { city: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const institutions = await prisma.institution.findMany({
      where,
      orderBy: [{ state: "asc" }, { name: "asc" }],
      take: limit,
      select: {
        id: true,
        institutionCode: true,
        name: true,
        state: true,
        city: true,
        district: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: institutions.length,
      institutions,
    });
  } catch (err: any) {
    console.error("[INSTITUTIONS_GET_ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
