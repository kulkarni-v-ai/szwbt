import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyVolunteerClearance } from "@/lib/volunteer/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const userId = authResult.context.user.id;

    const assignments = await prisma.volunteerAssignment.findMany({
      where: { userId },
      include: {
        tasks: {
          select: { id: true, title: true, priority: true, status: true, dueTime: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group assignments into Today, Upcoming, Completed
    const today = assignments.filter((a) => a.status === "ACTIVE" || a.status === "ASSIGNED");
    const completed = assignments.filter((a) => a.status === "COMPLETED");

    return NextResponse.json({
      success: true,
      today,
      upcoming: assignments.filter((a) => a.status === "ASSIGNED" && a.id !== today[0]?.id),
      completed,
      total: assignments.length,
    });
  } catch (error: any) {
    console.error("Volunteer assignments list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load volunteer assignments." },
      { status: 500 }
    );
  }
}
