import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";
import { MATCH_STATUS, COURT_STATUS, isPlaceholderSlot } from "@/lib/matches/lifecycle";
import { ROLES } from "@/lib/rbac/roles";

/**
 * POST /api/operations/matches/assign
 * Operationally assigns a scheduled match to an available Court and Umpire.
 * Atomic verification and transaction.
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
    const { matchId, courtNumber, officialId, officialEmail } = body;

    if (!matchId || !courtNumber) {
      return NextResponse.json(
        { success: false, error: "Missing matchId or courtNumber for assignment." },
        { status: 400 }
      );
    }

    // 1. Validate Match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });
    }

    if (match.status === MATCH_STATUS.LIVE) {
      return NextResponse.json(
        { success: false, error: "Cannot reassign a LIVE match via quick assign. Use Technical Intervention." },
        { status: 400 }
      );
    }

    if (match.status === MATCH_STATUS.COMPLETED || match.status === MATCH_STATUS.RESULT_CONFIRMED) {
      return NextResponse.json(
        { success: false, error: "Cannot assign a match that is already completed." },
        { status: 400 }
      );
    }

    if (isPlaceholderSlot(match.playerA) || isPlaceholderSlot(match.playerB)) {
      return NextResponse.json(
        {
          success: false,
          error: `Match has unresolved knockout prerequisite slots (${match.playerA} vs ${match.playerB}). Wait for prior round winners.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate Court
    const court = await prisma.court.findUnique({
      where: { courtNumber },
    });

    if (!court) {
      return NextResponse.json({ success: false, error: `Court ${courtNumber} not found.` }, { status: 404 });
    }

    if (court.status === COURT_STATUS.MAINTENANCE || court.status === COURT_STATUS.BLOCKED) {
      return NextResponse.json(
        { success: false, error: `Court ${courtNumber} is currently under ${court.status} and cannot be assigned.` },
        { status: 400 }
      );
    }

    // Check if court already has an active LIVE match
    const liveMatchOnCourt = await prisma.match.findFirst({
      where: {
        court: courtNumber,
        status: { in: [MATCH_STATUS.LIVE, MATCH_STATUS.PAUSED] },
        id: { not: matchId },
      },
    });

    if (liveMatchOnCourt) {
      return NextResponse.json(
        {
          success: false,
          error: `Court ${courtNumber} is occupied by active LIVE match #${liveMatchOnCourt.matchNumber}. Wait for post-match turnaround.`,
        },
        { status: 409 }
      );
    }

    // 3. Validate Umpire (if specified)
    let assignedOfficial: { id: string; name: string; email: string } | null = null;
    if (officialId || officialEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: officialId }, { officialId: officialId }, { email: officialEmail }],
          isActive: true,
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Designated match official not found or inactive." },
          { status: 404 }
        );
      }

      const hasOfficialRole = user.userRoles.some((ur) =>
        [ROLES.MATCH_OFFICIAL, ROLES.TOURNAMENT_ADMIN, ROLES.SUPER_ADMIN].includes(ur.role.name as any)
      );

      if (!hasOfficialRole) {
        return NextResponse.json(
          { success: false, error: "Selected user does not hold MATCH_OFFICIAL role clearance." },
          { status: 403 }
        );
      }

      // Check if official is already managing another LIVE match
      const liveOfficialMatch = await prisma.match.findFirst({
        where: {
          assignedOfficialId: { in: [user.id, user.officialId || "", user.email].filter(Boolean) },
          status: { in: [MATCH_STATUS.LIVE, MATCH_STATUS.PAUSED] },
          id: { not: matchId },
        },
      });

      if (liveOfficialMatch) {
        return NextResponse.json(
          {
            success: false,
            error: `Official ${user.name} is currently umpiring LIVE match #${liveOfficialMatch.matchNumber} on ${liveOfficialMatch.court}.`,
          },
          { status: 409 }
        );
      }

      assignedOfficial = {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    }

    // 4. Atomic Execution in Transaction
    const result = await prisma.$transaction(async (tx) => {
      const nextStatus = assignedOfficial ? MATCH_STATUS.READY_TO_START : MATCH_STATUS.COURT_ASSIGNED;

      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          court: courtNumber,
          assignedOfficialId: assignedOfficial ? assignedOfficial.id : match.assignedOfficialId,
          status: nextStatus,
        },
      });

      const updatedCourt = await tx.court.update({
        where: { courtNumber },
        data: {
          status: COURT_STATUS.ASSIGNED,
          umpire: assignedOfficial ? assignedOfficial.name : court.umpire,
        },
      });

      return { match: updatedMatch, court: updatedCourt };
    });

    // 5. Audit Logging
    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "MATCH_COURT_ASSIGNED",
      resourceType: "match",
      resourceId: match.id,
      metadata: {
        matchId: match.id,
        matchNumber: match.matchNumber,
        courtNumber,
        previousCourt: match.court,
        official: assignedOfficial ? assignedOfficial.name : null,
      },
    });

    if (assignedOfficial) {
      await logAuditEvent({
        actorUserId: authResult.context.user.id,
        actorEmail: authResult.context.user.email,
        action: "MATCH_UMPIRE_ASSIGNED",
        resourceType: "match",
        resourceId: match.id,
        metadata: {
          matchId: match.id,
          matchNumber: match.matchNumber,
          officialId: assignedOfficial.id,
          officialName: assignedOfficial.name,
          officialEmail: assignedOfficial.email,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Match #${match.matchNumber} successfully assigned to ${courtNumber}${
        assignedOfficial ? ` with Umpire ${assignedOfficial.name}` : ""
      }.`,
      data: result,
    });
  } catch (error: any) {
    console.error("[POST /api/operations/matches/assign] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to assign match." },
      { status: 500 }
    );
  }
}
