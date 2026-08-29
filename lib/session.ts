import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminExists } from "./db";

export interface Admin {
  username: string;
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
  const username = session?.user?.id?.toLowerCase();

  if (!username || !(await adminExists(username))) redirect("/admin/login");

  return { username, name: session?.user?.name ?? username };
});

/** Non-redirecting variant, for deciding what the chrome should show. */
export const currentAdmin = cache(async (): Promise<Admin | null> => {
  const session = await auth();
  const username = session?.user?.id?.toLowerCase();
  if (!username || !(await adminExists(username))) return null;
  return { username, name: session?.user?.name ?? username };
});
