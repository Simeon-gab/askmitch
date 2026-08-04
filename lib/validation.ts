// Shared Zod schema for POST /api/register (docs/ARCHITECTURE.md contract).
// Server-side import only — the client flow mirrors these rules with the
// prototype's inline checks and imports lib/options.ts instead, keeping zod
// out of the browser bundle (DESIGN.md perf budget). The server ALWAYS
// re-validates with this schema regardless of client checks (hard rule).
import { z } from "zod";
import { GADGETS, MOVES, SOURCES, TIMINGS } from "@/lib/options";

export { GADGETS, MOVES, SOURCES, TIMINGS };

// Error strings are verbatim validation microcopy from docs/DESIGN.md.
export const registrationSchema = z.object({
  name: z.string().trim().min(2, "We need a name for the guest list").max(120),
  email: z
    .string()
    .trim()
    .email("Hmm, that email doesn’t look right — double-check it")
    .max(254),
  phone: z.string().trim().max(32).optional().nullable(),
  // Multi-select (owner decision 2026-08-04): at least one, no duplicates.
  gadgets: z
    .array(z.enum(GADGETS))
    .min(1, "Pick at least one gadget")
    .max(GADGETS.length)
    .transform((list) => [...new Set(list)]),
  gadget_other: z.string().trim().max(120).optional().nullable(),
  move: z.enum(MOVES),
  timing: z.enum(TIMINGS),
  consent: z.boolean(),
  source: z.enum(SOURCES).default("link"),
  // Honeypot — hidden in the form, humans never fill it. The API rejects
  // non-empty values silently with a fake success (docs/ARCHITECTURE.md).
  company: z.string().max(200).optional(),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationData = z.output<typeof registrationSchema>;

// POST /api/redeem — staff voucher check/mark (docs/ARCHITECTURE.md).
export const redeemSchema = z.object({
  code: z.string().trim().min(1).max(40),
  pin: z.string().trim().min(1).max(32),
  confirm: z.boolean().optional(),
});
