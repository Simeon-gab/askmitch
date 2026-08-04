// Phase 5 acceptance: CSV formatting — quoting, Excel-safe phone columns
// (leading zeros / +234 intact), embedded-quote doubling, CRLF endings.
// Run: npx --yes tsx scripts/csv.test.ts
import assert from "node:assert/strict";
import { buildLeadsCsv } from "../lib/csv";

const csv = buildLeadsCsv([
  {
    name: 'Tunde "TJ" Bakare',
    email: "tj@x.ng",
    phone: "0801 234 5678",
    phone_e164: "+2348012345678",
    gadgets: ["iphone", "laptop"],
    gadget_other: null,
    move: "buy",
    timing: "today",
    consent: true,
    source: "qr",
    voucher_code: "MITCH-K3XT9",
    expires_at: "2026-08-15T00:00:00Z",
    redeemed_at: null,
    created_at: "2026-08-01T10:00:00Z",
  },
]);

const lines = csv.split("\r\n");
assert.equal(lines[0].split(",")[0], '"name"', "quoted header");
const row = lines[1];
assert.ok(row.includes('"=""0801 234 5678"""'), "phone Excel text-wrapped");
assert.ok(row.includes('"=""+2348012345678"""'), "e164 Excel text-wrapped");
assert.ok(row.includes('"Tunde ""TJ"" Bakare"'), "embedded quotes doubled");
assert.ok(row.includes('"iphone, laptop"'), "gadgets array joined in one cell");
assert.ok(row.includes('"true"'), "consent serialized");
assert.ok(csv.endsWith("\r\n"), "CRLF endings");
console.log("PASS csv: quoting, Excel-safe phones, quote doubling, CRLF");
