import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { logAuditEvent } from "@/lib/rbac/audit";
import { MATCH_STATUS, COURT_STATUS, resolveKnockoutDependencies } from "@/lib/matches/lifecycle";

/**
 * POST /api/official/matches/[id]/action
 * Umpire / Match Official authorized match actions: START, PAUSE, RESUME, END, CONFIRM_RESULT.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext, routeProps: any) => {
    try {
      const resolvedParams = await Promise.resolve(routeProps?.params || {});
      const matchId = resolvedParams.id;

      if (!matchId) {
        return NextResponse.json({ success: false, error: "Match ID is required." }, { status: 400 });
      }

      const body = await req.json();
      const { action, reason, notes, scoreA, scoreB, winner } = body;

      if (!action) {
        return NextResponse.json({ success: false, error: "Action is required." }, { status: 400 });
      }

      // 1. Fetch Match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });
      }

      // 2. Authorization check: must be assigned official or Super/Tournament Admin
      const isSuper =
        context.roles.includes(ROLES.SUPER_ADMIN) ||
        context.roles.includes(ROLES.TOURNAMENT_ADMIN);

      const isAssignedOfficial =
        match.assignedOfficialId &&
        (match.assignedOfficialId === context.user.id ||
          match.assignedOfficialId === context.user.officialId ||
          match.assignedOfficialId === context.user.email);

      if (!isSuper && !isAssignedOfficial) {
        return NextResponse.json(
          {
            success: false,
            error: `403 Forbidden: You are not assigned to umpire Match #${match.matchNumber}.`,
          },
          { status: 403 }
        );
      }

      switch (action) {
        // ─── START MATCH ─────────────────────────────────────────────────
        case "START": {
          if (match.status === MATCH_STATUS.LIVE) {
            return NextResponse.json({ success: false, error: "Match is already LIVE." }, { status: 400 });
          }

          const [updatedMatch, updatedCourt] = await prisma.$transaction([
            prisma.match.update({
              where: { id: matchId },
              data: {
                status: MATCH_STATUS.LIVE,
                actualStartTime: match.actualStartTime || new Date(),
                interruptionReason: null,
                interruptionNotes: null,
              },
            }),
            ...(match.court && match.court !== "TBD"
              ? [
                  prisma.court.update({
                    where: { courtNumber: match.court },
                    data: { status: COURT_STATUS.LIVE },
                  }),
                ]
              : []),
          ]);

          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "MATCH_STARTED",
            resourceType: "match",
            resourceId: match.id,
            metadata: {
              matchId: match.id,
              matchNumber: match.matchNumber,
              court: match.court,
              umpire: context.user.name,
              startTime: new Date().toISOString(),
            },
          });

          return NextResponse.json({
            success: true,
            message: `Match #${match.matchNumber} started on ${match.court}.`,
            match: updatedMatch,
            court: updatedCourt,
          });
        }

        // ─── PAUSE MATCH ─────────────────────────────────────────────────
        case "PAUSE": {
          if (match.status !== MATCH_STATUS.LIVE) {
            return NextResponse.json(
              { success: false, error: "Only a LIVE match can be paused." },
              { status: 400 }
            );
          }

          const [updatedMatch, updatedCourt] = await prisma.$transaction([
            prisma.match.update({
              where: { id: matchId },
              data: {
                status: MATCH_STATUS.PAUSED,
                interruptionReason: reason || "Official Pause",
                interruptionNotes: notes || "",
              },
            }),
            ...(match.court && match.court !== "TBD"
              ? [
                  prisma.court.update({
                    where: { courtNumber: match.court },
                    data: { status: COURT_STATUS.PAUSED },
                  }),
                ]
              : []),
          ]);

          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "MATCH_PAUSED",
            resourceType: "match",
            resourceId: match.id,
            metadata: {
              matchId: match.id,
              matchNumber: match.matchNumber,
              court: match.court,
              reason,
              notes,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Match #${match.matchNumber} paused (${reason}).`,
            match: updatedMatch,
            court: updatedCourt,
          });
        }

        // ─── RESUME MATCH ────────────────────────────────────────────────
        case "RESUME": {
          if (match.status !== MATCH_STATUS.PAUSED) {
            return NextResponse.json(
              { success: false, error: "Only a PAUSED match can be resumed." },
              { status: 400 }
            );
          }

          const [updatedMatch, updatedCourt] = await prisma.$transaction([
            prisma.match.update({
              where: { id: matchId },
              data: {
                status: MATCH_STATUS.LIVE,
                interruptionReason: null,
                interruptionNotes: null,
              },
            }),
            ...(match.court && match.court !== "TBD"
              ? [
                  prisma.court.update({
                    where: { courtNumber: match.court },
                    data: { status: COURT_STATUS.LIVE },
                  }),
                ]
              : []),
          ]);

          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "MATCH_RESUMED",
            resourceType: "match",
            resourceId: match.id,
            metadata: {
              matchId: match.id,
              matchNumber: match.matchNumber,
              court: match.court,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Match #${match.matchNumber} resumed on ${match.court}.`,
            match: updatedMatch,
            court: updatedCourt,
          });
        }

        // ─── END MATCH / SUBMIT RESULT ──────────────────────────────────
        case "END": {
          if (!winner || (winner !== "PLAYER_A" && winner !== "PLAYER_B")) {
            return NextResponse.json(
              { success: false, error: "Valid winner (PLAYER_A or PLAYER_B) is required to end match." },
              { status: 400 }
            );
          }

          const finalScoreA = scoreA !== undefined ? String(scoreA) : match.scoreA || "2";
          const finalScoreB = scoreB !== undefined ? String(scoreB) : match.scoreB || "0";

          const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
              status: MATCH_STATUS.RESULT_SUBMITTED,
              winner,
              scoreA: finalScoreA,
              scoreB: finalScoreB,
              actualEndTime: new Date(),
            },
          });

          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "MATCH_ENDED",
            resourceType: "match",
            resourceId: match.id,
            metadata: {
              matchId: match.id,
              matchNumber: match.matchNumber,
              winner,
              winningPlayer: winner === "PLAYER_A" ? match.playerA : match.playerB,
              scoreA: finalScoreA,
              scoreB: finalScoreB,
            },
          });

          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "RESULT_SUBMITTED",
            resourceType: "result",
            resourceId: match.id,
            metadata: {
              matchId: match.id,
              matchNumber: match.matchNumber,
              winner,
              score: `${finalScoreA} - ${finalScoreB}`,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Result submitted for Match #${match.matchNumber}. Winner: ${
              winner === "PLAYER_A" ? match.playerA : match.playerB
            }.`,
            match: updatedMatch,
          });
        }

        // ─── CONFIRM RESULT & COURT TURNAROUND ──────────────────────────
        case "CONFIRM_RESULT": {
          let resolvedDownstream = 0;

          await prisma.$transaction(async (tx) => {
            // 1. Finalize match to COMPLETED
            const completedMatch = await tx.match.update({
              where: { id: matchId },
              data: {
                status: MATCH_STATUS.COMPLETED,
                actualEndTime: match.actualEndTime || new Date(),
              },
            });

            // 2. Set court to POST_MATCH for cleanup/turnaround
            if (match.court && match.court !== "TBD") {
              await tx.court.update({
                where: { courtNumber: match.court },
                data: { status: COURT_STATUS.POST_MATCH },
              });
            }

            // 3. Propagate knockout bracket dependencies
            resolvedDownstream = await resolveKnockoutDependencies(tx, {
              id: completedMatch.id,
              matchNumber: completedMatch.matchNumber,
              winner: completedMatch.winner,
              playerA: completedMatch.playerA,
              institutionA: completedMatch.institutionA,
              playerB: completedMatch.playerB,
              institutionB: completedMatch.institutionB,
            });
          });

          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "RESULT_CONFIRMED",
            resourceType: "result",
            resourceId: match.id,
            metadata: {
              matchId: match.id,
              matchNumber: match.matchNumber,
              winner: match.winner,
              resolvedDownstreamMatches: resolvedDownstream,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Result confirmed for Match #${match.matchNumber}. Court set to POST_MATCH. ${resolvedDownstream} downstream bracket slots advanced.`,
          });
        }

        default: {
          return NextResponse.json(
            { success: false, error: `Unsupported official action: ${action}` },
            { status: 400 }
          );
        }
      }
    } catch (err: any) {
      console.error("[POST /api/official/matches/[id]/action] Error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.SCORING_UPDATE],
  }
);
