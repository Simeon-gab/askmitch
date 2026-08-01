# DESIGN.md

The approved reference is `prototype/askmitch-opening-registration.html`. Production must match its look, copy, and feel. This doc extracts the system so it can be rebuilt in React without guessing.

## Brand tokens

```css
--red:       #ED1C24;   /* primary brand red (CTAs, accents, script lines) */
--red-dark:  #B8121A;   /* CTA hover */
--red-soft:  #FF8A8E;   /* selected-state text, badge text on dark */
--black:     #0C0C0C;   /* page canvas */
--ink:       #161616;   /* secondary dark */
--white:     #FFFFFF;
--muted:     rgba(255,255,255,.62);  /* body copy on dark */
```

Background: black canvas with a red radial glow top-center (`radial-gradient(ellipse 80% 50% at 50% -10%, rgba(237,28,36,.22), transparent 60%)`) and a fainter one bottom-right. This is the only gradient in the system.

## Typography

| Role | Face | Usage |
|---|---|---|
| Display | **Anton** (Google Fonts), uppercase, letter-spacing .01em | Screen headlines, CTA labels, voucher code, wordmark |
| Script accent | **Kaushan Script**, red, rotated -2° | The "eyebrow" line above every headline ("Shop and Chop!", "Real talk…") |
| Body/UI | **Manrope** 400–800 | Everything else |

Headline scale: `clamp(34px, 9.5vw, 46px)`, line-height 1.04. One red word per headline (wrapped span) — always exactly one, it's the signature.

## Logo mark

Header shows the triangle-A mark (inline SVG: red triangle-A over a dark broken circle) + ASKMITCH wordmark in Anton + "MULTI-VENTURES" letterspaced in red, 8.5px. Keep the SVG from the prototype; do not rasterize.

## Screen anatomy (every screen)

1. Script eyebrow (red, Kaushan, -2° rotation)
2. Anton headline with one red word
3. Muted sub-line (Manrope 500, max 36ch)
4. Input / option cards / stack
5. Red CTA (Anton, uppercase, letterspaced, arrow icon)

Header bar: logo left, step counter right (`01 / 06`, current number red). Below it a 3px progress ribbon filling red.

## Copy deck (final — use verbatim)

| # | Screen | Eyebrow | Headline (red word in caps here) | Sub |
|---|---|---|---|---|
| 0 | Welcome | Shop and Chop! | Welcome to the ASKMITCH guest list | You made it to the party — now let's make it official. **60 seconds**, a few quick questions, and a **5% voucher** lands in your hands. |
| 1 | Name | First things first… | Who's on the GUEST LIST? | Every VIP has a name. What should we call you? |
| 2 | Email | Nice to meet you, {first}! | Where do we send your 5% VOUCHER? | Your code drops in your inbox the second you finish. No spam — just deals worth opening. |
| 3 | WhatsApp | Deals move fast here… | Drop your WHATSAPP | Flash deals, restock alerts, swap offers — the good stuff goes to WhatsApp first. |
| 4 | Gadget | Real talk… | Which gadget is CALLING YOU right now? | Pick the one you're most likely to buy next — we'll make sure it's waiting for you. |
| 5 | Move | We buy · We sell · We swap | What's the MOVE? | However you play it, there's a deal for you today. |
| 6 | Timing | Last one, promise… | When are you making it HAPPEN? | Be honest — your voucher works either way. |
| 7 | Voucher | You're in, {first}! | Welcome to the FAMILY | Show this at the counter — or find it in your email. Valid for **14 days**. |

Welcome screen extras: pulsing badge "OPENING DAY · IBADAN", meta row ("Sat, 8th August / Sims Plaza, Apata Rd" + "Shop · Eat · Drink / and mingle!!!"), footer line "Tech, Style, Askmitch Anything…" (also on voucher screen).

CTA labels per screen: Let's go → That's me → Lock it in → Continue → Noted → Continue → Get my 5% voucher. Voucher screen ghost button: "Register another guest" (kiosk); on personal phones instead show "Follow @Askmitch_multiventures" linking to Instagram.

Option sets:
- Gadget (2-col icon cards): iPhone, Samsung, Laptop, Audio & speakers, Smartwatch, Gaming. Add a 7th "Something else" card in production that reveals a small free-text input (maps to gadget='other' + gadget_other).
- Move (rows with radio dots): Buying *(brand new or premium used)* / Selling *(my current device)* / Swapping *(trade up to better)* / Just vibing *(here for the party)*.
- Timing (rows): Today *(while I'm here!)* / This week / This month / Someday soon.

Validation microcopy: name → "We need a name for the guest list"; email → "Hmm, that email doesn't look right — double-check it". Hints: name "This goes on your voucher"; email "We'll email your voucher code here"; phone "Optional — but you'll want the flash deals".

Consent line: "Keep me posted on offers and updates from ASKMITCH. Unsubscribe anytime." Checkbox default CHECKED is acceptable for an event context, but make it easy to untick.

## Interaction + animation spec

Animate **transform and opacity only**. No animation libraries.

- Screen transition: outgoing fades up 24px / incoming fades in from +28px, 500ms `cubic-bezier(.22,1,.36,1)`.
- Staggered entrance within each screen: eyebrow → headline → sub → controls → CTA, 80ms steps (delays .05/.12/.2/.28/.36s).
- Progress ribbon: width transition 600ms `cubic-bezier(.65,0,.35,1)`.
- Cards/rows: `:active` scale .955/.98; selected = red border + red-tint background (rgba(237,28,36,.13)) + red icon/text; row radio dot fills red with inset ring.
- Inputs on focus: red border + soft red glow ring (`0 0 0 4px rgba(237,28,36,.15)`).
- CTA press: scale .975.
- Voucher reveal: card springs in, `scale(.85)→1`, 600ms `cubic-bezier(.34,1.56,.64,1)`, delayed ~500ms after screen change; simultaneous canvas confetti burst (~110 rects, brand colors only: #ED1C24, #FFFFFF, #1E1E1E, #FF8A8E; gravity fall, fade out).
- `prefers-reduced-motion: reduce` → all transitions ~0, no confetti. Already in prototype; keep it.
- Name echo: after name screen, screens 2 and 7 greet by first name.

## Performance budget (event-day reality: mid-range Androids, weak venue Wi-Fi)

- First load interactive < 3s on 3G-ish; total JS < 150KB gz for the registration route.
- Fonts: preconnect + `display=swap`; subset if possible.
- No images on the flow (all SVG inline). Confetti canvas only mounts on the final screen.
- The flow is a single client component; no per-step network calls.

## Voucher email design

Dark header band with wordmark, red "5% OFF" pill, Anton-style code large (email-safe: use a bold system stack fallback), expiry line, store address, socials, sign-off "Tech, Style, Askmitch Anything…". Table-based layout, inline CSS (email client reality). Test in Gmail mobile — that's what the audience uses.
