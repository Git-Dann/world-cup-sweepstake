import Link from "next/link";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";
import { getTeamsByGroup, getDrawState, getFeaturedMatch, type GroupTeam, type FeaturedMatch } from "@/lib/queries";
import { londonDateLabel, londonTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";
const RAINBOW = "linear-gradient(90deg,#ff4d4d,#ffb020,#28c76f,#2f7bff,#9b5cff)";

function rankBg(r: number) {
  if (r === 1) return GOLD;
  if (r === 2) return "#c9d1d9";
  if (r === 3) return "#cd7f32";
  return "#33406b";
}

function Flag({ src, alt, size = 26, dim = false }: { src: string | null; alt: string; size?: number; dim?: boolean }) {
  if (!src) {
    return <span className="inline-block shrink-0 rounded-full bg-white/10" style={{ width: size, height: size }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover ring-1 ring-white/15"
      style={{ width: size, height: size, opacity: dim ? 0.4 : 1 }}
    />
  );
}

function MatchBanner({ m }: { m: FeaturedMatch }) {
  if (m.state === "none") {
    return (
      <div className="rounded-2xl bg-[#141a30] p-4 text-center text-sm text-slate-400 ring-1 ring-white/5">
        ⚽ Kicks off 11 June — live fixtures will appear here.
      </div>
    );
  }

  const live = m.state === "live";
  const ko = new Date(m.kickoff);

  return (
    <div className="overflow-hidden rounded-2xl bg-[#141a30] ring-1 ring-white/10">
      <div className="flex items-center justify-center gap-2 border-b border-white/5 py-2 text-xs font-bold uppercase tracking-wider">
        {live ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">Live</span>
          </>
        ) : (
          <span className="text-slate-400">Next match</span>
        )}
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">{m.round}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 sm:gap-4 sm:p-5">
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <span className="truncate text-right text-sm font-semibold sm:text-lg">{m.home.name}</span>
          <Flag src={m.home.logo} alt={m.home.name} size={34} />
        </div>
        <div className="text-center">
          {live ? (
            <div className="text-3xl font-extrabold tabular-nums sm:text-4xl" style={{ color: GOLD }}>
              {m.homeGoals ?? 0}<span className="px-2 text-slate-600">–</span>{m.awayGoals ?? 0}
            </div>
          ) : (
            <div className="text-base font-bold text-slate-500">vs</div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Flag src={m.away.logo} alt={m.away.name} size={34} />
          <span className="truncate text-sm font-semibold sm:text-lg">{m.away.name}</span>
        </div>
      </div>

      {!live && (
        <div className="border-t border-white/5 py-2 text-center text-xs text-slate-400">
          {londonDateLabel(ko)} · {londonTime(ko)}
        </div>
      )}
    </div>
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
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl bg-[#141a30] px-3.5 py-3 ring-1 ring-white/5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
              style={{ background: rankBg(r.rank), color: "#0b1020" }}
            >
              {r.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{r.name}</div>
              {drawDone && r.teams.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {r.teams.map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1" title={`${t.name} · ${t.points} pts`}>
                      <Flag src={t.logoUrl} alt={t.name} size={16} dim={t.eliminated} />
                      <span className={`text-[11px] ${t.eliminated ? "text-slate-600 line-through" : "text-slate-400"}`}>
                        {t.code ?? t.name}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: GOLD }}>
                        {t.points}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xl font-extrabold tabular-nums" style={{ color: GOLD }}>
                {r.total}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">pts</div>
            </div>
          </div>
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
          <div className="flex flex-col gap-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 text-sm">
                <Flag src={t.logoUrl} alt={t.name} size={24} dim={t.eliminated} />
                <span className={`flex-1 truncate ${t.eliminated ? "text-slate-600 line-through" : ""}`}>{t.name}</span>
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
  let draw = { drawCompleted: false, prizeText: "Bragging rights 🏆", logoUrl: null as string | null, bgUrl: null as string | null };
  let featured: FeaturedMatch = { state: "none" };
  let ready = true;
  try {
    [leaderboard, groups, draw, featured] = await Promise.all([
      getLeaderboard(),
      getTeamsByGroup(),
      getDrawState(),
      getFeaturedMatch(),
    ]);
  } catch {
    ready = false;
  }

  const bgStyle = draw.bgUrl
    ? { backgroundImage: `url(${draw.bgUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" as const }
    : undefined;

  return (
    <div style={bgStyle}>
      <div style={draw.bgUrl ? { background: "rgba(11,16,32,0.88)", minHeight: "100vh" } : undefined}>
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <header className="mb-10 text-center">
            {draw.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draw.logoUrl} alt="Logo" className="mx-auto mb-2 h-20 w-auto object-contain sm:h-24" />
            ) : (
              <div className="mb-1 text-5xl sm:text-6xl">🏆</div>
            )}
            <h1
              className="text-6xl font-black leading-none tracking-tight sm:text-8xl"
              style={{ backgroundImage: RAINBOW, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              2026
            </h1>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-300 sm:text-sm">
              World Cup · Office Sweepstake
            </div>
            <div className="mx-auto mt-5 h-1 w-40 rounded-full" style={{ backgroundImage: RAINBOW }} />
            <div className="mt-6 flex justify-center">
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
            <div className="flex flex-col gap-10">
              <MatchBanner m={featured} />
              <section>
                <h2 className="mb-4 text-center text-xl font-bold">🏆 Leaderboard</h2>
                <Leaderboard rows={leaderboard} drawDone={draw.drawCompleted} />
              </section>
              <section>
                <h2 className="mb-4 text-center text-xl font-bold">Teams by group</h2>
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
      </div>
    </div>
  );
}
