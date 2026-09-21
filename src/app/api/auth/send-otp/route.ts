import { NextRequest, NextResponse } from "next/server";
import { generateSecureOTP, createOTPSession } from "@/lib/auth/otp-store";
import { sendEmail } from "@/lib/email/smtp-provider";
import { renderOTPEmail } from "@/lib/email/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email address is required." }, { status: 400 });
    }

    const otp = generateSecureOTP();
    const sessionResult = createOTPSession(email, otp);

    if (!sessionResult.success) {
      return NextResponse.json(
        { success: false, error: sessionResult.error, cooldownLeft: sessionResult.cooldownLeft },
        { status: 429 }
      );
    }

    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
    const htmlContent = renderOTPEmail(otp, name || "Athlete", expiryMinutes);
    const emailResult = await sendEmail({
      to: email,
      subject: "Verify Your Email — South Zone Badminton Championship 2026",
      html: htmlContent,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: "Unable to send verification email. Please check configuration or try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully to your email.",
      expiresInMinutes: expiryMinutes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
