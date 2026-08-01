import { BackButton, Cta } from "./shared";

export default function EmailScreen({
  value,
  firstName,
  error,
  onChange,
  onSubmit,
  onBack,
}: {
  value: string;
  firstName: string;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="eyebrow">
        Nice to meet you{firstName ? `, ${firstName}` : ""}!
      </div>
      <h1 className="big">
        Where do we send your <span className="r">5% voucher?</span>
      </h1>
      <p className="sub">
        Your code drops in your inbox the second you finish. No spam — just
        deals worth opening.
      </p>
      <div className="field">
        <input
          suppressHydrationWarning
          type="email"
          placeholder="name@email.com"
          autoComplete="email"
          inputMode="email"
          value={value}
          data-autofocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />
        <div className={error ? "hint err" : "hint"}>
          {error ?? "We’ll email your voucher code here"}
        </div>
      </div>
      <Cta onClick={onSubmit}>Lock it in</Cta>
    </>
  );
}
