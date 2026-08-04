import { headers } from "next/headers";
import QRCode from "qrcode";
import { LogoMark } from "@/components/screens/shared";

// On-the-spot registration QR — any staff phone opens /qr and holds the
// screen out for a guest to scan (same source=qr tag as the printed flyer).
// Rendered server-side as inline SVG so the page is a single request with
// no client JS.
export default async function QrPage() {
  const h = await headers();
  const base = (
    process.env.APP_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`
  ).replace(/\/$/, "");
  const svg = await QRCode.toString(`${base}/?source=qr`, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const displayHost = base.replace(/^https?:\/\//, "");

  return (
    <div className="app rd">
      <div className="top">
        <LogoMark />
        <div className="stepcount">SCAN</div>
      </div>
      <div className="ribbon">
        <i style={{ width: "100%" }} />
      </div>

      <div className="rd-stage">
        <div>
          <div className="eyebrow">No typing, no queue…</div>
          <h1 className="big">
            Scan to <span className="r">register</span>
          </h1>
          <p className="sub">
            Point your camera at the code and claim your <b>5% opening-day voucher</b>.
          </p>
          <div className="qr-board" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="qr-alt">
            or visit <b>{displayHost}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
