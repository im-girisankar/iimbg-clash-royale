/* Shared shapes. The important line in this file is the one that isn't here:
   there is no stored "who is playing in round 3, slot 1". Participants are
   derived from seeds plus recorded winners every time the bracket is read,
   which is what makes undoing a result a one-row change instead of a
   cascade of stale advancement rows to unpick. */

export type TournamentStatus = "setup" | "live" | "done";

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  /** Bracket slot count — a power of two, 0 until the draw is made. */
  size: number;
  createdBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface Player {
  id: string;
  tournamentId: string;
  name: string;
  /** Roll number. Unique within a tournament where present, and the only
   *  reliable way to tell two students with the same name apart. */
  regNo: string | null;
  /** Clash Royale player tag, for finding someone in-game. */
  gameTag: string | null;
  /** 0-based bracket slot, null until the draw is made. */
  seed: number | null;
}

/** A recorded outcome. Rows exist only for matches that were actually played —
 *  byes are derived, never written. */
export interface MatchResult {
  tournamentId: string;
  round: number;
  slot: number;
  winnerId: string;
  crownsA: number | null;
  crownsB: number | null;
  decidedAt: string;
  decidedBy: string | null;
}

/**
 * bye     — one side is empty; the present player advances for free
 * waiting — at least one side is still to be decided upstream
 * ready   — both players known, no result yet: this can be played now
 * done    — result recorded
 */
export type MatchState = "bye" | "waiting" | "ready" | "done";

/** A fully resolved match. Built by lib/bracket.ts, never stored. */
export interface BracketMatch {
  round: number;
  slot: number;
  roundName: string;
  a: Player | null;
  b: Player | null;
  state: MatchState;
  winner: Player | null;
  loser: Player | null;
  crownsA: number | null;
  crownsB: number | null;
}

export interface Bracket {
  size: number;
  totalRounds: number;
  /** rounds[0] is round 1. */
  rounds: BracketMatch[][];
  champion: Player | null;
  /** Playable right now, earliest round first. */
  nextMatches: BracketMatch[];
  /** Ids of players who have lost. */
  eliminated: string[];
  /** Real matches decided, and how many a full tournament needs (players - 1). */
  played: number;
  total: number;
}
