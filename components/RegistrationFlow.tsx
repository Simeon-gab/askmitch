"use client";

// The multi-step registration flow. Copy is verbatim from docs/DESIGN.md.
// State lives locally; ONE network call at the end (POST /api/register).
// The voucher code shown is always the server's — never client-generated.
// Screen transitions mirror production (500ms brand ease) and are
// DIRECTION-AWARE: forward exits up / enters from below, Back exits
// down / enters from above (flushSync repositions waiting screens
// before the step change so the incoming side is always correct).
// All motion is CSS-only, transform/opacity, no libraries.
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import Confetti from "@/components/Confetti";
import type { Source } from "@/lib/options";
import s from "./registration.module.css";

interface RegisterSuccess {
  code: string;
  expires_at: string;
  already_registered: boolean;
  email_sent: boolean;
}

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAPS_QUERY = encodeURIComponent("Sims Plaza, Apata Road, Ibadan");
const MAPS_FALLBACK = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;

// Platform-specific maps deep link. Android gets `geo:` so the OS shows its
// "open with" chooser; iOS has no chooser, so it gets Apple Maps; desktop
// gets Google Maps in a tab. Read through useSyncExternalStore rather than
// an effect: the server snapshot is the https fallback, so markup matches
// on hydration and no cascading re-render is needed.
const EMPTY_SUBSCRIBE = () => () => {};

function readMapsHref(): string {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return `https://maps.apple.com/?q=${MAPS_QUERY}`;
  if (/Android/i.test(ua)) return `geo:0,0?q=${MAPS_QUERY}`;
  return MAPS_FALLBACK;
}

function serverMapsHref(): string {
  return MAPS_FALLBACK;
}

type Gadget =
  | "iphone"
  | "samsung"
  | "laptop"
  | "audio"
  | "watch"
  | "gaming"
  | "other";
type Move = "buy" | "sell" | "swap" | "browsing";
type Timing = "today" | "this_week" | "this_month" | "someday";

/* ---------- icons ---------- */

function TriMark() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="var(--tl-ring)"
        strokeWidth="9"
        strokeDasharray="188 63"
        strokeDashoffset="-30"
        transform="rotate(-90 50 50)"
      />
      <path d="M50 18 L78 74 L61 74 L50 51 L39 74 L22 74 Z" fill="#ED1C24" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21.5s-7-5.5-7-11.3A7 7 0 0 1 19 10.2c0 5.8-7 11.3-7 11.3z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 4l1.7 4.6L17.3 10.3l-4.6 1.7L11 16.6l-1.7-4.6L4.7 10.3l4.6-1.7z" />
      <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8.5l1.2-3.5h9.6L18 8.5M5.5 8.5h13l-.9 11a2 2 0 0 1-2 1.5H8.4a2 2 0 0 1-2-1.5z" />
      <path d="M9.3 12a2.7 2.7 0 0 0 5.4 0" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.6 3.5h7.9v7.9l-8.6 8.6a2 2 0 0 1-2.8 0l-5.1-5.1a2 2 0 0 1 0-2.8z" />
      <circle cx="16.5" cy="7.5" r="1.4" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h13M14 4.5L17.5 8 14 11.5" />
      <path d="M20 16H7M10 12.5L6.5 16l3.5 3.5" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

/* Footer socials — solid glyphs (filled, not stroked) so they read
   white-on-accent at 19px. */
function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.4-3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.92-4.45 9.92-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.02 2.57c.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.6 2.9c.5-.5 1.3-.5 1.8.1l2.3 3c.4.5.4 1.2-.1 1.6L9.2 9a.6.6 0 0 0-.15.72 12.4 12.4 0 0 0 5.23 5.23c.24.12.54.06.72-.15l1.4-1.4c.44-.45 1.11-.5 1.6-.1l3 2.3c.6.45.63 1.3.1 1.8l-1.36 1.36c-.72.72-1.8 1.03-2.8.76C11.63 18.2 5.8 12.37 4.5 5.06c-.27-1 .04-2.08.76-2.8z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z" />
    </svg>
  );
}

