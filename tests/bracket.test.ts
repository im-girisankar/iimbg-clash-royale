import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import {
  bracketSize,
  seedOrder,
  drawSeeds,
  roundName,
  resolveBracket,
  downstreamPath,
} from "../lib/bracket.ts";
import type { Player, MatchResult } from "../lib/types";

/** Tiny deterministic PRNG so draws are reproducible across runs. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An rng that produces j === i at every Fisher-Yates step (never swaps),
 * so drawSeeds assigns seed 1..N to playerIds in their original order.
 * rng()=0 does NOT do this — it swaps every element into slot 0 — so tests
 * that need a known, predictable seed assignment use this instead.
 */
const identityRng = () => 0.999999999;

function makePlayers(n: number, seeds: Record<string, number>): Player[] {
  return Array.from({ length: n }, (_, i) => {
    const id = `p${i}`;
    return {
      id,
      tournamentId: "t1",
      name: `Player ${i}`,
      seed: id in seeds ? seeds[id] : null,
    };
  });
}

describe("bracketSize", () => {
  it("returns the next power of two, minimum 2", () => {
    expect(bracketSize(1)).toBe(2);
    expect(bracketSize(2)).toBe(2);
    expect(bracketSize(3)).toBe(4);
    expect(bracketSize(5)).toBe(8);
    expect(bracketSize(8)).toBe(8);
    expect(bracketSize(9)).toBe(16);
    expect(bracketSize(37)).toBe(64);
    expect(bracketSize(64)).toBe(64);
  });
});

describe("seedOrder", () => {
  it("matches the standard bracket seeding literals exactly", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 3, 2]);
    expect(seedOrder(8)).toEqual([1, 8, 5, 4, 3, 6, 7, 2]);
    // The published 16-seed order. This is the assertion that actually pins
    // the alternation down: a naive expansion still gets 2/4/8 right in some
    // formulations but diverges here.
    expect(seedOrder(16)).toEqual([
      1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2,
    ]);
  });

  it("spreads byes across both halves rather than bunching them", () => {
    // 10 players in a 16 bracket leaves 6 byes. If they all landed in one
    // half, half the field would walk to the quarter-finals unopposed.
    const order = seedOrder(16);
    const byeSlots = order
      .map((seed, slot) => (seed > 10 ? slot : -1))
      .filter((slot) => slot >= 0);
    const topHalf = byeSlots.filter((slot) => slot < 8).length;
    expect(byeSlots).toHaveLength(6);
    expect(topHalf).toBe(3);
  });
});

describe("roundName", () => {
  it("counts back from the final", () => {
    // totalRounds = 3 (8-player bracket): rounds 1,2,3 = QF, SF, Final
    expect(roundName(3, 3)).toBe("Final");
    expect(roundName(2, 3)).toBe("Semi-final");
    expect(roundName(1, 3)).toBe("Quarter-final");

    // totalRounds = 5 (32-player bracket)
    expect(roundName(5, 5)).toBe("Final");
    expect(roundName(4, 5)).toBe("Semi-final");
    expect(roundName(3, 5)).toBe("Quarter-final");
    expect(roundName(2, 5)).toBe("Round of 16");
    expect(roundName(1, 5)).toBe("Round of 32");

    // totalRounds = 6 (64-player bracket)
    expect(roundName(1, 6)).toBe("Round of 64");
  });
});

describe("drawSeeds worked example (5 players)", () => {
  it("produces the exact slot mapping described in the spec", () => {
    // seedOrder(8) = [1,8,5,4,3,6,7,2]
    // A shuffle that assigns seed numbers 1..5 to p0..p4 in order (identity
    // shuffle) exercises the mapping directly.
    const rng = identityRng;
    const ids = ["p0", "p1", "p2", "p3", "p4"];
    const seeds = drawSeeds(ids, rng);

    // seed1->slot0, seed2->slot7, seed3->slot4, seed4->slot3, seed5->slot2
    expect(seeds["p0"]).toBe(0); // seed 1
    expect(seeds["p1"]).toBe(7); // seed 2
    expect(seeds["p2"]).toBe(4); // seed 3
    expect(seeds["p3"]).toBe(3); // seed 4
    expect(seeds["p4"]).toBe(2); // seed 5
  });
});

describe("byes: 5 players", () => {
  it("round 1 has exactly 3 byes and 1 ready match", () => {
    const rng = identityRng;
    const ids = ["p0", "p1", "p2", "p3", "p4"];
    const seeds = drawSeeds(ids, rng);
    const players = makePlayers(5, seeds);

    const bracket = resolveBracket(players, []);
    expect(bracket.size).toBe(8);

    const round1 = bracket.rounds[0];
    const byes = round1.filter((m) => m.state === "bye");
    const ready = round1.filter((m) => m.state === "ready");
    expect(byes.length).toBe(3);
    expect(ready.length).toBe(1);

    // The ready match is seed5 (p4, slot2) vs seed4 (p3, slot3)
    const readyMatch = ready[0];
    const ids2 = [readyMatch.a?.id, readyMatch.b?.id].sort();
    expect(ids2).toEqual(["p3", "p4"]);
  });
});

describe("empty bracket", () => {
  it("returns the empty bracket shape when there are no seeded players", () => {
    const players = makePlayers(3, {}); // none seeded
    const bracket = resolveBracket(players, []);
    expect(bracket).toEqual({
      size: 0,
      totalRounds: 0,
      rounds: [],
      champion: null,
      nextMatches: [],
      eliminated: [],
      played: 0,
      total: 0,
    });
  });
});

