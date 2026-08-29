import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { currentAdmin } from "@/lib/session";

/* Admin chrome is quieter than the public view on purpose. A scorer looks at
   this screen for three hours; the arena treatment belongs on the screen the
   hall is watching, not on the one being worked in. */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await currentAdmin();

  return (
    <div className="min-h-dvh bg-ground">
      <header className="border-b-2 border-line-strong bg-surface shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-2">
            <Image src="/it-committee.png" alt="" width={40} height={40} priority />
            {/* Bigger type stopped fitting beside the links on a 390px
                phone: it wrapped and then overlapped them. Rather than
                shrink the type back down, the wordmark goes short there and
                the logo carries the identity. Full name from sm up. */}
            <span className="titled whitespace-nowrap text-lg uppercase leading-none tracking-wide text-fg">
              <span className="sm:hidden">IIMBG</span>
              <span className="hidden sm:inline">IIMBG Clash Royale</span>
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link href="/" className="text-sm text-fg-muted hover:text-fg">
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
                  className="text-sm text-fg-muted hover:text-fg"
                  title={admin.username}
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
