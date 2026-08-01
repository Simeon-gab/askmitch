import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ASKMITCH — Opening Day Guest List",
  description:
    "Register for the ASKMITCH Multiventures store opening in Ibadan, Sat 8th August — and get a 5% voucher.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
