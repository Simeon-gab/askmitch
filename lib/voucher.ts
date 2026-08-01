// Voucher code generation — server-side ONLY (hard rule in CLAUDE.md).
// The client never generates codes; it displays whatever POST /api/register
// returns. node:crypto also keeps this module out of any client bundle:
// importing it from a client component fails the build.
import { randomInt } from "node:crypto";

export const VOUCHER_PREFIX = "MITCH-";
// Unambiguous alphabet per docs/DATABASE.md — no 0/O/1/I.
export const VOUCHER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const VOUCHER_SUFFIX_LENGTH = 5;
export const MAX_GENERATION_ATTEMPTS = 5;

export const VOUCHER_REGEX = new RegExp(
  `^${VOUCHER_PREFIX}[${VOUCHER_ALPHABET}]{${VOUCHER_SUFFIX_LENGTH}}$`,
);

export class VoucherGenerationError extends Error {
  constructor(attempts: number) {
    super(`Could not generate a unique voucher code after ${attempts} attempts`);
    this.name = "VoucherGenerationError";
  }
}

export function generateVoucherCode(): string {
  let suffix = "";
  for (let i = 0; i < VOUCHER_SUFFIX_LENGTH; i++) {
    suffix += VOUCHER_ALPHABET[randomInt(VOUCHER_ALPHABET.length)];
  }
  return VOUCHER_PREFIX + suffix;
}

// docs/DATABASE.md: on collision, regenerate — loop max 5, then fail.
// The register route maps VoucherGenerationError to a 500.
export async function generateUniqueVoucherCode(
  isTaken: (code: string) => Promise<boolean> | boolean,
  maxAttempts: number = MAX_GENERATION_ATTEMPTS,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateVoucherCode();
    if (!(await isTaken(code))) {
      return code;
    }
  }
  throw new VoucherGenerationError(maxAttempts);
}
