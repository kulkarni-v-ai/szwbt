import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";
import { MATCH_STATUS, COURT_STATUS, resolveKnockoutDependencies } from "@/lib/matches/lifecycle";

/**
 * POST /api/operations/matches/intervention
 * Technical Operations command interventions for courts, matches, walkovers, delays and reassignments.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const body = await req.json();
    const { action, matchId, courtNumber, reason, notes, newCourt, newOfficialId, winner } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Action parameter is required." }, { status: 400 });
    }

    switch (action) {
      // 1. RELEASE COURT TO AVAILABLE
      case "RELEASE_COURT": {
        if (!courtNumber) {
          return NextResponse.json({ success: false, error: "courtNumber is required to release court." }, { status: 400 });
        }

        const court = await prisma.court.update({
          where: { courtNumber },
          data: {
            status: COURT_STATUS.AVAILABLE,
          },
        });

        await logAuditEvent({
          actorUserId: authResult.context.user.id,
          actorEmail: authResult.context.user.email,
          action: "COURT_RELEASED",
          resourceType: "court",
          resourceId: courtNumber,
          metadata: { courtNumber, newStatus: COURT_STATUS.AVAILABLE, notes },
        });

        return NextResponse.json({
          success: true,
          message: `${courtNumber} released to AVAILABLE status.`,
          court,
        });
      }

      // 2. BLOCK / MAINTENANCE COURT
      case "BLOCK_COURT":
      case "MAINTENANCE_COURT": {
        if (!courtNumber) {
          return NextResponse.json({ success: false, error: "courtNumber is required." }, { status: 400 });
        }

        const newStatus = action === "BLOCK_COURT" ? COURT_STATUS.BLOCKED : COURT_STATUS.MAINTENANCE;

        const court = await prisma.court.update({
          where: { courtNumber },
          data: { status: newStatus, notes: reason || notes },
        });

        await logAuditEvent({
          actorUserId: authResult.context.user.id,
          actorEmail: authResult.context.user.email,
          action: "COURT_STATUS_CHANGED",
          resourceType: "court",
          resourceId: courtNumber,
          metadata: { courtNumber, newStatus, reason: reason || notes },
        });

        return NextResponse.json({
          success: true,
          message: `${courtNumber} status updated to ${newStatus}.`,
          court,
        });
      }

      // 3. REASSIGN COURT
      case "REASSIGN_COURT": {
        if (!matchId || !newCourt || !reason) {
          return NextResponse.json(
            { success: false, error: "matchId, newCourt, and explicit reason are required for court reassignment." },
            { status: 400 }
          );
        }

        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match) return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });

        const previousCourt = match.court;

        await prisma.$transaction([
          prisma.match.update({
            where: { id: matchId },
            data: { court: newCourt },
          }),
          prisma.court.update({
            where: { courtNumber: newCourt },
            data: { status: COURT_STATUS.ASSIGNED },
          }),
          ...(previousCourt && previousCourt !== "TBD"
            ? [
                prisma.court.update({
                  where: { courtNumber: previousCourt },
                  data: { status: COURT_STATUS.AVAILABLE },
                }),
              ]
            : []),
        ]);

        await logAuditEvent({
          actorUserId: authResult.context.user.id,
          actorEmail: authResult.context.user.email,
          action: "COURT_REASSIGNED",
          resourceType: "match",
          resourceId: match.id,
          metadata: {
            matchId: match.id,
            matchNumber: match.matchNumber,
            previousCourt,
            newCourt,
            reason,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match #${match.matchNumber} reassigned from ${previousCourt} to ${newCourt}.`,
        });
      }

      // 4. REASSIGN UMPIRE
      case "REASSIGN_UMPIRE": {
        if (!matchId || !newOfficialId || !reason) {
          return NextResponse.json(
            { success: false, error: "matchId, newOfficialId, and explicit reason are required for umpire reassignment." },
            { status: 400 }
          );
        }

        const [match, official] = await Promise.all([
          prisma.match.findUnique({ where: { id: matchId } }),
          prisma.user.findUnique({ where: { id: newOfficialId } }),
        ]);

        if (!match) return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });
        if (!official) return NextResponse.json({ success: false, error: "Official user not found." }, { status: 404 });

        await prisma.match.update({
          where: { id: matchId },
          data: { assignedOfficialId: official.id },
        });

        if (match.court && match.court !== "TBD") {
          await prisma.court.update({
            where: { courtNumber: match.court },
            data: { umpire: official.name },
          });
        }

        await logAuditEvent({
          actorUserId: authResult.context.user.id,
          actorEmail: authResult.context.user.email,
          action: "UMPIRE_REASSIGNED",
          resourceType: "match",
          resourceId: match.id,
          metadata: {
            matchId: match.id,
            matchNumber: match.matchNumber,
            previousOfficialId: match.assignedOfficialId,
            newOfficialId: official.id,
            newOfficialName: official.name,
            reason,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Match #${match.matchNumber} official reassigned to ${official.name}.`,
        });
      }

      // 5. MARK TECHNICAL DELAY
      case "MARK_DELAY": {
        if (!matchId) {
          return NextResponse.json({ success: false, error: "matchId is required to mark delay." }, { status: 400 });
        }

        const match = await prisma.match.update({
          where: { id: matchId },
          data: {
            status: MATCH_STATUS.DELAYED,
            interruptionReason: reason || "Technical Operations Delay",
            interruptionNotes: notes || "Match start delayed by operations control.",
          },
        });

        await logAuditEvent({
          actorUserId: authResult.context.user.id,
          actorEmail: authResult.context.user.email,
          action: "MATCH_DELAYED",
          resourceType: "match",
          resourceId: match.id,
          metadata: { matchId: match.id, matchNumber: match.matchNumber, reason, notes },
        });

        return NextResponse.json({
          success: true,
          message: `Match #${match.matchNumber} marked as DELAYED.`,
          match,
        });
      }

      // 6. WALKOVER DECLARATION (Controlled workflow with knockout propagation)
      case "WALKOVER": {
        if (!matchId || !winner || !reason) {
          return NextResponse.json(
            { success: false, error: "matchId, winner (PLAYER_A or PLAYER_B), and authorized reason are required for Walkover declaration." },
            { status: 400 }
          );
        }

        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match) return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });

        let resolvedBracketCount = 0;

        await prisma.$transaction(async (tx) => {
          // Update match to WALKOVER
          const updatedMatch = await tx.match.update({
            where: { id: matchId },
            data: {
              status: MATCH_STATUS.WALKOVER,
              winner,
              scoreA: winner === "PLAYER_A" ? "W/O (21-0, 21-0)" : "0",
              scoreB: winner === "PLAYER_B" ? "W/O (21-0, 21-0)" : "0",
              actualEndTime: new Date(),
              interruptionReason: "WALKOVER",
              interruptionNotes: reason + (notes ? ` - ${notes}` : ""),
            },
          });

          // Set court to POST_MATCH
          if (match.court && match.court !== "TBD") {
            await tx.court.update({
              where: { courtNumber: match.court },
              data: { status: COURT_STATUS.POST_MATCH },
            });
          }

          // Advance winner in knockout bracket
          resolvedBracketCount = await resolveKnockoutDependencies(tx, {
            id: updatedMatch.id,
            matchNumber: updatedMatch.matchNumber,
            winner: updatedMatch.winner,
            playerA: updatedMatch.playerA,
            institutionA: updatedMatch.institutionA,
            playerB: updatedMatch.playerB,
            institutionB: updatedMatch.institutionB,
          });
        });

        await logAuditEvent({
          actorUserId: authResult.context.user.id,
          actorEmail: authResult.context.user.email,
          action: "WALKOVER_DECLARED",
          resourceType: "match",
          resourceId: match.id,
          metadata: {
            matchId: match.id,
            matchNumber: match.matchNumber,
            winner,
            winningPlayer: winner === "PLAYER_A" ? match.playerA : match.playerB,
            reason,
            notes,
            resolvedDownstreamMatches: resolvedBracketCount,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Walkover declared for Match #${match.matchNumber}. Winner: ${
            winner === "PLAYER_A" ? match.playerA : match.playerB
          }. ${resolvedBracketCount} downstream knockout match slots updated.`,
        });
      }

      default: {
        return NextResponse.json({ success: false, error: `Unsupported intervention action: ${action}` }, { status: 400 });
      }
    }
  } catch (error: any) {
    console.error("[POST /api/operations/matches/intervention] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Intervention failed." },
      { status: 500 }
    );
  }
}
