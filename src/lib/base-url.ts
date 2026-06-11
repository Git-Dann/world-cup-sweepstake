// Best-effort absolute origin for building public URLs (Slack scoreboard images,
// leaderboard link). We want the OG card on EVERY post, so fall back to Vercel's
// deployment URLs when NEXT_PUBLIC_APP_URL isn't explicitly set.
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}
