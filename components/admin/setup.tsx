"use client";
import { Flag, Shuffle } from "@phosphor-icons/react";

import { useActionState, useState } from "react";
import { bracketSize } from "@/lib/bracket";
import type { Live } from "@/lib/tournament";
import type { BracketMatch, Player } from "@/lib/types";
import {
  addPlayersAction,
  removePlayerAction,
  renamePlayerAction,
  renameTournamentAction,
  randomizeAction,
  startTournamentAction,
  type ActionState,
} from "@/app/admin/actions";

/**
 * Setup screen: bulk-paste players, tidy the list, draw, start. Setting up
 * thirty players one form at a time is a chore nobody should do, so the
 * paste box is the primary path here, not a fallback.
 */
/** The name goes on the projector in very large letters, so it is worth
 *  being able to fix a typo without deleting the tournament. Editable only
 *  during setup: once the draw is locked, the name is on people's phones. */
function TournamentName({ tournament }: { tournament: Live["tournament"] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    renameTournamentAction,
    null,
  );
  const [editing, setEditing] = useState(false);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state?.ok) setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="titled truncate text-xl uppercase text-accent">
            {tournament.name}
          </h1>
          <p className="text-sm text-fg-muted">Add players, then make the draw.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn-plain h-11 shrink-0 px-3 text-sm text-fg-muted"
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="tournamentId" value={tournament.id} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">Tournament name</span>
        <input
          name="name"
          defaultValue={tournament.name}
          autoFocus
          required
          className="cell h-12 px-3 text-sm text-fg focus:border-accent-line"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold h-11 flex-1 text-sm">
          {pending ? "Saving…" : "Save name"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn-plain h-11 px-4 text-sm text-fg-muted"
        >
          Cancel
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-xs text-out">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function Setup({ live }: { live: Live }) {
  const { tournament, players } = live;

  return (
    <div className="flex flex-col gap-6">
      <TournamentName tournament={tournament} />

      <PasteBox tournamentId={tournament.id} />

      {players.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="titled text-sm uppercase tracking-wide text-accent">Players ({players.length})</h2>
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <PlayerRow key={p.id} tournamentId={tournament.id} player={p} />
            ))}
          </div>
        </section>
      )}

      <DrawPanel live={live} />
      <StartPanel live={live} />
    </div>
  );
}

function PasteBox({ tournamentId }: { tournamentId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addPlayersAction, null);
  const [text, setText] = useState("");

  // Clear the box after a successful add, without an effect: adjust state
  // during render by noticing the action's result object changed identity
  // (React's documented pattern for "reset state when an input changes").
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state?.ok) setText("");
  }

  const count = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean).length;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">
          Add players, one per line
        </span>
        <span className="text-[11px] leading-snug text-fg-subtle">
          Name on its own is fine. Add a roll number and a Clash Royale tag after
          commas if you have them, and a column pasted straight out of the
          registration sheet works as is.
        </span>
        <textarea
          name="names"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={
            "Rohan Pillai\nAparna Nair, MBA24-118\nKabir Sethi, MBA24-203, #9QRLPUYC"
          }
          className="cell px-3 py-2 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong focus:border-accent-line"
        />
      </label>

      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>
          {count} player{count === 1 ? "" : "s"}
        </span>
        {state?.ok && <span className="text-win">{state.ok}</span>}
      </div>

      {state?.error && (
        <p role="alert" className="text-xs text-out">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || count === 0}
        className="btn-gold h-12 w-full text-sm disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add players"}
      </button>
    </form>
  );
}

