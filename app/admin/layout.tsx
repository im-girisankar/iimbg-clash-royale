import Link from "next/link";
import { signOut } from "@/auth";
import { currentAdmin } from "@/lib/session";

/* Admin chrome stays on the neutral palette — the game themes belong to the
   public standings, and a scorer switching between games all evening should
   not have the interface change colour under them. */

const NAV = [{ href: "/admin", label: "Admin" }];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await currentAdmin();

  return (
    <div className="min-h-dvh bg-ground">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-display text-sm font-bold tracking-wide text-fg">
            IIMBG Clash Royale
          </Link>

          {admin && (
            <nav className="flex gap-1" aria-label="Admin">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-2.5 py-1 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <Link href="/" className="text-xs text-fg-subtle hover:text-fg">
              View bracket
            </Link>
            {admin && (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-fg-subtle hover:text-fg"
                  title={admin.email}
                >
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
