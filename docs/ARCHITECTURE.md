# ARCHITECTURE.md

## Route map

```
app/
  page.tsx                    # Registration flow (mobile-first)
  kiosk/page.tsx              # Kiosk variant (wraps same flow component)
  redeem/page.tsx             # Staff redemption (PIN gate)
  admin/page.tsx              # Dashboard (Supabase auth gate)
  api/
    register/route.ts         # POST — create lead + voucher, send email
    redeem/route.ts           # POST — validate/mark code (PIN-authorized)
    export/route.ts           # GET  — CSV export (admin-authorized)
components/
  RegistrationFlow.tsx        # The multi-step flow (client component)
  screens/*                   # One component per screen (Welcome, Name, Email, ...)
  Confetti.tsx                # Canvas confetti (brand colors)
lib/
  supabase/ (client.ts, server.ts, admin.ts)
  voucher.ts                  # Server-side code generation
  email.ts                    # Resend voucher email
  validation.ts               # Zod schemas shared client/server
```

## Data flow: registration

1. Client walks guest through screens, accumulating state locally (no per-step network calls).
2. On final "Get my 5% voucher" → single `POST /api/register`.
3. Server (service role, bypasses RLS):
   - Validate payload with Zod (same schema as client).
   - Normalize email (lowercase, trim). Normalize phone to E.164 if possible (`+234...`), store raw otherwise.
   - **Upsert by (org_id, email)**: if lead exists → return its existing voucher code with `already_registered: true`. Do NOT create a duplicate or a second code.
   - Else insert lead with server-generated voucher code, `expires_at = now() + interval '14 days'`.
   - Fire voucher email via Resend (await, but if email fails: still return success with code + `email_sent: false`; log the failure to `email_log`).
4. Client shows voucher screen with the returned code (never a client-generated one — replace prototype's `makeCode()` with the API response).

### POST /api/register — contract

Request:
```json
{
  "name": "Tunde Bakare",
  "email": "tunde@example.com",
  "phone": "08012345678",
  "gadgets": ["iphone"],       // 1+ of: iphone | samsung | laptop | audio | watch | gaming | other (multi-select since 2026-08-04)
  "gadget_other": null,         // free text when gadgets includes "other"
  "move": "swap",               // buy | sell | swap | browsing
  "timing": "today",            // today | this_week | this_month | someday
  "consent": true,
  "source": "qr"                // qr | kiosk | link
}
```

Response `200`:
```json
{ "code": "MITCH-K3XT9", "expires_at": "...", "already_registered": false, "email_sent": true }
```

Errors: `400` validation (field-level messages), `429` rate-limited, `500` generic ("Something went wrong — find a staff member and we'll sort you out.").

## Data flow: redemption

1. Staff opens `/redeem`, enters `STAFF_REDEMPTION_PIN` once (stored in sessionStorage; sent as header on every request).
2. Types/pastes code → `POST /api/redeem { code, pin }`.
3. Server responds with one of four states; UI renders each distinctly:
   - `valid` → shows lead name + gadget interest, button "Mark as used"
   - `redeemed` → shows when it was used ("Used today 2:14 PM")
   - `expired` → shows expiry date
   - `invalid` → not found
4. "Mark as used" → second `POST /api/redeem { code, pin, confirm: true }` → sets `redeemed_at`.
5. Two-step confirm prevents accidental burn. Code lookup is case-insensitive and strips whitespace/hyphens flexibly (`mitch k3xt9` matches `MITCH-K3XT9`).

## Kiosk mode (`/kiosk`)

Same `RegistrationFlow` component with a `kiosk` prop:
- Type scale up ~15%; touch targets min 52px.
- After voucher screen: auto-return to welcome after 20s countdown ("Starting over in 10…" visible from 10s).
- Inactivity reset: any screen idle 45s → confirm dialog ("Still there?") → reset to welcome after 10 more seconds. Clears ALL entered data on reset (privacy — next guest must never see previous entries).
- Disable browser back/pull-to-refresh where possible; fullscreen meta tags.
- Numeric keypad layouts via `inputmode` (already in prototype).

## Admin dashboard (`/admin`)

Auth: Supabase email/password (single owner account, created manually). Middleware-protected.

Widgets (all scoped to `org_id`):
- Total signups (+ today count), redemption rate (redeemed / total, %)
- Bar breakdown: gadget interest
- Bar breakdown: buy/sell/swap
- Bar breakdown: timing
- Cross-tab highlight: "Hot leads" = timing IN (today, this_week) AND move IN (buy, swap) — table with name, phone, gadget
- Recent registrations table (paginated, 25/page)
- Export CSV button → `/api/export` (all lead fields; only consented leads by default, toggle for all)

Keep it server-rendered where possible; realtime not required (manual refresh is fine for v1).

## Security requirements (non-negotiable)

1. **Voucher generation server-side only.** The service role key never reaches the client bundle. Verify with a build check.
2. **Rate limiting on /api/register**: max 5 requests/minute/IP (simple upstash-free approach: in-memory Map is NOT acceptable on serverless — use a Postgres-based counter table or Vercel KV if available; if neither, use Supabase `rate_limits` table as specified in DATABASE.md).
3. **Honeypot field** in the form (hidden input `company` — bots fill it, humans don't; server rejects silently with fake success).
4. **Zod validation on the server** regardless of client validation. Never trust the payload.
5. **PIN comparison** for /redeem uses constant-time compare (`crypto.timingSafeEqual`).
6. **RLS on**: anon key has NO direct table access to `leads` (see DATABASE.md). All writes go through API routes with service role. Admin reads go through authenticated server components.
7. **No PII in logs.** Log lead IDs, not emails/phones.
8. **CSV export requires admin session** — never a public or token-in-URL endpoint.

## Email (Resend)

One transactional template: voucher delivery.
- From: `ASKMITCH <hello@askmitch.ng>`, read from `EMAIL_FROM` (never hardcoded). Reply-To: same.
- Resend sends via the `send.askmitch.ng` subdomain (DKIM/SPF/DMARC records on the subdomain), keeping bulk-send reputation isolated from the Zoho mailbox on the root domain. The root domain carries exactly one SPF TXT record — Zoho's. Never add a second.
- Mailboxes live on Zoho Mail (free plan): `hello@` is the real inbox and the sender identity; `mitch@` is Mitch's named address; `info@`, `sales@`, and `support@` are aliases forwarding into `hello@`.
- Subject: `Your 5% ASKMITCH voucher is inside 🎉`
- Content: brand header (red/black), guest first name, large voucher code, expiry date, store address (Sims Plaza, Olakunle Junction, Bembo, Alao Akala Expressway, Apata Road, Ibadan), Instagram/TikTok handle @Askmitch_multiventures, "Tech, Style, Askmitch Anything…" sign-off.
- Log every send attempt to `email_log` (status, resend message id, error).

## Failure modes to handle

- Venue Wi-Fi drops mid-submit → client retries POST up to 2x with backoff; idempotent by email upsert so retries are safe.
- Resend down → registration still succeeds, code shown on screen, `email_sent: false`, admin dashboard shows count of failed emails for later manual resend.
- Duplicate rapid taps on submit → client disables button on first tap; server upsert makes it idempotent anyway.
