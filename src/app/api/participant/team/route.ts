import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;
    if (!participant) {
      return NextResponse.json({
        success: true,
        team: null,
        message: "No athlete record linked.",
      });
    }

    const membership = participant.teamMemberships[0];
    if (!membership || !membership.team) {
      return NextResponse.json({
        success: true,
        team: null,
        message: "NO TEAM ASSIGNED: You are currently registered as an independent contingent.",
      });
    }

    const team = membership.team;

    // Fetch team members with limited public fields (privacy enforcement)
    // NEVER expose private emails, phone numbers, or document statuses of teammates!
    const members = await prisma.teamMember.findMany({
      where: { teamId: team.id },
      include: {
        participant: {
          select: {
            id: true,
            playerId: true,
            name: true,
            category: true,
            gender: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        teamCode: team.teamCode,
        name: team.name,
        institution: team.institution,
        state: team.state,
        managerName: team.managerName || "Not Designated",
        captainName: team.captainName || "Not Designated",
        status: team.status,
        myRole: membership.role,
        membersCount: members.length,
        members: members.map((m) => ({
          id: m.participant.id,
          playerId: m.participant.playerId,
          name: m.participant.name,
          category: m.participant.category,
          gender: m.participant.gender,
          role: m.role,
          isMe: m.participant.id === participant.id,
        })),
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/team:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
