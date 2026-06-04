import Link from "next/link";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";
import { getTeamsByGroup, getDrawState, type GroupTeam } from "@/lib/queries";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";
const RAINBOW = "linear-gradient(90deg,#ff4d4d,#ffb020,#28c76f,#2f7bff,#9b5cff)";

function rankBg(r: number) {
  if (r === 1) return GOLD;
  if (r === 2) return "#c9d1d9";
  if (r === 3) return "#cd7f32";
  return "#33406b";
}

function Flag({ src, alt, size = 28, dim = false }: { src: string | null; alt: string; size?: number; dim?: boolean }) {
  if (!src) {
    return <span className="inline-block rounded-full bg-white/10" style={{ width: size, height: size }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover ring-1 ring-white/15"
      style={{ width: size, height: size, opacity: dim ? 0.4 : 1 }}
    />
  );
}

function Leaderboard({ rows, drawDone }: { rows: LeaderboardRow[]; drawDone: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">
        No players yet — the draw is being set up. Check back soon. ⚽
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl bg-[#141a30] p-4 ring-1 ring-white/5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-extrabold"
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
              <div className="text-2xl font-extrabold tabular-nums" style={{ color: GOLD }}>
                {r.total}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">pts</div>
            </div>
          </div>
          {drawDone && r.teams.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
              {r.teams.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5" title={`${t.name} · ${t.points} pts`}>
                  <Flag src={t.logoUrl} alt={t.name} size={22} dim={t.eliminated} />
                  <span className={`text-xs ${t.eliminated ? "text-slate-600 line-through" : "text-slate-300"}`}>
                    {t.code ?? t.name}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: GOLD }}>
                    {t.points}
                  </span>
                </span>
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
        <div key={group} className="rounded-2xl bg-[#141a30] p-4 ring-1 ring-white/5">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            {group === "TBD" ? "Unassigned" : `Group ${group}`}
          </div>
          <div className="flex flex-col gap-2.5">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 text-sm">
                <Flag src={t.logoUrl} alt={t.name} size={26} dim={t.eliminated} />
                <span className={`flex-1 truncate ${t.eliminated ? "text-slate-600 line-through" : ""}`}>
                  {t.name}
                </span>
                {t.owner && <span className="hidden truncate text-xs text-slate-500 sm:inline">{t.owner}</span>}
                <span className="w-6 text-right font-bold tabular-nums" style={{ color: GOLD }}>
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-12 text-center sm:mb-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://crests.football-data.org/wm26.png"
          alt="FIFA World Cup 2026"
          width={160}
          height={160}
          className="mx-auto h-28 w-auto sm:h-36"
        />
        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 sm:text-sm">
          Office Sweepstake
        </div>
        <div className="mx-auto mt-5 h-1 w-40 rounded-full" style={{ backgroundImage: RAINBOW }} />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="rounded-full bg-white/5 px-4 py-1.5 text-sm ring-1 ring-white/10">
            🎁 Prize: <span className="font-semibold">{draw.prizeText}</span>
          </span>
        </div>
      </header>

      {!ready ? (
        <div className="rounded-2xl bg-[#141a30] p-10 text-center text-slate-400">
          ⚙️ Setting things up — the leaderboard appears here once the tournament data is synced.
        </div>
      ) : (
        <div className="flex flex-col gap-14">
          <section>
            <h2 className="mb-5 text-center text-xl font-bold">🏆 Leaderboard</h2>
            <Leaderboard rows={leaderboard} drawDone={draw.drawCompleted} />
          </section>
          <section>
            <h2 className="mb-5 text-center text-xl font-bold">Teams by group</h2>
            <Groups groups={groups} />
          </section>
        </div>
      )}

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
        World Cup 2026 Office Sweepstake · live data via football-data.org
        {" "}
        <Link href="/admin" className="text-slate-700 transition-colors hover:text-slate-400" aria-label="Admin">
          ·
        </Link>
      </footer>
    </div>
  );
}
