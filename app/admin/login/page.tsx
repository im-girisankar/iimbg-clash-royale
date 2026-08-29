import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { currentAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · IIMBG Clash Royale" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentAdmin()) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-12">
      <div className="flex flex-col items-start gap-3">
        <Image src="/it-committee.png" alt="" width={56} height={56} priority />
        <h1 className="font-display text-2xl uppercase tracking-wide text-fg">
          Scorer sign-in
        </h1>
        <p className="text-sm text-fg-muted">
          Use the Google account whose address is on the committee&rsquo;s admin list.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-cell border px-3 py-2.5 text-sm"
          style={{
            borderColor: "var(--accent-line)",
            background: "var(--accent-soft)",
            color: "var(--fg)",
          }}
        >
          {error === "AccessDenied"
            ? "That account isn't on the admin list. Ask the tech lead to add your email, then try again."
            : "Sign-in failed. Try again."}
        </p>
      )}

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/admin" });
        }}
      >
        <button
          type="submit"
          className="btn-gold h-11 w-full"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
