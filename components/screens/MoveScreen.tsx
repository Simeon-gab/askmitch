import type { Move } from "@/lib/options";
import { BackButton, Cta } from "./shared";

const ROWS: { value: Move; label: string; small: string }[] = [
  { value: "buy", label: "Buying", small: "brand new or premium used" },
  { value: "sell", label: "Selling", small: "my current device" },
  { value: "swap", label: "Swapping", small: "trade up to better" },
  { value: "browsing", label: "Just vibing", small: "here for the party" },
];

export default function MoveScreen({
  value,
  onPick,
  onSubmit,
  onBack,
}: {
  value: Move | null;
  onPick: (value: Move) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="eyebrow">We buy · We sell · We swap</div>
      <h1 className="big">
        What&rsquo;s the <span className="r">move?</span>
      </h1>
      <p className="sub">However you play it, there&rsquo;s a deal for you today.</p>
      <div className="stack" role="radiogroup" aria-label="What's the move">
        {ROWS.map((row) => (
          <button
            suppressHydrationWarning
            type="button"
            key={row.value}
            className={value === row.value ? "row sel" : "row"}
            role="radio"
            aria-checked={value === row.value}
            onClick={() => onPick(row.value)}
          >
            <span>
              {row.label} <small>{row.small}</small>
            </span>
            <i className="dot" />
          </button>
        ))}
      </div>
      <Cta onClick={onSubmit} disabled={value === null}>
        Continue
      </Cta>
    </>
  );
}
