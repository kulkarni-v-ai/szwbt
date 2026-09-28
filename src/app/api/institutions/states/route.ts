import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/institutions/states
 * Returns distinct states from Institution master for dropdown population.
 * Sorted alphabetically.
 */
export async function GET(req: NextRequest) {
  try {
    const institutions = await prisma.institution.findMany({
      where: { status: "ACTIVE" },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    });

    const states = institutions.map((i) => i.state).filter(Boolean);

    // If no institutions exist yet, fall back to south zone states
    const fallbackStates = [
      "Andhra Pradesh",
      "Goa",
      "Karnataka",
      "Kerala",
      "Maharashtra",
      "Puducherry",
      "Tamil Nadu",
      "Telangana",
    ];

    return NextResponse.json({
      success: true,
      states: states.length > 0 ? states : fallbackStates,
      isFallback: states.length === 0,
    });
  } catch (err: any) {
    console.error("[INSTITUTIONS_STATES_ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
