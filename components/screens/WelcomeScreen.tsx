import { Cta } from "./shared";

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="badge">
        <i />
        Opening day · Ibadan
      </div>
      <div className="eyebrow">Shop and Chop!</div>
      <h1 className="big">
        Welcome to the <span className="r">ASKMITCH</span> guest list
      </h1>
      <p className="sub">
        You made it to the party — now let&rsquo;s make it official.{" "}
        <b>60 seconds</b>, a few quick questions, and a <b>5% voucher</b> lands
        in your hands.
      </p>
      <div className="meta">
        <div>
          <b>Sat, 8th August</b>Sims Plaza, Apata Rd
        </div>
        <div>
          <b>Shop · Eat · Drink</b>and mingle!!!
        </div>
      </div>
      <Cta onClick={onNext}>Let&rsquo;s go</Cta>
      <p className="fine">Tech, Style, Askmitch Anything…</p>
    </>
  );
}
