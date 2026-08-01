// Bootstrap the single owner login (docs/DATABASE.md seed step):
// creates the confirmed auth user, maps it in admin_users, and writes the
// generated password to .admin-credentials.txt (gitignored). Secrets are
// never printed to stdout. Re-running rotates the password safely.
// Run: npx --yes tsx scripts/create-admin.ts [email]
import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim().replace(/^"|"$/g, "") ?? "";
  if (!value) throw new Error(`${name} missing in .env.local`);
  return value;
}

const PASSWORD_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#%^*";
function generatePassword(length = 20): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

async function main() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const orgId = env("NEXT_PUBLIC_EVENT_ORG_ID");
  const email = process.argv[2] ?? "simeonayano209@gmail.com";
  const password = generatePassword();

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string;
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (!/already/i.test(error.message)) throw error;
    const { data: list, error: listError } =
      await supabase.auth.admin.listUsers({ perPage: 200 });
    if (listError) throw listError;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!existing) throw error;
    userId = existing.id;
    const { error: pwError } = await supabase.auth.admin.updateUserById(
      userId,
      { password },
    );
    if (pwError) throw pwError;
    console.log("existing auth user found — password rotated");
  } else {
    userId = created.user.id;
    console.log("auth user created and confirmed");
  }

  const { error: mapError } = await supabase
    .from("admin_users")
    .upsert({ user_id: userId, org_id: orgId });
  if (mapError) throw mapError;
  console.log("admin_users mapping upserted");

  writeFileSync(
    ".admin-credentials.txt",
    [
      "ASKMITCH owner login — change the password after first sign-in",
      "(Supabase dashboard → Authentication → Users, or ask Claude to rotate it)",
      "",
      "Login page: /admin/login",
      `Email: ${email}`,
      `Password: ${password}`,
      "",
    ].join("\n"),
    "utf8",
  );
  console.log("credentials written to .admin-credentials.txt (gitignored)");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
