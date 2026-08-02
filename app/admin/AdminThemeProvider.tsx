"use client";

// Light/dark theme for the owner area (/admin + /admin/login) only. Guest
// and staff surfaces stay dark — these tokens resolve inside .admin-root.
// The choice is remembered per-browser; server renders dark while the browser
// reads the saved preference during initialization.
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

const AdminThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

const STORAGE_KEY = "askmitch-admin-theme";

export default function AdminThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // private-mode / blocked storage — dark default is fine
    }
    return "dark";
  });

  const toggle = () =>
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore — the toggle still works for this session
      }
      return next;
    });

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      <div className="admin-root" data-theme={theme} suppressHydrationWarning>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
