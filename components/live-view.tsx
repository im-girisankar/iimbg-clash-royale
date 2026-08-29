import Image from "next/image";
import { Broadcast, Crown, Hourglass, Trophy } from "@phosphor-icons/react/dist/ssr";
import { loadLive } from "@/lib/tournament";
import { BracketView, MatchHistory } from "@/components/bracket";
import { NextMatch } from "@/components/next-match";
import { Share } from "@/components/share";
import { AutoRefresh } from "@/components/auto-refresh";

/* The whole public view, shared by / and /display.
   It deliberately takes no request-scoped input: no headers(), no
   searchParams, because either would opt both pages out of static
   rendering. That matters more than it looks. With ISR one render every
   five seconds serves the entire hall, while a dynamic page multiplies
   every viewer's 10-second auto-refresh into its own database round trip. */

/** Both marks, sized from one place. The institute's stupa is navy and
 *  would vanish against the page, so it sits on a light chip; the
 *  committee's mark is gold on black and needs none. */
function Marks({ size }: { size: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Image
        src="/it-committee.png"
        alt="IIM Bodh Gaya IT Committee"
        width={size}
        height={size}
        priority
      />
      <span aria-hidden="true" className="h-8 w-px bg-line-strong" />
      <Image
        src="/iimbg.png"
        alt="IIM Bodh Gaya"
        width={size}
        height={size}
        className="mark-chip"
        priority
      />
    </div>
  );
}

export async function LiveView({
  projector = false,
  url,
}: {
  projector?: boolean;
  url?: string;
}) {
  const live = await loadLive();

  if (!live) {
    return (
      <main className="stage flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
        <Marks size={64} />
        <div className="max-w-sm text-center">
          <h1 className="mb-3 font-display text-2xl uppercase tracking-wide text-fg md:text-3xl">
            Clash Royale Championship
          </h1>
          <p className="text-fg-muted">
            The bracket goes up here once the draw is made.
          </p>
        </div>
        <AutoRefresh />
      </main>
    );
  }

  const { tournament, players, bracket } = live;

  return (
    <main
      className={`stage min-h-dvh px-4 py-6 md:px-8 md:py-10 ${projector ? "display-mode" : ""}`}
    >
      <div
        className={`mx-auto flex flex-col gap-6 ${
          projector ? "max-w-[100rem] gap-4" : "max-w-6xl"
        }`}
      >
        {/* A projector is 16:9 and a bracket is tall, so on that screen the
            masthead runs along one row instead of stacking. Stacked, it ate
            roughly 300px of the 1080 available and pushed the last two
            first-round matches off the bottom, where nobody can scroll them
            back. Beside the content, the whole draw fits. */}
        {projector ? (
          <header className="masthead flex items-center gap-5">
            <Marks size={48} />
            <div className="text-left">
              <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-fg">
                {tournament.name}
              </h1>
              <p className="mt-1 text-[0.6em] font-semibold uppercase tracking-[0.2em] text-fg-subtle">
                IIM Bodh Gaya · IT Committee
              </p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <StatusPill tournament={tournament} bracket={bracket} />
              {bracket.nextMatches[0] && (
                <p className="flex items-center gap-3 rounded-panel border border-accent-line bg-accent-soft px-5 py-2.5">
                  <span className="text-[0.6em] font-bold uppercase tracking-[0.2em] text-accent">
                    Next
                  </span>
                  <span className="font-display uppercase text-fg">
                    {bracket.nextMatches[0].a?.name} vs{" "}
                    {bracket.nextMatches[0].b?.name}
                  </span>
                </p>
              )}
            </div>
          </header>
        ) : (
          <header className="masthead flex flex-col items-center gap-4 text-center">
            <Marks size={52} />
            <div>
              <h1 className="font-display text-2xl uppercase leading-tight tracking-wide text-fg md:text-4xl">
                {tournament.name}
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-fg-subtle">
                IIM Bodh Gaya · IT Committee
              </p>
            </div>
            <StatusPill tournament={tournament} bracket={bracket} />
          </header>
        )}

        {tournament.status === "setup" && (
          <section className="rounded-panel border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-fg-muted">Draw not made yet</p>
            {players.length > 0 && (
              <p className="nums text-sm text-fg-subtle">
                {players.length} player{players.length === 1 ? "" : "s"} signed up
              </p>
            )}
          </section>
        )}

        {tournament.status === "done" && bracket.champion && (
          <section className="relative overflow-hidden rounded-panel border border-accent-line bg-accent-soft px-6 py-9 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 100% at 50% 0%, rgb(240 192 48 / 0.22), transparent 70%)",
              }}
            />
            <div className="relative flex flex-col items-center gap-2">
              <Crown size={44} weight="fill" className="text-accent" />
              <p className="font-display text-3xl uppercase tracking-wide text-accent md:text-5xl">
                {bracket.champion.name}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-fg-muted">
                Champion
              </p>
            </div>
          </section>
        )}

        {(tournament.status === "live" || tournament.status === "done") && (
          <>
            {/* The full Next Match panel is for phones. On the projector the
                same fixture already sits in the masthead row, and the bracket
                marks every playable match in gold anyway. */}
            {!projector && <NextMatch bracket={bracket} />}
            <BracketView bracket={bracket} />
            {!projector && <MatchHistory bracket={bracket} />}
          </>
        )}

        {!projector && url && <Share url={url} />}
        <AutoRefresh />
      </div>
    </main>
  );
}

/** Status as a word plus an icon, never a bare coloured dot: on a
 *  projector at the back of a hall the colour is the first thing to go. */
function StatusPill({
  tournament,
  bracket,
}: {
  tournament: { status: string };
  bracket: { played: number; total: number };
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold";

  if (tournament.status === "setup") {
    return (
      <p className={`${base} border-line bg-surface text-fg-muted`}>
        <Hourglass size={16} weight="fill" />
        Not started
      </p>
    );
  }

  if (tournament.status === "live") {
    return (
      <p className={`${base} border-win-line bg-win-soft text-win`}>
        <Broadcast size={16} weight="fill" />
        <span className="nums">
          Live · {bracket.played} of {bracket.total} matches played
        </span>
      </p>
    );
  }

  return (
    <p className={`${base} border-accent-line bg-accent-soft text-accent`}>
      <Trophy size={16} weight="fill" />
      Completed
    </p>
  );
}

/** Read from the environment rather than the request, so the page stays
 *  static. Vercel exposes the production URL at build time. */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
