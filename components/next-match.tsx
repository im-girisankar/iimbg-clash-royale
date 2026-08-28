import type { Bracket } from "@/lib/types";

/* What the host reads out to the hall. The first ready match gets the big
   treatment; any other matches that are also playable right now are listed
   underneath, since they can be played in any order. */
export function NextMatch({ bracket }: { bracket: Bracket }) {
  const [first, ...rest] = bracket.nextMatches;
  if (!first) return null;

  return (
    <section
      aria-label="Next match"
      className="rounded-xl border border-accent-line bg-accent-soft px-4 py-4 md:px-6 md:py-5"
    >
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-accent">
        <span aria-hidden="true">🔥</span> Next match
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="font-display text-xl text-fg md:text-2xl">{first.a?.name}</span>
        <span className="text-sm font-semibold text-fg-muted">VS</span>
        <span className="font-display text-xl text-fg md:text-2xl">{first.b?.name}</span>
      </div>
      <p className="mt-1 text-center text-sm text-fg-muted">{first.roundName}</p>

      {rest.length > 0 && (
        <p className="mt-3 border-t border-line pt-3 text-center text-xs text-fg-subtle">
          Also ready: {rest.map((m) => `${m.a?.name} vs ${m.b?.name}`).join(", ")}
        </p>
      )}
    </section>
  );
}
