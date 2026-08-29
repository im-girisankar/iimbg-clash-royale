import { ArrowRight, Check, Crown, X } from "@phosphor-icons/react/dist/ssr";
import type { Bracket, BracketMatch, Player } from "@/lib/types";

/* One-directional bracket, left (round 1) to right (final), scrolling
   horizontally on narrow screens. No mirrored two-sided layout, no drawn
   connector lines: vertical alignment between rounds comes from flexbox
   (`justify-around` inside equal-height, stretched columns), not from
   absolute positioning.

   Every state is carried by a word as well as a colour. Half this
   audience is reading it projected across a room, where a green tint and
   a red tint are the same grey. */

const CARD_STYLE = { width: "var(--card-w, 11.5rem)" } as const;

function crownsFor(match: BracketMatch, player: Player | null): number | null {
  if (!player) return null;
  if (match.a && player.id === match.a.id) return match.crownsA;
  if (match.b && player.id === match.b.id) return match.crownsB;
  return null;
}

function Crowns({ count, dim = false }: { count: number; dim?: boolean }) {
  return (
    <span
      className={`nums flex shrink-0 items-center gap-0.5 text-xs font-semibold ${
        dim ? "text-fg-subtle" : "text-accent"
      }`}
    >
      {count}
      <Crown size={12} weight="fill" />
    </span>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const base = "flex flex-col gap-1.5 rounded-cell border p-2.5 text-sm";

  if (match.state === "waiting") {
    return (
      <div
        className={`${base} border-line bg-surface/60 border-dashed`}
        style={CARD_STYLE}
      >
        <div className="truncate text-fg-subtle">To be decided</div>
        <div className="truncate text-fg-subtle">To be decided</div>
      </div>
    );
  }

  if (match.state === "bye") {
    return (
      <div className={`${base} border-line bg-surface`} style={CARD_STYLE}>
        <div className="truncate font-semibold text-fg">{match.winner?.name}</div>
        <div className="flex items-center gap-1 text-xs text-fg-subtle">
          <ArrowRight size={12} weight="bold" />
          Bye, advances
        </div>
      </div>
    );
  }

  if (match.state === "ready") {
    return (
      <div
        className={`${base} border-accent-line bg-accent-soft`}
        style={CARD_STYLE}
      >
        <div className="truncate font-semibold text-fg">{match.a?.name}</div>
        <div className="-my-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fg-subtle">
          vs
        </div>
        <div className="truncate font-semibold text-fg">{match.b?.name}</div>
        <div className="text-xs font-semibold text-accent">Ready to play</div>
      </div>
    );
  }

  // state === "done"
  const winner = match.winner;
  const loser = match.loser;
  const winnerCrowns = crownsFor(match, winner);
  const loserCrowns = crownsFor(match, loser);

  return (
    <div className={`${base} border-line bg-surface`} style={CARD_STYLE}>
      <div className="rounded-cell border border-win-line bg-win-soft px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-bold text-win">{winner?.name}</span>
          {winnerCrowns !== null && <Crowns count={winnerCrowns} />}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] text-win">
          <Check size={10} weight="bold" />
          ADVANCED
        </div>
      </div>
      <div className="rounded-cell border border-out-line bg-out-soft px-2 py-1.5 opacity-75">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-out line-through">{loser?.name}</span>
          {loserCrowns !== null && <Crowns count={loserCrowns} dim />}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] text-out">
          <X size={10} weight="bold" />
          OUT
        </div>
      </div>
    </div>
  );
}

export function BracketView({ bracket }: { bracket: Bracket }) {
  if (bracket.rounds.length === 0) return null;

  return (
    /* The fade on the right edge is the only signal that there is more
       bracket off-screen. A phone showing round 1 of a 16-slot draw always
       has three more columns to the right, and a hard clip reads as the end
       of the page rather than as something to swipe. It is masked off from
       md up, where the columns usually fit. */
    <div className="bracket-scroll relative overflow-x-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 md:hidden"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--ground))",
        }}
      />
      <div className="bracket-columns inline-flex gap-4 pb-2 md:gap-6">
        {bracket.rounds.map((matches, i) => (
          <div key={i} className="flex flex-col" style={CARD_STYLE}>
            <h3 className="mb-3 rounded-full border border-line bg-surface py-1 text-center font-display text-[11px] uppercase tracking-[0.15em] text-fg-muted">
              {matches[0]?.roundName}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-4">
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
    <section
      aria-label="Match history"
      className="rounded-panel border border-line bg-surface p-4"
    >
      <h2 className="mb-3 font-display text-base uppercase tracking-wide text-fg">
        Match history
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
                <span className="font-semibold text-fg">{m.winner?.name}</span>{" "}
                beat <span>{m.loser?.name}</span>{" "}
                {hasScore && (
                  <span className="nums font-semibold text-accent">
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
