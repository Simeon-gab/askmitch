import type { Metadata } from "next";
import TestLanding from "./TestLanding";

// Visual lab for the welcome screen — does NOT replace the production
// landing (/). Safe to delete once a direction is chosen.
export const metadata: Metadata = {
  title: "ASKMITCH — Welcome (design test)",
  robots: { index: false },
};

export default function TestPage() {
  return <TestLanding />;
}
