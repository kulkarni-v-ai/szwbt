import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { selectedTeamId } = teamAuth;
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        pass: null,
        message: "No team assigned.",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: selectedTeamId },
      include: {
        members: {
          include: { participant: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found." }, { status: 404 });
    }

    // Ensure team has an opaque token
    let teamQrToken = team.teamQrToken;
    if (!teamQrToken) {
      teamQrToken = `sz26_qr_tm_${team.teamCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      await prisma.team.update({
        where: { id: team.id },
        data: { teamQrToken },
      });
    }

    return NextResponse.json({
      success: true,
      pass: {
        teamId: team.id,
        teamCode: team.teamCode,
        teamName: team.name,
        institution: team.institution,
        state: team.state,
        managerName: team.managerName || "Accredited Manager",
        captainName: team.captainName || "Team Captain",
        status: team.status,
        memberCount: team.members.length,
        // CRITICAL SECURITY: ONLY the opaque reference token is exposed for QR generation.
        // NO PII (no participant names, phones, emails, room numbers, payments) is encoded in the QR.
        qrToken: teamQrToken,
        issuedBy: "SZWBT Organizing Secretariat & Accreditation Control",
        validThrough: "OCT 21, 2026",
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/qr:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
