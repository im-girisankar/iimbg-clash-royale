import { loadLive } from "@/lib/tournament";
import { BracketView, MatchHistory } from "@/components/bracket";
import { NextMatch } from "@/components/next-match";
import { Share } from "@/components/share";
import { AutoRefresh } from "@/components/auto-refresh";

/* The whole public view, shared by / and /display.
   It deliberately takes no request-scoped input — no headers(), no
   searchParams — because either would opt both pages out of static
   rendering. That matters more than it looks: with ISR one render every
   five seconds serves the entire hall, while a dynamic page multiplies
   every viewer's 10-second auto-refresh into its own database round trip. */

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
      <main className="stage flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            IIM Bodh Gaya · IT Committee
          </p>
          <h1 className="mb-4 font-display text-3xl text-fg">
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

  let statusLine: string;
  if (tournament.status === "setup") {
    statusLine = "🟡 Not started";
  } else if (tournament.status === "live") {
    statusLine = `🟢 In progress · ${bracket.played} of ${bracket.total} matches played`;
  } else {
    statusLine = "🏆 Completed";
  }

  return (
    <main
      className={`stage min-h-dvh px-4 py-6 md:px-8 md:py-10 ${projector ? "display-mode" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            IIM Bodh Gaya · IT Committee
          </p>
          <h1 className="mb-2 font-display text-3xl text-fg md:text-4xl">
            {tournament.name}
          </h1>
          <p className="text-sm text-fg-muted">{statusLine}</p>
        </header>

        {tournament.status === "setup" && (
          <section className="rounded-xl border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-fg-muted">Draw not made yet</p>
            {players.length > 0 && (
              <p className="text-sm text-fg-subtle">
                {players.length} player{players.length === 1 ? "" : "s"} signed up
              </p>
            )}
          </section>
        )}

        {tournament.status === "done" && bracket.champion && (
          <section className="rounded-xl border border-accent-line bg-accent-soft px-6 py-8 text-center">
            <p className="mb-2 text-4xl" aria-hidden="true">
              🏆
            </p>
            <p className="mb-1 font-display text-3xl text-accent md:text-4xl">
              {bracket.champion.name}
            </p>
            <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
              Champion
            </p>
          </section>
        )}

        {(tournament.status === "live" || tournament.status === "done") && (
          <>
            <NextMatch bracket={bracket} />
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

/** Read from the environment rather than the request, so the page stays
 *  static. Vercel exposes the production URL at build time. */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
