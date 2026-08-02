"use client";

// Owner login (docs/ARCHITECTURE.md: Supabase email/password, single owner
// account). Middleware redirects unauthenticated /admin visits here.
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import LoginShaderBackdrop from "@/components/admin/LoginShaderBackdrop";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (busy || email.trim() === "" || password === "") return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError("Wrong email or password.");
      setBusy(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <>
      <LoginShaderBackdrop />
      <div className="app rd">
        <AdminHeader>
          <span className="admin-role">OWNER</span>
        </AdminHeader>
        <div className="rd-stage">
          <div>
            <div className="eyebrow">Numbers time…</div>
            <h1 className="big">
              Owner <span className="r">login</span>
            </h1>
            <div className="field">
              <input
                suppressHydrationWarning
                type="email"
                placeholder="Email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <input
                suppressHydrationWarning
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void signIn();
                }}
              />
              {error ? <div className="hint err">{error}</div> : null}
            </div>
            <button
              type="button"
              className="cta"
              onClick={() => void signIn()}
              disabled={busy || email.trim() === "" || password === ""}
              suppressHydrationWarning
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
