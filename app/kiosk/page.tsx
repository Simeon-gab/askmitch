import RegistrationFlow from "@/components/RegistrationFlow";

// Kiosk mode — same flow, kiosk behaviors (docs/ARCHITECTURE.md):
// larger scale, auto-reset after the voucher, inactivity reset with a
// visible confirm, and a full data wipe on every reset.
export default function KioskPage() {
  return <RegistrationFlow source="kiosk" kiosk />;
}
