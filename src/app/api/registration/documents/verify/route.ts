import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/registration/documents/verify
 * Explicit document verification control.
 *
 * Supported payload:
 * 1. Single document: { documentId: string }
 * 2. Bulk/All documents for participant: { participantId: string, markAll: true }
 *
 * Stores verifier, timestamp, status = "VERIFIED", and creates audit event.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { documentId, participantId, markAll, rejectionReason } = body;

      if (!documentId && !participantId) {
        return NextResponse.json(
          { success: false, error: "Either documentId or participantId must be provided." },
          { status: 400 }
        );
      }

      // Action: Single document verification
      if (documentId) {
        const doc = await prisma.document.findUnique({
          where: { id: documentId },
          include: { participant: true },
        });

        if (!doc) {
          return NextResponse.json(
            { success: false, error: "Document record not found." },
            { status: 404 }
          );
        }

        const newStatus = rejectionReason ? "REJECTED" : "VERIFIED";

        const updated = await prisma.document.update({
          where: { id: documentId },
          data: {
            status: newStatus,
            capturedBy: context.user.email,
          },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: newStatus === "VERIFIED" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
          resourceType: "document",
          resourceId: doc.id,
          metadata: {
            participantId: doc.participantId,
            playerId: doc.participant.playerId,
            documentType: doc.type,
            verifiedBy: context.user.email,
            rejectionReason: rejectionReason || null,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Document ${doc.type} marked as ${newStatus}.`,
          document: {
            id: updated.id,
            type: updated.type,
            status: updated.status,
            verifiedBy: context.user.email,
            updatedAt: updated.updatedAt,
          },
        });
      }

      // Action: Bulk / All documents verification for participant
      if (participantId && markAll) {
        const participant = await prisma.participant.findUnique({
          where: { id: participantId },
          include: { documents: true },
        });

        if (!participant) {
          return NextResponse.json(
            { success: false, error: "Participant not found." },
            { status: 404 }
          );
        }

        const updateResult = await prisma.document.updateMany({
          where: {
            participantId: participant.id,
            status: { in: ["READY", "PENDING"] },
          },
          data: {
            status: "VERIFIED",
            capturedBy: context.user.email,
          },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "DOCUMENT_VERIFIED",
          resourceType: "participant",
          resourceId: participant.id,
          metadata: {
            participantId: participant.id,
            playerId: participant.playerId,
            count: updateResult.count,
            verifiedBy: context.user.email,
          },
        });

        const refreshedDocs = await prisma.document.findMany({
          where: { participantId: participant.id },
        });

        return NextResponse.json({
          success: true,
          message: `All ${updateResult.count} documents marked as VERIFIED.`,
          count: updateResult.count,
          documents: refreshedDocs.map((d) => ({
            id: d.id,
            type: d.type,
            status: d.status,
            verifiedBy: d.capturedBy,
          })),
        });
      }

      return NextResponse.json(
        { success: false, error: "Invalid verification action requested." },
        { status: 400 }
      );
    } catch (err: any) {
      console.error("[DOCUMENT_VERIFY_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_UPDATE],
  }
);
