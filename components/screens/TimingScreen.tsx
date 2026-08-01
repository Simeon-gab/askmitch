import type { Timing } from "@/lib/options";
import { ArrowRightIcon, BackButton } from "./shared";

const ROWS: { value: Timing; label: string; small: string | null }[] = [
  { value: "today", label: "Today", small: "while I'm here!" },
  { value: "this_week", label: "This week", small: null },
  { value: "this_month", label: "This month", small: null },
  { value: "someday", label: "Someday soon", small: null },
];

export default function TimingScreen({
  value,
  submitting,
  submitError,
  onPick,
  onSubmit,
  onBack,
}: {
  value: Timing | null;
  submitting: boolean;
  submitError: string | null;
  onPick: (value: Timing) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="eyebrow">Last one, promise…</div>
      <h1 className="big">
        When are you making it <span className="r">happen?</span>
      </h1>
      <p className="sub">Be honest — your voucher works either way.</p>
      <div className="stack" role="radiogroup" aria-label="When">
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
              {row.label}
              {row.small ? <> <small>{row.small}</small></> : null}
            </span>
            <i className="dot" />
          </button>
        ))}
      </div>
      <button
        suppressHydrationWarning
        type="button"
        className="cta"
        disabled={value === null || submitting}
        onClick={onSubmit}
      >
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Getting your voucher…
          </>
        ) : (
          <>
            Get my 5% voucher
            <ArrowRightIcon />
          </>
        )}
      </button>
      {submitError ? (
        <p className="formerr" role="alert">
          {submitError}
        </p>
      ) : null}
    </>
  );
}