function PlayerRow({ tournamentId, player }: { tournamentId: string; player: Player }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(player.name);
  const [renameState, renameAction, renamePending] = useActionState<ActionState, FormData>(
    renamePlayerAction,
    null,
  );
  const [removeState, removeAction, removePending] = useActionState<ActionState, FormData>(
    removePlayerAction,
    null,
  );

  // Close the rename form on success — same render-time adjustment as
  // PasteBox above, instead of an effect.
  const [lastRenameState, setLastRenameState] = useState(renameState);
  if (renameState !== lastRenameState) {
    setLastRenameState(renameState);
    if (renameState?.ok) setRenaming(false);
  }

  if (renaming) {
    return (
      <form
        action={renameAction}
        className="flex flex-col gap-2 cell p-2"
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="playerId" value={player.id} />
        <div className="flex items-center gap-2">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="h-11 flex-1 rounded-cell border border-line bg-ground px-3 text-sm text-fg focus:border-accent-line"
          />
          <button
            type="submit"
            disabled={renamePending}
            className="btn-gold h-11 shrink-0 px-3 text-sm disabled:opacity-60"
          >
            {renamePending ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRenaming(false);
              setName(player.name);
            }}
            className="h-11 rounded-cell border border-line px-3 text-sm text-fg-muted"
          >
            Cancel
          </button>
        </div>
        {renameState?.error && (
          <p role="alert" className="text-xs text-out">
            {renameState.error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 cell p-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-fg">{player.name}</span>
          {(player.regNo || player.gameTag) && (
            <span className="block truncate text-[11px] text-fg-subtle">
              {[player.regNo, player.gameTag && `#${player.gameTag}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="btn-plain h-11 shrink-0 px-3 text-sm text-fg-muted"
        >
          Rename
        </button>
        <form action={removeAction}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <input type="hidden" name="playerId" value={player.id} />
          <button
            type="submit"
            disabled={removePending}
            className="btn-danger h-11 shrink-0 px-3 text-sm"
          >
            {removePending ? "…" : "Remove"}
          </button>
        </form>
      </div>
      {removeState?.error && (
        <p role="alert" className="text-xs text-out">
          {removeState.error}
        </p>
      )}
    </div>
  );
}

function pairText(m: BracketMatch): string {
  if (m.state === "bye") {
    const present = m.a ?? m.b;
    return `${present?.name ?? "?"} gets a bye`;
  }
  return `${m.a?.name ?? "?"} vs ${m.b?.name ?? "?"}`;
}

function DrawPanel({ live }: { live: Live }) {
  const { tournament, players, bracket } = live;
  const [state, action, pending] = useActionState<ActionState, FormData>(randomizeAction, null);

  const n = players.length;
  const size = n > 0 ? bracketSize(n) : 0;
  const byes = n > 0 ? size - n : 0;
  const hasDraw = tournament.size > 0;
  const blocked =
    n === 0
      ? "Add players above first."
      : n === 1
        ? "One player is not a tournament. Add at least one more."
        : null;

  return (
    <section className="flex flex-col gap-3 panel p-4">
      <h2 className="titled text-sm uppercase tracking-wide text-accent">Draw</h2>
      <p className="text-sm text-fg-muted">
        {n === 0
          ? "Add players to see the bracket size."
          : `${n} player${n === 1 ? "" : "s"} → ${size}-slot bracket, ${byes} bye${byes === 1 ? "" : "s"}`}
      </p>

      <form action={action}>
        <input type="hidden" name="tournamentId" value={tournament.id} />
        <button
          type="submit"
          disabled={pending || blocked !== null}
          className="btn-gold h-12 w-full text-sm disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            <Shuffle size={18} weight="bold" />
            {pending ? "Drawing…" : hasDraw ? "Randomize again" : "Randomize"}
          </span>
        </button>
      </form>
      {/* A dimmed button that does not say why reads as broken, and the
          person tapping it is mid-event with no way to tell the difference.
          Say what is missing. */}
      {blocked && <p className="text-xs text-fg-subtle">{blocked}</p>}
      {state?.error && (
        <p role="alert" className="text-xs text-out">
          {state.error}
        </p>
      )}

      {hasDraw && bracket.rounds[0] && (
        <div className="flex flex-col gap-1 rounded-cell border border-line bg-ground p-3">
          <p className="text-xs font-semibold text-fg-muted">First round, sanity check before you start</p>
          {bracket.rounds[0].map((m) => (
            <p key={m.slot} className="text-sm text-fg">
              {pairText(m)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function StartPanel({ live }: { live: Live }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    startTournamentAction,
    null,
  );
  const n = live.players.length;
  const hasDraw =
    live.tournament.size > 0 && live.players.every((p) => p.seed !== null);

  /* The action rejects a start with no draw anyway, but finding that out by
     tapping and reading an error is worse than being told beforehand. */
  const blocked =
    n < 2 ? "Add at least two players first." : !hasDraw ? "Randomize the draw first." : null;

  return (
    <section className="flex flex-col gap-2 panel p-4">
      <form action={action}>
        <input type="hidden" name="tournamentId" value={live.tournament.id} />
        <button
          type="submit"
          disabled={pending || blocked !== null}
          className="btn-gold h-14 w-full text-base disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            <Flag size={20} weight="fill" />
            {pending ? "Starting…" : "Start tournament"}
          </span>
        </button>
      </form>
      <p className="text-xs text-fg-muted">
        {blocked ?? "Starting locks the draw. You won’t be able to add, remove, or reshuffle players afterward."}
      </p>
      {state?.error && (
        <p role="alert" className="text-xs text-out">
          {state.error}
        </p>
      )}
    </section>
  );
}
