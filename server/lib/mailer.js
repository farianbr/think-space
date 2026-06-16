import nodemailer from "nodemailer";

// Lazily-built SMTP transport. Configure with SMTP_HOST / SMTP_PORT /
// SMTP_USER / SMTP_PASS (plus optional SMTP_SECURE and MAIL_FROM). When SMTP is
// not configured, email sending degrades gracefully: we log the message (and
// any action link) to the server console and return { sent: false } so callers
// can still succeed — useful in local dev.
let transport = null;

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    // Port 465 implies TLS; otherwise honor SMTP_SECURE (default STARTTLS/false).
    secure: SMTP_SECURE != null ? SMTP_SECURE === "true" : Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function fromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@thinkspace.app";
}

/**
 * Send an email. Returns { sent: boolean, reason?: string }. Never throws — a
 * failed/disabled mailer must not break the request that triggered it.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!isMailerConfigured()) {
    console.info(
      `[mailer] SMTP not configured — skipping email to ${to} ("${subject}").`
    );
    if (text) console.info(`[mailer] message preview:\n${text}`);
    return { sent: false, reason: "not_configured" };
  }
  try {
    if (!transport) transport = buildTransport();
    await transport.sendMail({ from: fromAddress(), to, subject, html, text });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] send failed:", err?.message || err);
    return { sent: false, reason: "send_error" };
  }
}

const APP_NAME = "ThinkSpace";

/**
 * Email a board invitation. `acceptUrl` opens the tokenized accept page. For a
 * brand-new invitee (no account yet) the copy nudges them to create one.
 */
export async function sendBoardInviteEmail({ to, inviterName, boardTitle, role, acceptUrl, isNewUser }) {
  const inviter = inviterName || "Someone";
  const board = boardTitle || "a board";
  const subject = `${inviter} invited you to "${board}" on ${APP_NAME}`;
  const cta = isNewUser ? "Create your account & join" : "Open invitation";
  const newUserLine = isNewUser
    ? `<p style="margin:0 0 16px;color:#475569;font-size:14px">You don't have a ${APP_NAME} account yet — the link below lets you create one with this email address and join automatically.</p>`
    : "";

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:8px">
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 8px">You've been invited to collaborate</h1>
    <p style="margin:0 0 16px;color:#475569;font-size:14px">
      <strong>${inviter}</strong> invited you to join the board
      <strong>"${board}"</strong> as <strong>${role}</strong> on ${APP_NAME}.
    </p>
    ${newUserLine}
    <p style="margin:0 0 24px">
      <a href="${acceptUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${cta}</a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:12px">If you weren't expecting this invitation, you can safely ignore this email.</p>
  </div>`;

  const text = `${inviter} invited you to join the board "${board}" as ${role} on ${APP_NAME}.\n\n${
    isNewUser ? `You don't have an account yet — use this link to create one and join:\n` : `Open the invitation:\n`
  }${acceptUrl}\n\nIf you weren't expecting this, ignore this email.`;

  return sendMail({ to, subject, html, text });
}
