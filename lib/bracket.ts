/* Pure bracket math. No DB, no React — every shape here is computed fresh
   from players + results each time, per the "nothing derived is stored"
   rule in CONTRACT.md. */

import type { Player, MatchResult, MatchState, BracketMatch, Bracket } from "./types";

/** Next power of two >= playerCount, minimum 2. */
export function bracketSize(playerCount: number): number {
  let size = 2;
  while (size < playerCount) size *= 2;
  return size;
}

/**
 * Standard single-elimination seeding order: element i is the 1-based seed
 * number belonging in slot i. Built recursively — order(1) = [1]; going
 * from size n to 2n, each seed s is replaced by the pair [s, 2n+1-s]. This
 * is what spreads byes evenly across the bracket instead of stacking them
 * in one half.
 */
export function seedOrder(size: number): number[] {
  let order = [1];
  let n = 1;
  while (n < size) {
    const next: number[] = [];
    const n2 = n * 2;
    order.forEach((s, i) => {
      const partner = n2 + 1 - s;
      // Alternate which half of the pair comes first so that doubling
      // spreads new byes/opponents evenly instead of stacking them in
      // one half of the bracket. Without the alternation this collapses
      // to seedOrder(4) = [1,4,2,3], not the standard [1,4,3,2].
      if (i % 2 === 0) {
        next.push(s, partner);
      } else {
        next.push(partner, s);
      }
    });
    order = next;
    n = n2;
  }
  return order;
}

/**
 * Fisher-Yates shuffle of playerIds using rng, assign seed numbers 1..N in
 * shuffled order, then map each player to the slot index where seedOrder
 * holds their seed number. Seed numbers beyond N are never assigned a slot
 * — those slots are the byes.
 */
export function drawSeeds(
  playerIds: string[],
  rng: () => number = Math.random
): Record<string, number> {
  const shuffled = playerIds.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const size = bracketSize(shuffled.length);
  const order = seedOrder(size);
  // seedNumber -> slotIndex
  const slotForSeed = new Map<number, number>();
  for (let slot = 0; slot < order.length; slot++) {
    slotForSeed.set(order[slot], slot);
  }

  const result: Record<string, number> = {};
  shuffled.forEach((playerId, i) => {
    const seedNumber = i + 1;
    const slot = slotForSeed.get(seedNumber);
    if (slot !== undefined) {
      result[playerId] = slot;
    }
  });
  return result;
}

/** Counts back from the final: Final, Semi-final, Quarter-final, then
 *  Round of 16 / 32 / 64 for earlier rounds. */
export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-final";
  if (fromEnd === 2) return "Quarter-final";
  const playersInRound = Math.pow(2, fromEnd + 1);
  return `Round of ${playersInRound}`;
}

/** The chain of later matches fed by (round, slot): (round+1, floor(slot/2)),
 *  then onward up to and including totalRounds. Excludes the starting match. */
export function downstreamPath(
  round: number,
  slot: number,
  totalRounds: number
): { round: number; slot: number }[] {
  const path: { round: number; slot: number }[] = [];
  let r = round;
  let s = slot;
  while (r < totalRounds) {
    r += 1;
    s = Math.floor(s / 2);
    path.push({ round: r, slot: s });
  }
  return path;
}

const EMPTY_BRACKET: Bracket = {
  size: 0,
  totalRounds: 0,
  rounds: [],
  champion: null,
  nextMatches: [],
  eliminated: [],
  played: 0,
  total: 0,
};

/**
 * Resolves the full bracket from players + recorded results. Nothing here
 * is stored: every later round's participants are derived by walking
 * winners forward from round 1.
 */
