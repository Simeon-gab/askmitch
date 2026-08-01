# ASKMITCH Opening Day Registration

Event lead-capture system for the ASKMITCH Multiventures store opening — Ibadan, Saturday 8 August 2026. Guests register through a branded multi-step form and receive a unique 5% voucher by email; leads are tagged for segmented follow-up marketing.

**All specs live in [`docs/`](docs/README.md).** Read `docs/README.md` first — it lists the surfaces, settled decisions, and the doc reading order. `CLAUDE.md` carries the build rules.

| Surface | Route |
|---|---|
| Registration flow | `/` |
| Kiosk mode | `/kiosk` |
| Staff redemption | `/redeem` |
| Admin dashboard | `/admin` |

Stack: Next.js (App Router, TypeScript strict) · Supabase · Resend · Vercel.

Environment variables are documented in `docs/README.md` and `.env.example`. Secrets are never committed.
