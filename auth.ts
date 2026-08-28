import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAdmin } from "@/lib/db";

/**
 * Google sign-in, gated by the `admins` table.
 *
 * There is no sign-up and no roles. A person can scorekeep because their
 * email is a row in `admins` — added from the Supabase table editor, which
 * works from a phone and needs no deploy.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/admin/login" },
  callbacks: {
    // Runs before a session is ever issued, so a non-admin never gets one.
    async signIn({ user }) {
      return user.email ? isAdmin(user.email) : false;
    },
  },
});
