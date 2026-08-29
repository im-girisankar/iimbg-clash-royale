import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Tournament, Player, MatchResult, TournamentStatus } from "./types";

/* The only file that speaks snake_case. Every function here returns (or
   accepts) the camelCase app shapes from lib/types.ts — nothing outside
   this file should ever see a DB column name. */

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local (see supabase/schema.sql for the tables it must reach).`
    );
  }
  return value;
}

/* Built on first use, not at import time. The build imports this module in
   contexts that have no env loaded — route type generation, for one — and
   throwing there fails the entire build rather than the single query that
   actually needed a connection. */
let client: SupabaseClient | null = null;

function sb(): SupabaseClient {
  client ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY"), {
    auth: { persistSession: false },
  });
  return client;
}

/** Wraps a Supabase error with the table name so a broken query is findable at a glance. */
function fail(table: string, action: string, error: { message: string }): never {
  throw new Error(`db: ${action} on "${table}" failed — ${error.message}`);
}

/* The row shapes as Postgres returns them. Declared rather than inferred
   because there are no generated Supabase types in this project — these six
   fields are the contract with schema.sql. */
interface TournamentRow {
  id: string;
  name: string;
  status: TournamentStatus;
  size: number;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface PlayerRow {
  id: string;
  tournament_id: string;
  name: string;
  reg_no: string | null;
  game_tag: string | null;
  seed: number | null;
}

interface ResultRow {
  tournament_id: string;
  round: number;
  slot: number;
  winner_id: string;
  crowns_a: number | null;
  crowns_b: number | null;
  decided_at: string;
  decided_by: string | null;
}

function toTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    size: row.size,
    createdBy: row.created_by,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    regNo: row.reg_no,
    gameTag: row.game_tag,
    seed: row.seed,
  };
}

function toResult(row: ResultRow): MatchResult {
  return {
    tournamentId: row.tournament_id,
    round: row.round,
    slot: row.slot,
    winnerId: row.winner_id,
    crownsA: row.crowns_a,
    crownsB: row.crowns_b,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
  };
}

export async function isAdmin(email: string): Promise<boolean> {
  const { data, error } = await sb()
    .from("admins")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) fail("admins", "select", error);
  return data !== null;
}

export async function getCurrentTournament(): Promise<Tournament | null> {
  const { data, error } = await sb()
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("tournaments", "select", error);
  return data ? toTournament(data) : null;
}

export async function listPlayers(tournamentId: string): Promise<Player[]> {
  const { data, error } = await sb()
    .from("players")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) fail("players", "select", error);
  return (data ?? []).map(toPlayer);
}

export async function listResults(tournamentId: string): Promise<MatchResult[]> {
  const { data, error } = await sb()
    .from("results")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (error) fail("results", "select", error);
  return (data ?? []).map(toResult);
}

export async function createTournament(name: string, createdBy: string): Promise<string> {
  const { data, error } = await sb()
    .from("tournaments")
    .insert({ name, created_by: createdBy })
    .select("id")
    .single();
  if (error) fail("tournaments", "insert", error);
  return data.id;
}

export interface NewPlayer {
  name: string;
  regNo: string | null;
  gameTag: string | null;
}

export async function addPlayers(
  tournamentId: string,
  people: NewPlayer[]
): Promise<number> {
  // Dedupe within the paste itself by roll number where there is one, by name
  // otherwise. Two different students genuinely can share a name, so the roll
  // number has to win when it is present.
  const seen = new Set<string>();
  const rows: {
    tournament_id: string;
    name: string;
    reg_no: string | null;
    game_tag: string | null;
  }[] = [];
  for (const raw of people) {
    const name = raw.name.trim();
    if (!name) continue;
    const key = raw.regNo ? `r:${raw.regNo.toLowerCase()}` : `n:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      tournament_id: tournamentId,
      name,
      reg_no: raw.regNo?.trim() || null,
      game_tag: raw.gameTag?.trim() || null,
    });
  }
  if (rows.length === 0) return 0;

  // Names already present in this tournament are skipped, not errors: fetch
  // existing names first and filter, rather than relying on upsert (which
  // would need an onConflict target and could still race on partial dupes).
  const { data: existing, error: existingError } = await sb()
    .from("players")
    .select("name, reg_no")
    .eq("tournament_id", tournamentId);
  if (existingError) fail("players", "select", existingError);
  const takenNames = new Set(
    (existing ?? []).map((r: { name: string }) => r.name.toLowerCase()),
  );
  const takenRegs = new Set(
    (existing ?? [])
      .map((r: { reg_no: string | null }) => r.reg_no?.toLowerCase())
      .filter(Boolean),
  );

  const toInsert = rows.filter((r) =>
    r.reg_no
      ? !takenRegs.has(r.reg_no.toLowerCase())
      : !takenNames.has(r.name.toLowerCase()),
  );
  if (toInsert.length === 0) return 0;

  const { error } = await sb().from("players").insert(toInsert);
  if (error) fail("players", "insert", error);
  return toInsert.length;
}

