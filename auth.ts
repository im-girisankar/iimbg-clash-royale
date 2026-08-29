import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findAdmin } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

/**
 * Username and password, checked against the `admins` table.
 *
 * There is no sign-up, no reset flow and no roles. An account exists because
 * somebody inserted a row with a scrypt hash in it. That is the whole system,
 * and for three scorers on one evening it is the right size.
 *
 * Each scorer gets their own login rather than sharing one, which is the only
 * reason `decided_by` on a result means anything: when a score is disputed at
 * 10pm, "entered by admin2" is an answer and "entered by the admin password"
 * is not.
 *
 * Sessions are JWTs because the Credentials provider cannot use the database
 * session strategy. Nothing sensitive rides in the token: the username, and
 * membership is re-read from the table on every request in lib/session.ts, so
 * deleting a row logs that person out on their next click rather than
 * whenever their cookie happens to expire.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const username = String(raw?.username ?? "").trim().toLowerCase();
        const password = String(raw?.password ?? "");
        if (!username || !password) return null;

        const admin = await findAdmin(username);

        /* A missing user and a wrong password have to cost the same. Without
           this, an unknown username returns fast and a real one returns after
           a ~100ms hash, which is enough to enumerate who exists. */
        const hash =
          admin?.passwordHash ??
          "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        const ok = await verifyPassword(password, hash);
        if (!ok || !admin) return null;

        return { id: admin.username, name: admin.name ?? admin.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.username = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.username) {
        session.user.id = String(token.username);
      }
      return session;
    },
  },
});
