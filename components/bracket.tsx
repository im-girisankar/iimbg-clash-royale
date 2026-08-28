import type { Bracket, BracketMatch, Player } from "@/lib/types";

/* One-directional bracket, left (round 1) to right (final), scrolling
   horizontally on narrow screens. No mirrored two-sided layout, no drawn
   connector lines — vertical alignment between rounds comes from flexbox
   (`justify-around` inside equal-height, stretched columns), not from
   absolute positioning. */

const CARD_STYLE = { width: "var(--card-w, 11rem)" } as const;

function crownsFor(match: BracketMatch, player: Player | null): number | null {
  if (!player) return null;
  if (match.a && player.id === match.a.id) return match.crownsA;
  if (match.b && player.id === match.b.id) return match.crownsB;
  return null;
}

function MatchCard({ match }: { match: BracketMatch }) {
  const base = "flex flex-col gap-1.5 rounded-lg border p-2.5 text-sm";

  if (match.state === "waiting") {
    return (
      <div className={`${base} border-line bg-surface`} style={CARD_STYLE}>
        <div className="truncate text-fg-subtle">TBD</div>
        <div className="truncate text-fg-subtle">TBD</div>
      </div>
    );
  }

  if (match.state === "bye") {
    return (
      <div className={`${base} border-line bg-surface`} style={CARD_STYLE}>
        <div className="truncate font-medium text-fg">{match.winner?.name}</div>
        <div className="text-xs text-fg-subtle">💤 BYE — advances</div>
      </div>
    );
  }

  if (match.state === "ready") {
    return (
      <div className={`${base} border-accent-line bg-accent-soft`} style={CARD_STYLE}>
        <div className="truncate font-medium text-fg">{match.a?.name}</div>
        <div className="-my-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">vs</div>
        <div className="truncate font-medium text-fg">{match.b?.name}</div>
        <div className="text-xs text-fg-muted">⚪ Ready to play</div>
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
      <div
        className="rounded-md border px-2 py-1.5"
        style={{ borderColor: "var(--win-line)", background: "var(--win-soft)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-win">{winner?.name}</span>
          {winnerCrowns !== null && (
            <span className="shrink-0 text-xs text-fg-muted">{winnerCrowns}👑</span>
          )}
        </div>
        <div className="text-[10px] font-bold tracking-wide text-win">ADVANCED</div>
      </div>
      <div
        className="rounded-md border px-2 py-1.5 opacity-70"
        style={{ borderColor: "var(--out-line)", background: "var(--out-soft)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-out line-through">{loser?.name}</span>
          {loserCrowns !== null && (
            <span className="shrink-0 text-xs text-fg-subtle">{loserCrowns}👑</span>
          )}
        </div>
        <div className="text-[10px] font-bold tracking-wide text-out">OUT</div>
      </div>
    </div>
  );
}

export function BracketView({ bracket }: { bracket: Bracket }) {
  if (bracket.rounds.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-4 pb-2 md:gap-6">
        {bracket.rounds.map((matches, i) => (
          <div key={i} className="flex flex-col" style={CARD_STYLE}>
            <h3 className="mb-3 text-center font-display text-xs uppercase tracking-wide text-fg-muted">
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
 *  approximated as later rounds first — a safe stand-in, since a match can
 *  only be decided after the matches that feed it. Byes are skipped: they
 *  were never played. */
export function MatchHistory({ bracket }: { bracket: Bracket }) {
  const decided = bracket.rounds
    .flat()
    .filter((m) => m.state === "done")
    .sort((a, b) => b.round - a.round || a.slot - b.slot);

  if (decided.length === 0) return null;

  return (
    <section aria-label="Match history" className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 font-display text-lg text-fg">Match history</h2>
      <ul className="flex flex-col gap-2">
        {decided.map((m) => {
          const winnerCrowns = crownsFor(m, m.winner);
          const loserCrowns = crownsFor(m, m.loser);
          const hasScore = winnerCrowns !== null && loserCrowns !== null;
          return (
            <li key={`${m.round}-${m.slot}`} className="text-sm text-fg-muted">
              <span aria-hidden="true">🟢</span>{" "}
              <span className="font-medium text-fg">{m.winner?.name}</span> beat{" "}
              <span>{m.loser?.name}</span>
              {hasScore ? ` ${winnerCrowns}–${loserCrowns}` : ""} · {m.roundName}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
