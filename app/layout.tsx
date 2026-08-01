import type { Metadata, Viewport } from "next";
import { Anton, Kaushan_Script, Manrope } from "next/font/google";
import "./globals.css";

// Fonts per docs/DESIGN.md, self-hosted via next/font (display swap, subset).
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});
const kaushan = Kaushan_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-kaushan",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASKMITCH — Opening Day Guest List",
  description:
    "Register for the ASKMITCH Multiventures store opening in Ibadan, Sat 8th August — and get a 5% voucher.",
};

// Matches the approved prototype's viewport (fixed-scale event flow).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0C0C0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${kaushan.variable} ${manrope.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
