import { useState } from "react";

export default function VoucherScreen({
  firstName,
  code,
  pop,
  kiosk,
  onRestart,
}: {
  firstName: string;
  code: string;
  pop: boolean;
  kiosk: boolean;
  onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <div className="eyebrow">
        You&rsquo;re in{firstName ? `, ${firstName}` : ""}!
      </div>
      <h1 className="big">
        Welcome to the <span className="r">family</span>
      </h1>
      <p className="sub">
        Show this at the counter — or find it in your email. Valid for{" "}
        <b>14 days</b>.
      </p>
      <div className={pop ? "voucher pop" : "voucher"}>
        <div className="pct">5% OFF</div>
        <small>Your voucher code</small>
        <div className="code">{code}</div>
        <button
          suppressHydrationWarning
          type="button"
          className="copybtn"
          onClick={copyCode}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      {kiosk ? (
        <button
          suppressHydrationWarning
          type="button"
          className="cta ghost"
          onClick={onRestart}
        >
          Register another guest
        </button>
      ) : (
        <a
          className="cta ghost"
          href="https://instagram.com/Askmitch_multiventures"
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow @Askmitch_multiventures
        </a>
      )}
      <p className="fine">Tech, Style, Askmitch Anything…</p>
    </>
  );
}
