import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/registration/complete
 * Completes registration for a participant once all prerequisites are satisfied:
 * 1. Participant details exist
 * 2. Active QR pass exists
 * 3. Required documents uploaded AND verified
 * 4. Payment handled / recorded
 *
 * Transitions status to APPROVED/COMPLETED.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { participantId, paymentMethod = "CASH", utr, amountPaid = 2500 } = body;

      if (!participantId) {
        return NextResponse.json(
          { success: false, error: "Participant ID is required." },
          { status: 400 }
        );
      }

      // 1. Fetch Participant with relations
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          documents: true,
          qrPasses: { where: { status: "ACTIVE" } },
          teamMemberships: { include: { team: true } },
          paymentLedgers: true,
        },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // Check condition: Active QR Pass exists
      const hasQr = !!(participant.qrCode || participant.qrPasses.length > 0);
      if (!hasQr) {
        return NextResponse.json(
          {
            success: false,
            error: "Registration cannot complete: No active accreditation QR pass has been generated.",
          },
          { status: 400 }
        );
      }

      // Check condition: Documents captured and verified
      // At least 1 document must be present and ALL uploaded documents must be verified
      const verifiedDocs = participant.documents.filter((d) => d.status === "VERIFIED");
      const unverifiedDocs = participant.documents.filter((d) => d.status !== "VERIFIED");

      if (participant.documents.length === 0 || unverifiedDocs.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Registration cannot complete: ${unverifiedDocs.length} documents are still pending verification. All captured documents must be verified first.`,
          },
          { status: 400 }
        );
      }

      // Execute Completion Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Record payment transaction if provided
        const numericAmount = parseFloat(String(amountPaid)) || 2500;
        const internalTxnId = `TXN-REG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        const payment = await tx.paymentTransaction.create({
          data: {
            category: "REGISTRATION",
            entityType: "PARTICIPANT",
            entityId: participant.id,
            amount: numericAmount,
            method: paymentMethod || "CASH",
            utr: paymentMethod === "UPI" ? (utr || "").trim() : null,
            internalTxnId,
            operatorEmail: context.user.email,
            status: "SUCCESS",
            receiptNumber: `RCP-REG-${Date.now().toString().slice(-6)}`,
            notes: `Registration completion for ${participant.name} (${participant.playerId})`,
          },
        });

        // Update fee ledger
        await tx.feeLedger.upsert({
          where: {
            category_participantId: {
              category: "REGISTRATION",
              participantId: participant.id,
            },
          },
          update: {
            amountDue: numericAmount,
            amountPaid: numericAmount,
            balance: 0,
            status: "PAID",
          },
          create: {
            category: "REGISTRATION",
            entityType: "PARTICIPANT",
            participantId: participant.id,
            amountDue: numericAmount,
            amountPaid: numericAmount,
            balance: 0,
            status: "PAID",
          },
        });

        // Transition Participant Status to APPROVED
        const updatedParticipant = await tx.participant.update({
          where: { id: participant.id },
          data: {
            status: "APPROVED",
          },
        });

        return { updatedParticipant, payment };
      });

      // Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "REGISTRATION_COMPLETED",
        resourceType: "participant",
        resourceId: participant.id,
        metadata: {
          playerId: participant.playerId,
          athleteName: participant.name,
          institution: participant.institution,
          verifiedDocumentsCount: verifiedDocs.length,
          paymentMethod,
          amountPaid,
          receiptNumber: result.payment.receiptNumber,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Registration successfully completed. Accreditation pass is active.",
        participant: {
          id: result.updatedParticipant.id,
          playerId: result.updatedParticipant.playerId,
          name: result.updatedParticipant.name,
          institution: result.updatedParticipant.institution,
          status: result.updatedParticipant.status,
          isCompleted: true,
        },
        payment: {
          receiptNumber: result.payment.receiptNumber,
          amount: result.payment.amount,
          method: result.payment.method,
        },
      });
    } catch (err: any) {
      console.error("[REGISTRATION_COMPLETE_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_UPDATE],
  }
);
