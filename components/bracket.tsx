import Image from "next/image";
import { Crown } from "@phosphor-icons/react/dist/ssr";
import type { Bracket, BracketMatch, Player } from "@/lib/types";

/* Two renderings of the same bracket, because a phone and a projector want
   genuinely different things.

   `BracketView` is the grid: columns left to right, for the projector and
   for desktop. `RoundList` is a plain vertical list of rounds, for phones.

   The grid used to be the only one, scaled down. That put a horizontally
   scrolling element inside a vertically scrolling page, which is the worst
   gesture on a touchscreen: you swipe to move the page and the bracket
   slides sideways instead. A phone gets the list and never scrolls
   sideways at all. */

const CARD_STYLE = { width: "var(--card-w, 12rem)" } as const;

/* Emotes are the game's own reaction faces, from the Fan Kit. They are
   picked by slot rather than at random so a face never changes underneath
   somebody during the ten-second auto-refresh. */
const WIN_EMOTES = ["/cr/emote-flex.png", "/cr/emote-dance.png", "/cr/emote-pose.png"];

function emoteFor(match: BracketMatch): string {
  return WIN_EMOTES[(match.round * 7 + match.slot) % WIN_EMOTES.length];
}

function crownsFor(match: BracketMatch, player: Player | null): number | null {
  if (!player) return null;
  if (match.a && player.id === match.a.id) return match.crownsA;
  if (match.b && player.id === match.b.id) return match.crownsB;
  return null;
}

function Crowns({ count, dim = false }: { count: number; dim?: boolean }) {
  return (
    <span
      className={`nums flex shrink-0 items-center gap-1 text-sm font-bold ${
        dim ? "text-fg-subtle" : "text-accent"
      }`}
    >
      {count}
      <Crown size={15} weight="fill" />
    </span>
  );
}

function Emote({ src, size = 30 }: { src: string; size?: number }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 select-none drop-shadow"
    />
  );
}

/** One match, laid out the same way in both renderings. `wide` gives the
 *  phone list a full-width row instead of a fixed column card. */
function MatchCard({ match, wide = false }: { match: BracketMatch; wide?: boolean }) {
  const style = wide ? undefined : CARD_STYLE;
  const box = `match-card flex flex-col gap-1.5 p-2.5 ${wide ? "w-full" : ""}`;

  if (match.state === "waiting") {
    return (
      <div className={`cell ${box} opacity-70`} style={style}>
        <div className="flex items-center gap-2 text-sm text-fg-subtle">
          <Emote src="/cr/emote-confused.png" size={26} />
          Waiting on earlier results
        </div>
      </div>
    );
  }

  if (match.state === "bye") {
    return (
      <div className={`cell ${box}`} style={style}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-bold text-fg">{match.winner?.name}</span>
          <Emote src="/cr/emote-seeya.png" size={26} />
        </div>
        <div className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
          Free pass, walks through
        </div>
      </div>
    );
  }

  if (match.state === "ready") {
    return (
      <div className={`panel-gold ${box}`} style={style}>
        <div className="truncate font-bold text-fg">{match.a?.name}</div>
        <div className="titled text-[11px] uppercase tracking-[0.2em] text-accent">
          vs
        </div>
        <div className="truncate font-bold text-fg">{match.b?.name}</div>
        <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-accent">
          Up next
        </div>
      </div>
    );
  }

  const { winner, loser } = match;
  const winnerCrowns = crownsFor(match, winner);
  const loserCrowns = crownsFor(match, loser);

  return (
    <div className={`cell ${box}`} style={style}>
      <div className="cell-win flex items-center gap-2 px-2 py-1.5">
        <Emote src={emoteFor(match)} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-win">{winner?.name}</span>
          <span className="block text-[10px] font-bold tracking-[0.15em] text-win">
            WINNER
          </span>
        </span>
        {winnerCrowns !== null && <Crowns count={winnerCrowns} />}
      </div>
      <div className="cell-out flex items-center gap-2 px-2 py-1.5">
        <Emote src="/cr/emote-lol.png" size={22} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-out line-through">{loser?.name}</span>
          <span className="block text-[10px] font-bold tracking-[0.15em] text-out">
            KNOCKED OUT
          </span>
        </span>
        {loserCrowns !== null && <Crowns count={loserCrowns} dim />}
      </div>
    </div>
  );
}