export async function removePlayer(tournamentId: string, playerId: string): Promise<void> {
  const { error } = await sb()
    .from("players")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("id", playerId);
  if (error) fail("players", "delete", error);
}

export async function renameTournament(
  tournamentId: string,
  name: string
): Promise<void> {
  const { error } = await sb()
    .from("tournaments")
    .update({ name })
    .eq("id", tournamentId);
  if (error) fail("tournaments", "update (name)", error);
}

export async function renamePlayer(
  tournamentId: string,
  playerId: string,
  name: string
): Promise<void> {
  const { error } = await sb()
    .from("players")
    .update({ name })
    .eq("tournament_id", tournamentId)
    .eq("id", playerId);
  if (error) fail("players", "update", error);
}

export async function saveDraw(
  tournamentId: string,
  seeds: Record<string, number>,
  size: number
): Promise<void> {
  // Seeds must be cleared to null in one statement first: the DB has a
  // unique (tournament_id, seed) constraint, so writing new seeds row by
  // row could collide with a slot another row still holds.
  const { error: clearError } = await sb()
    .from("players")
    .update({ seed: null })
    .eq("tournament_id", tournamentId);
  if (clearError) fail("players", "update (clear seeds)", clearError);

  // Concurrent is safe here and much faster than 64 sequential round-trips:
  // every seed was just nulled and each new one is distinct, so no two of
  // these updates can contend for the same slot.
  const assigned = await Promise.all(
    Object.entries(seeds).map(([playerId, seed]) =>
      sb()
        .from("players")
        .update({ seed })
        .eq("tournament_id", tournamentId)
        .eq("id", playerId),
    ),
  );
  for (const { error } of assigned) {
    if (error) fail("players", "update (assign seed)", error);
  }

  const { error: sizeError } = await sb()
    .from("tournaments")
    .update({ size })
    .eq("id", tournamentId);
  if (sizeError) fail("tournaments", "update (size)", sizeError);
}

export async function setStatus(
  tournamentId: string,
  status: TournamentStatus
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "live") patch.started_at = new Date().toISOString();
  if (status === "done") patch.completed_at = new Date().toISOString();
  const { error } = await sb().from("tournaments").update(patch).eq("id", tournamentId);
  if (error) fail("tournaments", "update (status)", error);
}

export async function recordResult(r: {
  tournamentId: string;
  round: number;
  slot: number;
  winnerId: string;
  crownsA: number | null;
  crownsB: number | null;
  decidedBy: string;
}): Promise<void> {
  const { error } = await sb().from("results").upsert(
    {
      tournament_id: r.tournamentId,
      round: r.round,
      slot: r.slot,
      winner_id: r.winnerId,
      crowns_a: r.crownsA,
      crowns_b: r.crownsB,
      decided_by: r.decidedBy,
      decided_at: new Date().toISOString(),
    },
    { onConflict: "tournament_id,round,slot" }
  );
  if (error) fail("results", "upsert", error);
}

export async function clearResults(
  tournamentId: string,
  cells: { round: number; slot: number }[]
): Promise<void> {
  if (cells.length === 0) return;
  for (const cell of cells) {
    const { error } = await sb()
      .from("results")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("round", cell.round)
      .eq("slot", cell.slot);
    if (error) fail("results", "delete", error);
  }
}

export async function resetTournament(tournamentId: string): Promise<void> {
  const { error: resultsError } = await sb()
    .from("results")
    .delete()
    .eq("tournament_id", tournamentId);
  if (resultsError) fail("results", "delete (reset)", resultsError);

  const { error: playersError } = await sb()
    .from("players")
    .update({ seed: null })
    .eq("tournament_id", tournamentId);
  if (playersError) fail("players", "update (reset seeds)", playersError);

  const { error: tournamentError } = await sb()
    .from("tournaments")
    .update({ size: 0, status: "setup" })
    .eq("id", tournamentId);
  if (tournamentError) fail("tournaments", "update (reset)", tournamentError);
}
