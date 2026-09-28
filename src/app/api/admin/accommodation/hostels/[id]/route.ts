import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/accommodation/hostels/[id]
 * Returns single hostel with floors, rooms, and beds.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const hostel = await prisma.hostel.findUnique({
        where: { id },
        include: {
          floors: {
            orderBy: { floorNumber: "asc" },
            include: {
              rooms: {
                include: {
                  beds: {
                    include: {
                      allocations: {
                        where: { status: "ACTIVE" },
                        include: {
                          participant: true,
                          team: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          rooms: {
            include: {
              beds: {
                include: {
                  allocations: {
                    where: { status: "ACTIVE" },
                    include: {
                      participant: true,
                      team: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!hostel) {
        return NextResponse.json(
          { success: false, error: "Hostel not found." },
          { status: 404 }
        );
      }

      let totalBeds = 0;
      let occupiedBeds = 0;
      let availableBeds = 0;

      hostel.rooms.forEach((r) => {
        totalBeds += r.beds.length;
        r.beds.forEach((b) => {
          if (b.status === "OCCUPIED") occupiedBeds++;
          else if (b.status === "AVAILABLE") availableBeds++;
        });
      });

      return NextResponse.json({
        success: true,
        hostel: {
          ...hostel,
          totalBeds,
          occupiedBeds,
          availableBeds,
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to load hostel." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);

/**
 * PATCH /api/admin/accommodation/hostels/[id]
 * Updates hostel details or status.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { name, code, description, genderAllowed, status } = body;

      const existing = await prisma.hostel.findUnique({
        where: { id },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Hostel not found." },
          { status: 404 }
        );
      }

      const updated = await prisma.hostel.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          code: code !== undefined ? code.trim().toUpperCase() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          genderAllowed: genderAllowed !== undefined ? genderAllowed : undefined,
          status: status !== undefined ? status : undefined,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: status === "INACTIVE" ? "HOSTEL_DEACTIVATED" : "HOSTEL_UPDATED",
        resourceType: "accommodation",
        resourceId: id,
        metadata: {
          previous: { name: existing.name, status: existing.status },
          updated: { name: updated.name, status: updated.status },
        },
      });

      return NextResponse.json({
        success: true,
        hostel: updated,
        message: "Hostel updated successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to update hostel." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
