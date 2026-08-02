// POST /api/register — create lead + voucher, send email.
// Contract and flow: docs/ARCHITECTURE.md. Runs with the service role
// (RLS denies anon everything); all inputs re-validated with Zod here
// regardless of client checks. No PII in logs — lead IDs only.
import { NextResponse } from "next/server";
import { sendVoucherEmail } from "@/lib/email";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrationSchema } from "@/lib/validation";
import {
  MAX_GENERATION_ATTEMPTS,
  generateVoucherCode,
} from "@/lib/voucher";

const RATE_LIMIT_MAX = 5; // requests per window per IP (ARCHITECTURE.md #2)
const RATE_LIMIT_WINDOW_SECONDS = 60;
const VOUCHER_VALIDITY_DAYS = 14;

// Verbatim per docs/ARCHITECTURE.md error contract.
const GENERIC_ERROR =
  "Something went wrong — find a staff member and we'll sort you out.";

type RegisterResponse = {
  code: string;
  expires_at: string;
  already_registered: boolean;
  email_sent: boolean;
};

function serverError(): NextResponse {
  return NextResponse.json(
    { error: "server_error", message: GENERIC_ERROR },
    { status: 500 },
  );
}

// On Vercel x-forwarded-for is set by the platform (first entry = client).
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  const orgId = process.env.NEXT_PUBLIC_EVENT_ORG_ID;
  if (!orgId) {
    console.error("register: NEXT_PUBLIC_EVENT_ORG_ID not set");
    return serverError();
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error(
      "register: admin client init failed:",
      err instanceof Error ? err.message : err,
    );
    return serverError();
  }

  // 1. Rate limit before any work, so invalid payloads still burn budget.
  //    Fail OPEN on limiter errors: at a live event, registration working
  //    matters more than the abuse guard (docs/ARCHITECTURE.md failure modes).
  const ip = clientIp(request);
  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "bump_rate_limit",
    {
      p_key: `register:${orgId}:${ip}`,
      p_max: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    },
  );
  if (rateLimitError) {
    console.error("register: rate-limit check failed:", rateLimitError.code);
  } else if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 2. Parse + validate (Zod always runs server-side — hard rule).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "validation_failed", fields: { body: "Invalid JSON" } },
      { status: 400 },
    );
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "body");
      if (!(key in fields)) fields[key] = issue.message;
    }
    return NextResponse.json(
      { error: "validation_failed", fields },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // 3. Honeypot: bots fill the hidden `company` field. Reject silently with
  //    a fake success — a real-looking code that is never stored.
  if (input.company && input.company.trim() !== "") {
    const fake: RegisterResponse = {
      code: generateVoucherCode(),
      expires_at: new Date(
        Date.now() + VOUCHER_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      already_registered: false,
      email_sent: true,
    };
    return NextResponse.json(fake);
  }

  const email = normalizeEmail(input.email);
  const { phone, phoneE164 } = normalizePhone(input.phone);

  // 4. Dedupe on (org_id, email): one registration = one code. Re-registering
  //    returns the existing code, creates nothing, sends no second email.
  const { data: existing, error: lookupError } = await supabase
    .from("leads")
    .select("id, voucher_code, expires_at")
    .eq("org_id", orgId)
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("register: lead lookup failed:", lookupError.code);
    return serverError();
  }
  if (existing) {
    const response: RegisterResponse = {
      code: existing.voucher_code,
      expires_at: existing.expires_at,
      already_registered: true,
      email_sent: false,
    };
    return NextResponse.json(response);
  }

  // 5. Insert with a server-generated code. On voucher collision (unique
  //    violation) regenerate — loop max 5, then 500 (docs/DATABASE.md).
  //    On email unique violation we lost a concurrent race: return the winner.
  const expiresAt = new Date(
    Date.now() + VOUCHER_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let lead: { id: string; voucher_code: string } | null = null;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateVoucherCode();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        org_id: orgId,
        name: input.name,
        email,
        phone,
        phone_e164: phoneE164,
        gadget: input.gadget,
        // free text rides with any gadget: the model for named categories,
        // the description for 'other' (demand-driven stocking signal)
        gadget_other: input.gadget_other?.trim() || null,
        move: input.move,
        timing: input.timing,
        consent: input.consent,
        source: input.source,
        voucher_code: code,
        expires_at: expiresAt,
      })
      .select("id, voucher_code")
      .single();

    if (!error && data) {
      lead = data;
      break;
    }
    if (error?.code === "23505") {
      if (error.message.includes("voucher_code")) {
        continue; // code collision — regenerate and retry
      }
      // (org_id, email) race: another request just created this lead.
      const { data: winner } = await supabase
        .from("leads")
        .select("voucher_code, expires_at")
        .eq("org_id", orgId)
        .eq("email", email)
        .maybeSingle();
      if (winner) {
        const response: RegisterResponse = {
          code: winner.voucher_code,
          expires_at: winner.expires_at,
          already_registered: true,
          email_sent: false,
        };
        return NextResponse.json(response);
      }
      console.error("register: unique violation but no winner row found");
      return serverError();
    }
    console.error("register: lead insert failed:", error?.code);
    return serverError();
  }
  if (!lead) {
    console.error(
      `register: voucher collision retries exhausted (${MAX_GENERATION_ATTEMPTS})`,
    );
    return serverError();
  }

  // 6. Voucher email — await it, but a failure never fails registration.
  const firstName = input.name.split(" ")[0] ?? input.name;
  const sendResult = await sendVoucherEmail({
    to: email,
    firstName,
    code: lead.voucher_code,
    expiresAt,
  });
  if (!sendResult.ok) {
    console.error(
      `register: voucher email failed for lead ${lead.id}: ${sendResult.error}`,
    );
  }

  const { error: logError } = await supabase.from("email_log").insert({
    org_id: orgId,
    lead_id: lead.id,
    kind: "voucher",
    status: sendResult.ok ? "sent" : "failed",
    provider_message_id: sendResult.ok ? sendResult.messageId : null,
    error: sendResult.ok ? null : sendResult.error,
  });
  if (logError) {
    console.error(
      `register: email_log insert failed for lead ${lead.id}:`,
      logError.code,
    );
  }

  const response: RegisterResponse = {
    code: lead.voucher_code,
    expires_at: expiresAt,
    already_registered: false,
    email_sent: sendResult.ok,
  };
  return NextResponse.json(response);
}
