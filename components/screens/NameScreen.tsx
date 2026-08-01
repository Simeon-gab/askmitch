import { BackButton, Cta } from "./shared";

export default function NameScreen({
  value,
  error,
  onChange,
  onSubmit,
  onBack,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <div className="eyebrow">First things first…</div>
      <h1 className="big">
        Who&rsquo;s on the <span className="r">guest list?</span>
      </h1>
      <p className="sub">Every VIP has a name. What should we call you?</p>
      <div className="field">
        <input
          suppressHydrationWarning
          type="text"
          placeholder="Your full name"
          autoComplete="name"
          value={value}
          data-autofocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />
        <div className={error ? "hint err" : "hint"}>
          {error ?? "This goes on your voucher"}
        </div>
      </div>
      <Cta onClick={onSubmit}>That&rsquo;s me</Cta>
    </>
  );
}
