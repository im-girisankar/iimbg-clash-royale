import type { Metadata, Viewport } from "next";
import { Barlow, Lilita_One } from "next/font/google";
import "./globals.css";

/* Lilita One for headings — it is the chunky arena signage voice Clash
   Royale uses everywhere. Barlow carries everything else, including the
   numbers: at crown counts of 0–3 a monospace face buys nothing. */

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const lilita = Lilita_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lilita",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IIMBG Clash Royale",
  description:
    "Live tournament bracket for the IIM Bodh Gaya IT Committee Clash Royale championship.",
};

export const viewport: Viewport = {
  themeColor: "#0D1030",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${barlow.variable} ${lilita.variable} min-h-dvh antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
