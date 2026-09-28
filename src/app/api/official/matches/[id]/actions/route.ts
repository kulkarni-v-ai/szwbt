import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { logAuditEvent } from "@/lib/rbac/audit";
import { getScoringConfigForCategory, validateScoreIncrement } from "@/lib/scoring/rules";
import { resolveKnockoutDependencies } from "@/lib/matches/lifecycle";

// In-memory idempotency deduplication window (500ms) to prevent accidental double-taps
const processedRequests = new Map<string, number>();

function isDuplicateRequest(key: string): boolean {
  const now = Date.now();
  const lastTime = processedRequests.get(key);
  if (lastTime && now - lastTime < 500) {
    return true;
  }
  processedRequests.set(key, now);
  // cleanup old keys
  if (processedRequests.size > 1000) {
    for (const [k, t] of processedRequests.entries()) {
      if (now - t > 5000) processedRequests.delete(k);
    }
  }
  return false;
}

/**
 * POST /api/official/matches/[id]/actions
 * Authoritative court-side match actions for assigned match officials.
 * Supported: START, SCORE, UNDO, PAUSE, RESUME, REPORT_ISSUE, COMPLETE
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { action, pointTo, reason, notes, issueCategory, description, winner, clientRequestId } = body;

      // 1. Fetch match from database
      const match = await prisma.match.findUnique({
        where: { id },
      });

      if (!match) {
        return NextResponse.json(
          { success: false, error: "Match not found." },
          { status: 404 }
        );
      }

      // 2. RESOURCE-LEVEL AUTHORIZATION
      // Match official MUST be assigned to this match (or hold Super/Tournament Admin clearance)
      const isSuper =
        context.roles.includes(ROLES.SUPER_ADMIN) ||
        context.roles.includes(ROLES.TOURNAMENT_ADMIN);

      const isAssigned =
        match.assignedOfficialId &&
        (match.assignedOfficialId === context.user.id ||
          match.assignedOfficialId === context.user.officialId ||
          match.assignedOfficialId === context.user.email);

      if (!isSuper && !isAssigned) {
        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "ACCESS_DENIED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            reason: "Match official attempted action on unassigned match",
            matchNumber: match.matchNumber,
            assignedOfficialId: match.assignedOfficialId,
          },
        });

        return NextResponse.json(
          {
            success: false,
            code: "NOT_ASSIGNED",
            error: `403 Forbidden: You are not assigned to officiate match ${match.matchNumber}. Access denied.`,
          },
          { status: 403 }
        );
      }

      // 3. ACTION: START
      if (action === "START") {
        if (match.status === "COMPLETED") {
          return NextResponse.json(
            { success: false, error: "Cannot start a match that is already COMPLETED." },
            { status: 400 }
          );
        }

        // Concurrency Check: Verify court is not already occupied by another active LIVE match
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
                error: `COURT CONFLICT: ${match.court} is currently occupied by active match ${conflictingMatch.matchNumber}. Please wait for court to clear.`,
              },
              { status: 409 }
            );
          }
        }

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              status: "LIVE",
              actualStartTime: match.actualStartTime || new Date(),
              interruptionReason: null,
              interruptionNotes: null,
            },
          });

          if (match.court && match.court !== "TBA") {
            await tx.court.updateMany({
              where: { courtNumber: { equals: match.court, mode: "insensitive" } },
              data: { status: "LIVE" },
            });
          }

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: "PLAYER_A",
              scoreA: parseInt(match.scoreA || "0", 10),
              scoreB: parseInt(match.scoreB || "0", 10),
              eventType: "START",
              officialId: context.user.officialId || context.user.id,
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
            official: context.user.name,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} started on ${match.court}.`,
          data: updated,
        });
      }

      // 4. ACTION: SCORE
      if (action === "SCORE") {
        if (match.status !== "LIVE") {
          return NextResponse.json(
            { success: false, error: `Cannot score match with status ${match.status}. Match must be LIVE.` },
            { status: 400 }
          );
        }

        if (!pointTo || (pointTo !== "PLAYER_A" && pointTo !== "PLAYER_B")) {
          return NextResponse.json(
            { success: false, error: "pointTo must be 'PLAYER_A' or 'PLAYER_B'." },
            { status: 400 }
          );
        }

        // Deduplication guard
        const dedupeKey = `${context.user.id}-${id}-${pointTo}-${clientRequestId || Date.now()}`;
        if (clientRequestId && isDuplicateRequest(dedupeKey)) {
          return NextResponse.json(
            { success: false, error: "Duplicate score request detected. Please wait." },
            { status: 429 }
          );
        }

        const scoringConfig = getScoringConfigForCategory(match.category);
        const currentA = parseInt(match.scoreA || "0", 10);
        const currentB = parseInt(match.scoreB || "0", 10);

        const validation = validateScoreIncrement(currentA, currentB, pointTo, scoringConfig);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: validation.error || "Invalid score transition." },
            { status: 400 }
          );
        }

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              scoreA: String(validation.newScoreA),
              scoreB: String(validation.newScoreB),
            },
          });

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo,
              scoreA: validation.newScoreA,
              scoreB: validation.newScoreB,
              eventType: "POINT",
              officialId: context.user.officialId || context.user.id,
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
            pointTo,
            previousA: currentA,
            previousB: currentB,
            scoreA: validation.newScoreA,
            scoreB: validation.newScoreB,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Point awarded to ${pointTo}. New score: ${validation.newScoreA} - ${validation.newScoreB}.`,
          data: updated,
        });
      }

      // 5. ACTION: UNDO
      if (action === "UNDO") {
        if (match.status !== "LIVE" && match.status !== "PAUSED") {
          return NextResponse.json(
            { success: false, error: `Cannot undo score for match with status ${match.status}.` },
            { status: 400 }
          );
        }

        // Find the most recent POINT event for this match
        const lastPointEvent = await prisma.matchEvent.findFirst({
          where: {
            matchId: id,
            eventType: "POINT",
          },
          orderBy: { timestamp: "desc" },
        });

        if (!lastPointEvent) {
          return NextResponse.json(
            { success: false, error: "No score events found to undo." },
            { status: 400 }
          );
        }

        // Revert score by subtracting 1 from the player who received the last point
        const currentA = parseInt(match.scoreA || "0", 10);
        const currentB = parseInt(match.scoreB || "0", 10);

        let revertedA = currentA;
        let revertedB = currentB;

        if (lastPointEvent.pointTo === "PLAYER_A") {
          revertedA = Math.max(0, currentA - 1);
        } else {
          revertedB = Math.max(0, currentB - 1);
        }

        const updated = await prisma.$transaction(async (tx) => {
          const m = await tx.match.update({
            where: { id },
            data: {
              scoreA: String(revertedA),
              scoreB: String(revertedB),
            },
          });

          await tx.matchEvent.create({
            data: {
              matchId: id,
              pointTo: lastPointEvent.pointTo,
              scoreA: revertedA,
              scoreB: revertedB,
              eventType: "UNDO",
              officialId: context.user.officialId || context.user.id,
            },
          });

          return m;
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "SCORE_UNDO",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            undonePointTo: lastPointEvent.pointTo,
            revertedScoreA: revertedA,
            revertedScoreB: revertedB,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Last point undone. Score reverted to ${revertedA} - ${revertedB}.`,
          data: updated,
        });
      }

      // 6. ACTION: PAUSE
      if (action === "PAUSE") {
        if (match.status !== "LIVE") {
          return NextResponse.json(
            { success: false, error: `Cannot pause match with status ${match.status}. Only LIVE matches can be paused.` },
            { status: 400 }
          );
        }

        const pauseReason = reason?.trim() || "Operational Pause";

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
              officialId: context.user.officialId || context.user.id,
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

      // 7. ACTION: RESUME
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
              officialId: context.user.officialId || context.user.id,
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
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} resumed to LIVE.`,
          data: updated,
        });
      }

      // 8. ACTION: REPORT_ISSUE
      if (action === "REPORT_ISSUE") {
        const cat = issueCategory?.trim() || "OTHER";
        const desc = description?.trim() || "Operational Issue";

        await prisma.matchEvent.create({
          data: {
            matchId: id,
            pointTo: "PLAYER_A",
            scoreA: parseInt(match.scoreA || "0", 10),
            scoreB: parseInt(match.scoreB || "0", 10),
            eventType: "ISSUE_REPORTED",
            officialId: context.user.officialId || context.user.id,
          },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "ISSUE_REPORTED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            court: match.court,
            issueCategory: cat,
            description: desc,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Issue reported: [${cat}] ${desc}.`,
        });
      }

      // 9. ACTION: COMPLETE
      if (action === "COMPLETE") {
        if (match.status === "COMPLETED") {
          return NextResponse.json(
            { success: false, error: "Match is already COMPLETED." },
            { status: 400 }
          );
        }

        if (!winner || !["PLAYER_A", "PLAYER_B"].includes(winner)) {
          return NextResponse.json(
            { success: false, error: "Winner must be specified ('PLAYER_A' or 'PLAYER_B')." },
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
              // Note: Match Official submits result; public portal publication is controlled separately
              isPublished: false,
            },
          });

          // Free up court back to READY
          if (match.court && match.court !== "TBA") {
            const otherActive = await tx.match.findFirst({
              where: {
                id: { not: match.id },
                court: { equals: match.court, mode: "insensitive" },
                status: "LIVE",
              },
            });

            if (!otherActive) {
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
              officialId: context.user.officialId || context.user.id,
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
          },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "RESULT_SUBMITTED",
          resourceType: "match",
          resourceId: id,
          metadata: {
            matchNumber: match.matchNumber,
            winner,
            submittedBy: context.user.email,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match ${match.matchNumber} marked COMPLETED. Result submitted by ${context.user.name}.`,
          data: updated,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Supported: START, SCORE, UNDO, PAUSE, RESUME, REPORT_ISSUE, COMPLETE",
        },
        { status: 400 }
      );
    } catch (error: any) {
      console.error("[POST /api/official/matches/[id]/actions] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.SCORING_UPDATE],
  }
);
