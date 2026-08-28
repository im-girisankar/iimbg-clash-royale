import assert from "node:assert/strict";

/**
 * A six-matcher stand-in for vitest's `expect`.
 *
 * Vitest is not usable on this machine: it bundles through rolldown, whose
 * native binary Windows Smart App Control blocks outright ("An Application
 * Control policy has blocked this file"). node:test needs no native binary,
 * so the suite runs anywhere Node does — and this shim is the entire cost of
 * getting there. Add a matcher here rather than reaching for a test library.
 */
export function expect<T>(actual: T) {
  return {
    toBe: (want: T) => assert.strictEqual(actual, want),
    toEqual: (want: unknown) => assert.deepStrictEqual(actual, want),
    toBeNull: () => assert.strictEqual(actual, null),
    toHaveLength: (n: number) =>
      assert.strictEqual((actual as { length: number }).length, n),
    toBeLessThan: (n: number) =>
      assert.ok((actual as number) < n, `expected ${actual} < ${n}`),
    toBeGreaterThan: (n: number) =>
      assert.ok((actual as number) > n, `expected ${actual} > ${n}`),
    not: {
      toBeNull: () => assert.notStrictEqual(actual, null),
    },
  };
}
