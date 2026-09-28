import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/registration/documents
 * Records a captured or uploaded verification document for a participant.
 *
 * CRITICAL RULE: Uploading is NOT verification.
 * The document enters status "READY" (or "PENDING"), NOT "VERIFIED".
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { participantId, type, fileName, filePath, fileSize, mimeType } = body;

      if (!participantId || !type) {
        return NextResponse.json(
          { success: false, error: "Participant ID and Document Type are required." },
          { status: 400 }
        );
      }

      // Verify participant exists
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // Upsert document record (READY for inspection, NOT verified)
      const doc = await prisma.document.create({
        data: {
          participantId: participant.id,
          type,
          fileName: fileName || `${type.toLowerCase()}_capture.jpg`,
          filePath: filePath || `/uploads/documents/${participant.id}/${type.toLowerCase()}.jpg`,
          fileSize: fileSize || 1024,
          mimeType: mimeType || "image/jpeg",
          status: "READY", // READY for verification inspection
          capturedBy: context.user.email,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "DOCUMENT_CAPTURED",
        resourceType: "document",
        resourceId: doc.id,
        metadata: {
          participantId: participant.id,
          playerId: participant.playerId,
          documentType: type,
          status: "READY",
          capturedBy: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Document ${type} captured and ready for verification.`,
        document: {
          id: doc.id,
          type: doc.type,
          fileName: doc.fileName,
          status: doc.status,
          isVerified: false,
          capturedAt: doc.createdAt,
        },
      });
    } catch (err: any) {
      console.error("[REGISTRATION_DOCUMENT_POST_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.DOCUMENT_UPLOAD],
  }
);
