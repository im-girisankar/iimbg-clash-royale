import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* The actual Clash fonts, from Supercell's official Fan Kit
   (fankit.supercell.com), which licenses them for exactly this kind of
   non-commercial fan use. Self-hosted through next/font/local so they are
   preloaded and subset with no layout shift and no third-party request.

   Heavy is the signage voice. Regular carries body text: it is the game's
   own UI face, so the whole thing reads as one product rather than as a
   web app wearing a game's colours. */

const clash = localFont({
  src: [
    { path: "../public/fonts/Clash_Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/Clash_Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-clash",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const clashHeavy = localFont({
  src: "../public/fonts/Clash-Heavy.otf",
  variable: "--font-clash-heavy",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "IIMBG Clash Royale",
  description:
    "Live tournament bracket for the IIM Bodh Gaya IT Committee Clash Royale championship.",
};

export const viewport: Viewport = {
  themeColor: "#131A4A",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* The font variables go on <html>, not <body>. globals.css derives
       --f-body and --f-display from them inside :root, and a var() that
       resolves to nothing there makes the whole font-family declaration
       invalid, silently dropping the page back to the system stack. */
    <html lang="en" className={`${clash.variable} ${clashHeavy.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
