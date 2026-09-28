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
        registration: null,
        message: "No athlete record linked.",
      });
    }

    const team = participant.teamMemberships[0]?.team || null;
    const totalDocs = participant.documents.length;
    const verifiedDocs = participant.documents.filter(
      (d: any) => d.status === "VERIFIED" || d.status === "READY"
    ).length;

    // Determine outstanding requirements
    const outstandingRequirements: string[] = [];
    if (participant.status !== "APPROVED") {
      outstandingRequirements.push("Present original documents at Registration Desk 02 for physical accreditation.");
    }
    if (totalDocs === 0 || verifiedDocs < totalDocs) {
      outstandingRequirements.push("Document verification pending with desk officials.");
    }
    const ledgers = participant.paymentLedgers || [];
    const totalBalance = ledgers.reduce((sum: number, l: any) => sum + (l.balance || 0), 0);
    if (totalBalance > 0) {
      outstandingRequirements.push(`Outstanding tournament fee balance: ₹${totalBalance.toLocaleString()}`);
    }

    return NextResponse.json({
      success: true,
      registration: {
        participantId: participant.id,
        playerId: participant.playerId,
        fullName: participant.name,
        institution: participant.institution,
        state: participant.state,
        category: participant.category,
        teamName: team ? team.name : "Independent Contingent",
        teamCode: team ? team.teamCode : "—",
        currentStatus: participant.status,
        isAccredited: participant.status === "APPROVED",
        documentsCount: totalDocs,
        verifiedDocumentsCount: verifiedDocs,
        lastUpdated: participant.updatedAt,
        outstandingRequirements,
        verificationDeskNote:
          "Official accreditation is handled exclusively by Registration Staff at Desk 02. Participants do not self-register online.",
      },
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/registration:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
