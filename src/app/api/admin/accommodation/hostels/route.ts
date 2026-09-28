import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/accommodation/hostels
 * Returns all configured hostels with calculated real database counts.
 * ZERO hardcoded counts.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const hostels = await prisma.hostel.findMany({
        include: {
          floors: {
            orderBy: { floorNumber: "asc" },
          },
          rooms: {
            include: {
              beds: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const formatted = hostels.map((h) => {
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;

        h.rooms.forEach((r) => {
          totalBeds += r.beds.length;
          r.beds.forEach((b) => {
            if (b.status === "OCCUPIED") occupiedBeds++;
            else if (b.status === "AVAILABLE") availableBeds++;
          });
        });

        return {
          id: h.id,
          name: h.name,
          code: h.code || h.id,
          description: h.description,
          status: h.status,
          genderAllowed: h.genderAllowed,
          floorsCount: h.floors.length,
          roomsCount: h.rooms.length,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
        };
      });

      return NextResponse.json({
        success: true,
        hostels: formatted,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to load hostels." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);

/**
 * POST /api/admin/accommodation/hostels
 * Creates a new Hostel record.
 * Super Admin clearance only.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { name, code, description, genderAllowed, totalFloors } = body;

      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Hostel Name is required." },
          { status: 400 }
        );
      }

      const cleanCode = (code || name.replace(/[^A-Za-z0-9]/g, "").toUpperCase()).trim();

      // Check unique code
      const existing = await prisma.hostel.findFirst({
        where: {
          OR: [
            { code: cleanCode },
            { name: { equals: name.trim(), mode: "insensitive" } },
          ],
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `A hostel with code '${cleanCode}' or name '${name}' already exists.` },
          { status: 409 }
        );
      }

      const newHostel = await prisma.hostel.create({
        data: {
          name: name.trim(),
          code: cleanCode,
          description: description?.trim() || null,
          genderAllowed: genderAllowed || "ANY",
          totalFloors: Number(totalFloors) || 1,
          status: "ACTIVE",
        },
      });

      // Default Ground Floor creation
      await prisma.floor.create({
        data: {
          hostelId: newHostel.id,
          name: "Ground Floor",
          floorNumber: 0,
          status: "ACTIVE",
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "HOSTEL_CREATED",
        resourceType: "accommodation",
        resourceId: newHostel.id,
        metadata: {
          name: newHostel.name,
          code: newHostel.code,
          genderAllowed: newHostel.genderAllowed,
        },
      });

      return NextResponse.json({
        success: true,
        hostel: newHostel,
        message: "Hostel created successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to create hostel." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
