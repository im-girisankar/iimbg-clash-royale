"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  getCurrentTournament,
  listPlayers,
  listResults,
  createTournament,
  addPlayers,
  renameTournament,
  removePlayer,
  renamePlayer,
  saveDraw,
  setStatus,
  recordResult,
  clearResults,
  resetTournament,
} from "@/lib/db";
import { bracketSize, drawSeeds, resolveBracket, downstreamPath } from "@/lib/bracket";
import { parseRoster } from "@/lib/roster";

export type ActionState = { ok?: string; error?: string } | null;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Returns null for a blank field (used for optional crowns), NaN never
 *  leaks out — a non-numeric value is treated the same as blank. */
function int(form: FormData, key: string): number | null {
  const v = form.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/admin");
}

/** Confirms `tournamentId` is still the one tournament this app operates on,
 *  rather than trusting the client-supplied id outright (there is only ever
 *  one live tournament, but a stale form or a crafted request could name a
 *  different, no-longer-current one). Returns it, or an error. */
async function loadCurrent(tournamentId: string) {
  if (!tournamentId) return { error: "No tournament selected." } as const;
  const tournament = await getCurrentTournament();
  if (!tournament || tournament.id !== tournamentId) {
    return { error: "That tournament is no longer current — refresh the page." } as const;
  }
  return { tournament } as const;
}

export async function createTournamentAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const name = str(form, "name");
  if (!name) return { error: "Give the tournament a name." };

  await createTournament(name, admin.username);
  revalidateAll();
  return { ok: `Created "${name}".` };
}

export async function addPlayersAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  if (!tournamentId) return { error: "No tournament selected." };

  const added = await addPlayers(tournamentId, parseRoster(str(form, "names")));
  revalidateAll();
  if (added === 0) {
    return {
      error: "Nobody new was added. Those lines were blank or already on the list.",
    };
  }
  return { ok: `Added ${added} player${added === 1 ? "" : "s"}.` };
}

export async function renameTournamentAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const name = str(form, "name").trim();
  if (!tournamentId) return { error: "No tournament selected." };
  if (!name) return { error: "The tournament needs a name." };

  await renameTournament(tournamentId, name);
  revalidateAll();
  return { ok: "Renamed." };
}

export async function removePlayerAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const playerId = str(form, "playerId");
  if (!tournamentId || !playerId) return { error: "Missing player to remove." };

  await removePlayer(tournamentId, playerId);
  revalidateAll();
  return { ok: "Player removed." };
}

export async function renamePlayerAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const playerId = str(form, "playerId");
  const name = str(form, "name");
  if (!tournamentId || !playerId) return { error: "Missing player to rename." };
  if (!name) return { error: "Name can't be blank." };

  await renamePlayer(tournamentId, playerId, name);
  revalidateAll();
  return { ok: "Player renamed." };
}

export async function randomizeAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const current = await loadCurrent(tournamentId);
  if ("error" in current) return current;
  if (current.tournament.status !== "setup") {
    return { error: "The draw is locked once the tournament has started." };
  }

  const players = await listPlayers(tournamentId);
  if (players.length < 2) {
    return { error: "Add at least 2 players before randomising." };
  }

  const seeds = drawSeeds(players.map((p) => p.id));
  await saveDraw(tournamentId, seeds, bracketSize(players.length));
  revalidateAll();
  return { ok: "Draw randomised." };
}

export async function startTournamentAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const current = await loadCurrent(tournamentId);
  if ("error" in current) return current;
  if (current.tournament.status !== "setup") {
    return { error: "The tournament has already started." };
  }

  const players = await listPlayers(tournamentId);
  if (players.length < 2) {
    return { error: "Add at least 2 players before starting." };
  }
  if (players.some((p) => p.seed === null)) {
    return { error: "Randomise the draw before starting." };
  }

  await setStatus(tournamentId, "live");
  revalidateAll();
  return { ok: "Tournament is live." };
}

export async function recordResultAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const round = int(form, "round");
  const slot = int(form, "slot");
  const winnerId = str(form, "winnerId");
  const crownsA = int(form, "crownsA");
  const crownsB = int(form, "crownsB");

  if (!tournamentId || round === null || slot === null) {
    return { error: "Missing match to record." };
  }
  if (!winnerId) return { error: "Pick a winner." };
  if (crownsA !== null && (crownsA < 0 || crownsA > 3)) {
    return { error: "Crowns must be between 0 and 3." };
  }
  if (crownsB !== null && (crownsB < 0 || crownsB > 3)) {
    return { error: "Crowns must be between 0 and 3." };
  }

  const players = await listPlayers(tournamentId);
  const results = await listResults(tournamentId);
  const bracket = resolveBracket(players, results);
  const match = bracket.rounds[round - 1]?.[slot];
  if (!match) return { error: "That match doesn't exist." };
  if (match.state !== "ready" && match.state !== "done") {
    return { error: "That match isn't playable yet." };
  }
  const candidateIds = [match.a?.id, match.b?.id].filter((id): id is string => Boolean(id));
  if (!candidateIds.includes(winnerId)) {
    return { error: "The winner must be one of the two players in that match." };
  }

  await recordResult({
    tournamentId,
    round,
    slot,
    winnerId,
    crownsA,
    crownsB,
    decidedBy: admin.username,
  });

  // Re-resolve with the fresh result to see whether the final just closed.
  const newResults = await listResults(tournamentId);
  const newBracket = resolveBracket(players, newResults);
  const final = newBracket.rounds[newBracket.totalRounds - 1]?.[0];
  if (final?.state === "done") {
    await setStatus(tournamentId, "done");
  }

  revalidateAll();
  return { ok: "Result recorded." };
}

export async function undoResultAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const round = int(form, "round");
  const slot = int(form, "slot");
  if (round === null || slot === null) return { error: "Missing match to undo." };

  const current = await loadCurrent(tournamentId);
  if ("error" in current) return current;
  const { tournament } = current;

  const totalRounds = Math.log2(tournament.size || 1);
  const cells = [{ round, slot }, ...downstreamPath(round, slot, totalRounds)];
  await clearResults(tournamentId, cells);

  if (tournament.status === "done") {
    await setStatus(tournamentId, "live");
  }

  revalidateAll();
  return { ok: "Result undone." };
}

export async function resetTournamentAction(
  prev: ActionState,
  form: FormData
): Promise<ActionState> {
  await requireAdmin();

  const tournamentId = str(form, "tournamentId");
  const current = await loadCurrent(tournamentId);
  if ("error" in current) return current;

  await resetTournament(tournamentId);
  revalidateAll();
  return { ok: "Tournament reset." };
}
