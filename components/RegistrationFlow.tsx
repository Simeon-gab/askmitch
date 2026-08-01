"use client";

// The multi-step registration flow — a faithful port of the approved
// prototype (docs/DESIGN.md is the copy/animation source of truth).
// State lives locally; ONE network call at the end (POST /api/register).
// The voucher code shown is always the server's — never client-generated.
import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/Confetti";
import EmailScreen from "@/components/screens/EmailScreen";
import GadgetScreen from "@/components/screens/GadgetScreen";
import MoveScreen from "@/components/screens/MoveScreen";
import NameScreen from "@/components/screens/NameScreen";
import { LogoMark } from "@/components/screens/shared";
import TimingScreen from "@/components/screens/TimingScreen";
import VoucherScreen from "@/components/screens/VoucherScreen";
import WelcomeScreen from "@/components/screens/WelcomeScreen";
import WhatsAppScreen from "@/components/screens/WhatsAppScreen";
import type { Gadget, Move, Source, Timing } from "@/lib/options";

interface Answers {
  name: string;
  email: string;
  phone: string;
  gadget: Gadget | null;
  gadgetOther: string;
  move: Move | null;
  timing: Timing | null;
  consent: boolean;
}

const INITIAL_ANSWERS: Answers = {
  name: "",
  email: "",
  phone: "",
  gadget: null,
  gadgetOther: "",
  move: null,
  timing: null,
  consent: true, // default checked is acceptable for an event (DESIGN.md)
};

interface RegisterSuccess {
  code: string;
  expires_at: string;
  already_registered: boolean;
  email_sent: boolean;
}

// Same inline check as the prototype; the full Zod schema runs before POST
// and again on the server.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 500 copy comes from the server (docs/ARCHITECTURE.md); these two cover
// states the copy deck doesn't: rate-limited and offline.
const FALLBACK_SERVER_ERROR =
  "Something went wrong — find a staff member and we'll sort you out.";
const RATE_LIMIT_ERROR =
  "Whoa — too many tries from this connection. Give it a minute, then go again.";
const NETWORK_ERROR =
  "Network's acting up — check your connection and try again.";

const SUBMIT_ATTEMPTS = 3; // 1 try + 2 retries with backoff (ARCHITECTURE.md)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function postRegistration(
  payload: unknown,
): Promise<{ ok: true; data: RegisterSuccess } | { ok: false; message: string }> {
  let failureMessage = NETWORK_ERROR;
  for (let attempt = 0; attempt < SUBMIT_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(800 * attempt);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 12_000);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (res.ok) {
        return { ok: true, data: (await res.json()) as RegisterSuccess };
      }
      if (res.status === 429) {
        return { ok: false, message: RATE_LIMIT_ERROR };
      }
      if (res.status >= 500) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        failureMessage = body?.message ?? FALLBACK_SERVER_ERROR;
        continue; // retry 5xx
      }
      // 4xx other than 429 — client checks should prevent this; don't retry.
      return { ok: false, message: FALLBACK_SERVER_ERROR };
    } catch {
      failureMessage = NETWORK_ERROR; // network drop or timeout — retry
    }
  }
  return { ok: false, message: failureMessage };
}

