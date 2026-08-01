# BUILD_PLAN.md

Build in this order. Each phase has acceptance criteria — do not move on until they pass. Event date is **Saturday, 8th August 2026**; everything through Phase 4 must be live and tested days before.

## Phase 1 — Foundation & data layer

- Scaffold Next.js (App Router, TS, strict mode). Env wiring per README.
- Apply full DATABASE.md schema via Supabase migration (orgs, leads, email_log, rate_limits, admin_users, RLS policies, indexes, seed org).
- `lib/voucher.ts` (server code-gen with retry-on-collision), `lib/validation.ts` (shared Zod schema), Supabase clients (anon/server/admin split).

**Accept:** migration applies cleanly to a fresh project; anon key cannot select from `leads` (verify explicitly); code generator produces valid format and survives forced collision test.

## Phase 2 — Registration API + email

- `POST /api/register` per ARCHITECTURE.md contract: Zod validation, email/phone normalization, upsert-by-email idempotency, server voucher generation, expiry, rate limiting (Postgres `rate_limits` sliding window), honeypot rejection.
- `lib/email.ts` + Resend voucher template per DESIGN.md; log to `email_log`; email failure does not fail registration.

**Accept:** duplicate email returns the same code with `already_registered: true`; 6th request in a minute from one IP gets 429; honeypot-filled payload gets fake-success and no row; registration succeeds with Resend key removed (email_sent: false logged).

## Phase 3 — Registration flow UI

- Port the approved prototype into `RegistrationFlow.tsx` + screen components. DESIGN.md is the source of truth for tokens, copy (verbatim), animation timings, and easing curves.
- Replace client code generation with the API call; wire loading state on the final CTA ("Getting your voucher…" spinner in-button) and retry-with-backoff.
- Add "Something else" gadget card with free-text reveal.
- Error surface for 500/429: friendly inline message, keep data intact.

**Accept:** side-by-side with the prototype, flow is visually indistinguishable per screen; full run on a 360px viewport with keyboard open never obscures the active input; Lighthouse mobile perf ≥ 90; `prefers-reduced-motion` verified.

## Phase 4 — Redemption + kiosk

- `/redeem`: PIN gate (sessionStorage, constant-time server compare), flexible code parsing, four result states, two-step mark-as-used per ARCHITECTURE.md.
- `/kiosk`: kiosk prop — larger scale, 20s post-voucher auto-reset with visible countdown, 45s inactivity reset with confirm, full data clear on every reset.

**Accept:** `mitch k3xt9` (lowercase, space) redeems `MITCH-K3XT9`; already-used code shows redemption time; kiosk reset wipes every field and selection (inspect state, not just UI); wrong PIN 5x shows no timing difference.

## Phase 5 — Admin dashboard + export

- Supabase auth (single owner), middleware protection.
- Widgets per ARCHITECTURE.md: totals, redemption rate, three breakdowns, hot-leads table, recent registrations, failed-email count.
- `GET /api/export` CSV (consented-only default, all-leads toggle), admin session required.

**Accept:** unauthenticated `/admin` and `/api/export` redirect/401; CSV opens correctly in Excel with Nigerian phone numbers intact (leading zeros/`+234` not mangled — quote fields); hot-leads query matches DATABASE.md definition.

## Phase 6 — Event-day hardening (pre-launch checklist)

- Verify `send.askmitch.ng` in Resend (DKIM/SPF/DMARC); send a real test email to a Gmail account and check spam placement. Confirm Zoho MX on the root domain still receives mail after the change.
- Generate the QR code pointing to production `/?source=qr`; kiosk bookmark uses `/kiosk`.
- Load test: 30 concurrent registrations complete without error.
- Dry run: full guest journey on a mid-range Android over mobile data; full staff journey redeeming it.
- Backup plan documented: if the app is down, staff collect name+phone on the paper flyer form (Image 4 style) for manual entry later — note this in a `RUNBOOK.md` one-pager for staff with the redeem PIN handoff and dashboard login.

**Accept:** every box above checked; RUNBOOK.md exists and a non-technical staff member can follow it.

## Explicitly out of scope (do not build)

Loyverse/POS integration, WhatsApp API sending, marketing email campaigns (export feeds external tools), guest login, admin multi-user management, analytics beyond the dashboard.

## Post-event (backlog, not now)

- Day-3 and day-10 segment sends (queries in DATABASE.md) via Resend broadcast or export→Brevo
- Generalize theming (org-level brand tokens) to resell the product to other SMEs
- Fold learnings into SIMON as an "Events/Leads" module candidate
