import type { NextRequest } from "next/server";

// Cron endpoints accept the secret as a Bearer token (what Vercel Cron sends
// automatically when CRON_SECRET is set, and what our GitHub Action sends),
// or as a ?secret= query param for easy manual testing.
export function checkCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const fromQuery = new URL(req.url).searchParams.get("secret");
  return fromQuery === secret;
}
