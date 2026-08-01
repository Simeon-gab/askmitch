// Shared primitives for the flow screens. Markup and SVG paths are lifted
// verbatim from the approved prototype.
import type { ReactNode } from "react";

export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// suppressHydrationWarning on controls: form-filler browser extensions stamp
// attributes (e.g. fdprocessedid) on buttons/inputs before hydration; the
// mismatch spam is meaningless and drowns dev tooling.
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="back"
      onClick={onClick}
      suppressHydrationWarning
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}

export function Cta({
  children,
  onClick,
  disabled,
  arrow = true,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  arrow?: boolean;
}) {
  return (
    <button
      type="button"
      className="cta"
      onClick={onClick}
      disabled={disabled}
      suppressHydrationWarning
    >
      {children}
      {arrow ? <ArrowRightIcon /> : null}
    </button>
  );
}

export function LogoMark() {
  return (
    <div className="mark">
      <div className="tri">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#1E1E1E"
            strokeWidth="9"
            strokeDasharray="188 63"
            strokeDashoffset="-30"
            transform="rotate(-90 50 50)"
          />
          <path d="M50 18 L78 74 L61 74 L50 51 L39 74 L22 74 Z" fill="#ED1C24" />
        </svg>
      </div>
      <div className="wordmark">
        <b>ASKMITCH</b>
        <span>MULTI-VENTURES</span>
      </div>
    </div>
  );
}
