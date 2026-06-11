import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { matchCardPath, statusLabelFor } from "@/lib/match-card";
import { repostResultAction } from "../../actions";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";

// Preview / verification screen: shows the exact OG scoreboard card and the raw
// text that will be pushed to Slack, then a confirm button to actually post it.
export default async function RepostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-slate-400">
        Not authorised. <Link href="/admin" className="underline">Sign in</Link>.
      </div>
    );
  }

  const { id } = await params;
  const f = await prisma.fixture.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
  });

  const card = "rounded-xl bg-[#141a30] p-5";
  const btn = "rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/5";

  if (!f || !f.homeTeam || !f.awayTeam) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <p className="text-slate-400">That match couldn’t be found (or has no teams assigned).</p>
        <Link href="/admin" className={`${btn} mt-4 inline-block`}>← Back to admin</Link>
      </div>
    );
  }

  const hg = f.homeGoals ?? 0;
  const ag = f.awayGoals ?? 0;
  const statusLabel = statusLabelFor(f);
  const pts = (n: number) => `${n} pt${n === 1 ? "" : "s"}`;

  // Mirrors exactly what resultMessage() sends to Slack.
  const rawText = [
    `⚽ ${statusLabel} — ${f.round}`,
    `${f.homeTeam.name}  ${hg} – ${ag}  ${f.awayTeam.name}`,
    `${f.homeTeam.name} — ${f.homeTeam.owner?.name ?? "unowned"} · ${pts(f.homeTeam.points)}`,
    `${f.awayTeam.name} — ${f.awayTeam.owner?.name ?? "unowned"} · ${pts(f.awayTeam.points)}`,
    "See the live leaderboard ↗",
  ].join("\n");

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
        Re-post result
      </div>
      <h1 className="mb-2 text-2xl font-extrabold">
        {f.homeTeam.name} {hg}–{ag} {f.awayTeam.name}
      </h1>
      <p className="mb-6 text-sm text-slate-400">
        Check the card and text below — this is exactly what gets pushed to #world-cup. Nothing is
        sent until you press <span className="text-slate-200">Post to Slack</span>.
      </p>

      {!f.finished && (
        <p className="mb-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          ⚠️ This match isn’t marked finished yet — re-syncing first is recommended so the score is final.
        </p>
      )}

      <section className={`${card} mb-5`}>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Scoreboard card (OG image)</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={matchCardPath(f)}
          alt={`${f.homeTeam.name} ${hg}-${ag} ${f.awayTeam.name}`}
          className="w-full rounded-lg ring-1 ring-white/10"
        />
      </section>

      <section className={`${card} mb-6`}>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Raw text</h2>
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 p-4 text-sm text-slate-200">
{rawText}
        </pre>
      </section>

      <div className="flex items-center gap-3">
        <form action={repostResultAction}>
          <input type="hidden" name="fixtureId" value={f.id} />
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
