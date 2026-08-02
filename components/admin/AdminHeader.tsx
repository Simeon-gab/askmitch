"use client";

// Shared owner-area header — the full landing-page logo lockup plus a
// theme toggle. Pages pass their own right-side actions (OWNER label on
// login; export/sign-out on the dashboard) as children.
import type { ReactNode } from "react";
import { useAdminTheme } from "@/app/admin/AdminThemeProvider";
import { LogoMark } from "@/components/screens/shared";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z" />
    </svg>
  );
}

export default function AdminHeader({ children }: { children?: ReactNode }) {
  const { theme, toggle } = useAdminTheme();
  const dark = theme === "dark";
  return (
    <header className="admin-head">
      <LogoMark />
      <div className="admin-head-right">
        {children}
        <button
          type="button"
          className="theme-btn"
          onClick={toggle}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          suppressHydrationWarning
        >
          <span className="icon-sun">
            <SunIcon />
          </span>
          <span className="icon-moon">
            <MoonIcon />
          </span>
        </button>
      </div>
    </header>
  );
}
