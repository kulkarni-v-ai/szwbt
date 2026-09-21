import { NextRequest, NextResponse } from "next/server";
import { verifyOTPSession } from "@/lib/auth/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Email and OTP code are required." }, { status: 400 });
    }

    const verification = verifyOTPSession(email, otp);

    if (!verification.success) {
      return NextResponse.json({ success: false, error: verification.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Email address verified successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
