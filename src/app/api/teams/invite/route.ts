import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/smtp-provider";
import { renderTeamInvitationEmail } from "@/lib/email/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, teamName, inviterName } = body;

    if (!email || !teamName) {
      return NextResponse.json({ success: false, error: "Member email and team name are required." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/register/team/accept?email=${encodeURIComponent(email)}&team=${encodeURIComponent(teamName)}`;
    const htmlContent = renderTeamInvitationEmail(teamName, inviterName || "Team Manager", inviteUrl);

    const emailResult = await sendEmail({
      to: email,
      subject: `You've been invited to join ${teamName} — South Zone Badminton 2026`,
      html: htmlContent,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: "Failed to dispatch team invitation email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${email}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
