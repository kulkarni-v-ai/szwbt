import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/live/matches
 * Filterable list of tournament matches for live operations.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const statusParam = searchParams.get("status")?.toUpperCase();
      const courtParam = searchParams.get("court");
      const categoryParam = searchParams.get("category");
      const dayId = searchParams.get("dayId");
      const search = searchParams.get("search")?.trim() || "";
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
      const skip = (page - 1) * limit;

      const where: any = {};

      if (statusParam && statusParam !== "ALL") {
        where.status = statusParam;
      }

      if (courtParam && courtParam !== "ALL") {
        where.court = { equals: courtParam, mode: "insensitive" };
      }

      if (categoryParam && categoryParam !== "ALL") {
        where.category = { equals: categoryParam, mode: "insensitive" };
      }

      if (dayId && dayId !== "ALL") {
        where.dayId = dayId;
      }

      if (search) {
        where.OR = [
          { matchNumber: { contains: search, mode: "insensitive" } },
          { playerA: { contains: search, mode: "insensitive" } },
          { institutionA: { contains: search, mode: "insensitive" } },
          { playerB: { contains: search, mode: "insensitive" } },
          { institutionB: { contains: search, mode: "insensitive" } },
          { court: { contains: search, mode: "insensitive" } },
        ];
      }

      const [totalCount, matches] = await Promise.all([
        prisma.match.count({ where }),
        prisma.match.findMany({
          where,
          include: {
            day: { select: { id: true, date: true, dayNumber: true, stage: true } },
            events: { orderBy: { timestamp: "desc" }, take: 3 },
          },
          orderBy: [{ status: "asc" }, { dayId: "asc" }, { time: "asc" }],
          skip,
          take: limit,
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          matches,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit) || 1,
          },
        },
      });
    } catch (error: any) {
      console.error("[GET /api/admin/live/matches] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_READ],
  }
);

/**
 * POST /api/admin/live/matches
 * Create and schedule a new tournament match.
 * Clearance: MATCH_CREATE or LIVE_OPERATE.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const {
        dayId,
        time,
        category,
        court,
        matchNumber,
        playerA,
        institutionA,
        playerB,
        institutionB,
        assignedOfficialId,
      } = body;

      // Validate required fields
      if (!dayId || !time || !category || !playerA || !playerB) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields: dayId, time, category, playerA, playerB are required.",
          },
          { status: 400 }
        );
      }

      // Check day exists
      const day = await prisma.tournamentDay.findUnique({
        where: { id: dayId },
      });
      if (!day) {
        return NextResponse.json(
          { success: false, error: `Tournament day '${dayId}' does not exist.` },
          { status: 400 }
        );
      }

      // If court is specified, check if court exists
      const assignedCourtName = court?.trim() || "TBA";
      if (assignedCourtName !== "TBA" && assignedCourtName !== "Unassigned") {
        const courtRecord = await prisma.court.findFirst({
          where: { courtNumber: { equals: assignedCourtName, mode: "insensitive" } },
        });

        // Double booking check: if attempting to create as LIVE directly, verify court is not occupied
        if (body.status === "LIVE") {
          const conflictingLiveMatch = await prisma.match.findFirst({
            where: {
              court: { equals: assignedCourtName, mode: "insensitive" },
              status: "LIVE",
            },
          });

          if (conflictingLiveMatch) {
            return NextResponse.json(
              {
                success: false,
                code: "COURT_CONFLICT",
                error: `COURT CONFLICT: ${assignedCourtName} is currently hosting active live match ${conflictingLiveMatch.matchNumber}. Please select another court or schedule as upcoming.`,
              },
              { status: 409 }
            );
          }
        }
      }

      // If official is specified, validate official exists and has MATCH_OFFICIAL role
      if (assignedOfficialId) {
        const official = await prisma.user.findFirst({
          where: {
            OR: [
              { id: assignedOfficialId },
              { officialId: assignedOfficialId },
              { email: assignedOfficialId },
            ],
            isActive: true,
            userRoles: { some: { role: { name: "MATCH_OFFICIAL" } } },
          },
        });

        if (!official) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid official ID '${assignedOfficialId}'. User must be active and hold MATCH_OFFICIAL role.`,
            },
            { status: 400 }
          );
        }
      }

      const count = await prisma.match.count({ where: { dayId } });
      const generatedMatchNumber =
        matchNumber?.trim() || `M-${dayId}-${(count + 1).toString().padStart(2, "0")}`;

      const newMatch = await prisma.match.create({
        data: {
          dayId,
          time: time.trim(),
          category: category.trim(),
          court: assignedCourtName,
          matchNumber: generatedMatchNumber,
          playerA: playerA.trim(),
          institutionA: institutionA?.trim() || "Independent",
          playerB: playerB.trim(),
          institutionB: institutionB?.trim() || "Independent",
          assignedOfficialId: assignedOfficialId || null,
          status: "UPCOMING",
          scoreA: "0",
          scoreB: "0",
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "MATCH_CREATED",
        resourceType: "match",
        resourceId: newMatch.id,
        metadata: {
          matchNumber: newMatch.matchNumber,
          category: newMatch.category,
          court: newMatch.court,
          time: newMatch.time,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Match ${newMatch.matchNumber} successfully created.`,
          data: newMatch,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("[POST /api/admin/live/matches] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_OPERATE, PERMISSIONS.MATCH_CREATE],
    permissionsMode: "ANY",
  }
);
