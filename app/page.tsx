import RegistrationFlow from "@/components/RegistrationFlow";

// Registration flow (mobile-first). `/?source=qr` marks QR scans; plain
// visits count as `link`. Kiosk gets its own route in Phase 4.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  return <RegistrationFlow source={source === "qr" ? "qr" : "link"} />;
}
