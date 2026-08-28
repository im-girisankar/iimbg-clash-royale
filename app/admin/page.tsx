import { requireAdmin } from "@/lib/session";
import { loadLive } from "@/lib/tournament";
import { createTournamentAction } from "@/app/admin/actions";
import { Setup } from "@/components/admin/setup";
import { Console } from "@/components/admin/console";

/**
 * The whole host flow lives behind this one branch: no tournament yet, a
 * draw still being assembled, or a live/finished bracket. There is
 * deliberately no tournament list or settings screen — one tournament runs
 * per evening.
 */
export default async function AdminPage() {
  await requireAdmin();
  const live = await loadLive();

  if (!live) {
    return <CreateTournament />;
  }

  if (live.tournament.status === "setup") {
    return <Setup live={live} />;
  }

  return <Console live={live} />;
}

function CreateTournament() {
  // Inline server action (as in app/admin/layout.tsx's sign-out form) so this
  // stays a plain progressive-enhancement form — no client component needed
  // for a one-field, once-ever screen.
  async function create(formData: FormData) {
    "use server";
    await createTournamentAction(null, formData);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-bold text-fg">New tournament</h1>
        <p className="text-sm text-fg-muted">Name it, then add players.</p>
      </div>

      <form action={create} className="flex flex-col gap-3">
        <input
          name="name"
          required
          autoFocus
          placeholder="e.g. IIMBG Clash Royale Cup"
          className="h-12 rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-line-strong focus:border-accent-line"
        />
        <button
          type="submit"
          className="h-12 rounded-lg text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Create tournament
        </button>
      </form>
    </div>
  );
}