describe("undo", () => {
  it("removing a recorded result resets downstream to waiting and clears the champion", () => {
    // 2 players -> size 2, 1 round, the final IS round 1.
    const rng = identityRng;
    const ids = ["p0", "p1"];
    const seeds = drawSeeds(ids, rng);
    const players = makePlayers(2, seeds);

    const result: MatchResult = {
      tournamentId: "t1",
      round: 1,
      slot: 0,
      winnerId: "p0",
      crownsA: 3,
      crownsB: 1,
      decidedAt: new Date().toISOString(),
      decidedBy: "admin@example.com",
    };

    const withResult = resolveBracket(players, [result]);
    expect(withResult.champion?.id).toBe("p0");
    expect(withResult.rounds[0][0].state).toBe("done");

    const withoutResult = resolveBracket(players, []);
    expect(withoutResult.champion).toBeNull();
    expect(withoutResult.rounds[0][0].state).toBe("ready");
  });

  it("undoing a round-1 result resets the downstream round-2 match to waiting", () => {
    // 4 players, size 4, totalRounds 2. Use identity shuffle.
    const rng = identityRng;
    const ids = ["p0", "p1", "p2", "p3"];
    const seeds = drawSeeds(ids, rng);
    const players = makePlayers(4, seeds);

    const r1m0: MatchResult = {
      tournamentId: "t1",
      round: 1,
      slot: 0,
      winnerId: players.find((p) => p.seed === 0)!.id,
      crownsA: 2,
      crownsB: 0,
      decidedAt: new Date().toISOString(),
      decidedBy: "a",
    };

    const withResult = resolveBracket(players, [r1m0]);
    // Round 2 slot 0 depends on round1 slot0 and slot1 winners.
    expect(withResult.rounds[1][0].a).not.toBeNull();

    const withoutResult = resolveBracket(players, []);
    expect(withoutResult.rounds[1][0].state).toBe("waiting");
    expect(withoutResult.rounds[1][0].a).toBeNull();
    expect(withoutResult.champion).toBeNull();
  });
});

describe("stale result", () => {
  it("ignores a recorded result whose winnerId matches neither current side", () => {
    const rng = identityRng;
    const ids = ["p0", "p1"];
    const seeds = drawSeeds(ids, rng);
    const players = makePlayers(2, seeds);

    const stale: MatchResult = {
      tournamentId: "t1",
      round: 1,
      slot: 0,
      winnerId: "someone-else-entirely",
      crownsA: 3,
      crownsB: 0,
      decidedAt: new Date().toISOString(),
      decidedBy: "a",
    };

    const bracket = resolveBracket(players, [stale]);
    expect(bracket.rounds[0][0].state).toBe("ready");
    expect(bracket.rounds[0][0].winner).toBeNull();
    expect(bracket.champion).toBeNull();
  });
});

describe("downstreamPath", () => {
  it("walks forward to the final, excluding the starting match", () => {
    // totalRounds = 3 (8-player bracket)
    expect(downstreamPath(1, 0, 3)).toEqual([
      { round: 2, slot: 0 },
      { round: 3, slot: 0 },
    ]);
    expect(downstreamPath(1, 5, 3)).toEqual([
      { round: 2, slot: 2 },
      { round: 3, slot: 1 },
    ]);
    expect(downstreamPath(2, 1, 3)).toEqual([{ round: 3, slot: 0 }]);
    // Final itself has no downstream matches.
    expect(downstreamPath(3, 0, 3)).toEqual([]);
    // Round >= totalRounds always returns [].
    expect(downstreamPath(4, 0, 3)).toEqual([]);
  });
});

describe("full tournament simulation across player counts", () => {
  const counts = [2, 3, 5, 7, 8, 10, 13, 16, 20, 31, 32, 37, 63, 64];

  for (const n of counts) {
    it(`resolves correctly for ${n} players`, () => {
      const rng = mulberry32(1000 + n);
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const seeds = drawSeeds(ids, rng);
      const players = makePlayers(n, seeds);

      const results: MatchResult[] = [];
      let matchesPlayed = 0;
      const maxIterations = n * 10 + 100; // generous safety valve against infinite loops

      let bracket = resolveBracket(players, results);
      let iterations = 0;

      while (bracket.champion === null) {
        iterations += 1;
        expect(iterations).toBeLessThan(maxIterations); // terminates

        expect(bracket.nextMatches.length).toBeGreaterThan(0);
        const match = bracket.nextMatches[0];
        expect(match.a).not.toBeNull();
        expect(match.b).not.toBeNull();

        results.push({
          tournamentId: "t1",
          round: match.round,
          slot: match.slot,
          winnerId: match.a!.id, // always pick side a
          crownsA: 3,
          crownsB: 1,
          decidedAt: new Date().toISOString(),
          decidedBy: "test",
        });
        matchesPlayed += 1;

        bracket = resolveBracket(players, results);

        // No player appears twice in the same round, for every round.
        for (const roundMatches of bracket.rounds) {
          const seen = new Set<string>();
          for (const m of roundMatches) {
            for (const p of [m.a, m.b]) {
              if (p === null) continue;
              expect(seen.has(p.id)).toBe(false);
              seen.add(p.id);
            }
          }
        }
      }

      expect(matchesPlayed).toBe(n - 1);
      expect(bracket.total).toBe(n - 1);
      expect(bracket.played).toBe(n - 1);
      expect(bracket.eliminated.length).toBe(n - 1);
      expect(bracket.eliminated.includes(bracket.champion!.id)).toBe(false);
    });
  }
});
