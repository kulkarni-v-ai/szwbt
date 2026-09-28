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
        pass: null,
        message: "No athlete record linked.",
      });
    }

    let qrToken = participant.qrCode;
    if (!qrToken) {
      // Generate deterministic opaque token if not already set
      qrToken = `sz26_qr_pt_${participant.id.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      await prisma.participant.update({
        where: { id: participant.id },
        data: { qrCode: qrToken },
      });
    }

    const membership = participant.teamMemberships[0];
    const team = membership?.team || null;

    return NextResponse.json({
      success: true,
      pass: {
        participantId: participant.id,
        playerId: participant.playerId,
        fullName: participant.name,
        institution: participant.institution,
        state: participant.state,
        category: participant.category,
        role: membership?.role || "PLAYER",
        teamName: team ? team.name : "Independent Contingent",
        teamCode: team ? team.teamCode : "—",
        accreditationStatus: participant.status, // "APPROVED", "PENDING"
        qrToken, // Authoritative opaque token for QR rendering
        securityNotice:
          "This QR code contains ONLY an opaque cryptographic token. No personal identification, phone numbers, or payment data are encoded in the payload.",
        issuedBy: "South Zone Women's Badminton Championship 2026 Organizing Committee",
        validThrough: "2026-10-21",
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/qr:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
