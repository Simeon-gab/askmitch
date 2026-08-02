import type { ReactNode } from "react";
import AdminThemeProvider from "./AdminThemeProvider";

// Wraps both the dashboard and the login page so they share the theme shell.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
