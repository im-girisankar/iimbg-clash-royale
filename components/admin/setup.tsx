"use client";

import { useActionState, useState } from "react";
import { bracketSize } from "@/lib/bracket";
import type { Live } from "@/lib/tournament";
import type { BracketMatch, Player } from "@/lib/types";
import {
  addPlayersAction,
  removePlayerAction,
  renamePlayerAction,
  randomizeAction,
  startTournamentAction,
  type ActionState,
} from "@/app/admin/actions";

/**
 * Setup screen: bulk-paste players, tidy the list, draw, start. Setting up
 * thirty players one form at a time is a chore nobody should do, so the
 * paste box is the primary path here, not a fallback.
 */
export function Setup({ live }: { live: Live }) {
  const { tournament, players } = live;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-fg">{tournament.name}</h1>
        <p className="text-sm text-fg-muted">Setup — add players, then make the draw.</p>
      </div>

      <PasteBox tournamentId={tournament.id} />

      {players.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-sm font-bold text-fg">Players ({players.length})</h2>
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
        <span className="text-xs font-semibold text-fg-muted">Add players — one name per line</span>
        <textarea
          name="names"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Ananya\nRahul\nPriya\n…"}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong focus:border-accent-line"
        />
      </label>

      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>
          {count} name{count === 1 ? "" : "s"}
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
        className="h-12 rounded-lg text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
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
        className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-2"
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="playerId" value={player.id} />
        <div className="flex items-center gap-2">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="h-11 flex-1 rounded-md border border-line bg-ground px-3 text-sm text-fg focus:border-accent-line"
          />
          <button
            type="submit"
            disabled={renamePending}
            className="h-11 rounded-md px-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {renamePending ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRenaming(false);
              setName(player.name);
            }}
            className="h-11 rounded-md border border-line px-3 text-sm text-fg-muted"
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
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2">
        <span className="flex-1 text-sm text-fg">{player.name}</span>
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="h-11 rounded-md border border-line px-3 text-sm text-fg-muted hover:text-fg"
        >
          Rename
        </button>
        <form action={removeAction}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <input type="hidden" name="playerId" value={player.id} />
          <button
            type="submit"
            disabled={removePending}
            className="h-11 rounded-md border px-3 text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--out-line)" }}
          >
            <span className="text-out">{removePending ? "…" : "Remove"}</span>
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
    return `${present?.name ?? "?"} — bye`;
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

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-bold text-fg">Draw</h2>
      <p className="text-sm text-fg-muted">
        {n === 0
          ? "Add players to see the bracket size."
          : `${n} player${n === 1 ? "" : "s"} → ${size}-slot bracket, ${byes} bye${byes === 1 ? "" : "s"}`}
      </p>

      <form action={action}>
        <input type="hidden" name="tournamentId" value={tournament.id} />
        <button
          type="submit"
          disabled={pending || n < 2}
          className="h-12 w-full rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {pending ? "Drawing…" : hasDraw ? "🎲 Randomize again" : "🎲 Randomize"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="text-xs text-out">
          {state.error}
        </p>
      )}

      {hasDraw && bracket.rounds[0] && (
        <div className="flex flex-col gap-1 rounded-md border border-line bg-ground p-3">
          <p className="text-xs font-semibold text-fg-muted">First round — sanity check before you start</p>
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

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
      <form action={action}>
        <input type="hidden" name="tournamentId" value={live.tournament.id} />
        <button
          type="submit"
          disabled={pending || n < 2}
          className="h-14 w-full rounded-lg text-base font-bold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {pending ? "Starting…" : "🚀 Start tournament"}
        </button>
      </form>
      <p className="text-xs text-fg-muted">
        Starting locks the draw — you won&rsquo;t be able to add, remove, or reshuffle players
        afterward.
      </p>
      {state?.error && (
        <p role="alert" className="text-xs text-out">
          {state.error}
        </p>
      )}
    </section>
  );
}
