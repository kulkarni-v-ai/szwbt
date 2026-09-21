import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@szwbt2026.org";
  const fromName = process.env.SMTP_FROM_NAME || "South Zone Badminton Championship 2026";
  const secure = process.env.SMTP_SECURE === "true";
  const requireTLS = process.env.SMTP_REQUIRE_TLS === "true";

  const from = `"${fromName}" <${fromEmail}>`;

  // Development Fallback: If no SMTP host or user configured, safely log to server console
  if (!host || (!user && process.env.NODE_ENV !== "production")) {
    console.log("================ [DEVELOPMENT SMTP LOGGER] ================");
    console.log(`TO: ${options.to}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log(`FROM: ${from}`);
    console.log(`BODY SUMMARY: ${options.text || "HTML Email Body"}`);
    console.log("============================================================");
    return { success: true, messageId: `dev-console-msg-${Date.now()}` };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS,
      auth: user ? { user, pass } : undefined,
    });

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ""),
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[SMTP PROVIDER ERROR]: Failed to deliver email", err?.message || err);
    return { success: false, error: err?.message || "SMTP transmission failed" };
  }
}
