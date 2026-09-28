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
        summary: { total: 0, verified: 0, pending: 0 },
        memberDocuments: [],
        message: "No team assigned.",
      });
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: selectedTeamId },
      include: {
        participant: {
          include: {
            documents: {
              select: {
                id: true,
                type: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                status: true,
                capturedBy: true,
                updatedAt: true,
                // filePath and compiledPdfPath are strictly excluded for privacy & security!
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    let totalDocs = 0;
    let verifiedDocs = 0;
    let pendingDocs = 0;

    const memberDocuments = teamMembers.map((tm) => {
      const p = tm.participant;
      const docs = p.documents.map((d) => {
        totalDocs++;
        if (d.status === "VERIFIED" || d.status === "READY") {
          verifiedDocs++;
        } else {
          pendingDocs++;
        }

        return {
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          status: d.status,
          mimeType: d.mimeType,
          capturedBy: d.capturedBy ? "Registration Desk Staff" : "System",
          lastUpdated: d.updatedAt,
        };
      });

      return {
        participantId: p.id,
        playerId: p.playerId,
        name: p.name,
        role: tm.role,
        documentsCount: docs.length,
        documents: docs,
      };
    });

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      summary: {
        total: totalDocs,
        verified: verifiedDocs,
        pending: pendingDocs,
        readinessStatus:
          totalDocs > 0 && verifiedDocs === totalDocs
            ? "ALL_VERIFIED"
            : totalDocs > 0
            ? "PARTIALLY_VERIFIED"
            : "PENDING_CAPTURE",
      },
      memberDocuments,
      notice: "Physical verification and document capture is performed exclusively by authorized Registration Staff at Desk 02.",
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/documents:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
