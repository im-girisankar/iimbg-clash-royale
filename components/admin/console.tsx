"use client";
import { Crown } from "@phosphor-icons/react";

import { useActionState } from "react";
import type { Live } from "@/lib/tournament";
import type { BracketMatch } from "@/lib/types";
import { undoResultAction, resetTournamentAction, type ActionState } from "@/app/admin/actions";
import { ResultEntry } from "./result-entry";

/**
 * The live screen — used one-handed on a phone between matches. Ready
 * matches are the working surface, at the top. Everything decided already
 * is below, out of the way, with undo behind a deliberate second tap.
 */
export function Console({ live }: { live: Live }) {
  const { tournament, bracket } = live;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-xl font-bold text-fg">{tournament.name}</h1>
        <p className="text-sm text-fg-muted">
          {bracket.played}/{bracket.total} matches decided
        </p>
      </div>

      {bracket.champion && (
        <section
          className="flex flex-col items-center gap-1 rounded-panel border p-6 text-center"
          style={{ borderColor: "var(--accent-line)", background: "var(--accent-soft)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Champion</p>
          <p className="flex items-center gap-2 font-display text-2xl uppercase text-accent">
            <Crown size={26} weight="fill" />
            {bracket.champion.name}
          </p>
        </section>
      )}

      {bracket.nextMatches.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold text-fg">Ready to play</h2>
          {bracket.nextMatches.map((m) => (
            <ResultEntry key={`${m.round}-${m.slot}`} tournamentId={tournament.id} match={m} />
          ))}
        </section>
      )}

      {bracket.nextMatches.length === 0 && !bracket.champion && (
        <p className="text-sm text-fg-muted">No matches ready. Waiting on earlier results.</p>
      )}

      <DecidedRounds tournamentId={tournament.id} rounds={bracket.rounds} />

      <ResetPanel tournamentId={tournament.id} />
    </div>
  );
}

function DecidedRounds({
  tournamentId,
  rounds,
}: {
  tournamentId: string;
  rounds: BracketMatch[][];
}) {
  const decidedRounds = rounds
    .map((round) => round.filter((m) => m.state === "done"))
    .filter((round) => round.length > 0);

  if (decidedRounds.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-sm font-bold text-fg">Results</h2>
      {decidedRounds.map((round) => (
        <div key={round[0].round} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {round[0].roundName}
          </h3>
          {round.map((m) => (
            <DecidedMatch key={`${m.round}-${m.slot}`} tournamentId={tournamentId} match={m} />
          ))}
        </div>
      ))}
    </section>
  );
}

function DecidedMatch({ tournamentId, match }: { tournamentId: string; match: BracketMatch }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(undoResultAction, null);
  const score =
    match.crownsA !== null && match.crownsB !== null ? ` ${match.crownsA}-${match.crownsB}` : "";

  return (
    <div className="rounded-cell border border-line bg-surface p-3">
      <p className="text-sm text-fg">
        <span className="font-semibold text-win">{match.winner?.name}</span> beat{" "}
        {match.loser?.name}
        {score}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-fg-subtle">Undo…</summary>
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-out">
            This clears this result, and anything decided later on this path.
          </p>
          <form action={action}>
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="round" value={match.round} />
            <input type="hidden" name="slot" value={match.slot} />
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-cell border px-3 text-sm font-semibold disabled:opacity-60"
              style={{ borderColor: "var(--out-line)" }}
            >
              <span className="text-out">{pending ? "Undoing…" : "Undo this result"}</span>
            </button>
          </form>
          {state?.error && (
            <p role="alert" className="text-xs text-out">
              {state.error}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

function ResetPanel({ tournamentId }: { tournamentId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resetTournamentAction,
    null,
  );

  return (
    <details className="rounded-panel border border-line bg-surface p-3">
      <summary className="cursor-pointer text-sm text-fg-subtle">Reset tournament…</summary>
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-out">
          This wipes every result and the draw. Players stay; you&rsquo;ll need to randomize and
          start again from scratch.
        </p>
        <form action={action}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-cell border text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--out-line)" }}
          >
            <span className="text-out">{pending ? "Resetting…" : "Reset tournament"}</span>
          </button>
        </form>
        {state?.error && (
          <p role="alert" className="text-xs text-out">
            {state.error}
          </p>
        )}
      </div>
    </details>
  );
}
