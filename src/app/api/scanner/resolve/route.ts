import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { resolveQrOperation } from "@/lib/qr/service";

/**
 * POST /api/scanner/resolve
 * Resolves a QR token for document scanning workflow.
 * Returns only permitted data: participant photo, name, ID, university, documents.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { token } = body;

      if (!token || typeof token !== "string") {
        return NextResponse.json(
          { success: false, error: "QR token is required." },
          { status: 400 }
        );
      }

      const result = await resolveQrOperation(token, "DOCUMENT_SCANNING", context);

      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: result.error, code: result.code },
          { status: result.code === "ACCESS_DENIED" ? 403 : 404 }
        );
      }

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error("[SCANNER_RESOLVE_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.DOCUMENT_UPLOAD],
    permissionsMode: "ANY",
  }
);
