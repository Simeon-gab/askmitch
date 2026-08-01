"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };
  return (
    <button
      type="button"
      className="ad-btn"
      onClick={() => void signOut()}
      suppressHydrationWarning
    >
      Sign out
    </button>
  );
}