export default function RegistrationFlow({
  source,
  kiosk = false,
}: {
  source: Source;
  kiosk?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [company, setCompany] = useState(""); // honeypot — humans never see it
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [voucherPop, setVoucherPop] = useState(false);
  const leaveTimer = useRef<number | null>(null);

  const patch = (partial: Partial<Answers>) =>
    setAnswers((prev) => ({ ...prev, ...partial }));

  const go = (n: number) => {
    if (n === step) return;
    setLeaving(step);
    setStep(n);
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setLeaving(null), 500);
  };

  // Focus the active screen's input after the 500ms transition — desktop
  // only, so mobile keyboards don't pop uninvited (prototype behavior).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.innerWidth <= 560) return;
      document
        .querySelector<HTMLInputElement>(
          `.screen[data-s="${step}"] input[data-autofocus]`,
        )
        ?.focus();
    }, 550);
    return () => window.clearTimeout(timer);
  }, [step]);

  // Voucher card springs in ~500ms after the screen change (DESIGN.md);
  // confetti fires at the same moment.
  useEffect(() => {
    if (step !== 7) {
      setVoucherPop(false);
      return;
    }
    const timer = window.setTimeout(() => setVoucherPop(true), 500);
    return () => window.clearTimeout(timer);
  }, [step]);

  const firstName = answers.name.trim().split(" ")[0] ?? "";

  const submitName = () => {
    if (answers.name.trim().length < 2) {
      setNameError("We need a name for the guest list");
      return;
    }
    setNameError(null);
    go(2);
  };

  const submitEmail = () => {
    if (!EMAIL_RE.test(answers.email.trim())) {
      setEmailError("Hmm, that email doesn’t look right — double-check it");
      return;
    }
    setEmailError(null);
    go(3);
  };

  const submit = async () => {
    if (submitting) return;
    // The disabled CTAs make these impossible; guard anyway for type safety.
    if (!answers.gadget || !answers.move || !answers.timing) return;
    setSubmitError(null);

    // Mirrors lib/validation.ts — which the server re-runs on every request.
    const payload = {
      name: answers.name.trim(),
      email: answers.email.trim(),
      phone: answers.phone.trim() === "" ? null : answers.phone.trim(),
      gadget: answers.gadget,
      gadget_other:
        answers.gadget === "other" ? answers.gadgetOther.trim() || null : null,
      move: answers.move,
      timing: answers.timing,
      consent: answers.consent,
      source,
      company,
    };

    setSubmitting(true);
    const result = await postRegistration(payload);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message); // data stays intact — just retry
      return;
    }
    setVoucherCode(result.data.code);
    go(7);
  };

  const restart = () => {
    setAnswers(INITIAL_ANSWERS);
    setNameError(null);
    setEmailError(null);
    setCompany("");
    setSubmitError(null);
    setSubmitting(false);
    setVoucherCode(null);
    setVoucherPop(false);
    go(0);
  };

  const screenClass = (n: number) =>
    `screen${step === n ? " on" : ""}${leaving === n ? " out" : ""}`;
  const progress = step === 0 ? 0 : step === 7 ? 100 : Math.round((step / 6) * 100);

  const screens: { key: string; node: React.ReactNode }[] = [
    { key: "welcome", node: <WelcomeScreen onNext={() => go(1)} /> },
    {
      key: "name",
      node: (
        <NameScreen
          value={answers.name}
          error={nameError}
          onChange={(name) => patch({ name })}
          onSubmit={submitName}
          onBack={() => go(0)}
        />
      ),
    },
    {
      key: "email",
      node: (
        <EmailScreen
          value={answers.email}
          firstName={firstName}
          error={emailError}
          onChange={(email) => patch({ email })}
          onSubmit={submitEmail}
          onBack={() => go(1)}
        />
      ),
    },
    {
      key: "whatsapp",
      node: (
        <WhatsAppScreen
          value={answers.phone}
          consent={answers.consent}
          onChange={(phone) => patch({ phone })}
          onConsentChange={(consent) => patch({ consent })}
          onSubmit={() => go(4)}
          onBack={() => go(2)}
        />
      ),
    },
    {
      key: "gadget",
      node: (
        <GadgetScreen
          value={answers.gadget}
          otherText={answers.gadgetOther}
          onPick={(gadget) => patch({ gadget })}
          onOtherTextChange={(gadgetOther) => patch({ gadgetOther })}
          onSubmit={() => go(5)}
          onBack={() => go(3)}
        />
      ),
    },
    {
      key: "move",
      node: (
        <MoveScreen
          value={answers.move}
          onPick={(move) => patch({ move })}
          onSubmit={() => go(6)}
          onBack={() => go(4)}
        />
      ),
    },
    {
      key: "timing",
      node: (
        <TimingScreen
          value={answers.timing}
          submitting={submitting}
          submitError={submitError}
          onPick={(timing) => patch({ timing })}
          onSubmit={submit}
          onBack={() => go(5)}
        />
      ),
    },
    {
      key: "voucher",
      node: (
        <VoucherScreen
          firstName={firstName}
          code={voucherCode ?? ""}
          pop={voucherPop}
          kiosk={kiosk}
          onRestart={restart}
        />
      ),
    },
  ];

  return (
    <div className="app" data-kiosk={kiosk || undefined}>
      <div className="top">
        <LogoMark />
        <div className="stepcount">
          {step > 0 && step < 7 ? (
            <>
              <em>{`0${step}`}</em>
              {" / 06"}
            </>
          ) : null}
        </div>
      </div>
      <div className="ribbon">
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className="stage">
        {/* honeypot: hidden from humans, tempting to bots */}
        <input
          suppressHydrationWarning
          className="hp"
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        {screens.map(({ key, node }, i) => (
          <section key={key} className={screenClass(i)} data-s={i}>
            <div className="screen-inner">{node}</div>
          </section>
        ))}
      </div>

      {step === 7 && voucherPop ? <Confetti /> : null}
    </div>
  );
}
