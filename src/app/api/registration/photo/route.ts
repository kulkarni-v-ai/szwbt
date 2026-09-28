import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import fs from "fs";
import path from "path";

/**
 * POST /api/registration/photo
 * Captures and stores participant photo (webcam capture or file upload).
 * Returns the private reference URL for storage.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { participantId, dataUrl } = body;

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json(
          { success: false, error: "Photo data (dataUrl) is required." },
          { status: 400 }
        );
      }

      // Private file storage
      const safeId = participantId
        ? participantId.replace(/[^a-zA-Z0-9_-]/g, "")
        : `temp_${Date.now()}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "photos", safeId);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `photo_${Date.now()}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const publicPath = `/uploads/photos/${safeId}/${fileName}`;

      // Update participant if exists
      if (participantId && !participantId.startsWith("temp_")) {
        const existing = await prisma.participant.findFirst({
          where: { OR: [{ id: participantId }, { playerId: participantId }] },
        });

        if (existing) {
          await prisma.participant.update({
            where: { id: existing.id },
            data: { photoUrl: publicPath },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Photo captured and stored.",
        photo: {
          url: publicPath,
          fileName,
          fileSize: buffer.length,
          participantId: safeId,
        },
      });
    } catch (err: any) {
      console.error("[PHOTO_UPLOAD_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.PARTICIPANT_CREATE],
    permissionsMode: "ANY",
  }
);
