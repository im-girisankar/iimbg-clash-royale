import Image from "next/image";
import { Broadcast, Hourglass, Sword, Trophy } from "@phosphor-icons/react/dist/ssr";
import { loadLive } from "@/lib/tournament";
import { BracketView, RoundList, MatchHistory } from "@/components/bracket";
import { AutoRefresh } from "@/components/auto-refresh";
import type { Bracket, Tournament } from "@/lib/types";

/* The whole public view, shared by / and /display.
   It deliberately takes no request-scoped input: no headers(), no
   searchParams, because either would opt both pages out of static
   rendering. That matters more than it looks. With ISR one render every
   five seconds serves the entire hall, while a dynamic page multiplies
   every viewer's 10-second auto-refresh into its own database round trip. */

/** The committee's two marks. The institute's stupa is navy and would
 *  vanish against the page, so it sits on a light chip; the committee's is
 *  gold on black and needs none. */
function Marks({ size }: { size: number }) {
  return (
    <div className="flex items-center gap-3">
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

export async function LiveView({ projector = false }: { projector?: boolean }) {
  const live = await loadLive();

  if (!live) {
    return (
      <main className="stage flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <Image src="/cr/logo.png" alt="Clash Royale" width={280} height={126} priority />
        <div className="panel max-w-sm px-6 py-7">
          <Image
            src="/cr/emote-confused.png"
            alt=""
            width={72}
            height={72}
            className="mx-auto mb-3"
          />
          <h1 className="titled mb-2 text-xl uppercase text-accent">
            Nothing to see yet
          </h1>
          <p className="text-fg-muted">
            The arena is empty. Come back once the draw is made.
          </p>
        </div>
        <AutoRefresh />
      </main>
    );
  }

  const { tournament, players, bracket } = live;

  return (
    <main
      className={`stage min-h-dvh px-4 py-5 md:px-8 md:py-8 ${projector ? "display-mode" : ""}`}
    >
      <div
        className={`mx-auto flex flex-col gap-5 ${projector ? "max-w-[100rem] gap-4" : "max-w-6xl"}`}
      >
        {/* A projector is 16:9 and a bracket is tall, so on that screen the
            masthead runs along one row instead of stacking. Stacked, it ate
            roughly 300px of the 1080 available and pushed the last two
            first-round matches off the bottom, where nobody can scroll them
            back. Beside the content, the whole draw fits. */}
        {projector ? (
          <header className="flex items-center gap-5">
            <Image src="/cr/logo.png" alt="Clash Royale" width={150} height={68} priority />
            <div className="text-left">
              <h1 className="titled text-3xl uppercase leading-none text-accent">
                {tournament.name}
              </h1>
              <p className="mt-1 text-[0.6em] uppercase tracking-[0.2em] text-fg-subtle">
                IIM Bodh Gaya · IT Committee
              </p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <StatusPill tournament={tournament} bracket={bracket} />
              {bracket.nextMatches[0] && (
                <p className="panel-gold flex items-center gap-3 px-5 py-2.5">
                  <Sword size={18} weight="fill" className="text-accent" />
                  <span className="titled uppercase text-fg">
                    {bracket.nextMatches[0].a?.name} vs{" "}
                    {bracket.nextMatches[0].b?.name}
                  </span>
                </p>
              )}
              <Marks size={44} />
            </div>
          </header>
        ) : (
          <header className="flex flex-col items-center gap-3 text-center">
            <Image src="/cr/logo.png" alt="Clash Royale" width={200} height={90} priority />
            <h1 className="titled text-2xl uppercase leading-tight text-accent md:text-4xl">
              {tournament.name}
            </h1>
            <Marks size={40} />
            <StatusPill tournament={tournament} bracket={bracket} />
          </header>
        )}

        {tournament.status === "setup" && (
          <section className="panel p-6 text-center">
            <Image
              src="/cr/emote-pose.png"
              alt=""
              width={64}
              height={64}
              className="mx-auto mb-3"
            />
            <p className="titled mb-1 uppercase text-accent">Warming up</p>
            <p className="text-fg-muted">
              {players.length > 0
                ? `${players.length} challenger${players.length === 1 ? "" : "s"} signed up. The draw is next.`
                : "Waiting for challengers."}
            </p>
          </section>
        )}

        {tournament.status === "done" && bracket.champion && (
          <Champion name={bracket.champion.name} projector={projector} />
        )}

        {(tournament.status === "live" || tournament.status === "done") && (
          <>
            {!projector && <NextUp bracket={bracket} />}
            {/* Phones get the vertical round list; anything wider gets the
                grid. Rendering both and toggling with a media class keeps
                this a Server Component with no layout flash. */}
            {!projector && (
              <div className="md:hidden">
                <RoundList bracket={bracket} />
              </div>
            )}
            <div className={projector ? "" : "hidden md:block"}>
              <BracketView bracket={bracket} />
            </div>
            {!projector && <MatchHistory bracket={bracket} />}
          </>
        )}

        {!projector && <Credit />}
        <AutoRefresh />
      </div>
    </main>
  );
}

/** The moment the whole evening builds to, so it gets a real character
 *  rather than a bigger font size. */
function Champion({ name, projector }: { name: string; projector: boolean }) {
  return (
    <section className="panel-gold relative overflow-hidden px-6 py-7 text-center">
      <Image
        src="/cr/valkyrie.png"
        alt=""
        width={260}
        height={260}
        className="pointer-events-none absolute -bottom-6 -left-8 opacity-40 md:opacity-70"
      />
      <Image
        src="/cr/berserker.png"
        alt=""
        width={260}
        height={260}
        className="pointer-events-none absolute -right-8 -bottom-6 opacity-40 md:opacity-70"
      />
      <div className="relative flex flex-col items-center gap-2">
        <Image src="/cr/emote-flex.png" alt="" width={72} height={72} />
        <p className="text-xs uppercase tracking-[0.3em] text-fg-muted">
          King of the Arena
        </p>
        <p
          className={`titled uppercase text-accent ${projector ? "text-6xl" : "text-3xl md:text-5xl"}`}
        >
          {name}
        </p>
      </div>
    </section>
  );
}

/** What the host reads out to the hall. Any other playable match is listed
 *  underneath, since they can be played in any order. */
function NextUp({ bracket }: { bracket: Bracket }) {
  const [first, ...rest] = bracket.nextMatches;
  if (!first) return null;

  return (
    <section aria-label="Next match" className="panel-gold px-4 py-4 md:px-6 md:py-5">
      <p className="titled mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] text-accent">
        <Sword size={15} weight="fill" />
        In the arena next
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="titled text-xl uppercase text-fg md:text-2xl">
          {first.a?.name}
        </span>
        <span className="titled text-sm text-accent">vs</span>
        <span className="titled text-xl uppercase text-fg md:text-2xl">
          {first.b?.name}
        </span>
      </div>
      <p className="mt-1 text-center text-sm text-fg-muted">{first.roundName}</p>

      {rest.length > 0 && (
        <p className="mt-3 border-t border-line pt-3 text-center text-xs text-fg-subtle">
          Also on deck: {rest.map((m) => `${m.a?.name} vs ${m.b?.name}`).join(", ")}
        </p>
      )}
    </section>
  );
}

/** Status as a word plus an icon, never a bare coloured dot: on a projector
 *  at the back of a hall the colour is the first thing to go. */
function StatusPill({
  tournament,
  bracket,
}: {
  tournament: Tournament;
  bracket: Bracket;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-bold";

  if (tournament.status === "setup") {
    return (
      <p className={`${base} border-line-strong bg-surface text-fg-muted`}>
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
          Live · {bracket.played} of {bracket.total} battles done
        </span>
      </p>
    );
  }

  return (
    <p className={`${base} border-accent-line bg-accent-soft text-accent`}>
      <Trophy size={16} weight="fill" />
      Champion crowned
    </p>
  );
}

/** Supercell's Fan Content Policy asks for this wherever their assets are
 *  used. It is one line and it is the condition of using the artwork. */
function Credit() {
  return (
    <p className="pb-2 text-center text-[11px] leading-relaxed text-fg-subtle">
      This material is unofficial and is not endorsed by Supercell. For more
      information see Supercell&rsquo;s Fan Content Policy:{" "}
      <a
        href="https://supercell.com/en/fan-content-policy/"
        className="underline hover:text-fg-muted"
      >
        supercell.com/fan-content-policy
      </a>
    </p>
  );
}
