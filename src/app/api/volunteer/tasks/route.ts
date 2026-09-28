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
    const isSuperAdmin = authResult.context.roles.includes("SUPER_ADMIN");

    // Super Admin can view all or specify volunteerId
    const targetUserId =
      isSuperAdmin && req.nextUrl.searchParams.get("volunteerId")
        ? req.nextUrl.searchParams.get("volunteerId")!
        : userId;

    const status = req.nextUrl.searchParams.get("status");

    const where: any = { userId: targetUserId };
    if (status && status !== "ALL") {
      where.status = status;
    }

    const tasks = await prisma.volunteerTask.findMany({
      where,
      include: { assignment: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      success: true,
      tasks,
      total: tasks.length,
    });
  } catch (error: any) {
    console.error("Volunteer tasks list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load volunteer tasks." },
      { status: 500 }
    );
  }
}
