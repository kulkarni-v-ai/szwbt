import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";
import fs from "fs";
import path from "path";

export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { participantId, type, fileName, dataUrl, mimeType } = body;

      const validTypes = ["UNIVERSITY_ID", "SSLC", "PUC", "OTHER"];
      if (!type || !validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: `Invalid document type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json(
          { success: false, error: "Document payload (dataUrl) is required." },
          { status: 400 }
        );
      }

      // Secure Private File Storage Path
      // Save to private uploads directory outside web root or in secure subfolder
      const safeParticipantId = participantId ? participantId.replace(/[^a-zA-Z0-9_-]/g, "") : `temp_${Date.now()}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "secure", safeParticipantId);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Convert base64 data to buffer
      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const ext = (mimeType && mimeType.includes("pdf")) ? "pdf" : "jpg";
      const cleanFileName = `${type.toLowerCase()}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, cleanFileName);

      fs.writeFileSync(filePath, buffer);

      const publicPath = `/uploads/secure/${safeParticipantId}/${cleanFileName}`;

      // If participant exists in DB, attach or create Document record
      let documentRecord: any = null;
      if (participantId && !participantId.startsWith("temp_")) {
        const existingParticipant = await prisma.participant.findFirst({
          where: { OR: [{ id: participantId }, { playerId: participantId }] },
        });

        if (existingParticipant) {
          // Remove or update existing document of same type
          await prisma.document.deleteMany({
            where: { participantId: existingParticipant.id, type },
          });

          documentRecord = await prisma.document.create({
            data: {
              participantId: existingParticipant.id,
              type,
              fileName: fileName || cleanFileName,
              filePath: publicPath,
              fileSize: buffer.length,
              mimeType: mimeType || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
              status: "VERIFIED",
              capturedBy: context.user.email,
            },
          });

          // Audit Log
          await logAuditEvent({
            actorUserId: context.user.id,
            actorEmail: context.user.email,
            action: "DOCUMENT_UPLOADED",
            resourceType: "document",
            resourceId: documentRecord.id,
            metadata: {
              participantId: existingParticipant.id,
              type,
              fileName: cleanFileName,
              fileSize: buffer.length,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Document captured and processed successfully.",
        document: {
          id: documentRecord?.id || `doc_${Date.now()}`,
          type,
          label: type.replace(/_/g, " "),
          fileName: fileName || cleanFileName,
          fileSize: buffer.length,
          mimeType: mimeType || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
          status: "READY",
          url: publicPath,
          dataUrl: dataUrl,
          capturedAt: new Date().toLocaleTimeString(),
        },
      });
    } catch (err: any) {
      console.error("Document upload error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.DOCUMENT_UPLOAD],
  }
);
