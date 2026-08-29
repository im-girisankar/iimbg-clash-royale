import "next-auth";

/* The Credentials provider carries a username, not an email. `id` is the
   field next-auth already reserves for it, so this widens the session type
   rather than inventing a parallel one. */
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
  }
}
