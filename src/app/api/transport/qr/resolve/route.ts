import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { resolveQrOperation } from "@/lib/qr/service";

/**
 * POST /api/transport/qr/resolve
 * Resolves participant/team accreditation pass for transport boarding verification.
 * STRICT ZERO PAYMENT POLICY: Never returns or requires payment.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { qrToken } = body;

      if (!qrToken || typeof qrToken !== "string" || !qrToken.trim()) {
        return NextResponse.json(
          { success: false, error: "QR scan token is required." },
          { status: 400 }
        );
      }

      const result = await resolveQrOperation(qrToken, "TRANSPORT", context);

      if (!result.valid) {
        const statusCode = result.code === "ACCESS_DENIED" ? 403 : 404;
        return NextResponse.json(
          { success: false, error: result.error, code: result.code },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        success: true,
        resolvedType: result.qrType,
        token: result.token,
        data: result.data,
      });
    } catch (err: any) {
      console.error("[TRANSPORT_QR_RESOLVE_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_BOARDING],
  }
);