export function resolveBracket(players: Player[], results: MatchResult[]): Bracket {
  const seeded = players.filter((p) => p.seed !== null);
  if (seeded.length === 0) {
    return EMPTY_BRACKET;
  }

  const size = bracketSize(seeded.length);
  const totalRounds = Math.log2(size);

  const slots: (Player | null)[] = new Array(size).fill(null);
  for (const p of seeded) {
    slots[p.seed as number] = p;
  }

  // Index recorded results by "round,slot" for quick lookup.
  const resultByCell = new Map<string, MatchResult>();
  for (const r of results) {
    resultByCell.set(`${r.round},${r.slot}`, r);
  }

  const rounds: BracketMatch[][] = [];
  // Parallel to `rounds`: whether each match's outcome is permanently
  // fixed (done, bye, or a permanently-empty slot) vs still pending a
  // real decision somewhere upstream. Not part of the public Bracket
  // shape — used only to tell "opponent not decided yet" apart from
  // "opponent's slot will always be empty" when building later rounds.
  const settledGrid: boolean[][] = [];
  const eliminated: string[] = [];
  let played = 0;

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = size / Math.pow(2, round);
    const roundMatches: BracketMatch[] = [];
    const settledRow: boolean[] = [];

    for (let slot = 0; slot < matchesInRound; slot++) {
      let a: Player | null;
      let b: Player | null;
      let aSettled: boolean;
      let bSettled: boolean;

      if (round === 1) {
        // Leaf level: a slot's occupant (or permanent absence) is known
        // outright, with no upstream match to wait on.
        a = slots[2 * slot];
        b = slots[2 * slot + 1];
        aSettled = true;
        bSettled = true;
      } else {
        const prevRound = rounds[round - 2]; // rounds is 0-indexed, holds round-1 already
        const prevSettled = settledGrid[round - 2];
        a = prevRound[2 * slot].winner;
        aSettled = prevSettled[2 * slot];
        b = prevRound[2 * slot + 1].winner;
        bSettled = prevSettled[2 * slot + 1];
      }

      let state: MatchState;
      let winner: Player | null = null;
      let loser: Player | null = null;
      let crownsA: number | null = null;
      let crownsB: number | null = null;
      let matchSettled: boolean;

      if (!aSettled || !bSettled) {
        // One feeder match is a real match that hasn't been decided yet.
        // Even though the OTHER side might already be known (e.g. it
        // arrived via a bye), this match cannot be a "bye" — that side
        // isn't permanently empty, it's just undecided. Keep waiting.
        state = "waiting";
        matchSettled = false;
      } else if (a === null && b === null) {
        // Both feeder subtrees are permanently empty — this slot can
        // never be filled.
        state = "waiting";
        matchSettled = true;
      } else if (a === null || b === null) {
        state = "bye";
        winner = a ?? b;
        matchSettled = true;
      } else {
        const recorded = resultByCell.get(`${round},${slot}`);
        if (recorded && (recorded.winnerId === a.id || recorded.winnerId === b.id)) {
          state = "done";
          winner = recorded.winnerId === a.id ? a : b;
          loser = winner === a ? b : a;
          crownsA = recorded.crownsA;
          crownsB = recorded.crownsB;
          played += 1;
          eliminated.push(loser.id);
          matchSettled = true;
        } else {
          // Either no result yet, or a stale result left over from an
          // undone upstream result — ignore it and treat as still playable.
          state = "ready";
          matchSettled = false;
        }
      }

      roundMatches.push({
        round,
        slot,
        roundName: roundName(round, totalRounds),
        a,
        b,
        state,
        winner,
        loser,
        crownsA,
        crownsB,
      });
      settledRow.push(matchSettled);
    }

    rounds.push(roundMatches);
    settledGrid.push(settledRow);
  }

  const finalMatch = rounds[totalRounds - 1][0];
  const champion =
    finalMatch.state === "done" || finalMatch.state === "bye" ? finalMatch.winner : null;

  const nextMatches: BracketMatch[] = [];
  for (const roundMatches of rounds) {
    for (const m of roundMatches) {
      if (m.state === "ready") nextMatches.push(m);
    }
  }

  return {
    size,
    totalRounds,
    rounds,
    champion,
    nextMatches,
    eliminated,
    played,
    total: seeded.length - 1,
  };
}
