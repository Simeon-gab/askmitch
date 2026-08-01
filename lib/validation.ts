// Shared Zod schema for POST /api/register (docs/ARCHITECTURE.md contract).
// The client uses it for inline checks; the server ALWAYS re-runs it (hard rule).
import { z } from "zod";

export const GADGETS = [
  "iphone",
  "samsung",
  "laptop",
  "audio",
  "watch",
  "gaming",
  "other",
] as const;
export const MOVES = ["buy", "sell", "swap", "browsing"] as const;
export const TIMINGS = ["today", "this_week", "this_month", "someday"] as const;
export const SOURCES = ["qr", "kiosk", "link"] as const;

// Error strings are verbatim validation microcopy from docs/DESIGN.md.
export const registrationSchema = z.object({
  name: z.string().trim().min(2, "We need a name for the guest list").max(120),
  email: z
    .string()
    .trim()
    .email("Hmm, that email doesn’t look right — double-check it")
    .max(254),
  phone: z.string().trim().max(32).optional().nullable(),
  gadget: z.enum(GADGETS),
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
