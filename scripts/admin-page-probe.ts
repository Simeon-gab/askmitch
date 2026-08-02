// Diagnostic: sign in as the owner, build the Supabase auth cookie the way
// @supabase/ssr expects, fetch /admin server-side, and report which parts
// of the dashboard the SERVER actually rendered. Run:
//   npx --yes tsx scripts/admin-page-probe.ts https://askmitch.ng
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim().replace(/^"|"$/g, "") ?? "";
  if (!value) throw new Error(`${name} missing`);
  return value;
}
function credential(field: "Email" | "Password"): string {
  const line = readFileSync(".admin-credentials.txt", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${field}: `));
  if (!line) throw new Error(`${field} missing`);
  return line.slice(field.length + 2).trim();
}

// @supabase/ssr cookie format: sb-<ref>-auth-token = base64-<b64url(session JSON)>,
// chunked into .0/.1... parts when longer than ~3180 chars.
function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function main() {
  const base = process.argv[2] ?? "https://askmitch.ng";
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const ref = new URL(url).hostname.split(".")[0];
  const supabase = createClient(url, env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credential("Email"),
    password: credential("Password"),
  });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message}`);

  const value = `base64-${toBase64Url(JSON.stringify(data.session))}`;
  const CHUNK = 3180;
  const cookies: string[] = [];
  const name = `sb-${ref}-auth-token`;
  if (value.length <= CHUNK) {
    cookies.push(`${name}=${value}`);
  } else {
    for (let i = 0; i * CHUNK < value.length; i++) {
      cookies.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`);
    }
  }

  const res = await fetch(`${base}/admin`, {
    headers: { Cookie: cookies.join("; ") },
    redirect: "manual",
  });
  console.log(`GET /admin -> HTTP ${res.status}`);
  const html = await res.text();

  const checks: [string, string][] = [
    ["header (logo)", "MULTI-VENTURES"],
    ["Export CSV button", "Export CSV"],
    ["Sign out button", "Sign out"],
    ["KPI: Total signups", "Total signups"],
    ["KPI: Redemption rate", "Redemption rate"],
    ["Breakdown: Gadget interest", "Gadget interest"],
    ["Hot leads heading", "Hot leads"],
    ["A hot-lead row (Askmitch Owner)", "Askmitch Owner"],
    ["Recent table cell markers", "<td>"],
    ["Voucher-lead email cell", "askmitchltd@gmail.com"],
    ["Pager", "leads</span>"],
  ];
  for (const [label, needle] of checks) {
    console.log(`${html.includes(needle) ? "FOUND  " : "MISSING"}  ${label}`);
  }
  const tdCount = (html.match(/<td/g) ?? []).length;
  console.log(`total <td> cells in server HTML: ${tdCount}`);
  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
