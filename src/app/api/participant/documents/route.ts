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
        documents: [],
        message: "No athlete record linked.",
      });
    }

    // Expected standard tournament document types
    const expectedTypes = [
      { type: "UNIVERSITY_ID", label: "University Student ID Card" },
      { type: "SSLC", label: "SSLC / 10th Standard Marks Card (DOB Proof)" },
      { type: "PUC", label: "PUC / 12th Standard Marks Card" },
      { type: "MEDICAL_FITNESS", label: "Authorized Medical Fitness Certificate" },
    ];

    // Map participant documents to safe metadata (CRITICAL: exclude storage keys, filePath, compiledPdfPath)
    const docs = participant.documents || [];

    const documentStatuses = expectedTypes.map((exp) => {
      const match = docs.find((d: any) => d.type === exp.type);
      if (match) {
        return {
          id: match.id,
          type: exp.type,
          label: exp.label,
          status: match.status, // "VERIFIED", "PENDING", "RETAKE_REQUIRED", "READY"
          capturedBy: match.capturedBy || "Desk Official",
          updatedAt: match.updatedAt,
          verified: match.status === "VERIFIED" || match.status === "READY",
        };
      }
      return {
        id: null,
        type: exp.type,
        label: exp.label,
        status: "NOT CAPTURED",
        capturedBy: null,
        updatedAt: null,
        verified: false,
      };
    });

    const totalExpected = expectedTypes.length;
    const totalVerified = documentStatuses.filter((d) => d.verified).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalExpected,
        totalVerified,
        allVerified: totalVerified === totalExpected,
        deskInstruction:
          "All documents must be verified in person at Registration Desk 02. Digital uploads by athletes are not permitted for security compliance.",
      },
      documents: documentStatuses,
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/documents:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
