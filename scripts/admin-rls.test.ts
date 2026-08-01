// Phase 5 acceptance: the signed-in owner (anon key + session, NOT service
// role) can read leads/email_log through the RLS admin policies — the exact
// path the dashboard uses. Run: npx --yes tsx scripts/admin-rls.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim().replace(/^"|"$/g, "") ?? "";
  if (!value) throw new Error(`${name} missing in .env.local`);
  return value;
}

function credential(field: "Email" | "Password"): string {
  const line = readFileSync(".admin-credentials.txt", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${field}: `));
  if (!line) throw new Error(`${field} missing in .admin-credentials.txt`);
  return line.slice(field.length + 2).trim();
}

async function main() {
  const supabase = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const orgId = env("NEXT_PUBLIC_EVENT_ORG_ID");

  // Sanity: signed OUT, RLS hides everything.
  const anonProbe = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  assert.equal(anonProbe.count, 0, "anon must see zero leads");
  console.log("PASS anon sees 0 leads");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: credential("Email"),
    password: credential("Password"),
  });
  assert.equal(signInError, null, `sign-in failed: ${signInError?.message}`);
  console.log("PASS owner sign-in");

  const leads = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  assert.equal(leads.error, null);
  assert.ok((leads.count ?? 0) >= 1, "owner must see the existing leads");
  console.log(`PASS owner reads leads via RLS (count: ${leads.count})`);

  const log = await supabase
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  assert.equal(log.error, null);
  assert.ok((log.count ?? 0) >= 1, "owner must see email_log rows");
  console.log(`PASS owner reads email_log via RLS (count: ${log.count})`);

  // Mutations must still be denied (read-only policies).
  const write = await supabase
    .from("leads")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .select("id");
  assert.ok(
    write.error !== null || (write.data ?? []).length === 0,
    "owner writes must be blocked by RLS",
  );
  console.log("PASS owner cannot write (mutations stay service-role-only)");

  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
