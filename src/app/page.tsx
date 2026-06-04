import Link from "next/link";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";
import { getTeamsByGroup, getDrawState, type GroupTeam } from "@/lib/queries";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";

function rankBg(r: number) {
  if (r === 1) return GOLD;
  if (r === 2) return "#c9d1d9";
  if (r === 3) return "#cd7f32";
  return "#33406b";
}

function TeamChip({ t }: { t: { code: string | null; name: string; logoUrl: string | null; points: number; eliminated: boolean } }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs"
      style={{ opacity: t.eliminated ? 0.45 : 1 }}
      title={t.name}
    >
      {t.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.logoUrl} alt="" width={16} height={16} style={{ height: 16, width: 16, objectFit: "contain" }} />
      ) : null}
      <span className={t.eliminated ? "line-through" : ""}>{t.code ?? t.name}</span>
      <span style={{ color: GOLD }}>{t.points}</span>
    </span>
  );
}

function Leaderboard({ rows, drawDone }: { rows: LeaderboardRow[]; drawDone: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-white/5 p-6 text-center text-slate-400">
        No players yet — the draw is being set up. Check back soon. ⚽
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl bg-[#141a30] p-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold"
              style={{ background: rankBg(r.rank), color: "#0b1020" }}
            >
              {r.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">{r.name}</div>
              <div className="text-xs text-slate-400">
                {r.teams.length} team{r.teams.length === 1 ? "" : "s"} · {r.teamsAlive} still in
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold" style={{ color: GOLD }}>
                {r.total}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">pts</div>
            </div>
          </div>
          {drawDone && r.teams.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.teams.map((t) => (
                <TeamChip key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Groups({ groups }: { groups: { group: string; teams: GroupTeam[] }[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ group, teams }) => (
        <div key={group} className="rounded-xl bg-[#141a30] p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            {group === "TBD" ? "Unassigned" : `Group ${group}`}
          </div>
          <div className="flex flex-col gap-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm" style={{ opacity: t.eliminated ? 0.5 : 1 }}>
                {t.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logoUrl} alt="" width={20} height={20} style={{ height: 20, width: 20, objectFit: "contain" }} />
                ) : (
                  <span className="inline-block h-5 w-5" />
                )}
                <span className={`flex-1 truncate ${t.eliminated ? "line-through" : ""}`}>{t.name}</span>
                {t.owner && <span className="truncate text-xs text-slate-500">{t.owner}</span>}
                <span className="w-6 text-right font-bold" style={{ color: GOLD }}>
                  {t.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  let leaderboard: LeaderboardRow[] = [];
  let groups: { group: string; teams: GroupTeam[] }[] = [];
  let draw = { drawCompleted: false, prizeText: "Bragging rights 🏆", potText: null as string | null };
  let ready = true;
  try {
    [leaderboard, groups, draw] = await Promise.all([
      getLeaderboard(),
      getTeamsByGroup(),
      getDrawState(),
    ]);
  } catch {
    ready = false;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
          World Cup 2026 · Office Sweepstake
        </div>
        <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">The Leaderboard 🏆</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/5 px-4 py-1.5 text-sm">
            🎁 Prize: <span className="font-semibold">{draw.prizeText}</span>
          </span>
          {draw.potText && (
            <span className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-slate-300">{draw.potText}</span>
          )}
        </div>
      </header>

      {!ready ? (
        <div className="rounded-xl bg-[#141a30] p-8 text-center text-slate-400">
          ⚙️ Setting things up — the leaderboard will appear here once the tournament data is synced.
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <section>
            <h2 className="mb-4 text-xl font-bold">Standings</h2>
            <Leaderboard rows={leaderboard} drawDone={draw.drawCompleted} />
          </section>
          <section>
            <h2 className="mb-4 text-xl font-bold">Teams by group</h2>
            <Groups groups={groups} />
          </section>
        </div>
      )}

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
        World Cup 2026 Office Sweepstake · live data via API-Football
        {" "}
        <Link href="/admin" className="text-slate-700 transition-colors hover:text-slate-400" aria-label="Admin">
          ·
        </Link>
      </footer>
    </div>
  );
}
