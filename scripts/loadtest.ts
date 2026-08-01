// Phase 6 acceptance: 30 concurrent registrations complete without error
// (docs/BUILD_PLAN.md). Distinct IPs per request so the 5/min/IP rate limit
// doesn't gate the test; unique synthetic emails; run against a server with
// RESEND_API_KEY unset so no bounce traffic hits the fresh sending domain.
// Run: npx --yes tsx scripts/loadtest.ts
import assert from "node:assert/strict";
import { VOUCHER_REGEX } from "../lib/voucher";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const RUN = `lt-${Date.now().toString(36)}`;
const N = 30;

async function register(i: number) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.7.${i}.1`,
    },
    body: JSON.stringify({
      name: `Load Test ${i}`,
      email: `${RUN}-${i}@example.invalid`,
      phone: "0801 234 5678",
      gadget: "iphone",
      move: "buy",
      timing: "today",
      consent: true,
      source: "qr",
    }),
  });
  const body = (await res.json()) as { code?: string };
  return { i, status: res.status, code: body.code ?? "", ms: Date.now() - t0 };
}

async function main() {
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) => register(i)),
  );
  const failures = results.filter(
    (r) => r.status !== 200 || !VOUCHER_REGEX.test(r.code),
  );
  for (const f of failures) console.error("FAIL", f);
  assert.equal(failures.length, 0, `${failures.length} of ${N} failed`);
  assert.equal(
    new Set(results.map((r) => r.code)).size,
    N,
    "voucher codes must be unique",
  );
  const slowest = Math.max(...results.map((r) => r.ms));
  console.log(
    `PASS load: ${N}/${N} succeeded, unique codes, wall ${Date.now() - started}ms, slowest request ${slowest}ms`,
  );
  console.log(`run id: ${RUN}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
