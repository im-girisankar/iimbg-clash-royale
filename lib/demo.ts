/* Explicit .ts extension: this is a value import, and the test runner is
   bare Node, which will not resolve an extensionless one. Every other module
   here gets away with it only because its imports are type-only and erased.
   tsconfig has allowImportingTsExtensions for exactly this. */
import { resolveBracket } from "./bracket.ts";
import type { Live } from "./tournament";
import type { MatchResult, Player } from "./types";

/* A tournament in a jar, for working on the UI without a database.
 *
 * Anyone doing frontend work here should not need the service key, a
 * Supabase project, or an evening's worth of real results. Set DEMO_MODE=1
 * and every page renders this instead.
 *
 * It is deliberately mid-tournament and deliberately awkward: 13 players in
 * a 16 bracket, so there are byes; round one finished, round two half
 * played, so all four match states (bye, done, ready, waiting) are on screen
 * at once. Styling any single state in isolation is how you ship a bracket
 * where "waiting" looks broken.
 *
 * The opt-in is an explicit environment variable rather than "no database
 * configured", because the second one would silently serve fake results to a
 * hall full of people the day somebody fumbles an env var in production. */

const NAMES = [
  "Ritwik Sanyal",
  "Aparna Nair",
  "Devansh Kothari",
  "Meghna Iyer",
  "Zoya Qureshi",
  "Kabir Sethi",
  "Tanvi Deshmukh",
  "Arjun Rebello",
  "Ishaan Bhatt",
  "Naina Chaudhary",
  "Vedant Rao",
  "Simran Ahluwalia",
  "Rohan Pillai",
];

/** Fixed rather than drawn, so the demo looks the same on every reload and a
 *  screenshot means something. */
const SEEDS = [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6];

export function demoLive(): Live {
  const players: Player[] = NAMES.map((name, i) => ({
    id: `demo-${i}`,
    tournamentId: "demo",
    name,
    regNo: `MBA24-${100 + i}`,
    gameTag: i % 3 === 0 ? `9QRLP${i}UY` : null,
    seed: SEEDS[i],
  }));

  /* Winners are played out through resolveBracket rather than written down.
     Hand-listing them means hand-deriving which slots meet in which match,
     and getting that wrong produces results the resolver quietly discards as
     stale, leaving a fixture that silently shows fewer matches than intended.
     Playing it forward cannot drift. */
  const results: MatchResult[] = [];
  const PLAY = 7; // all five real first-round matches, then two of round two.

  while (results.length < PLAY) {
    const ready = resolveBracket(players, results).nextMatches;
    if (ready.length === 0) break;
    for (const match of ready) {
      if (results.length >= PLAY) break;
      // The player nearer the top of the bracket wins: arbitrary, but stable.
      const winner = match.a!;
      results.push({
        tournamentId: "demo",
        round: match.round,
        slot: match.slot,
        winnerId: winner.id,
        crownsA: 3,
        crownsB: match.slot % 3,
        decidedAt: "2026-08-29T18:00:00.000Z",
        decidedBy: "admin",
      });
    }
  }

  return {
    tournament: {
      id: "demo",
      name: "DEMO TOURNAMENT",
      status: "live",
      size: 16,
      createdBy: "admin",
      createdAt: "2026-08-29T17:00:00.000Z",
      startedAt: "2026-08-29T17:30:00.000Z",
      completedAt: null,
    },
    players,
    bracket: resolveBracket(players, results),
  };
}
