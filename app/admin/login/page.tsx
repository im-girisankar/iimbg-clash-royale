import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
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

  /* Inline Server Action rather than a client component: this form has two
     fields and one button, and keeping it server-side means the password
     never enters a React state tree or a client bundle. */
  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (e) {
      // next-auth signals a successful redirect by throwing, so only a real
      // AuthError is a failed login. Anything else has to keep propagating
      // or the redirect never happens.
      if (e instanceof AuthError) redirect("/admin/login?error=CredentialsSignin");
      throw e;
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-12">
      <div className="flex flex-col items-start gap-3">
        <Image src="/it-committee.png" alt="" width={56} height={56} priority />
        <h1 className="titled text-2xl uppercase tracking-wide text-fg">
          Scorer sign-in
        </h1>
        <p className="text-sm text-fg-muted">
          Ask the tech lead for the login if you don&rsquo;t have it.
        </p>
      </div>

      {error && (
        <p role="alert" className="panel-gold px-3 py-2.5 text-sm text-fg">
          {/* Deliberately does not say which of the two was wrong: naming the
              field tells anyone guessing whether the username exists. */}
          That username and password don&rsquo;t match. Try again.
        </p>
      )}

      <form action={login} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-fg-muted">Username</span>
          <input
            name="username"
            required
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            className="cell h-12 px-3 text-fg placeholder:text-fg-subtle focus:border-accent-line"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-fg-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="cell h-12 px-3 text-fg placeholder:text-fg-subtle focus:border-accent-line"
          />
        </label>

        <button type="submit" className="btn-gold h-12 w-full">
          Sign in
        </button>
      </form>
    </div>
  );
}
