import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { getLeaderboard } from "@/lib/leaderboard";
import { repostLeaderboardAction } from "../actions";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";

// Preview / verification screen for posting the leaderboard graphic to Slack.
// Shows the live OG leaderboard image and the current standings before sending.
export default async function LeaderboardPostPage() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-slate-400">
        Not authorised. <Link href="/admin" className="underline">Sign in</Link>.
      </div>
    );
  }

  const rows = await getLeaderboard();
  const card = "rounded-xl bg-[#141a30] p-5";
  const btn = "rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/5";
  const pts = (n: number) => `${n} pt${n === 1 ? "" : "s"}`;
  const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}.`);

  // Cache-bust so the preview (and the eventual Slack unfurl) render the latest scores.
  const imgSrc = `/api/og/leaderboard?ts=${Date.now()}`;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
        Post leaderboard
      </div>
      <h1 className="mb-2 text-2xl font-extrabold">🏆 World Cup Sweepstake — Leaderboard</h1>
      <p className="mb-6 text-sm text-slate-400">
        This posts the live leaderboard graphic to #world-cup. Check it below — nothing is sent
        until you press <span className="text-slate-200">Post to Slack</span>.
      </p>

      <section className={`${card} mb-5`}>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Leaderboard graphic (OG image)</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt="Leaderboard" className="w-full rounded-lg ring-1 ring-white/10" />
      </section>

      <section className={`${card} mb-6`}>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Current standings</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No scores yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {rows.slice(0, 10).map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="w-7 text-slate-500">{medal(r.rank)}</span>
                <span className="flex-1">{r.name}</span>
                <span className="font-semibold text-white">{pts(r.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-3">
        <form action={repostLeaderboardAction}>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "#2f7bff" }}
          >
            📣 Post to Slack
          </button>
        </form>
        <Link href="/admin" className={btn}>Cancel</Link>
      </div>
    </div>
  );
}
