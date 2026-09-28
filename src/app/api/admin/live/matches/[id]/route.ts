import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/live/matches/[id]
 * Fetch single match details with events history and assigned official.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          day: true,
          events: { orderBy: { timestamp: "asc" } },
        },
      });

      if (!match) {
        return NextResponse.json(
          { success: false, error: "Match not found." },
          { status: 404 }
        );
      }

      // Resolve assigned official details
      let official = null;
      if (match.assignedOfficialId) {
        official = await prisma.user.findFirst({
          where: {
            OR: [
              { id: match.assignedOfficialId },
              { officialId: match.assignedOfficialId },
              { email: match.assignedOfficialId },
            ],
          },
          select: { id: true, name: true, email: true, officialId: true, badge: true },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          match,
          official,
        },
      });
    } catch (error: any) {
      console.error("[GET /api/admin/live/matches/[id]] Error:", error);
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
 * PATCH /api/admin/live/matches/[id]
 * Authoritative operational match control: START, PAUSE, RESUME, COMPLETE,
 * WALKOVER, RETIRE, ASSIGN_COURT, ASSIGN_OFFICIAL, UPDATE_SCORE, PUBLISH_RESULT.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const {
        action,
        reason,
        notes,
        winner,
        courtNumber,
        officialId,
        scoreA,
        scoreB,
      } = body;

      const match = await prisma.match.findUnique({
        where: { id },
      });

      if (!match) {
        return NextResponse.json(
          { success: false, error: "Match not found." },
          { status: 404 }
        );
      }

      // ── ACTION: START ──────────────────────────────────────────────────
      if (action === "START") {
        if (match.status === "COMPLETED") {
          return NextResponse.json(
            { success: false, error: "Cannot start a match that is already COMPLETED." },
            { status: 400 }
          );
        }

        // Concurrency / Conflict Check: Is the assigned court already hosting a LIVE match?
        if (match.court && match.court !== "TBA" && match.court !== "Unassigned") {
          const conflictingMatch = await prisma.match.findFirst({
            where: {
              id: { not: match.id },
              court: { equals: match.court, mode: "insensitive" },
              status: "LIVE",
            },
          });

          if (conflictingMatch) {
            return NextResponse.json(
              {
                success: false,
                code: "COURT_CONFLICT",
                error: `COURT CONFLICT: ${match.court} is currently occupied by active match ${conflictingMatch.matchNumber}. Please wait or reassign court.`,
              },
              { status: 409 }
            );
          }
        }

        const updated = await prisma.$transaction(async (tx) => {
          // Update match status to LIVE
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "LIVE",
              actualStartTime: match.actualStartTime || new Date(),
              interruptionReason: null,
              interruptionNotes: null,
            },
          });

          // Update court status to LIVE if court exists
          if (match.court && match.court !== "TBA") {
            await tx.court.updateMany({
              where: { courtNumber: { equals: match.court, mode: "insensitive" } },
              data: { status: "LIVE" },
            });
          }

          // Record match event
          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: "PLAYER_A",
              scoreA: parseInt(match.scoreA || "0", 10),
              scoreB: parseInt(match.scoreB || "0", 10),
              eventType: "START",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "MATCH_STARTED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            court: match.court,
            previousStatus: match.status,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} started on ${match.court}.`,
          data: updated,
        });
      }

      // ── ACTION: PAUSE ──────────────────────────────────────────────────
      if (action === "PAUSE") {
        if (match.status !== "LIVE") {
          return NextResponse.json(
            { success: false, error: `Cannot pause match with status ${match.status}. Only LIVE matches can be paused.` },
            { status: 400 }
          );
        }

        const pauseReason = reason?.trim() || "Operational Intervention";

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "PAUSED",
              interruptionReason: pauseReason,
              interruptionNotes: notes?.trim() || null,
            },
          });

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: "PLAYER_A",
              scoreA: parseInt(match.scoreA || "0", 10),
              scoreB: parseInt(match.scoreB || "0", 10),
              eventType: "PAUSE",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "MATCH_PAUSED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            court: match.court,
            reason: pauseReason,
            notes: notes?.trim() || null,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} paused (${pauseReason}).`,
          data: updated,
        });
      }

      // ── ACTION: RESUME ─────────────────────────────────────────────────
      if (action === "RESUME") {
        if (match.status !== "PAUSED") {
          return NextResponse.json(
            { success: false, error: `Cannot resume match with status ${match.status}. Only PAUSED matches can be resumed.` },
            { status: 400 }
          );
        }

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "LIVE",
              interruptionReason: null,
              interruptionNotes: null,
            },
          });

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: "PLAYER_A",
              scoreA: parseInt(match.scoreA || "0", 10),
              scoreB: parseInt(match.scoreB || "0", 10),
              eventType: "RESUME",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "MATCH_RESUMED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            court: match.court,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} resumed to LIVE.`,
          data: updated,
        });
      }

      // ── ACTION: COMPLETE ───────────────────────────────────────────────
      if (action === "COMPLETE") {
        if (match.status === "COMPLETED") {
          return NextResponse.json(
            { success: false, error: "Match is already marked COMPLETED." },
            { status: 400 }
          );
        }

        if (!winner || !["PLAYER_A", "PLAYER_B"].includes(winner)) {
          return NextResponse.json(
            { success: false, error: "Winner is required to complete match ('PLAYER_A' or 'PLAYER_B')." },
            { status: 400 }
          );
        }

        const winnerName = winner === "PLAYER_A" ? match.playerA : match.playerB;

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "COMPLETED",
              winner,
              actualEndTime: new Date(),
              isPublished: true, // Auto-mark ready for public results
            },
          });

          // Free up court back to READY if no other active match
          if (match.court && match.court !== "TBA") {
            const otherActiveOnCourt = await tx.match.findFirst({
              where: {
                id: { not: match.id },
                court: { equals: match.court, mode: "insensitive" },
                status: "LIVE",
              },
            });
            if (!otherActiveOnCourt) {
              await tx.court.updateMany({
                where: { courtNumber: { equals: match.court, mode: "insensitive" } },
                data: { status: "READY" },
              });
            }
          }

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: winner,
              scoreA: parseInt(match.scoreA || "0", 10),
              scoreB: parseInt(match.scoreB || "0", 10),
              eventType: "MATCH_WON",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "MATCH_COMPLETED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            winner,
            winnerName,
            finalScoreA: match.scoreA,
            finalScoreB: match.scoreB,
            court: match.court,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} completed. Winner: ${winnerName}. Court freed.`,
          data: updated,
        });
      }

      // ── ACTION: WALKOVER ───────────────────────────────────────────────
      if (action === "WALKOVER") {
        if (!winner || !["PLAYER_A", "PLAYER_B"].includes(winner)) {
          return NextResponse.json(
            { success: false, error: "Winner is required for walkover ('PLAYER_A' or 'PLAYER_B')." },
            { status: 400 }
          );
        }

        const walkoverReason = reason?.trim() || "Walkover granted by Tournament Referee";
        const winnerName = winner === "PLAYER_A" ? match.playerA : match.playerB;

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "COMPLETED",
              winner,
              interruptionReason: `Walkover: ${walkoverReason}`,
              actualEndTime: new Date(),
              isPublished: true,
            },
          });

          // Free up court
          if (match.court && match.court !== "TBA") {
            await tx.court.updateMany({
              where: { courtNumber: { equals: match.court, mode: "insensitive" } },
              data: { status: "READY" },
            });
          }

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: winner,
              scoreA: 0,
              scoreB: 0,
              eventType: "WALKOVER",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "MATCH_WALKOVER",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            winner,
            winnerName,
            reason: walkoverReason,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Walkover recorded for ${match.matchNumber}. Winner: ${winnerName}.`,
          data: updated,
        });
      }

      // ── ACTION: RETIRE ─────────────────────────────────────────────────
      if (action === "RETIRE") {
        if (!winner || !["PLAYER_A", "PLAYER_B"].includes(winner)) {
          return NextResponse.json(
            { success: false, error: "Winner is required for medical retirement ('PLAYER_A' or 'PLAYER_B')." },
            { status: 400 }
          );
        }

        const retireReason = reason?.trim() || "Medical retirement / injury during match";
        const winnerName = winner === "PLAYER_A" ? match.playerA : match.playerB;

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "COMPLETED",
              winner,
              interruptionReason: `Retired: ${retireReason}`,
              actualEndTime: new Date(),
              isPublished: true,
            },
          });

          if (match.court && match.court !== "TBA") {
            await tx.court.updateMany({
              where: { courtNumber: { equals: match.court, mode: "insensitive" } },
              data: { status: "READY" },
            });
          }

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: winner,
              scoreA: parseInt(match.scoreA || "0", 10),
              scoreB: parseInt(match.scoreB || "0", 10),
              eventType: "RETIRED",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "MATCH_RETIRED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            winner,
            winnerName,
            reason: retireReason,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Retirement recorded for ${match.matchNumber}. Winner: ${winnerName}.`,
          data: updated,
        });
      }

      // ── ACTION: ASSIGN_COURT ───────────────────────────────────────────
      if (action === "ASSIGN_COURT") {
        if (!courtNumber || typeof courtNumber !== "string") {
          return NextResponse.json(
            { success: false, error: "courtNumber is required (e.g. 'Court 03')." },
            { status: 400 }
          );
        }

        const targetCourtName = courtNumber.trim();

        // Concurrency Check: If target court has an active LIVE match, reject double-booking!
        if (targetCourtName !== "TBA" && targetCourtName !== "Unassigned") {
          const conflictingMatch = await prisma.match.findFirst({
            where: {
              id: { not: match.id },
              court: { equals: targetCourtName, mode: "insensitive" },
              status: "LIVE",
            },
          });

          if (conflictingMatch) {
            return NextResponse.json(
              {
                success: false,
                code: "COURT_CONFLICT",
                error: `COURT CONFLICT: ${targetCourtName} is already assigned to active live match ${conflictingMatch.matchNumber}.`,
              },
              { status: 409 }
            );
          }
        }

        const updated = await prisma.match.update({
          where: { id },
          data: { court: targetCourtName },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "COURT_ASSIGNED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            previousCourt: match.court,
            newCourt: targetCourtName,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} court assigned to ${targetCourtName}.`,
          data: updated,
        });
      }

      // ── ACTION: ASSIGN_OFFICIAL ────────────────────────────────────────
      if (action === "ASSIGN_OFFICIAL") {
        if (!officialId) {
          return NextResponse.json(
            { success: false, error: "officialId is required." },
            { status: 400 }
          );
        }

        // Validate user holds MATCH_OFFICIAL role
        const official = await prisma.user.findFirst({
          where: {
            OR: [{ id: officialId }, { officialId: officialId }, { email: officialId }],
            isActive: true,
            userRoles: { some: { role: { name: "MATCH_OFFICIAL" } } },
          },
        });

        if (!official) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid official ID '${officialId}'. User must be active and hold MATCH_OFFICIAL role.`,
            },
            { status: 400 }
          );
        }

        const updated = await prisma.match.update({
          where: { id },
          data: { assignedOfficialId: official.id },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "OFFICIAL_ASSIGNED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            assignedOfficialEmail: official.email,
            assignedOfficialName: official.name,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Official ${official.name} assigned to match ${match.matchNumber}.`,
          data: updated,
        });
      }

      // ── ACTION: UPDATE_SCORE ───────────────────────────────────────────
      if (action === "UPDATE_SCORE") {
        if (scoreA === undefined && scoreB === undefined) {
          return NextResponse.json(
            { success: false, error: "scoreA or scoreB must be provided." },
            { status: 400 }
          );
        }

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              scoreA: scoreA !== undefined ? String(scoreA) : match.scoreA,
              scoreB: scoreB !== undefined ? String(scoreB) : match.scoreB,
            },
          });

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: "PLAYER_A",
              scoreA: typeof scoreA === "number" ? scoreA : parseInt(match.scoreA || "0", 10),
              scoreB: typeof scoreB === "number" ? scoreB : parseInt(match.scoreB || "0", 10),
              eventType: "POINT",
              officialId: context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "SCORE_UPDATED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            previousScoreA: match.scoreA,
            previousScoreB: match.scoreB,
            newScoreA: scoreA,
            newScoreB: scoreB,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} score updated to ${scoreA} - ${scoreB}.`,
          data: updated,
        });
      }

      // ── ACTION: PUBLISH_RESULT ─────────────────────────────────────────
      if (action === "PUBLISH_RESULT") {
        const updated = await prisma.match.update({
          where: { id },
          data: { isPublished: true },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "RESULT_PUBLISHED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            winner: match.winner,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} official result published to public portal.`,
          data: updated,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid action. Supported: START, PAUSE, RESUME, COMPLETE, WALKOVER, RETIRE, ASSIGN_COURT, ASSIGN_OFFICIAL, UPDATE_SCORE, PUBLISH_RESULT",
        },
        { status: 400 }
      );
    } catch (error: any) {
      console.error("[PATCH /api/admin/live/matches/[id]] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_OPERATE],
  }
);
