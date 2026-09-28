import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

export const GET = withAuth(
  async (req: NextRequest, context: UserContext, routeProps: any) => {
    try {
      const documentId = routeProps?.params?.id;

      if (!documentId) {
        return NextResponse.json({ success: false, error: "Document ID is required." }, { status: 400 });
      }

      // Check document in DB
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { participant: true },
      });

      if (!document) {
        return NextResponse.json({ success: false, error: "Document not found." }, { status: 404 });
      }

      // RESOURCE-LEVEL DOCUMENT SECURITY CHECK
      const isSuper = context.roles.includes("SUPER_ADMIN");
      const isRegStaff = context.roles.includes("REGISTRATION_STAFF");
      const isAthleteOwner =
        context.roles.includes("PARTICIPANT") &&
        (context.user.participantId === document.participantId ||
          context.user.participantId === document.participant.playerId);

      if (!isSuper && !isRegStaff && !isAthleteOwner) {
        return NextResponse.json(
          {
            success: false,
            error: "403 Forbidden: Confidential athlete verification documents cannot be accessed by unauthorized personnel.",
          },
          { status: 403 }
        );
      }

      // Record Audit Event
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "DOCUMENT_VIEWED",
        resourceType: "document",
        resourceId: document.id,
        metadata: {
          participantId: document.participantId,
          documentType: document.type,
          fileName: document.fileName,
        },
      });

      return NextResponse.json({
        success: true,
        documentId: document.id,
        type: document.type,
        fileName: document.fileName,
        status: document.status,
        accessGranted: true,
        downloadUrl: `/uploads/secure/${document.id}/${document.fileName}?token=signed_${Date.now()}`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.DOCUMENT_READ],
  }
);
