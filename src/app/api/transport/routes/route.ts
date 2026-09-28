import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/transport/routes
 * List all configured routes with pickup points/stops and active trip counts.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const routes = await prisma.transportRoute.findMany({
        include: {
          stops: {
            orderBy: { orderIndex: "asc" },
          },
          trips: {
            select: {
              id: true,
              tripCode: true,
              status: true,
              scheduledTime: true,
            },
          },
        },
        orderBy: { code: "asc" },
      });

      const formatted = routes.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        origin: r.origin,
        destination: r.destination,
        estimatedMinutes: r.estimatedMinutes,
        status: r.status,
        stops: r.stops.map((s) => ({
          id: s.id,
          name: s.name,
          orderIndex: s.orderIndex,
          expectedMinutes: s.expectedMinutes,
        })),
        activeTripsCount: r.trips.filter((t) => ["BOARDING", "DEPARTED", "IN_TRANSIT"].includes(t.status)).length,
        totalTripsCount: r.trips.length,
      }));

      return NextResponse.json({
        success: true,
        routes: formatted,
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/routes:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch routes." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);

/**
 * POST /api/transport/routes
 * Create a new route with stops.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { code, name, origin, destination, estimatedMinutes, stops } = body;

      if (!code || !name || !origin || !destination) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: code, name, origin, destination." },
          { status: 400 }
        );
      }

      // Check code uniqueness
      const existing = await prisma.transportRoute.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Route code ${code} is already in use.` },
          { status: 409 }
        );
      }

      const newRoute = await prisma.transportRoute.create({
        data: {
          code,
          name,
          origin,
          destination,
          estimatedMinutes: parseInt(estimatedMinutes) || 30,
          stops: {
            create: Array.isArray(stops)
              ? stops.map((s: any, idx: number) => ({
                  name: typeof s === "string" ? s : s.name,
                  orderIndex: typeof s === "object" && s.orderIndex !== undefined ? s.orderIndex : idx + 1,
                  expectedMinutes: typeof s === "object" && s.expectedMinutes !== undefined ? s.expectedMinutes : idx * 10,
                }))
              : [],
          },
        },
        include: { stops: true },
      });

      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "ROUTE_CREATED",
        resourceType: "transport",
        resourceId: newRoute.id,
        metadata: { code: newRoute.code, name: newRoute.name, origin, destination },
      });

      return NextResponse.json({ success: true, route: newRoute });
    } catch (error: any) {
      console.error("Error in POST /api/transport/routes:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create route: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_MANAGE_ROUTE],
  }
);
