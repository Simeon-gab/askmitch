// Canonical option values shared by the client flow and the server schema.
// Client-safe: no dependencies — keeps zod out of the browser bundle
// (DESIGN.md perf budget: total JS < 150KB gz for the registration route).
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

export type Gadget = (typeof GADGETS)[number];
export type Move = (typeof MOVES)[number];
export type Timing = (typeof TIMINGS)[number];
export type Source = (typeof SOURCES)[number];
