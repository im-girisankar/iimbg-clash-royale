import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "./db";

export interface Admin {
  email: string;
  name: string;
}

/**
 * The authorisation check, called next to the data rather than only in a
 * layout — a layout guard protects the page, not the Server Action behind it.
 *
 * Membership is re-read on every request so removing someone from `admins`
 * takes effect at once. React's cache() collapses that to one query per
 * request no matter how many callers ask.
 */
export const requireAdmin = cache(async (): Promise<Admin> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!email || !(await isAdmin(email))) redirect("/admin/login");

  return { email, name: session?.user?.name ?? email };
});

/** Non-redirecting variant, for deciding what the chrome should show. */
export const currentAdmin = cache(async (): Promise<Admin | null> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !(await isAdmin(email))) return null;
  return { email, name: session?.user?.name ?? email };
});
