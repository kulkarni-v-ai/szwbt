import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/scanner/verify
 * Document Scanner explicitly verifies a document.
 * This is NOT a verification queue — the scanner operator verifies inline.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { documentId, action = "VERIFY" } = body;

      if (!documentId) {
        return NextResponse.json(
          { success: false, error: "Document ID is required." },
          { status: 400 }
        );
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { participant: true },
      });

      if (!document) {
        return NextResponse.json(
          { success: false, error: "Document not found." },
          { status: 404 }
        );
      }

      if (action === "VERIFY") {
        if (document.status === "VERIFIED") {
          return NextResponse.json({
            success: true,
            message: "Document is already verified.",
            document: { id: document.id, type: document.type, status: "VERIFIED" },
          });
        }

        await prisma.document.update({
          where: { id: documentId },
          data: { status: "VERIFIED" },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "DOCUMENT_VERIFIED",
          resourceType: "document",
          resourceId: documentId,
          metadata: {
            participantId: document.participantId,
            type: document.type,
            fileName: document.fileName,
            verifiedBy: context.user.email,
          },
        });

        return NextResponse.json({
          success: true,
          message: `${document.type.replace(/_/g, " ")} verified successfully.`,
          document: { id: document.id, type: document.type, status: "VERIFIED" },
        });
      }

      if (action === "RETAKE") {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "PENDING" },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "DOCUMENT_RETAKE",
          resourceType: "document",
          resourceId: documentId,
          metadata: {
            participantId: document.participantId,
            type: document.type,
            requestedBy: context.user.email,
          },
        });

        return NextResponse.json({
          success: true,
          message: `${document.type.replace(/_/g, " ")} marked for retake.`,
          document: { id: document.id, type: document.type, status: "PENDING" },
        });
      }

      return NextResponse.json(
        { success: false, error: "Invalid action. Use VERIFY or RETAKE." },
        { status: 400 }
      );
    } catch (err: any) {
      console.error("[SCANNER_VERIFY_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.DOCUMENT_VERIFY],
    permissionsMode: "ANY",
  }
);
