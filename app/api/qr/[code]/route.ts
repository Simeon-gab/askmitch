// QR image for a voucher code, referenced from the voucher email.
// Encodes a link to /redeem?code=... so staff scanning it with a phone
// camera land on the redemption page with the code prefilled.
// Renders for any well-formed code without a DB lookup — the QR is just a
// picture of a URL; /api/redeem (PIN-gated) is what actually verifies.
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { normalizeVoucherInput, VOUCHER_REGEX } from "@/lib/voucher";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const code = normalizeVoucherInput(raw.replace(/\.png$/i, ""));
  if (!code || !VOUCHER_REGEX.test(code)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // APP_URL in production (email images must point at the real domain);
  // request origin as a dev fallback.
  const base = (process.env.APP_URL ?? req.nextUrl.origin).replace(/\/$/, "");
  const target = `${base}/redeem?code=${code}`;

  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // The code→URL mapping never changes, so cache hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
