import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Russo_One } from "next/font/google";
import "./globals.css";

/* Russo One for headings: wide, flat-sided and unmistakably tournament
   signage, which is what a name has to be when it is read from the back
   of a hall. Chakra Petch carries everything else. It is narrow enough
   that a long player name still fits inside a bracket cell, and it has
   real tabular figures for the crown counts. */

const russo = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo",
  display: "swap",
});

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IIMBG Clash Royale",
  description:
    "Live tournament bracket for the IIM Bodh Gaya IT Committee Clash Royale championship.",
};

export const viewport: Viewport = {
  themeColor: "#0A0C22",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${chakra.variable} ${russo.variable} min-h-dvh antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
