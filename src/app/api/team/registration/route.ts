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
        registration: null,
        message: "No team assigned.",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: selectedTeamId },
      include: {
        members: {
          include: {
            participant: {
              include: { documents: true },
            },
          },
        },
        paymentLedgers: true,
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found." }, { status: 404 });
    }

    // Determine lifecycle steps based on real state
    const memberCount = team.members.length;
    let totalDocs = 0;
    let verifiedDocs = 0;
    team.members.forEach((m) => {
      m.participant.documents.forEach((d) => {
        totalDocs++;
        if (d.status === "VERIFIED" || d.status === "READY") {
          verifiedDocs++;
        }
      });
    });

    const regLedger = team.paymentLedgers.find((l) => l.category === "REGISTRATION");
    const isPaymentPaid = regLedger ? regLedger.status === "PAID" || regLedger.balance <= 0 : false;

    // Timeline stages
    const stages = [
      {
        id: "DRAFT",
        name: "Institution Enrollment",
        description: "Official team entry filed by university athletic department.",
        status: "COMPLETED",
        completedAt: team.createdAt,
      },
      {
        id: "ROSTER",
        name: "Contingent Roster Entry",
        description: `${memberCount} athletes and officials submitted to championship desk.`,
        status: memberCount >= 2 ? "COMPLETED" : "IN_PROGRESS",
      },
      {
        id: "DOCUMENTS",
        name: "Physical Document Verification",
        description:
          totalDocs > 0 && verifiedDocs === totalDocs
            ? "Student ID cards, DOB certificates, and fitness certificates verified."
            : `${verifiedDocs}/${totalDocs} participant documents processed by registration desk.`,
        status: totalDocs > 0 && verifiedDocs === totalDocs ? "COMPLETED" : "IN_PROGRESS",
      },
      {
        id: "PAYMENT",
        name: "Tournament Registration Fee",
        description: isPaymentPaid
          ? "Official registration fee reconciled with tournament treasury."
          : "Registration fee pending desk settlement.",
        status: isPaymentPaid ? "COMPLETED" : "ACTION_REQUIRED",
      },
      {
        id: "APPROVAL",
        name: "Secretariat Desk Accreditation",
        description:
          team.status === "COMPLETED"
            ? "Official accreditation granted by tournament organizing secretariat."
            : "Pending final review by tournament technical director.",
        status: team.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      },
    ];

    const outstandingActions: string[] = [];
    if (memberCount < 2) {
      outstandingActions.push("Contingent roster requires at least 2 accredited players.");
    }
    if (totalDocs === 0 || verifiedDocs < totalDocs) {
      outstandingActions.push("Report to Registration Desk 02 with original student IDs and DOB certificates for physical scanning.");
    }
    if (!isPaymentPaid) {
      outstandingActions.push("Settle outstanding tournament fee at the Finance & Treasury counter (Cash or UPI).");
    }
    if (outstandingActions.length === 0 && team.status === "COMPLETED") {
      outstandingActions.push("All registration requirements are satisfied. Your digital Team Pass is active.");
    }

    return NextResponse.json({
      success: true,
      teamId: team.id,
      teamName: team.name,
      institution: team.institution,
      status: team.status,
      lastUpdated: team.updatedAt,
      stages,
      outstandingActions,
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/registration:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
