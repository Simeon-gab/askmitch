// Voucher email via Resend (docs/ARCHITECTURE.md "Email" + DESIGN.md
// "Voucher email design"). Server-only: holds the Resend API key.
// Plain fetch against the Resend REST API — one endpoint, no SDK needed.
// A send failure must NEVER fail registration; callers log the result to
// email_log and return email_sent accordingly.
import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SUBJECT = "Your 5% ASKMITCH voucher is inside 🎉";
const STORE_ADDRESS =
  "Sims Plaza, Olakunle Junction, Bembo, Alao Akala Expressway, Apata Road, Ibadan";
const SOCIAL_HANDLE = "@Askmitch_multiventures";
const SIGN_OFF = "Tech, Style, Askmitch Anything…";

// Brand tokens from docs/DESIGN.md
const RED = "#ED1C24";
const RED_SOFT = "#FF8A8E";
const BLACK = "#0C0C0C";

export type SendVoucherEmailResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

export interface VoucherEmailArgs {
  to: string;
  firstName: string;
  code: string;
  expiresAt: string; // ISO timestamp
}

function formatExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(expiresAt));
}

export async function sendVoucherEmail(
  args: VoucherEmailArgs,
): Promise<SendVoucherEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  if (!from) {
    return { ok: false, error: "EMAIL_FROM not set" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        reply_to: from,
        subject: SUBJECT,
        html: voucherEmailHtml(args),
        text: voucherEmailText(args),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, messageId: data.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown send error",
    };
  }
}

// Table-based layout, all CSS inline (email-client reality; tested target is
// Gmail mobile). Anton isn't email-safe — bold condensed system stack instead.
// Exported so scripts can render a preview without sending.
export function voucherEmailHtml({ firstName, code, expiresAt }: VoucherEmailArgs): string {
  const expiry = formatExpiry(expiresAt);
  const displayFont =
    "'Arial Black', 'Arial Bold', Arial, Helvetica, sans-serif";
  const bodyFont = "Arial, Helvetica, sans-serif";
  // Scannable voucher QR (links to /redeem?code=...). Needs an absolute URL —
  // if APP_URL isn't set the email simply omits the image; the text code
  // always works on its own.
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const qrBlock = appUrl
    ? `<img src="${appUrl}/api/qr/${encodeURIComponent(code)}.png" width="132" height="132" alt="QR code for voucher ${escapeHtml(code)}" style="display:block;margin:16px auto 0;border:0;border-radius:8px;background-color:#ffffff;" />
                  <div style="font-family:${bodyFont};font-size:12px;color:#666666;padding-top:8px;">Staff can scan this at the counter</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- dark brand header -->
        <tr>
          <td align="center" style="background-color:${BLACK};padding:28px 24px 24px;">
            <div style="font-family:${displayFont};font-size:26px;letter-spacing:2px;color:#ffffff;line-height:1;">ASKMITCH</div>
            <div style="font-family:${bodyFont};font-size:10px;letter-spacing:5px;color:${RED};font-weight:bold;padding-top:6px;">MULTI-VENTURES</div>
          </td>
        </tr>
        <!-- greeting -->
        <tr>
          <td style="padding:28px 28px 8px;font-family:${bodyFont};color:#111111;">
            <div style="font-size:20px;font-weight:bold;">You're in, ${escapeHtml(firstName)}! 🎉</div>
            <div style="font-size:14px;line-height:1.6;color:#444444;padding-top:10px;">
              Welcome to the family — here's your opening-day voucher.
              Show it at the counter or just open this email in store.
            </div>
          </td>
        </tr>
        <!-- voucher block -->
        <tr>
          <td align="center" style="padding:20px 28px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border:2px dashed ${RED};border-radius:14px;background-color:#FDF1F1;padding:22px 16px;">
                  <div style="display:inline-block;background-color:${RED};color:#ffffff;font-family:${displayFont};font-size:13px;letter-spacing:1px;padding:6px 14px;border-radius:999px;">5% OFF</div>
                  <div style="font-family:${bodyFont};font-size:10px;letter-spacing:3px;color:#B8121A;font-weight:bold;padding-top:14px;">YOUR VOUCHER CODE</div>
                  <div style="font-family:${displayFont};font-size:34px;letter-spacing:4px;color:${BLACK};padding-top:8px;">${escapeHtml(code)}</div>
                  <div style="font-family:${bodyFont};font-size:13px;color:#666666;padding-top:12px;">Valid until <strong>${expiry}</strong></div>
                  ${qrBlock}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- store details -->
        <tr>
          <td style="padding:20px 28px 4px;font-family:${bodyFont};color:#444444;font-size:13px;line-height:1.7;" align="center">
            <strong style="color:#111111;">Find us:</strong><br>
            ${STORE_ADDRESS}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:14px 28px 24px;font-family:${bodyFont};font-size:13px;color:#444444;">
            Instagram &amp; TikTok: <strong style="color:${RED};">${SOCIAL_HANDLE}</strong>
          </td>
        </tr>
        <!-- sign-off -->
        <tr>
          <td align="center" style="background-color:${BLACK};padding:18px 24px;">
            <div style="font-family:Georgia, 'Times New Roman', serif;font-style:italic;font-size:14px;color:${RED_SOFT};">${SIGN_OFF}</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function voucherEmailText({ firstName, code, expiresAt }: VoucherEmailArgs): string {
  const expiry = formatExpiry(expiresAt);
  return [
    `You're in, ${firstName}!`,
    "",
    "Welcome to the family — here's your ASKMITCH opening-day voucher.",
    "",
    `5% OFF — voucher code: ${code}`,
    `Valid until ${expiry}.`,
    "",
    "Show this at the counter or just open this email in store.",
    "",
    `Find us: ${STORE_ADDRESS}`,
    `Instagram & TikTok: ${SOCIAL_HANDLE}`,
    "",
    SIGN_OFF,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
