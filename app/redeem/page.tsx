"use client";

// Staff redemption page (docs/ARCHITECTURE.md "Data flow: redemption").
// PIN entered once per browser session (sessionStorage), sent with every
// request; server does the constant-time comparison. Four result states
// render distinctly; marking as used is a second, explicit call.
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/screens/shared";

const PIN_STORAGE_KEY = "askmitch_redeem_pin";

const GADGET_LABELS: Record<string, string> = {
  iphone: "iPhone",
  samsung: "Samsung",
  laptop: "Laptop",
  audio: "Audio & speakers",
  watch: "Smartwatch",
  gaming: "Gaming",
  other: "Something else",
};

type RedeemResult =
  | { state: "valid"; name: string; gadget: string; gadget_other: string | null }
  | { state: "redeemed"; redeemed_at: string | null; name: string }
  | { state: "expired"; expires_at: string; name: string }
  | { state: "invalid" }
  | { state: "marked"; redeemed_at: string; name: string };

function formatWhen(iso: string | null): string {
  if (!iso) return "earlier";
  const then = new Date(iso);
  const lagos = { timeZone: "Africa/Lagos" } as const;
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { ...lagos, dateStyle: "short" }).format(then) ===
    new Intl.DateTimeFormat("en-CA", { ...lagos, dateStyle: "short" }).format(new Date());
  const time = new Intl.DateTimeFormat("en-NG", {
    ...lagos,
    hour: "numeric",
    minute: "2-digit",
  }).format(then);
  if (sameDay) return `today ${time}`;
  const date = new Intl.DateTimeFormat("en-NG", {
    ...lagos,
    day: "numeric",
    month: "short",
  }).format(then);
  return `${date}, ${time}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

async function callRedeem(code: string, pin: string, confirm?: boolean) {
  const res = await fetch("/api/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(confirm ? { code, pin, confirm } : { code, pin }),
  });
  return { status: res.status, body: (await res.json()) as RedeemResult };
}

export default function RedeemPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPin(window.sessionStorage.getItem(PIN_STORAGE_KEY));
  }, []);

  const unlock = async () => {
    if (unlocking || pinInput.trim() === "") return;
    setUnlocking(true);
    setPinError(null);
    try {
      // '0' can never normalize to a real code — a cheap PIN probe.
      const probe = await callRedeem("0", pinInput.trim());
      if (probe.status === 401) {
        setPinError("Wrong PIN — try again.");
      } else if (probe.status === 200) {
        window.sessionStorage.setItem(PIN_STORAGE_KEY, pinInput.trim());
        setPin(pinInput.trim());
        setPinInput("");
      } else {
        setPinError("Something went wrong — try again.");
      }
    } catch {
      setPinError("Network problem — try again.");
    }
    setUnlocking(false);
  };

  const lock = () => {
    window.sessionStorage.removeItem(PIN_STORAGE_KEY);
    setPin(null);
    setResult(null);
    setCode("");
  };

  const check = async () => {
    if (!pin || checking || code.trim() === "") return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await callRedeem(code, pin);
      if (res.status === 401) {
        lock();
        return;
      }
      if (res.status !== 200) {
        setError("Something went wrong — try again.");
      } else {
        setResult(res.body);
      }
    } catch {
      setError("Network problem — try again.");
    }
    setChecking(false);
  };

  const markUsed = async () => {
    if (!pin || marking || !result || result.state !== "valid") return;
    setMarking(true);
    setError(null);
    try {
      const res = await callRedeem(code, pin, true);
      if (res.status === 401) {
        lock();
        return;
      }
      if (res.status !== 200) {
        setError("Something went wrong — try again.");
      } else {
        setResult(res.body);
      }
    } catch {
      setError("Network problem — try again.");
    }
    setMarking(false);
  };

  const reset = () => {
    setCode("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="app rd">
      <div className="top">
        <LogoMark />
        {pin ? (
          <button type="button" className="rd-lock" onClick={lock} suppressHydrationWarning>
            Lock
          </button>
        ) : (
          <div className="stepcount">STAFF</div>
        )}
      </div>
      <div className="ribbon">
        <i style={{ width: pin ? "100%" : "0%" }} />
      </div>

      <div className="rd-stage">
        {pin === null ? (
          <div>
            <div className="eyebrow">Staff only…</div>
            <h1 className="big">
              Voucher <span className="r">redemption</span>
            </h1>
            <p className="sub">Enter the staff PIN to unlock this station.</p>
            <div className="field">
              <input
                suppressHydrationWarning
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="6-digit PIN"
                value={pinInput}
                maxLength={12}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void unlock();
                }}
              />
              {pinError ? <div className="hint err">{pinError}</div> : null}
            </div>
            <button
              type="button"
              className="cta"
              onClick={() => void unlock()}
              disabled={unlocking || pinInput.trim() === ""}
              suppressHydrationWarning
            >
              {unlocking ? "Checking…" : "Unlock"}
            </button>
          </div>
        ) : (
          <div>
            <div className="eyebrow">Check a code…</div>
            <h1 className="big">
              Redeem a <span className="r">voucher</span>
            </h1>
            <div className="field">
              <input
                suppressHydrationWarning
                type="text"
                placeholder="MITCH-XXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void check();
                }}
              />
              <div className="hint">
                Case and spaces don&rsquo;t matter — &ldquo;mitch k3xt9&rdquo; works
              </div>
            </div>

            {result === null ? (
              <button
                type="button"
                className="cta"
                onClick={() => void check()}
                disabled={checking || code.trim() === ""}
                suppressHydrationWarning
              >
                {checking ? "Checking…" : "Check code"}
              </button>
            ) : null}

            {result?.state === "valid" ? (
              <div className="rd-card">
                <span className="pill ok">Valid</span>
                <div className="rd-name">{result.name}</div>
                <div className="rd-meta">
                  Interested in:{" "}
                  {result.gadget === "other" && result.gadget_other
                    ? result.gadget_other
                    : (GADGET_LABELS[result.gadget] ?? result.gadget)}{" "}
                  · 5% off
                </div>
                <button
                  type="button"
                  className="cta"
                  onClick={() => void markUsed()}
                  disabled={marking}
                  suppressHydrationWarning
                >
                  {marking ? "Marking…" : "Mark as used"}
                </button>
              </div>
            ) : null}

            {result?.state === "marked" ? (
              <div className="rd-card">
                <span className="pill ok">Done ✓</span>
                <div className="rd-name">{result.name}</div>
                <div className="rd-meta">
                  Marked as used {formatWhen(result.redeemed_at)}
                </div>
                <button type="button" className="cta ghost" onClick={reset} suppressHydrationWarning>
                  Check another code
                </button>
              </div>
            ) : null}

            {result?.state === "redeemed" ? (
              <div className="rd-card">
                <span className="pill warn">Already used</span>
                <div className="rd-name">{result.name}</div>
                <div className="rd-meta">Used {formatWhen(result.redeemed_at)}</div>
                <button type="button" className="cta ghost" onClick={reset} suppressHydrationWarning>
                  Check another code
                </button>
              </div>
            ) : null}

            {result?.state === "expired" ? (
              <div className="rd-card">
                <span className="pill err">Expired</span>
                <div className="rd-name">{result.name}</div>
                <div className="rd-meta">Expired {formatDate(result.expires_at)}</div>
                <button type="button" className="cta ghost" onClick={reset} suppressHydrationWarning>
                  Check another code
                </button>
              </div>
            ) : null}

            {result?.state === "invalid" ? (
              <div className="rd-card">
                <span className="pill err">Not found</span>
                <div className="rd-meta">
                  No voucher matches that code — check the spelling.
                </div>
                <button type="button" className="cta ghost" onClick={reset} suppressHydrationWarning>
                  Try again
                </button>
              </div>
            ) : null}

            {error ? <p className="formerr">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
