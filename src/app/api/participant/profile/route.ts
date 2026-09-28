import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";

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
        profile: null,
        message: "No athlete record linked.",
      });
    }

    const teamMembership = participant.teamMemberships[0];

    return NextResponse.json({
      success: true,
      profile: {
        id: participant.id,
        playerId: participant.playerId,
        fullName: participant.name,
        email: participant.email,
        phone: participant.phone,
        state: participant.state,
        institution: participant.institution,
        category: participant.category,
        gender: participant.gender,
        status: participant.status,
        teamName: teamMembership?.team?.name || "Independent Contingent",
        teamCode: teamMembership?.team?.teamCode || "—",
        role: teamMembership?.role || "PLAYER",
        isEditable: false, // Read-only for participants; administrative fields are restricted to staff
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/profile:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
