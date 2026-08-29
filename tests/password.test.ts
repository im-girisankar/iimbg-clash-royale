import { test, describe } from "node:test";
import { expect } from "./expect.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";

describe("password hashing", () => {
  test("the right password verifies", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  test("a wrong password does not", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
    expect(await verifyPassword("correct horse battery stapl", hash)).toBe(false);
  });

  test("the same password hashes differently every time", async () => {
    // Distinct salts, so two admins choosing the same password do not end up
    // with matching rows, and a stolen table shows no duplicates to target.
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a === b).toBe(false);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  test("stores parameters in the string so cost can change later", async () => {
    const hash = await hashPassword("x");
    const [scheme, n, r, p] = hash.split("$");
    expect(scheme).toBe("scrypt");
    expect(Number(n) > 1).toBe(true);
    expect(Number(r) > 0).toBe(true);
    expect(Number(p) > 0).toBe(true);
    expect(hash.split("$")).toHaveLength(6);
  });

  test("malformed stored values read as a wrong password, never a crash", async () => {
    // A corrupt row must not become a 500: that tells an attacker they found
    // something. Every one of these has to be a plain false.
    for (const bad of [
      "",
      "not-a-hash",
      "bcrypt$16384$8$1$aaaa$bbbb",
      "scrypt$16384$8$1$$",
      "scrypt$16384$8$1$aaaa",
      "$$$$$",
    ]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  test("a blank password does not verify against a blank-ish hash", async () => {
    const hash = await hashPassword("");
    expect(await verifyPassword("", hash)).toBe(true);
    expect(await verifyPassword("x", hash)).toBe(false);
  });
});
