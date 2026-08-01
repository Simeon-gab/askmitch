# ASKMITCH Opening Day Registration

Event lead-capture system for ASKMITCH Multiventures' new store opening in Ibadan (Saturday, 8th August 2026). Guests register via a branded, conversational multi-step form, answer two demand-intelligence questions, and receive a unique 5% discount voucher by email. All leads are stored with interest tags for segmented follow-up marketing (email + WhatsApp).

## What this is

Not a survey. A structured lead-capture funnel:

```
Guest (phone/QR/kiosk) → Registration flow → Lead record (tagged) → Voucher email
                                                    ↓
                              Admin dashboard ← Supabase ← Staff redemption page
                                                    ↓
                              CSV export / segments → Email + WhatsApp campaigns
```

## The four surfaces

| Surface | Route | Users | Purpose |
|---|---|---|---|
| Registration flow | `/` | Guests | Conversational multi-step form + voucher reveal |
| Kiosk mode | `/kiosk` | Guests (tablet at entrance) | Same flow, larger type, auto-reset after inactivity |
| Redemption | `/redeem` | Staff (PIN-protected) | Validate + mark voucher codes as used |
| Admin dashboard | `/admin` | Owner | Signups, interest breakdown, redemption rate, CSV export |

## Reference prototype

`prototype/askmitch-opening-registration.html` is the approved design reference. The production build must match its flow, copy, brand treatment, and animation feel. See DESIGN.md for the extracted design system and full copy deck.

## Key decisions (already made — do not revisit)

1. **Unique voucher code per registration**, generated server-side, never client-side. Format `MITCH-XXXXX` (5 chars from unambiguous alphabet, no 0/O/1/I).
2. **Dedupe on email**: one registration = one code. Re-registering with the same email returns the existing code, does not create a new lead.
3. **Two demand questions**: gadget interest (single-select, maps to real inventory categories) and buy/sell/swap intent. Plus purchase timing. These three tags are the marketing leverage.
4. **Voucher email is the email-validity check.** Sent immediately on registration via Resend. Code also shown on-screen.
5. **Consent checkbox required** for marketing (NDPA compliance). Stored on the lead. Transactional voucher email sends regardless; marketing sends only to consented leads.
6. **Manual redemption at POS**: staff page validates the code and marks redeemed. No POS integration for v1.
7. **Voucher expiry: 14 days** from registration (`expires_at` on the lead).
8. **Multi-tenant-ready schema**: `org_id` on every table from day one, even though v1 serves one store. This product is repeatable for other SME openings/promos.

## Stack

- Next.js 14+ (App Router) + TypeScript
- Supabase (Postgres + RLS) — database, auth for admin
- Resend — transactional voucher email
- Vercel — hosting
- No client-side state libraries; no animation libraries (CSS transitions + one small canvas confetti only)

## Docs in this folder

- `ARCHITECTURE.md` — routes, API contracts, data flow, security
- `DATABASE.md` — full schema, RLS policies, indexes
- `DESIGN.md` — brand system, screen-by-screen copy deck, animation spec
- `BUILD_PLAN.md` — phased build order with acceptance criteria

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never exposed
RESEND_API_KEY=
EMAIL_FROM="ASKMITCH <hello@askmitch.ng>"
STAFF_REDEMPTION_PIN=             # 6-digit PIN for /redeem
NEXT_PUBLIC_EVENT_ORG_ID=         # org UUID for this deployment
```

## Non-goals for v1

- No POS/Loyverse integration
- No OAuth or guest accounts
- No WhatsApp API sending (numbers are captured for manual/broadcast use)
- No payment or order handling
