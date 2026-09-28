import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { name, email, phone, institution } = body;

      const trimmedName = name?.trim();
      const trimmedEmail = email?.trim().toLowerCase();
      const trimmedPhone = phone?.trim();
      const trimmedInst = institution?.trim();

      if (!trimmedName && !trimmedEmail && !trimmedPhone) {
        return NextResponse.json({ success: true, duplicates: [] });
      }

      // Build OR conditions to find matching participants
      const orConditions: any[] = [];

      if (trimmedEmail) {
        orConditions.push({ email: { equals: trimmedEmail, mode: "insensitive" } });
      }
      if (trimmedPhone) {
        // Strip out non-digits for flexible match
        const digits = trimmedPhone.replace(/\D/g, "");
        if (digits.length >= 8) {
          orConditions.push({ phone: { contains: digits.slice(-10) } });
        }
      }
      if (trimmedName && trimmedInst) {
        orConditions.push({
          AND: [
            { name: { equals: trimmedName, mode: "insensitive" } },
            { institution: { equals: trimmedInst, mode: "insensitive" } },
          ],
        });
      }

      if (orConditions.length === 0) {
        return NextResponse.json({ success: true, duplicates: [] });
      }

      const matches = await prisma.participant.findMany({
        where: { OR: orConditions },
        include: {
          teamMemberships: { include: { team: true } },
          documents: true,
        },
        take: 5,
      });

      return NextResponse.json({
        success: true,
        hasDuplicate: matches.length > 0,
        duplicates: matches.map((p) => ({
          id: p.id,
          playerId: p.playerId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          institution: p.institution,
          state: p.state,
          status: p.status,
          teamName: p.teamMemberships[0]?.team?.name || "Independent",
        })),
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.PARTICIPANT_READ],
  }
);
