export function renderOTPEmail(otp: string, recipientName: string = "Athlete", expiryMinutes: number = 10): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Email Verification Code</title>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #060608; color: #f5e6ca; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 30px auto; background-color: #0b0c10; border: 3px solid #ff5500; padding: 30px; box-shadow: 6px 6px 0px #000; }
      .header { text-align: center; border-b: 2px solid #ff5500; padding-bottom: 20px; margin-bottom: 25px; }
      .brand { color: #ff5500; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
      .tagline { color: #f5a623; font-size: 11px; margin-top: 5px; text-transform: uppercase; }
      .otp-box { background-color: #000; border: 2px solid #ff5500; padding: 20px; text-align: center; margin: 25px 0; }
      .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #ff5500; letter-spacing: 8px; }
      .footer { text-align: center; border-t: 1px solid #2d303e; padding-top: 20px; margin-top: 30px; font-size: 11px; color: #6c728d; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="brand">SOUTH ZONE BADMINTON 2026</div>
        <div class="tagline">THE SOUTH CONVERGES. THE COURT DECIDES.</div>
      </div>
      
      <p style="font-size: 14px; color: #e5e7eb;">Hello <strong>${recipientName}</strong>,</p>
      
      <p style="font-size: 13px; color: #9da4c0; line-height: 1.6;">
        Your email verification code for the South Zone Women's Badminton Tournament 2026 portal is:
      </p>

      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div style="font-size: 11px; color: #f5a623; margin-top: 8px;">VALID FOR ${expiryMinutes} MINUTES</div>
      </div>

      <p style="font-size: 12px; color: #6c728d;">
        If you did not request this code, you can safely ignore this email.
      </p>

      <div class="footer">
        © 2026 South Zone Badminton Championship. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

export function renderTeamInvitationEmail(teamName: string, inviterName: string, inviteUrl: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Team Invitation</title>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #060608; color: #f5e6ca; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 30px auto; background-color: #0b0c10; border: 3px solid #ff5500; padding: 30px; box-shadow: 6px 6px 0px #000; }
      .header { text-align: center; border-b: 2px solid #ff5500; padding-bottom: 20px; margin-bottom: 25px; }
      .brand { color: #ff5500; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
      .cta-btn { display: inline-block; background-color: #ff5500; color: #000; font-weight: bold; padding: 12px 28px; text-decoration: none; border: 2px solid #000; margin-top: 20px; font-size: 14px; }
      .footer { text-align: center; border-t: 1px solid #2d303e; padding-top: 20px; margin-top: 30px; font-size: 11px; color: #6c728d; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="brand">SOUTH ZONE BADMINTON 2026</div>
      </div>
      
      <p style="font-size: 15px; color: #ffffff;">You've been invited to join <strong>${teamName}</strong>!</p>
      
      <p style="font-size: 13px; color: #9da4c0; line-height: 1.6;">
        ${inviterName} has invited you to join team <strong>${teamName}</strong> for the South Zone Women's Badminton Tournament 2026.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" class="cta-btn">ACCEPT INVITATION & JOIN TEAM</a>
      </div>

      <div class="footer">
        © 2026 South Zone Badminton Championship.
      </div>
    </div>
  </body>
  </html>
  `;
}
