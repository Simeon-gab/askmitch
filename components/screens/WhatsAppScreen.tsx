import { BackButton, Cta } from "./shared";

export default function WhatsAppScreen({
  value,
  consent,
  onChange,
  onConsentChange,
  onSubmit,
  onBack,
}: {
  value: string;
  consent: boolean;
  onChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="eyebrow">Deals move fast here…</div>
      <h1 className="big">
        Drop your <span className="r">WhatsApp</span>
      </h1>
      <p className="sub">
        Flash deals, restock alerts, swap offers — the good stuff goes to
        WhatsApp first.
      </p>
      <div className="field">
        <input
          suppressHydrationWarning
          type="tel"
          placeholder="0801 234 5678"
          autoComplete="tel"
          inputMode="tel"
          value={value}
          data-autofocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />
        <div className="hint">
          Optional — but you&rsquo;ll want the flash deals
        </div>
      </div>
      <label className="consent">
        <input
          suppressHydrationWarning
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <span>
          Keep me posted on offers and updates from ASKMITCH. Unsubscribe
          anytime.
        </span>
      </label>
      <div style={{ height: 16 }} />
      <Cta onClick={onSubmit}>Continue</Cta>
    </>
  );
}
