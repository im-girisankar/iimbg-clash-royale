"use client";

import { useActionState } from "react";
import Image from "next/image";
import { CaretDown, Crown } from "@phosphor-icons/react";
import type { Live } from "@/lib/tournament";
import type { BracketMatch } from "@/lib/types";
import {
  undoResultAction,
  resetTournamentAction,
  type ActionState,
} from "@/app/admin/actions";
import { ResultEntry } from "./result-entry";

/**
 * The live screen, used one-handed on a phone between matches.
 *
 * Ready matches used to render as full entry forms, all of them, stacked.
 * Round one of a 16-draw has up to eight of those, which is several screens
 * of scrolling to reach the match you are actually standing in front of.
 * They are collapsed rows now: one tap opens the one you want, and only one
 * is open at a time because they share a `name`, so the working surface is
 * always a single screen.
 */
export function Console({ live }: { live: Live }) {
  const { tournament, bracket } = live;
  const ready = bracket.nextMatches;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="titled text-xl uppercase text-accent">{tournament.name}</h1>
        <p className="nums text-sm text-fg-muted">
          {bracket.played} of {bracket.total} battles decided
        </p>
      </div>

      {bracket.champion && (
        <section className="panel-gold flex flex-col items-center gap-1 p-6 text-center">
          <Image src="/cr/emote-flex.png" alt="" width={56} height={56} />
          <p className="text-xs uppercase tracking-[0.25em] text-fg-muted">Champion</p>
          <p className="titled flex items-center gap-2 text-2xl uppercase text-accent">
            <Crown size={26} weight="fill" />
            {bracket.champion.name}
          </p>
        </section>
      )}

      {ready.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="titled text-sm uppercase tracking-wide text-accent">
            Ready to play ({ready.length})
          </h2>
          {ready.map((m, i) => (
            <ReadyMatch
              key={`${m.round}-${m.slot}`}
              tournamentId={tournament.id}
              match={m}
              defaultOpen={i === 0}
            />
          ))}
        </section>
      )}

      {ready.length === 0 && !bracket.champion && (
        <p className="cell p-4 text-sm text-fg-muted">
          Nothing playable yet. Waiting on earlier results.
        </p>
      )}

      <DecidedRounds tournamentId={tournament.id} rounds={bracket.rounds} />
      <ResetPanel tournamentId={tournament.id} />
    </div>
  );
}

/** A collapsed row that opens into the entry form. The shared `name` makes
 *  the browser close whichever other one was open, so the scorer never has
 *  two half-filled forms on screen at once. */
function ReadyMatch({
  tournamentId,
  match,
  defaultOpen,
}: {
  tournamentId: string;
  match: BracketMatch;
  defaultOpen: boolean;
}) {
  return (
    <details name="ready-match" open={defaultOpen} className="panel-gold overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-bold text-fg">
          {match.a?.name} <span className="text-accent">vs</span> {match.b?.name}
        </span>
        <span className="shrink-0 text-[11px] uppercase tracking-wide text-fg-subtle">
          {match.roundName}
        </span>
        <CaretDown size={16} weight="bold" className="shrink-0 text-accent" />
      </summary>
      <div className="px-3 pb-3">
        <ResultEntry tournamentId={tournamentId} match={match} />
      </div>
    </details>
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
    .filter((round) => round.length > 0)
    .reverse();

  if (decidedRounds.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="titled text-sm uppercase tracking-wide text-accent">Already decided</h2>
      {decidedRounds.map((round) => (
        <details key={round[0].round} open={round[0].round === decidedRounds[0][0].round}>
          <summary className="cursor-pointer list-none py-1 text-xs uppercase tracking-wide text-fg-muted">
            {round[0].roundName} ({round.length})
          </summary>
          <div className="mt-1 flex flex-col gap-2">
            {round.map((m) => (
              <DecidedMatch
                key={`${m.round}-${m.slot}`}
                tournamentId={tournamentId}
                match={m}
              />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}

function DecidedMatch({
  tournamentId,
  match,
}: {
  tournamentId: string;
  match: BracketMatch;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    undoResultAction,
    null,
  );
  const score =
    match.crownsA !== null && match.crownsB !== null
      ? ` ${match.crownsA}-${match.crownsB}`
      : "";

  return (
    <div className="cell p-3">
      <p className="text-sm text-fg">
        <span className="font-bold text-win">{match.winner?.name}</span> beat{" "}
        {match.loser?.name}
        <span className="nums text-accent">{score}</span>
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-fg-subtle">Wrong? Undo it</summary>
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
              className="btn-danger h-11 px-3 text-sm"
            >
              {pending ? "Undoing…" : "Undo this result"}
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
    <details className="panel p-3">
      <summary className="cursor-pointer text-sm text-fg-subtle">Reset tournament…</summary>
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-out">
          This wipes every result and the draw. Players stay; you&rsquo;ll need to
          randomize and start again from scratch.
        </p>
        <form action={action}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <button
            type="submit"
            disabled={pending}
            className="btn-danger h-12 w-full text-sm"
          >
            {pending ? "Resetting…" : "Reset tournament"}
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
