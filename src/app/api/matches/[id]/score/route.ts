import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

export const POST = withAuth(
  async (req: NextRequest, context: UserContext, routeProps: any) => {
    try {
      const resolvedParams = await Promise.resolve(routeProps?.params || {});
      const matchId = resolvedParams.id;

      if (!matchId) {
        return NextResponse.json({ success: false, error: "Match ID is required." }, { status: 400 });
      }

      const body = await req.json();
      const { scoreA, scoreB, pointTo, eventType } = body;

      // 1. Fetch Match from DB
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });
      }

      // 2. RESOURCE-LEVEL AUTHORIZATION CHECK
      // Official must be assigned to this match, or Super/Tournament Admin
      const isSuper = context.roles.includes("SUPER_ADMIN") || context.roles.includes("TOURNAMENT_ADMIN");
      const isAssigned =
        match.assignedOfficialId &&
        (match.assignedOfficialId === context.user.officialId ||
          match.assignedOfficialId === context.user.id ||
          match.assignedOfficialId === context.user.email);

      if (!isSuper && !isAssigned) {
        return NextResponse.json(
          {
            success: false,
            error: `403 Forbidden: Match Official is not assigned to match ${matchId}. Access denied.`,
          },
          { status: 403 }
        );
      }

      // 3. Update Match Score
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          scoreA: scoreA !== undefined ? String(scoreA) : match.scoreA,
          scoreB: scoreB !== undefined ? String(scoreB) : match.scoreB,
          status: "LIVE",
        },
      });

      // 4. Record Match Event
      if (pointTo) {
        await prisma.matchEvent.create({
          data: {
            matchId: match.id,
            pointTo,
            scoreA: typeof scoreA === "number" ? scoreA : parseInt(match.scoreA || "0", 10),
            scoreB: typeof scoreB === "number" ? scoreB : parseInt(match.scoreB || "0", 10),
            eventType: eventType || "POINT",
            officialId: context.user.officialId || context.user.id,
          },
        });
      }

      // 5. Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "SCORE_UPDATED",
        resourceType: "match",
        resourceId: match.id,
        metadata: {
          scoreA,
          scoreB,
          pointTo,
          officialEmail: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        match: updatedMatch,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.SCORING_UPDATE],
  }
);
