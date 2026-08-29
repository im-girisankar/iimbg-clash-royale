"use client";
import { Check } from "@phosphor-icons/react";

import { useActionState, useState } from "react";
import type { BracketMatch, Player } from "@/lib/types";
import { recordResultAction, type ActionState } from "@/app/admin/actions";

const CROWNS = [0, 1, 2, 3];

/**
 * One ready match. This is the screen a host taps thirty times in an
 * evening: pick a winner with a thumb, optionally tap in crowns, read the
 * outcome back before it's final, save.
 */
export function ResultEntry({
  tournamentId,
  match,
}: {
  tournamentId: string;
  match: BracketMatch;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    recordResultAction,
    null,
  );

  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [crownsA, setCrownsA] = useState<number | null>(null);
  const [crownsB, setCrownsB] = useState<number | null>(null);

  const { a, b } = match;
  if (!a || !b) return null; // a "ready" match always has both players

  const winner = winnerId === a.id ? a : winnerId === b.id ? b : null;

  let outcome = "Tap a player to record the winner.";
  if (winner) {
    const winnerCrowns = winner.id === a.id ? crownsA : crownsB;
    const loserCrowns = winner.id === a.id ? crownsB : crownsA;
    outcome =
      winnerCrowns !== null && loserCrowns !== null
        ? `${winner.name} wins ${winnerCrowns}-${loserCrowns}`
        : `${winner.name} wins`;
  }

  return (
    <div className="flex flex-col gap-3 panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {match.roundName}
      </p>

      <div className="flex flex-col gap-2">
        <PlayerButton player={a} selected={winnerId === a.id} onTap={() => setWinnerId(a.id)} />
        <CrownRow label={`${a.name} crowns`} value={crownsA} onChange={setCrownsA} />

        <PlayerButton player={b} selected={winnerId === b.id} onTap={() => setWinnerId(b.id)} />
        <CrownRow label={`${b.name} crowns`} value={crownsB} onChange={setCrownsB} />
      </div>

      <p
        role="status"
        className="rounded-cell border border-line bg-ground px-3 py-3 text-center text-sm font-semibold text-fg"
      >
        {outcome}
      </p>

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="round" value={match.round} />
        <input type="hidden" name="slot" value={match.slot} />
        {winnerId !== null && <input type="hidden" name="winnerId" value={winnerId} />}
        {crownsA !== null && <input type="hidden" name="crownsA" value={crownsA} />}
        {crownsB !== null && <input type="hidden" name="crownsB" value={crownsB} />}

        {state?.error && (
          <p role="alert" className="text-xs text-out">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !winner}
          className="h-14 rounded-cell text-base font-bold disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save result"}
        </button>
      </form>
    </div>
  );
}

/** The primary action: a thumb-sized tap that picks the winner. */
function PlayerButton({
  player,
  selected,
  onTap,
}: {
  player: Player;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={selected}
      className="min-h-20 rounded-cell border-2 px-4 text-lg font-bold text-fg transition-colors"
      style={
        selected
          ? { borderColor: "var(--win)", background: "var(--win-soft)" }
          : { borderColor: "var(--line)", background: "var(--ground)" }
      }
    >
      {selected && <Check size={18} weight="bold" className="mr-1.5 inline-block" />}
      {player.name}
    </button>
  );
}

/** Crowns run 0–3, so tapping the number directly beats a stepper. Tapping
 *  the already-selected chip clears it back to blank. */
function CrownRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {CROWNS.map((n) => {
        const on = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : n)}
            className="h-11 flex-1 rounded-cell border text-sm font-bold tabular-nums"
            style={
              on
                ? { background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)" }
                : { borderColor: "var(--line)", color: "var(--fg-muted)" }
            }
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
