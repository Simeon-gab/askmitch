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

// Display labels (staff/admin surfaces).
export const GADGET_LABELS: Record<Gadget, string> = {
  iphone: "iPhone",
  samsung: "Samsung",
  laptop: "Laptop",
  audio: "Audio & speakers",
  watch: "Smartwatch",
  gaming: "Gaming",
  other: "Something else",
};
export const MOVE_LABELS: Record<Move, string> = {
  buy: "Buying",
  sell: "Selling",
  swap: "Swapping",
  browsing: "Just vibing",
};
export const TIMING_LABELS: Record<Timing, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  someday: "Someday soon",
};

// One display string for a lead's gadget list (staff/admin surfaces).
// 'other' is replaced by the free text when present; free text alongside
// named gadgets is appended as the model note ("iPhone · Laptop · 16 Pro Max").
export function formatGadgets(
  gadgets: readonly string[],
  other: string | null,
): string {
  const labels = gadgets.map((g) =>
    g === "other"
      ? other || GADGET_LABELS.other
      : ((GADGET_LABELS as Record<string, string>)[g] ?? g),
  );
  if (other && !gadgets.includes("other")) labels.push(other);
  return labels.join(" · ");
}
