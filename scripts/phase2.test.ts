// Phase 2 acceptance tests (docs/BUILD_PLAN.md) — HTTP level, against a dev
// server started WITHOUT a Resend key so the email-failure path is exercised.
// Run: TEST_BASE_URL=http://localhost:3907 npx --yes tsx scripts/phase2.test.ts
// DB side-effects (rows, email_log, honeypot absence) are verified separately
// against the database.
import assert from "node:assert/strict";
import { VOUCHER_REGEX } from "../lib/voucher";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
// Unique per run so leftovers from earlier runs can't collide.
const RUN = `p2-${Date.now().toString(36)}`;

interface RegisterBody {
  code: string;
  expires_at: string;
  already_registered: boolean;
  email_sent: boolean;
}

function payload(email: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Tunde Bakare",
    email,
    phone: "0801 234 5678",
    gadgets: ["iphone"],
    gadget_other: null,
    move: "swap",
    timing: "today",
    consent: true,
    source: "qr",
    ...overrides,
  };
}

async function post(body: unknown, ip: string) {
  const res = await fetch(`${BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as unknown };
}

async function main() {
  console.log(`run id: ${RUN}`);

  // T1 — fresh registration succeeds with no Resend key: email_sent false.
  const t1 = await post(payload(`${RUN}-t1@example.invalid`), "10.9.0.1");
  assert.equal(t1.status, 200, `T1 status ${t1.status}`);
  const r1 = t1.body as RegisterBody;
  assert.match(r1.code, VOUCHER_REGEX);
  assert.equal(r1.already_registered, false);
  assert.equal(r1.email_sent, false, "T1 email_sent must be false without key");
  console.log(`PASS T1 fresh registration: ${r1.code}, email_sent=false`);

  // T2 — duplicate email returns the SAME code, already_registered: true.
  const t2 = await post(
    payload(`${RUN}-t1@example.invalid`, { move: "buy" }),
    "10.9.0.2",
  );
  assert.equal(t2.status, 200, `T2 status ${t2.status}`);
  const r2 = t2.body as RegisterBody;
  assert.equal(r2.already_registered, true);
  assert.equal(r2.code, r1.code, "duplicate must return the existing code");
  assert.equal(r2.email_sent, false);
  console.log(`PASS T2 duplicate email: same code ${r2.code}, already_registered=true`);

  // T2b — email is deduped case-insensitively (normalized lowercase).
  const t2b = await post(
    payload(`${RUN.toUpperCase()}-T1@EXAMPLE.INVALID`),
    "10.9.0.3",
  );
  assert.equal(t2b.status, 200);
  const r2b = t2b.body as RegisterBody;
  assert.equal(r2b.already_registered, true, "uppercased email must dedupe");
  assert.equal(r2b.code, r1.code);
  console.log("PASS T2b case-insensitive dedupe");

  // T3 — honeypot: fake success, and (checked in DB) no row is created.
  const t3 = await post(
    payload(`${RUN}-honeypot@example.invalid`, { company: "Acme Inc" }),
    "10.9.0.4",
  );
  assert.equal(t3.status, 200, "honeypot must look like success");
  const r3 = t3.body as RegisterBody;
  assert.match(r3.code, VOUCHER_REGEX, "fake code must look real");
  assert.equal(r3.email_sent, true, "fake response claims email sent");
  console.log(`PASS T3 honeypot fake success: ${r3.code}`);

  // T4 — validation: bad email -> 400 with the DESIGN.md microcopy.
  const t4 = await post(
    payload("not-an-email", { name: "X" }),
    "10.9.0.5",
  );
  assert.equal(t4.status, 400, `T4 status ${t4.status}`);
  const r4 = t4.body as { error: string; fields: Record<string, string> };
  assert.equal(r4.error, "validation_failed");
  assert.ok(r4.fields.email, "email field error expected");
  assert.ok(r4.fields.name, "name field error expected");
  console.log(`PASS T4 validation 400: email="${r4.fields.email}"`);

  // T5 — rate limit: 6th request in a minute from one IP gets 429.
  const ip = "10.9.0.99";
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await post(payload(`${RUN}-rl${i}@example.invalid`), ip);
    statuses.push(res.status);
  }
  assert.deepEqual(
    statuses,
    [200, 200, 200, 200, 200, 429],
    `rate-limit statuses were ${statuses.join(",")}`,
  );
  console.log("PASS T5 rate limit: 5x200 then 429 from same IP");

  console.log(`ALL PASS — run id ${RUN}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
