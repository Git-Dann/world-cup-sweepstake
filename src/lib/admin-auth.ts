import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "wc_admin";

// Stateless cookie value derived from the admin password — no session store needed
// for a single admin. Changing ADMIN_PASSWORD invalidates existing sessions.
function token(): string {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  return crypto.createHash("sha256").update("wc-sweepstake::" + pw).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false; // locked until a password is set
  const c = await cookies();
  return c.get(COOKIE)?.value === token();
}

export async function signInAdmin(password: string): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || password !== pw) return false;
  const c = await cookies();
  c.set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });
  return true;
}

export async function signOutAdmin() {
  const c = await cookies();
  c.delete(COOKIE);
}
