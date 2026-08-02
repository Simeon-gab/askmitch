"use client";

// Warp shader backdrop for /admin/login only — owner-requested exception to
// the no-animation-libraries rule; the guest-facing flow stays CSS-only.
// The shader chunk is imported after a deliberate delay so the login form is
// interactive first, then the canvas fades in at low opacity (CSS handles
// the fade). Colors follow the owner's theme so it tints, rather than
// smudges, the background. Skipped entirely under prefers-reduced-motion.
import { useEffect, useState } from "react";
import { useAdminTheme } from "@/app/admin/AdminThemeProvider";

type WarpComponent = (typeof import("@paper-design/shaders-react"))["Warp"];

const LOAD_DELAY_MS = 1400;

export default function LoginShaderBackdrop() {
  const { theme } = useAdminTheme();
  const [Warp, setWarp] = useState<WarpComponent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void import("@paper-design/shaders-react").then((mod) => {
        if (!cancelled) setWarp(() => mod.Warp);
      });
    }, LOAD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!Warp) return null;

  const base = theme === "light" ? "#F6F3F1" : "#0C0C0C";

  return (
    <div className="login-shader" aria-hidden="true">
      <Warp
        style={{ width: "100%", height: "100%" }}
        colors={[base, "#ED1C24", base, "#B8121A"]}
        proportion={0.45}
        softness={1}
        distortion={0.25}
        swirl={0.8}
        swirlIterations={10}
        shape="checks"
        shapeScale={0.1}
        speed={1}
        scale={1}
        rotation={0}
      />
    </div>
  );
}
