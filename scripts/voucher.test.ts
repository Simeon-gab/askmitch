// Phase 1 acceptance test: voucher format + forced-collision behavior.
// Run: npx --yes tsx scripts/voucher.test.ts
import assert from "node:assert/strict";
import {
  MAX_GENERATION_ATTEMPTS,
  VOUCHER_REGEX,
  VoucherGenerationError,
  generateUniqueVoucherCode,
  generateVoucherCode,
} from "../lib/voucher";

async function main() {
  // 1. Format: 1,000 codes all match MITCH-XXXXX from the unambiguous alphabet.
  for (let i = 0; i < 1000; i++) {
    const code = generateVoucherCode();
    assert.match(code, VOUCHER_REGEX, `bad code: ${code}`);
  }
  console.log(`PASS format: 1000/1000 codes match ${VOUCHER_REGEX}`);

  // 2. Forced collision: every code reported taken -> throws after max attempts.
  let probes = 0;
  await assert.rejects(
    generateUniqueVoucherCode(() => {
      probes++;
      return true;
    }),
    VoucherGenerationError,
  );
  assert.equal(probes, MAX_GENERATION_ATTEMPTS);
  console.log(
    `PASS forced collision: VoucherGenerationError after exactly ${probes} attempts`,
  );

  // 3. Partial collision: first two codes taken -> succeeds on the third.
  let calls = 0;
  const code = await generateUniqueVoucherCode(() => ++calls <= 2);
  assert.match(code, VOUCHER_REGEX);
  assert.equal(calls, 3);
  console.log(`PASS collision retry: survived 2 collisions, got ${code}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
