import type { ReactNode } from "react";
import type { Gadget } from "@/lib/options";
import { BackButton, Cta } from "./shared";

// Icon SVGs verbatim from the prototype; "Something else" added per
// DESIGN.md (7th card revealing a small free-text input, maps to 'other').
const CARDS: { value: Gadget; label: string; sub: string; icon: ReactNode }[] = [
  {
    value: "iphone",
    label: "iPhone",
    sub: "XR to 17 Pro Max",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M10.5 5h3" />
      </svg>
    ),
  },
  {
    value: "samsung",
    label: "Samsung",
    sub: "Galaxy A to S Ultra",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <circle cx="12" cy="18" r="1" />
      </svg>
    ),
  },
  {
    value: "laptop",
    label: "Laptop",
    sub: "MacBook & Windows",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="11" rx="1.5" />
        <path d="M2 19h20" />
      </svg>
    ),
  },
  {
    value: "audio",
    label: "Audio & speakers",
    sub: "Buds, pods & speakers",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="13" width="4" height="7" rx="1.5" />
        <rect x="17" y="13" width="4" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    value: "watch",
    label: "Smartwatch",
    sub: "Apple Watch & more",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="6.5" width="10" height="11" rx="3" />
        <path d="M9 6.5V3h6v3.5M9 17.5V21h6v-3.5" />
      </svg>
    ),
  },
  {
    value: "gaming",
    label: "Gaming",
    sub: "Consoles, pads & VR",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.5 1.7L15 15H9l-1.5 1.7A3 3 0 0 1 2 15v-2a4 4 0 0 1 4-4Z" />
        <path d="M7.5 12.5h3M9 11v3" />
      </svg>
    ),
  },
];

export default function GadgetScreen({
  value,
  otherText,
  onPick,
  onOtherTextChange,
  onSubmit,
  onBack,
}: {
  value: Gadget | null;
  otherText: string;
  onPick: (value: Gadget) => void;
  onOtherTextChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="eyebrow">Real talk…</div>
      <h1 className="big">
        Which gadget is <span className="r">calling you</span> right now?
      </h1>
      <p className="sub">
        Pick the one you&rsquo;re most likely to buy next — we&rsquo;ll make
        sure it&rsquo;s waiting for you.
      </p>
      <div className="grid" role="radiogroup" aria-label="Gadget">
        {CARDS.map((card) => (
          <button
            suppressHydrationWarning
            type="button"
            key={card.value}
            className={value === card.value ? "card sel" : "card"}
            role="radio"
            aria-checked={value === card.value}
            onClick={() => onPick(card.value)}
          >
            {card.icon}
            <span>{card.label}</span>
            <small>{card.sub}</small>
          </button>
        ))}
        <button
          suppressHydrationWarning
          type="button"
          className={value === "other" ? "card wide sel" : "card wide"}
          role="radio"
          aria-checked={value === "other"}
          onClick={() => onPick("other")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8.5v7M8.5 12h7" />
          </svg>
          <span>Something else</span>
        </button>
      </div>
      {value !== null ? (
        <div className="field">
          <input
            suppressHydrationWarning
            type="text"
            placeholder={
              value === "other"
                ? "Tell us what you’re after"
                : "Which model? (optional)"
            }
            value={otherText}
            data-autofocus
            onChange={(e) => onOtherTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
          />
        </div>
      ) : null}
      <Cta onClick={onSubmit} disabled={value === null}>
        Noted
      </Cta>
    </>
  );
}
