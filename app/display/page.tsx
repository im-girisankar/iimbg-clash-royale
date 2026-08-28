import type { Metadata } from "next";
import { LiveView } from "@/components/live-view";

/* Projector mode. A separate route rather than /?display=1 so both pages
   stay statically rendered — reading a search param would make them dynamic
   and put every viewer's refresh straight through to the database. */

export const revalidate = 5;

export const metadata: Metadata = {
  title: "Bracket · IIMBG Clash Royale",
  robots: { index: false },
};

export default function DisplayPage() {
  return <LiveView projector />;
}
