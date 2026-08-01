# ASKMITCH Opening Day — Staff Runbook

**Event:** Saturday, 8th August 2026 · Sims Plaza, Olakunle Junction, Bembo, Alao Akala Expressway, Apata Road, Ibadan

**Production URL:** `https://askmitch.vercel.app`
*(bookmark it once on every staff phone — nobody should type it twice; if a branded domain like `www.askmitch.ng` is added later, the QR in `assets/` must be regenerated and reprinted)*

---

## The three pages

| Page | Address | Who uses it |
|---|---|---|
| Guest registration | `<URL>/` (QR code points here) | Guests on their own phones |
| Kiosk | `<URL>/kiosk` | The tablet at the entrance |
| Voucher check | `<URL>/redeem` | Staff at the counter |

## Kiosk tablet — set up in the morning

1. Charge the tablet and keep the charger plugged in all day.
2. Open Chrome → go to `<URL>/kiosk`.
3. Chrome menu (⋮) → **Add to Home screen**, then open it from the home icon so it runs full-screen.
4. That's it. The kiosk resets itself for the next guest — 20 seconds after a voucher appears, or after 45 seconds of nobody touching it. Every reset clears the previous guest's details automatically.

## Checking vouchers at the counter (any staff phone)

1. Open `<URL>/redeem`.
2. Enter the staff PIN: `______` *(manager: write it in by hand — never print it anywhere else)*.
3. Type the guest's code from their email or screen. Spelling relaxed — `mitch k3xt9` works fine.
4. Read the result:
   - **VALID** → shows the guest's name. Apply 5% at the till, then press **Mark as used**.
   - **ALREADY USED** → shows when it was used. The discount was taken before — do not apply again.
   - **EXPIRED** → voucher is past its 14 days.
   - **NOT FOUND** → re-type carefully; if still nothing, the code isn't real.
5. The PIN stays unlocked on that phone until the browser tab is closed. Press **Lock** if you hand the phone to someone else.

## If the app goes down (backup plan)

Don't panic and don't turn guests away:

1. Grab the paper flyer forms at the counter.
2. Collect: **Name · Phone (WhatsApp) · Email · Which gadget they're into**.
3. Tell the guest: "Your 5% voucher will arrive by email today."
4. After the event (or when the app is back), enter each paper form through the normal registration page — the guest gets their real voucher email then.
5. A voucher promised on paper can be honoured at the till at the manager's discretion — note it on the form.

## Owner dashboard (manager only)

- `<URL>/admin` — login is **askmitchltd@gmail.com** (password is with the owner; it is never written down here).
- Shows: signups, redemption rate, what people are interested in, hot leads, and any failed voucher emails.
- **Failed emails**: the guest still saw their code on screen, so nothing is lost — resend manually after the event.
- **End of day:** press **Export CSV** and save the file — that's the marketing list.

## Quick fixes before calling for help

| Problem | Try this |
|---|---|
| Kiosk frozen | Refresh the page (pull down, or reopen from home icon) |
| "Network's acting up" on submit | Guest's data is still on screen — wait 10 seconds, press the button again |
| Voucher email didn't arrive | Check spam. The on-screen code works regardless — redeem it normally |
| Redeem page asks for PIN again | Browser tab was closed — re-enter the PIN |
| Nothing loads on venue Wi-Fi | Switch the device to mobile data — the app is tiny and loads fine on 3G |
