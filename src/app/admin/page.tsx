import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ensureSettings } from "@/lib/settings";
import { ImageUpload } from "@/components/image-upload";
import { RemovePlayerButton } from "@/components/remove-player-button";
import { ConfirmButton } from "@/components/confirm-button";
import {
  signInAction,
  signOutAction,
  addPlayersAction,
  removePlayerAction,
  updatePrizeAction,
  updateBrandingAction,
  runDrawAction,
  resetDrawAction,
  postDrawAction,
} from "./actions";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";

function LoginScreen({ error }: { error?: boolean }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold">Admin</h1>
      <p className="mb-6 text-sm text-slate-400">World Cup Sweepstake control room.</p>
      <form action={signInAction} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="Admin password"
          autoFocus
          className="rounded-lg bg-white/5 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2"
          style={{ caretColor: GOLD }}
        />
        {error && <p className="text-sm text-red-400">Wrong password — try again.</p>}
        <button
          type="submit"
          className="rounded-lg px-4 py-3 font-semibold text-[#0b1020]"
          style={{ background: GOLD }}
        >
          Enter
        </button>
      </form>
      <Link href="/" className="mt-6 text-center text-xs text-slate-600 hover:text-slate-400">
        ← Back to the leaderboard
      </Link>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const sp = await searchParams;

  if (!(await isAdmin())) {
    return <LoginScreen error={sp?.error === "1"} />;
  }

  const settings = await ensureSettings();
  const [players, teamCount, ownedCount, results] = await Promise.all([
    prisma.player.findMany({
      include: { _count: { select: { teams: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.team.count(),
    prisma.team.count({ where: { ownerId: { not: null } } }),
    prisma.fixture.findMany({
      where: { finished: true },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoff: "desc" },
    }),
  ]);
  const drawDone = !!settings.drawCompletedAt;

  const card = "rounded-xl bg-[#141a30] p-5";
  const btn = "rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/5";
  const primaryBtn = "rounded-lg px-4 py-2 text-sm font-semibold text-[#0b1020]";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
            Admin
          </div>
          <h1 className="text-3xl font-extrabold">Control room</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className={btn}>
            View site ↗
          </Link>
          <form action={signOutAction}>
            <button className={btn}>Sign out</button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Players */}
        <section className={card}>
          <div className="mb-4">
            <h2 className="text-lg font-bold">
              Players <span className="text-slate-500">({players.length})</span>
            </h2>
          </div>

          <form action={addPlayersAction} className="mb-4 flex flex-col gap-2">
            <textarea
              name="names"
              rows={3}
              placeholder="Add players — one per line, or comma-separated"
              className="rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-2"
            />
            <button type="submit" className={`${primaryBtn} self-start`} style={{ background: GOLD }}>
              + Add players
            </button>
          </form>

          {players.length === 0 ? (
            <p className="text-sm text-slate-500">No players yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-white/5 py-2.5">
                  <span className="flex-1 truncate">{p.name}</span>
                  {drawDone && <span className="text-xs text-slate-500">{p._count.teams} teams</span>}
                  <RemovePlayerButton id={p.id} name={p.name} action={removePlayerAction} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Prize */}
        <section className={card}>
          <h2 className="mb-4 text-lg font-bold">
            Prize{sp?.saved === "prize" && <span className="ml-2 text-xs font-medium text-green-400">✓ Saved</span>}
          </h2>
          <form action={updatePrizeAction} className="flex flex-col gap-3">
            <label className="text-sm text-slate-400">
              What does the winner get? <span className="text-slate-500">(just for fun — no buy-in)</span>
              <input
                name="prizeText"
                defaultValue={settings.prizeText}
                className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-2"
              />
            </label>
            <button type="submit" className={`${primaryBtn} self-start`} style={{ background: GOLD }}>
              Save
            </button>
          </form>
        </section>

        {/* Branding */}
        <section className={card}>
          <h2 className="mb-4 text-lg font-bold">
            Branding{sp?.saved === "branding" && <span className="ml-2 text-xs font-medium text-green-400">✓ Saved</span>}
          </h2>
          <form action={updateBrandingAction} className="flex flex-col gap-4">
            <ImageUpload
              name="logoUrl"
              label="Header logo (above “2026”)"
              spec="Square PNG or SVG, transparent background, ~512×512px. Uploads are auto-resized (keep under ~1 MB). Blank = 🏆."
              current={settings.logoUrl}
              maxDim={512}
              format="image/png"
            />
            <ImageUpload
              name="bgUrl"
              label="Background image"
              spec="Landscape JPG or PNG, ~1920×1080px (16:9). Uploads are auto-resized & compressed. Blank = plain navy."
              current={settings.bgUrl}
              maxDim={1600}
              format="image/jpeg"
            />
            <button type="submit" className={`${primaryBtn} self-start`} style={{ background: GOLD }}>
              Save branding
            </button>
          </form>
        </section>

        {/* The draw */}
        <section className={card}>
          <h2 className="mb-2 text-lg font-bold">The draw</h2>
          <p className="mb-4 text-sm text-slate-400">
            {drawDone
              ? `✅ Draw done — ${ownedCount}/${teamCount} teams assigned. Review it on the leaderboard, then post it to #world-cup when you're happy.`
              : `Ready — ${teamCount} teams and ${players.length} players loaded. Run the draw to assign teams — this does NOT post to Slack, so you can review (and re-run) first.`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <form action={runDrawAction}>
              <button
                className={primaryBtn}
                style={{ background: GOLD }}
                disabled={players.length === 0 || teamCount === 0}
              >
                {drawDone ? "Re-run draw" : "Run draw"}
              </button>
            </form>
            {drawDone && (
              <>
                <Link href="/" className={btn}>
                  Review on leaderboard ↗
                </Link>
                <ConfirmButton
                  action={postDrawAction}
                  confirmText="Post the draw to #world-cup? Everyone in the channel will see it."
                  className={primaryBtn}
                  style={{ background: "#2f7bff", color: "white" }}
                >
                  📣 Post draw to Slack
                </ConfirmButton>
                <form action={resetDrawAction}>
                  <button className={`${btn} text-red-400`}>Reset draw</button>
                </form>
              </>
            )}
          </div>
          {sp?.saved === "draw-posted" && (
            <p className="mt-3 text-sm font-medium text-green-400">✓ Draw posted to #world-cup</p>
          )}
          {drawDone && (
            <p className="mt-3 text-xs text-amber-400/80">
              ⚠️ Re-running reshuffles everyone&apos;s teams — post again afterwards to update the channel.
            </p>
          )}
        </section>

        {/* Match results — re-post a (corrected) result card to Slack */}
        <section className={card}>
          <h2 className="mb-2 text-lg font-bold">
            Match results <span className="text-slate-500">({results.length})</span>
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Re-post a finished match to #world-cup — handy after a score correction. You&apos;ll see a
            preview of the card and text before anything is sent.
          </p>
          {sp?.saved === "reposted" && (
            <p className="mb-3 text-sm font-medium text-green-400">✓ Result re-posted to #world-cup</p>
          )}
          {sp?.error === "repost" && (
            <p className="mb-3 text-sm font-medium text-red-400">
              Couldn&apos;t post — check SLACK_WEBHOOK_URL is set.
            </p>
          )}
          {results.length === 0 ? (
            <p className="text-sm text-slate-500">No finished matches yet.</p>
          ) : (
            <ul className="flex flex-col">
              {results.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 border-b border-white/5 py-2.5 text-sm"
                >
                  <span className="flex-1 truncate">
                    {f.homeTeam?.name ?? "TBD"}{" "}
                    <span className="font-semibold text-white">
                      {f.homeGoals ?? 0}–{f.awayGoals ?? 0}
                    </span>{" "}
                    {f.awayTeam?.name ?? "TBD"}
                    <span className="ml-2 text-xs text-slate-500">{f.round}</span>
                  </span>
                  {f.resultPosted && <span className="text-xs text-slate-500">posted</span>}
                  <Link
                    href={`/admin/repost/${f.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-white/10 hover:bg-white/5"
                  >
                    Preview & re-post
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}
