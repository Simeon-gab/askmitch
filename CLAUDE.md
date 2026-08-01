# CLAUDE.md

Event lead-capture system for ASKMITCH Multiventures store opening (Ibadan, Sat 8 Aug 2026). Guests register via a branded multi-step form, get a unique 5% voucher by email; leads are tagged for segmented marketing.

## Read first

All specs live in `docs/`. Read in this order before writing any code:
1. `docs/README.md` — overview, surfaces, decisions already made
2. `docs/ARCHITECTURE.md` — routes, API contracts, security requirements
3. `docs/DATABASE.md` — schema, RLS, normalization rules
4. `docs/DESIGN.md` — brand tokens, verbatim copy deck, animation spec
5. `docs/BUILD_PLAN.md` — phased order with acceptance criteria

Visual reference: `docs/prototype/askmitch-opening-registration.html` — the approved design. Production UI must match it.

## Hard rules

- Follow BUILD_PLAN.md phase order. Verify each phase's acceptance criteria before moving on; state which criteria you tested.
- Do NOT revisit the decisions listed in README.md ("Key decisions"). They are settled.
- Voucher codes are generated server-side ONLY. `SUPABASE_SERVICE_ROLE_KEY` must never appear in client code.
- Copy in DESIGN.md is verbatim — do not rewrite headlines, eyebrows, or microcopy.
- All tables carry `org_id`. Never write a query without scoping it.
- Zod validation runs on the server regardless of client checks.
- No animation libraries, no state libraries, no UI kits. CSS transitions + the canvas confetti only.
- Animate `transform`/`opacity` only; respect `prefers-reduced-motion`.
- No PII (emails/phones) in logs — log lead IDs.

## Environment notes

- Domain: `askmitch.ng` (registered via Qservers, NiRA-accredited). Mailboxes on Zoho Mail free plan; transactional sending via Resend.
- Sender is `EMAIL_FROM="ASKMITCH <hello@askmitch.ng>"` — always read from env, never hardcode an address. Display name must be `ASKMITCH` (that is what recipients see).
- Resend sends from the `send.askmitch.ng` subdomain to keep sending reputation separate from the Zoho inbox. Do not add a second root-level SPF record — the root already carries Zoho's.
- If Resend verification is still pending when Phase 2 runs, fall back to `onboarding@resend.dev` via env only, and flag clearly that real guests will not receive email until verification completes.
- Stack: Next.js App Router + TypeScript (strict), Supabase, Resend, Vercel. Nothing else without asking.

## Working style

- One phase at a time; summarize what was built and which acceptance tests passed before proposing the next phase.
- If a spec conflict or gap is found, stop and ask — do not improvise architecture.
- Prefer boring, readable code over clever code. This runs live at a one-day event; debuggability beats elegance.