function RoundBadge({ label }: { label: string }) {
  return (
    <h3 className="titled cell px-3 py-1.5 text-center text-[11px] uppercase tracking-[0.18em] text-accent">
      {label}
    </h3>
  );
}

/** The grid. Desktop and projector only. */
export function BracketView({ bracket }: { bracket: Bracket }) {
  if (bracket.rounds.length === 0) return null;

  return (
    <div className="bracket-scroll overflow-x-auto">
      <div className="bracket-columns inline-flex gap-4 pb-2 md:gap-6">
        {bracket.rounds.map((matches, i) => (
          <div key={i} className="flex flex-col" style={CARD_STYLE}>
            <div className="mb-3">
              <RoundBadge label={matches[0]?.roundName ?? ""} />
            </div>
            <div className="round-col flex flex-1 flex-col justify-around gap-4">
              {matches.map((m) => (
                <MatchCard key={m.slot} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The phone rendering: rounds stacked, matches full width, no sideways
 *  scroll anywhere. Rounds nobody can play yet start collapsed, so the page
 *  opens on what is actually happening. */
export function RoundList({ bracket }: { bracket: Bracket }) {
  if (bracket.rounds.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {bracket.rounds.map((matches, i) => {
        const live = matches.some((m) => m.state === "ready");
        const allWaiting = matches.every((m) => m.state === "waiting");
        const done = matches.filter((m) => m.state === "done").length;
        const real = matches.filter((m) => m.state !== "bye").length;

        return (
          <details key={i} open={!allWaiting} className="panel overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
              <span className="titled text-sm uppercase tracking-[0.14em] text-accent">
                {matches[0]?.roundName}
              </span>
              {live && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-ink">
                  Playing now
                </span>
              )}
              <span className="nums ml-auto text-xs text-fg-subtle">
                {done}/{real}
              </span>
            </summary>
            <div className="flex flex-col gap-2 px-3 pb-3">
              {matches.map((m) => (
                <MatchCard key={m.slot} match={m} wide />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** Reverse-chronological list of decided matches. `Live`/`Bracket` carry no
 *  per-match timestamp (only the raw `MatchResult` rows do, and those are
 *  not part of the public read path), so "reverse-chronological" is
 *  approximated as later rounds first. That is a safe stand-in, since a
 *  match can only be decided after the matches that feed it. Byes are
 *  skipped: they were never played. */
export function MatchHistory({ bracket }: { bracket: Bracket }) {
  const decided = bracket.rounds
    .flat()
    .filter((m) => m.state === "done")
    .sort((a, b) => b.round - a.round || a.slot - b.slot);

  if (decided.length === 0) return null;

  return (
    <section aria-label="Match history" className="panel p-4">
      <h2 className="titled mb-3 text-base uppercase tracking-wide text-accent">
        Every battle so far
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {decided.map((m) => {
          const winnerCrowns = crownsFor(m, m.winner);
          const loserCrowns = crownsFor(m, m.loser);
          const hasScore = winnerCrowns !== null && loserCrowns !== null;
          return (
            <li
              key={`${m.round}-${m.slot}`}
              className="flex items-baseline justify-between gap-3 py-2 text-sm text-fg-muted"
            >
              <span className="min-w-0">
                <span className="font-bold text-fg">{m.winner?.name}</span> sent{" "}
                <span>{m.loser?.name}</span> home{" "}
                {hasScore && (
                  <span className="nums font-bold text-accent">
                    {winnerCrowns}-{loserCrowns}
                  </span>
                )}
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs uppercase tracking-wide text-fg-subtle">
                {m.roundName}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
