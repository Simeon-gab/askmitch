// POST /api/redeem — validate and mark voucher codes (staff, PIN-authorized).
// Flow per docs/ARCHITECTURE.md: first call returns one of four states;
// a second call with confirm:true marks the voucher used (two-step guard
// against accidental burns). No PII in logs — lead IDs only.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redeemSchema } from "@/lib/validation";
import { normalizeVoucherInput } from "@/lib/voucher";

// Constant-time PIN comparison (docs/ARCHITECTURE.md security req #5).
// Hashing both sides first gives equal-length buffers for timingSafeEqual.
function pinMatches(supplied: string, actual: string): boolean {
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(actual).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const orgId = process.env.NEXT_PUBLIC_EVENT_ORG_ID;
  const staffPin = process.env.STAFF_REDEMPTION_PIN;
  if (!orgId || !staffPin) {
    console.error(
      "redeem: NEXT_PUBLIC_EVENT_ORG_ID or STAFF_REDEMPTION_PIN not set",
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!pinMatches(parsed.data.pin, staffPin)) {
    return NextResponse.json({ error: "bad_pin" }, { status: 401 });
  }

  const canonical = normalizeVoucherInput(parsed.data.code);
  if (!canonical) {
    return NextResponse.json({ state: "invalid" });
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error(
      "redeem: admin client init failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Codes are stored uppercase-canonical, so equality uses the unique
  // (org_id, voucher_code) index; normalizeVoucherInput handled the casing.
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, name, gadget, gadgets, gadget_other, expires_at, redeemed_at")
    .eq("org_id", orgId)
    .eq("voucher_code", canonical)
    .maybeSingle();
  if (error) {
    console.error("redeem: lookup failed:", error.code);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ state: "invalid" });
  }
  if (lead.redeemed_at) {
    return NextResponse.json({
      state: "redeemed",
      redeemed_at: lead.redeemed_at,
      name: lead.name,
    });
  }
  if (new Date(lead.expires_at).getTime() < Date.now()) {
    return NextResponse.json({
      state: "expired",
      expires_at: lead.expires_at,
      name: lead.name,
    });
  }

  if (!parsed.data.confirm) {
    return NextResponse.json({
      state: "valid",
      name: lead.name,
      // fallback covers rows written by a pre-multiselect deploy (0002 note)
      gadgets: lead.gadgets ?? [lead.gadget],
      gadget_other: lead.gadget_other,
    });
  }

  // Mark as used — race-safe: only flips if still unredeemed.
  const { data: marked, error: markError } = await supabase
    .from("leads")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", lead.id)
    .is("redeemed_at", null)
    .select("redeemed_at")
    .maybeSingle();
  if (markError) {
    console.error(`redeem: mark failed for lead ${lead.id}:`, markError.code);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!marked) {
    // Lost a race — someone marked it between the two calls.
    const { data: again } = await supabase
      .from("leads")
      .select("redeemed_at")
      .eq("id", lead.id)
      .maybeSingle();
    return NextResponse.json({
      state: "redeemed",
      redeemed_at: again?.redeemed_at ?? null,
      name: lead.name,
    });
  }
  return NextResponse.json({
    state: "marked",
    redeemed_at: marked.redeemed_at,
    name: lead.name,
  });
}
