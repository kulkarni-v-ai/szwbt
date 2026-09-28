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

    const [user, latestShift, activeAssignment] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: { include: { role: true } },
        },
      }),
      prisma.volunteerShift.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.volunteerAssignment.findFirst({
        where: { userId, status: { in: ["ACTIVE", "ASSIGNED"] } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Volunteer user not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        volunteerCode: `VLT-2026-${user.id.slice(-4).toUpperCase()}`,
        name: user.name,
        email: user.email,
        badge: user.badge || "MOBILE FIELD",
        role: "Field Operations Volunteer",
        roles: user.userRoles.map((ur) => ur.role.displayName),
        assignedArea: activeAssignment ? `${activeAssignment.venue} — ${activeAssignment.area}` : "Unassigned",
        supervisor: activeAssignment ? activeAssignment.supervisor : "Venue Director Desk",
        supervisorPhone: activeAssignment ? activeAssignment.supervisorPhone : null,
        currentStatus: latestShift ? latestShift.status : "NOT_STARTED",
        shiftStart: activeAssignment ? activeAssignment.shiftStart : null,
        shiftEnd: activeAssignment ? activeAssignment.shiftEnd : null,
      },
    });
  } catch (error: any) {
    console.error("Volunteer profile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load volunteer profile." },
      { status: 500 }
    );
  }
}