/* Gadget card icons — SVG paths verbatim from production GadgetScreen. */
const GADGET_CARDS: { value: Gadget; label: string; sub: string; icon: ReactNode }[] = [
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

const SIGN_OFF = "Tech, Style, Askmitch Anything…";
const INSTAGRAM_URL = "https://instagram.com/Askmitch_multiventures";
const STORE_ADDRESS = "Sims Plaza, Olakunle Junction, Bembo, Alao Akala Expressway, Apata Road, Ibadan";
const CONTACTS = [
  { name: "Mitch", number: "08101799537" },
  { name: "Nasir", number: "08088547806" },
] as const;

function toWhatsAppNumber(number: string) {
  return `234${number.slice(1)}`;
}

function copyText(value: string, onCopied: () => void) {
  void navigator.clipboard?.writeText(value);
  onCopied();
}

function ContactMenu({ mode }: { mode: "whatsapp" | "call" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const label = mode === "whatsapp" ? "Message us on WhatsApp" : "Call us";

  const handleCopy = (name: string, number: string) => {
    copyText(number, () => {
      setCopied(name);
      window.setTimeout(() => setCopied(null), 1600);
    });
  };

  return (
    <span className={s.contactControl}>
      <button
        type="button"
        className={s.socialBtn}
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-expanded={open}
      >
        {mode === "whatsapp" ? <WhatsAppGlyph /> : <PhoneGlyph />}
      </button>
      {open ? (
        <span className={s.contactPop} role="dialog" aria-label={label}>
          <span className={s.contactTitle}>{mode === "whatsapp" ? "Message on WhatsApp" : "Call ASKMITCH"}</span>
          {CONTACTS.map((contact) => (
            <span className={s.contactRow} key={contact.number}>
              <span>
                <b>{contact.name}</b>
                <small>{contact.number}</small>
              </span>
              <span className={s.contactActions}>
                <button
                  type="button"
                  className={s.contactCopy}
                  onClick={() => handleCopy(contact.name, contact.number)}
                >
                  {copied === contact.name ? "Copied" : "Copy"}
                </button>
                <a
                  className={s.contactOpen}
                  href={mode === "whatsapp" ? `https://wa.me/${toWhatsAppNumber(contact.number)}` : `tel:${contact.number}`}
                  target={mode === "whatsapp" ? "_blank" : undefined}
                  rel={mode === "whatsapp" ? "noopener noreferrer" : undefined}
                  aria-label={mode === "whatsapp" ? `Message ${contact.name} on WhatsApp` : `Call ${contact.name}`}
                >
                  {mode === "whatsapp" ? <WhatsAppGlyph /> : <PhoneGlyph />}
                </a>
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function VenueMenu({ mapsHref }: { mapsHref: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className={`${s.tile} ${s.tileLink} ${s.venueTile}`}>
      <button
        type="button"
        className={s.tileTrigger}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Show venue actions for Sims Plaza, Apata Road"
      >
        <span className={s.tileGo}>
          <ExternalIcon />
        </span>
        <span className={s.tileIcon}>
          <PinIcon />
        </span>
        <span className={s.tileKicker}>Venue</span>
        <b className={s.tileValue}>Sims Plaza, Apata Rd</b>
      </button>
      {open ? (
        <span className={s.venuePop} role="dialog" aria-label="Venue actions">
          <span>{STORE_ADDRESS}</span>
          <span className={s.venueActions}>
            <button
              type="button"
              onClick={() => {
                copyText(STORE_ADDRESS, () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              <CopyIcon />
              {copied ? "Copied" : "Copy address"}
            </button>
            <a
              href={mapsHref}
              target={mapsHref.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              <ExternalIcon />
              Open maps
            </a>
          </span>
        </span>
      ) : null}
    </div>
  );
}

/* Sign-off + socials. The line types itself in on the welcome screen. */
function FooterLine({ typed = false }: { typed?: boolean }) {
  return (
    <>
      <span className={s.signOffWrap}>
        <span className={typed ? `${s.signOff} ${s.signOffType}` : s.signOff}>
          {SIGN_OFF}
        </span>
        {typed ? <i className={s.caret} aria-hidden="true" /> : null}
      </span>
      <span className={s.social}>
        <a
          className={s.socialBtn}
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="ASKMITCH on Instagram"
        >
          <InstagramGlyph />
        </a>
        <ContactMenu mode="whatsapp" />
        <ContactMenu mode="call" />
      </span>
    </>
  );
}

const MOVE_ROWS: { value: Move; label: string; small: string; icon: ReactNode }[] = [
  { value: "buy", label: "Buying", small: "brand new or premium used", icon: <BagIcon /> },
  { value: "sell", label: "Selling", small: "my current device", icon: <TagIcon /> },
  { value: "swap", label: "Swapping", small: "trade up to better", icon: <SwapIcon /> },
  { value: "browsing", label: "Just vibing", small: "here for the party", icon: <SparklesIcon /> },
];

const TIMING_ROWS: { value: Timing; label: string; small: string | null; icon: ReactNode }[] = [
  { value: "today", label: "Today", small: "while I'm here!", icon: <ZapIcon /> },
  { value: "this_week", label: "This week", small: null, icon: <ClockIcon /> },
  { value: "this_month", label: "This month", small: null, icon: <CalendarIcon /> },
  { value: "someday", label: "Someday soon", small: null, icon: <MoonIcon /> },
];

export default function RegistrationFlow({
  source,
  kiosk = false,
}: {
  source: Source;
  kiosk?: boolean;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true); // default checked (DESIGN.md)
  const [gadget, setGadget] = useState<Gadget | null>(null);
  const [gadgetOther, setGadgetOther] = useState("");
  const [move, setMove] = useState<Move | null>(null);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [company, setCompany] = useState(""); // honeypot — humans never see it
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [voucherPop, setVoucherPop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kioskCountdown, setKioskCountdown] = useState<number | null>(null);
  const [stillThere, setStillThere] = useState(false);
  const [stillThereCount, setStillThereCount] = useState(10);
  const mapsHref = useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    readMapsHref,
    serverMapsHref,
  );
  const leaveTimer = useRef<number | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);
  const emailInput = useRef<HTMLInputElement | null>(null);
  const phoneInput = useRef<HTMLInputElement | null>(null);
  const lastActivity = useRef(Date.now());
  const dark = theme === "dark";

  // Direction-aware transition: commit the direction FIRST (flushSync) so
  // waiting screens reposition (above vs below) before the step change
  // starts the 500ms transition. Same bookkeeping as production otherwise.
  const go = (n: number) => {
    if (n === step) return;
    flushSync(() => setDir(n < step ? "back" : "fwd"));
    setLeaving(step);
    setStep(n);
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setLeaving(null), 500);
  };

  // Desktop-only autofocus after the 500ms transition (prototype behavior).
  useEffect(() => {
    const inputs: Record<number, RefObject<HTMLInputElement | null>> = {
      1: nameInput,
      2: emailInput,
      3: phoneInput,
    };
    const target = inputs[step];
    if (!target) return;
    const timer = window.setTimeout(() => {
      if (window.innerWidth <= 560) return;
      target.current?.focus();
    }, 550);
    return () => window.clearTimeout(timer);
  }, [step]);

  // Voucher card springs in ~500ms after the screen change; confetti
  // fires at the same moment (DESIGN.md).
  useEffect(() => {
    if (step !== 7) return;
    const timer = window.setTimeout(() => setVoucherPop(true), 500);
    // reset on the way out, not synchronously in the body — keeps this a
    // single render pass instead of a cascading one
    return () => {
      window.clearTimeout(timer);
      setVoucherPop(false);
    };
  }, [step]);

  // ---- kiosk behaviours (docs/ARCHITECTURE.md "Kiosk mode") ----

  // 20s auto-reset after the voucher screen; countdown surfaces from 10s.
  useEffect(() => {
    if (!kiosk || step !== 7) return;
    setKioskCountdown(20);
    const interval = window.setInterval(
      () => setKioskCountdown((c) => (c === null || c <= 0 ? c : c - 1)),
      1000,
    );
    return () => {
      window.clearInterval(interval);
      setKioskCountdown(null);
    };
  }, [kiosk, step]);

  useEffect(() => {
    if (kioskCountdown === 0) restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kioskCountdown]);

  // Any tap or key counts as activity for the idle timer.
  useEffect(() => {
    if (!kiosk) return;
    const bump = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [kiosk]);

  // 45s idle on any screen with data in play -> "Still there?" overlay.
  useEffect(() => {
    if (!kiosk || stillThere) return;
    const interval = window.setInterval(() => {
      const dirty =
        name !== "" ||
        email !== "" ||
        phone !== "" ||
        gadget !== null ||
        move !== null ||
        timing !== null ||
        !consent;
      if (step === 7) return; // the 20s voucher reset owns that screen
      if ((step > 0 || dirty) && Date.now() - lastActivity.current > 45_000) {
        setStillThere(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [kiosk, stillThere, step, name, email, phone, gadget, move, timing, consent]);

  // Overlay: reset to welcome after 10 more seconds, wiping everything.
  useEffect(() => {
    if (!stillThere) return;
    const interval = window.setInterval(
      () => setStillThereCount((c) => (c <= 0 ? c : c - 1)),
      1000,
    );
    return () => {
      window.clearInterval(interval);
      setStillThereCount(10);
    };
  }, [stillThere]);

  useEffect(() => {
    if (stillThere && stillThereCount === 0) restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillThere, stillThereCount]);

  const firstName = name.trim().split(" ")[0] ?? "";

  const submitName = () => {
    if (name.trim().length < 2) {
      setNameError("We need a name for the guest list");
      return;
    }
    setNameError(null);
    go(2);
  };

  const submitEmail = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Hmm, that email doesn’t look right — double-check it");
      return;
    }
    setEmailError(null);
    go(3);
  };

  const copyCode = () => {
    if (voucherCode && navigator.clipboard) {
      void navigator.clipboard.writeText(voucherCode);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const submit = async () => {
    if (submitting) return;
    // The disabled CTAs make these impossible; guard anyway for type safety.
    if (!gadget || !move || !timing) return;
    setSubmitError(null);

    // Mirrors lib/validation.ts — which the server re-runs on every request.
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() === "" ? null : phone.trim(),
      gadget,
      // model text is welcome for ANY gadget (demand-driven stocking)
      gadget_other: gadgetOther.trim() || null,
      move,
      timing,
      consent,
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

  // Full reset — clears EVERY answer and error (kiosk privacy rule: the
  // next guest must never see the previous guest's entries).
  const restart = () => {
    setName("");
    setNameError(null);
    setEmail("");
    setEmailError(null);
    setPhone("");
    setConsent(true);
    setGadget(null);
    setGadgetOther("");
    setMove(null);
    setTiming(null);
    setCompany("");
    setSubmitError(null);
    setSubmitting(false);
    setVoucherCode(null);
    setVoucherPop(false);
    setKioskCountdown(null);
    setStillThere(false);
    lastActivity.current = Date.now();
    go(0);
  };

  const scr = (n: number) =>
    `${s.scr}${step === n ? ` ${s.on}` : ""}${leaving === n ? ` ${s.out}` : ""}`;

  const progress = step === 0 ? 0 : step === 7 ? 100 : Math.round((step / 6) * 100);

  return (
    <div className={s.page} data-theme={theme} data-kiosk={kiosk || undefined}>
      <div className={s.glow} aria-hidden="true" />

      <div className={s.frame}>
        <header className={s.top}>
          <div className={s.mark}>
            <div className={s.tri}>
              <TriMark />
            </div>
            <div className={s.wordmark}>
              <b>ASKMITCH</b>
              <span>MULTI-VENTURES</span>
            </div>
          </div>

          <div className={s.topRight}>
            {step > 0 && step < 7 ? (
              <span className={s.stepcount}>
                <em>{`0${step}`}</em> / 06
              </span>
            ) : null}
            <button
              type="button"
              className={s.themeBtn}
              suppressHydrationWarning
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(dark ? "light" : "dark")}
            >
              <span className={s.iconSun}>
                <SunIcon />
              </span>
              <span className={s.iconMoon}>
                <MoonIcon />
              </span>
            </button>
          </div>
        </header>

        <div className={s.ribbon}>
          <i style={{ width: `${progress}%` }} />
        </div>

        <main className={s.stage} data-dir={dir}>
          {/* honeypot: hidden from humans, tempting to bots */}
          <input
            suppressHydrationWarning
            className={s.hp}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          {/* ---------- 0 · welcome ---------- */}
          <section className={scr(0)} aria-hidden={step !== 0}>
            {/* centered pill; the icon crossfades pin ⇄ calendar (CSS only —
                GSAP is off-limits per the no-animation-libraries hard rule) */}
            <div className={s.ticket}>
              <span className={s.ticketMorph} aria-hidden="true">
                <span className={s.morphPin}>
                  <PinIcon />
                </span>
                <span className={s.morphCal}>
                  <CalendarIcon />
                </span>
              </span>
              <span>Opening day</span>
              <i className={s.ticketDot} />
              <span className={s.ticketCity}>Ibadan</span>
            </div>

            {/* writes in after a beat — line 1, then line 2 */}
            <div className={s.scriptWrap}>
              <svg
                className={s.script}
                viewBox="0 0 640 228"
                role="img"
                aria-label="Shop · Eat · Drink and mingle!!!"
              >
                <defs>
                  <mask id="tl-nib1">
                    <rect className={s.nib} x="-10" y="0" width="660" height="112" fill="#fff" />
                  </mask>
                  <mask id="tl-ink1">
                    <rect
                      className={`${s.nib} ${s.nibInk}`}
                      x="-10"
                      y="0"
                      width="660"
                      height="112"
                      fill="#fff"
                    />
                  </mask>
                  <mask id="tl-nib2">
                    <rect
                      className={`${s.nib} ${s.nibL2}`}
                      x="-10"
                      y="112"
                      width="660"
                      height="102"
                      fill="#fff"
                    />
                  </mask>
                  <mask id="tl-ink2">
                    <rect
                      className={`${s.nib} ${s.nibL2} ${s.nibL2Ink}`}
                      x="-10"
                      y="112"
                      width="660"
                      height="102"
                      fill="#fff"
                    />
                  </mask>
                  {/* the underline strokes itself via a masked sweep, not
                      stroke-dashoffset — transform-only (CLAUDE.md) */}
                  <mask id="tl-uline">
                    <rect
                      className={s.ulineNib}
                      x="40"
                      y="188"
                      width="400"
                      height="46"
                      fill="#fff"
                    />
                  </mask>
                </defs>
                <g className={s.sLine1}>
                  <text className={s.scriptStroke} x="6" y="78" mask="url(#tl-nib1)">
                    Shop · Eat · Drink
                  </text>
                  <text className={s.scriptFill} x="6" y="78" mask="url(#tl-ink1)">
                    Shop · Eat · Drink
                  </text>
                </g>
                <g className={s.sLine2}>
                  <text className={`${s.scriptStroke} ${s.scriptL2}`} x="92" y="180" mask="url(#tl-nib2)">
                    and mingle!!!
                  </text>
                  <text className={`${s.scriptFill} ${s.scriptL2}`} x="92" y="180" mask="url(#tl-ink2)">
                    and mingle!!!
                  </text>
                  <path
                    className={s.underline}
                    d="M86 206 C 146 198, 228 214, 296 203 S 370 197, 392 205"
                    mask="url(#tl-uline)"
                  />
                </g>
              </svg>
            </div>

            <h1 className={s.big}>
              <span className={s.lineClip}>
                <span className={s.line1}>Welcome to the</span>
              </span>
              <span className={s.lineClip}>
                <span className={s.line2}>
                  <em>ASKMITCH</em> guest list
                </span>
              </span>
            </h1>

            <p className={s.sub}>
              You made it to the party — now let&rsquo;s make it official.{" "}
              <b>60 seconds</b>, a few quick questions, and a <b>5% voucher</b>{" "}
              lands in your hands.
            </p>

            <p className={s.moves} aria-label="We buy · We sell · We swap">
              <span>We buy</span>
              <i />
              <span>We sell</span>
              <i />
              <span>We swap</span>
            </p>

            <div className={s.details}>
              <div className={s.tile}>
                <span className={s.tileIcon}>
                  <CalendarIcon />
                </span>
                <span className={s.tileKicker}>Date</span>
                <b className={s.tileValue}>Sat, 8th August</b>
              </div>
              <VenueMenu mapsHref={mapsHref} />
            </div>

            <button type="button" className={s.cta} suppressHydrationWarning onClick={() => go(1)}>
              Let&rsquo;s go
              <span className={s.ctaArrow}>
                <ArrowIcon />
              </span>
            </button>

            <div className={s.fine}>
              <FooterLine typed />
            </div>
          </section>

          {/* ---------- 1 · name ---------- */}
          <section className={scr(1)} aria-hidden={step !== 1}>
            <button
              type="button"
              className={`${s.back} ${s.st} ${s.st0}`}
              suppressHydrationWarning
              onClick={() => go(0)}
            >
              <BackIcon />
              Back
            </button>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>First things first…</div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              Who&rsquo;s on the <em>guest list?</em>
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              Every VIP has a name. What should we call you?
            </p>
            <div className={`${s.field} ${s.st} ${s.st4}`}>
              <input
                ref={nameInput}
                suppressHydrationWarning
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitName();
                }}
              />
              <div className={nameError ? `${s.hint} ${s.err}` : s.hint}>
                {nameError ?? "This goes on your voucher"}
              </div>
            </div>
            <button
              type="button"
              className={`${s.cta} ${s.ctaTight} ${s.st} ${s.st5}`}
              suppressHydrationWarning
              onClick={submitName}
            >
              That&rsquo;s me
              <span className={s.ctaArrow}>
                <ArrowIcon />
              </span>
            </button>
          </section>

          {/* ---------- 2 · email ---------- */}
          <section className={scr(2)} aria-hidden={step !== 2}>
            <button
              type="button"
              className={`${s.back} ${s.st} ${s.st0}`}
              suppressHydrationWarning
              onClick={() => go(1)}
            >
              <BackIcon />
              Back
            </button>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>
              Nice to meet you{firstName ? `, ${firstName}` : ""}!
            </div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              Where do we send your <em>5% voucher?</em>
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              Your code drops in your inbox the second you finish. No spam —
              just deals worth opening.
            </p>
            <div className={`${s.field} ${s.st} ${s.st4}`}>
              <input
                ref={emailInput}
                suppressHydrationWarning
                type="email"
                placeholder="name@email.com"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitEmail();
                }}
              />
              <div className={emailError ? `${s.hint} ${s.err}` : s.hint}>
                {emailError ?? "We’ll email your voucher code here"}
              </div>
            </div>
            <button
              type="button"
              className={`${s.cta} ${s.ctaTight} ${s.st} ${s.st5}`}
              suppressHydrationWarning
              onClick={submitEmail}
            >
              Lock it in
              <span className={s.ctaArrow}>
                <ArrowIcon />
              </span>
            </button>
          </section>

          {/* ---------- 3 · whatsapp ---------- */}
          <section className={scr(3)} aria-hidden={step !== 3}>
            <button
              type="button"
              className={`${s.back} ${s.st} ${s.st0}`}
              suppressHydrationWarning
              onClick={() => go(2)}
            >
              <BackIcon />
              Back
            </button>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>Deals move fast here…</div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              Drop your <em>WhatsApp</em>
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              Flash deals, restock alerts, swap offers — the good stuff goes to
              WhatsApp first.
            </p>
            <div className={`${s.field} ${s.st} ${s.st4}`}>
              <input
                ref={phoneInput}
                suppressHydrationWarning
                type="tel"
                placeholder="0801 234 5678"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") go(4);
                }}
              />
              <div className={s.hint}>
                Optional — but you&rsquo;ll want the flash deals
              </div>
            </div>
            <label className={`${s.consent} ${s.st} ${s.st4}`}>
              <input
                suppressHydrationWarning
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Keep me posted on offers and updates from ASKMITCH. Unsubscribe
                anytime.
              </span>
            </label>
            <button
              type="button"
              className={`${s.cta} ${s.st} ${s.st5}`}
              style={{ marginTop: 16 }}
              suppressHydrationWarning
              onClick={() => go(4)}
            >
              Continue
              <span className={s.ctaArrow}>
                <ArrowIcon />
              </span>
            </button>
          </section>

          {/* ---------- 4 · gadget ---------- */}
          <section className={scr(4)} aria-hidden={step !== 4}>
            <button
              type="button"
              className={`${s.back} ${s.st} ${s.st0}`}
              suppressHydrationWarning
              onClick={() => go(3)}
            >
              <BackIcon />
              Back
            </button>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>Real talk…</div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              Which gadget is <em>calling you</em> right now?
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              Pick the one you&rsquo;re most likely to buy next — we&rsquo;ll
              make sure it&rsquo;s waiting for you.
            </p>
            <div className={`${s.grid} ${s.st} ${s.st4}`} role="radiogroup" aria-label="Gadget">
              {GADGET_CARDS.map((card) => (
                <button
                  suppressHydrationWarning
                  type="button"
                  key={card.value}
                  className={gadget === card.value ? `${s.card} ${s.sel}` : s.card}
                  role="radio"
                  aria-checked={gadget === card.value}
                  onClick={() => {
                    setGadget(card.value);
                    if (gadget !== card.value) setGadgetOther("");
                  }}
                >
                  <span className={s.cardTop}>
                    <span className={s.chip}>{card.icon}</span>
                    <i className={s.dot} />
                  </span>
                  <span className={s.cardLabel}>{card.label}</span>
                  <small className={s.cardSub}>{card.sub}</small>
                </button>
              ))}
              <button
                suppressHydrationWarning
                type="button"
                className={
                  gadget === "other" ? `${s.card} ${s.wide} ${s.sel}` : `${s.card} ${s.wide}`
                }
                role="radio"
                aria-checked={gadget === "other"}
                onClick={() => {
                  if (gadget !== "other") setGadgetOther("");
                  setGadget("other");
                }}
              >
                <span className={s.chip}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8.5v7M8.5 12h7" />
                  </svg>
                </span>
                <span className={s.cardLabel}>Something else</span>
                <i className={`${s.dot} ${s.dotEnd}`} />
              </button>
            </div>
            {gadget !== null ? (
              <div className={`${s.field} ${s.modelField}`}>
                <input
                  suppressHydrationWarning
                  type="text"
                  placeholder={
                    gadget === "other"
                      ? "Tell us what you’re after"
                      : "Which model? (optional)"
                  }
                  value={gadgetOther}
                  onChange={(e) => setGadgetOther(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && gadget !== null) go(5);
                  }}
                />
              </div>
            ) : null}
            <button
              type="button"
              className={`${s.cta} ${s.ctaTight} ${s.st} ${s.st5}`}
              suppressHydrationWarning
              disabled={gadget === null}
              onClick={() => go(5)}
            >
              Noted
              <span className={s.ctaArrow}>
                <ArrowIcon />
              </span>
            </button>
          </section>

          {/* ---------- 5 · move ---------- */}
          <section className={scr(5)} aria-hidden={step !== 5}>
            <button
              type="button"
              className={`${s.back} ${s.st} ${s.st0}`}
              suppressHydrationWarning
              onClick={() => go(4)}
            >
              <BackIcon />
              Back
            </button>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>
              We buy · We sell · We swap
            </div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              What&rsquo;s the <em>move?</em>
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              However you play it, there&rsquo;s a deal for you today.
            </p>
            <div
              className={`${s.stack} ${s.st} ${s.st4}`}
              role="radiogroup"
              aria-label="What's the move"
            >
              {MOVE_ROWS.map((row) => (
                <button
                  suppressHydrationWarning
                  type="button"
                  key={row.value}
                  className={move === row.value ? `${s.row} ${s.rowSel}` : s.row}
                  role="radio"
                  aria-checked={move === row.value}
                  onClick={() => setMove(row.value)}
                >
                  <span className={s.chip}>{row.icon}</span>
                  <span className={s.rowMain}>
                    {row.label} <small>{row.small}</small>
                  </span>
                  <i className={s.dot} />
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${s.cta} ${s.ctaTight} ${s.st} ${s.st5}`}
              suppressHydrationWarning
              disabled={move === null}
              onClick={() => go(6)}
            >
              Continue
              <span className={s.ctaArrow}>
                <ArrowIcon />
              </span>
            </button>
          </section>

          {/* ---------- 6 · timing ---------- */}
          <section className={scr(6)} aria-hidden={step !== 6}>
            <button
              type="button"
              className={`${s.back} ${s.st} ${s.st0}`}
              suppressHydrationWarning
              onClick={() => go(5)}
            >
              <BackIcon />
              Back
            </button>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>Last one, promise…</div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              When are you making it <em>happen?</em>
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              Be honest — your voucher works either way.
            </p>
            <div className={`${s.stack} ${s.st} ${s.st4}`} role="radiogroup" aria-label="When">
              {TIMING_ROWS.map((row) => (
                <button
                  suppressHydrationWarning
                  type="button"
                  key={row.value}
                  className={timing === row.value ? `${s.row} ${s.rowSel}` : s.row}
                  role="radio"
                  aria-checked={timing === row.value}
                  onClick={() => setTiming(row.value)}
                >
                  <span className={s.chip}>{row.icon}</span>
                  <span className={s.rowMain}>
                    {row.label}
                    {row.small ? (
                      <>
                        {" "}
                        <small>{row.small}</small>
                      </>
                    ) : null}
                  </span>
                  <i className={s.dot} />
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${s.cta} ${s.ctaTight} ${s.st} ${s.st5}`}
              suppressHydrationWarning
              disabled={timing === null || submitting}
              onClick={submit}
            >
              {submitting ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  Getting your voucher…
                </>
              ) : (
                <>
                  Get my 5% voucher
                  <span className={s.ctaArrow}>
                    <ArrowIcon />
                  </span>
                </>
              )}
            </button>
            {submitError ? (
              <p className={s.formerr} role="alert">
                {submitError}
              </p>
            ) : null}
          </section>

          {/* ---------- 7 · voucher ---------- */}
          <section className={scr(7)} aria-hidden={step !== 7}>
            <div className={`${s.eyebrow} ${s.st} ${s.st1}`}>
              You&rsquo;re in{firstName ? `, ${firstName}` : ""}!
            </div>
            <h1 className={`${s.big} ${s.st} ${s.st2}`}>
              Welcome to the <em>family</em>
            </h1>
            <p className={`${s.sub} ${s.st} ${s.st3}`}>
              Show this at the counter — or find it in your email. Valid for{" "}
              <b>14 days</b>.
            </p>
            <div className={voucherPop ? `${s.voucher} ${s.popped}` : s.voucher}>
              <div className={s.pct}>5% OFF</div>
              <small>Your voucher code</small>
              <div className={s.code}>{voucherCode ?? ""}</div>
              <button
                suppressHydrationWarning
                type="button"
                className={s.copybtn}
                onClick={copyCode}
              >
                <CopyIcon />
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
            {kiosk ? (
              <button
                type="button"
                className={`${s.cta} ${s.ghost} ${s.st} ${s.st5}`}
                suppressHydrationWarning
                onClick={restart}
              >
                Register another guest
              </button>
            ) : (
              <a
                className={`${s.cta} ${s.ghost} ${s.st} ${s.st5}`}
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow @Askmitch_multiventures
              </a>
            )}
            {kiosk && kioskCountdown !== null && kioskCountdown <= 10 ? (
              <p className={`${s.fine} ${s.st} ${s.st6}`}>
                Starting over in {kioskCountdown}…
              </p>
            ) : null}
            <div className={`${s.fine} ${s.st} ${s.st6}`}>
              <FooterLine />
            </div>
          </section>
        </main>
      </div>

      {step === 7 && voucherPop ? <Confetti /> : null}

      {stillThere ? (
        <div className={s.stillthere} role="alertdialog" aria-label="Still there?">
          <div className={s.stillthereCard}>
            <div className={s.eyebrow}>Still there?</div>
            <p className={s.sub}>
              Starting fresh for the next guest in <b>{stillThereCount}s</b>.
            </p>
            <button
              type="button"
              className={s.cta}
              suppressHydrationWarning
              onClick={() => {
                lastActivity.current = Date.now();
                setStillThere(false);
              }}
            >
              I&rsquo;m still here
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
