import Link from "next/link";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";
import { getTeamsByGroup, getDrawState, getFeaturedMatch, type GroupTeam, type FeaturedMatch } from "@/lib/queries";
import { londonDateLabel, londonTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const GOLD = "#f5c518";
const RAINBOW = "linear-gradient(90deg,#ff4d4d,#ffb020,#28c76f,#2f7bff,#9b5cff)";
const HERO_BG =
  "radial-gradient(720px 320px at 12% -20%, rgba(255,77,77,.40), transparent), radial-gradient(720px 320px at 88% -10%, rgba(47,123,255,.42), transparent), radial-gradient(620px 440px at 50% 135%, rgba(155,92,255,.34), transparent), radial-gradient(500px 300px at 70% 120%, rgba(40,199,111,.28), transparent), #0b1020";

function rankBg(r: number) {
  if (r === 1) return GOLD;
  if (r === 2) return "#c9d1d9";
  if (r === 3) return "#cd7f32";
  return "#33406b";
}
function medal(r: number) {
  return r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}`;
}

function Flag({ src, alt, size = 24, dim = false }: { src: string | null; alt: string; size?: number; dim?: boolean }) {
  if (!src) return <span className="inline-block shrink-0 rounded-full bg-white/10" style={{ width: size, height: size }} />;
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

function TeamChips({ teams }: { teams: LeaderboardRow["teams"] }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      {teams.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1" title={`${t.name} · ${t.points} pts`}>
          <Flag src={t.flagUrl ?? t.logoUrl} alt={t.name} size={15} dim={t.eliminated} />
          <span className={`text-[11px] ${t.eliminated ? "text-slate-600 line-through" : "text-slate-400"}`}>{t.code ?? t.name}</span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: GOLD }}>{t.points}</span>
        </span>
      ))}
    </div>
  );
}

function Podium({ top }: { top: LeaderboardRow[] }) {
  const tint = (r: number) =>
    r === 1
      ? "linear-gradient(160deg, rgba(245,197,24,.28), rgba(245,197,24,.04))"
      : r === 2
        ? "linear-gradient(160deg, rgba(201,209,217,.24), rgba(201,209,217,.03))"
        : "linear-gradient(160deg, rgba(205,127,50,.26), rgba(205,127,50,.04))";
  return (
    <div className="mb-3 grid grid-cols-3 gap-2.5 sm:gap-4">
      {top.map((r) => (
        <div
          key={r.id}
          className="flex flex-col items-center rounded-2xl p-3 text-center ring-1 ring-white/10 sm:p-5"
          style={{ background: tint(r.rank) }}
        >
          <div className="text-2xl sm:text-4xl">{medal(r.rank)}</div>
          <div className="mt-1 w-full truncate text-sm font-bold sm:text-lg">{r.name}</div>
          <div className="text-2xl font-black tabular-nums sm:text-4xl" style={{ color: GOLD }}>{r.total}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400">pts · {r.teamsAlive} alive</div>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {r.teams.map((t) => (
              <Flag key={t.id} src={t.flagUrl ?? t.logoUrl} alt={t.name} size={18} dim={t.eliminated} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ rows, drawDone }: { rows: LeaderboardRow[]; drawDone: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">No players yet — the draw is being set up. ⚽</p>;
  }
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  return (
    <div>
      <Podium top={top} />
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 md:gap-x-3">
        {rest.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl bg-[#141a30] px-3 py-2.5 ring-1 ring-white/5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
              style={{ background: rankBg(r.rank), color: "#0b1020" }}
            >
              {r.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{r.name}</div>
              {drawDone && r.teams.length > 0 && <TeamChips teams={r.teams} />}
            </div>
            <div className="shrink-0 text-lg font-extrabold tabular-nums" style={{ color: GOLD }}>{r.total}</div>
          </div>
        ))}
      </div>
    </div>
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
  const ring = (c: string) => ({ boxShadow: `0 0 0 3px ${c}, 0 0 20px ${c}55` });
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ background: "linear-gradient(180deg,#172041,#0e1530)" }}>
      <div className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-[0.2em]">
        {live ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-red-400">Live</span>
          </>
        ) : (
          <span className="text-slate-300">Next match</span>
        )}
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">{m.round}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-6 pt-2 sm:gap-6 sm:px-8">
        <div className="flex items-center justify-end gap-2.5 sm:gap-4">
          <span className="truncate text-right text-sm font-extrabold sm:text-2xl">{m.home.name}</span>
          <span className="shrink-0 rounded-full" style={ring("#ff4d4d")}>
            <Flag src={m.home.flag ?? m.home.logo} alt={m.home.name} size={50} />
          </span>
        </div>
        <div className="text-center">
          {live ? (
            <div className="text-4xl font-black tabular-nums sm:text-5xl" style={{ color: GOLD }}>
              {m.homeGoals ?? 0}<span className="px-1 text-slate-600">–</span>{m.awayGoals ?? 0}
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-black" style={{ color: GOLD, boxShadow: `inset 0 0 0 1.5px ${GOLD}` }}>
              VS
            </span>
          )}
        </div>
        <div className="flex items-center justify-start gap-2.5 sm:gap-4">
          <span className="shrink-0 rounded-full" style={ring("#2f7bff")}>
            <Flag src={m.away.flag ?? m.away.logo} alt={m.away.name} size={50} />
          </span>
          <span className="truncate text-sm font-extrabold sm:text-2xl">{m.away.name}</span>
        </div>
      </div>
      {!live && (
        <div className="border-t border-white/5 py-2.5 text-center text-xs text-slate-400">
          🗓️ {londonDateLabel(ko)} · {londonTime(ko)}
        </div>
      )}
    </div>
  );
}

function Groups({ groups }: { groups: { group: string; teams: GroupTeam[] }[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ group, teams }) => (
        <div key={group} className="rounded-2xl bg-[#141a30] p-4 ring-1 ring-white/5">
          <div className="mb-3 inline-flex rounded-md px-2 py-0.5 text-sm font-bold uppercase tracking-wider" style={{ background: "rgba(245,197,24,.15)", color: GOLD }}>
            {group === "TBD" ? "Unassigned" : group}
          </div>
          <div className="flex flex-col gap-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 text-sm">
                <Flag src={t.logoUrl} alt={t.name} size={24} dim={t.eliminated} />
                <span className={`flex-1 truncate ${t.eliminated ? "text-slate-600 line-through" : ""}`}>{t.name}</span>
                {t.owner && <span className="hidden truncate text-xs text-slate-500 sm:inline">{t.owner}</span>}
                <span className="w-6 text-right font-bold tabular-nums" style={{ color: GOLD }}>{t.points}</span>
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

  const teamCount = groups.reduce((n, g) => n + g.teams.length, 0);
  const bgStyle = draw.bgUrl
    ? { backgroundImage: `url(${draw.bgUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" as const }
    : undefined;

  return (
    <div style={bgStyle}>
      <div style={draw.bgUrl ? { background: "rgba(11,16,32,0.88)", minHeight: "100vh" } : undefined}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <header
            className="relative mb-8 overflow-hidden rounded-3xl px-6 py-10 text-center sm:py-14"
            style={{ backgroundImage: HERO_BG, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.07)" }}
          >
            {draw.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draw.logoUrl} alt="Logo" className="mx-auto mb-2 h-20 w-auto object-contain sm:h-24" />
            ) : (
              <div className="mb-1 text-5xl drop-shadow sm:text-6xl">🏆</div>
            )}
            <h1
              className="text-7xl font-black leading-none tracking-tight sm:text-9xl"
              style={{ backgroundImage: RAINBOW, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              2026
            </h1>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.4em] text-white/80 sm:text-sm">
              World Cup · Office Sweepstake
            </div>
            <div className="mx-auto mt-5 h-1.5 w-44 rounded-full" style={{ backgroundImage: RAINBOW }} />
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="rounded-full bg-black/30 px-4 py-1.5 ring-1 ring-white/15 backdrop-blur">
                🎁 <span className="font-semibold">{draw.prizeText}</span>
              </span>
              {ready && teamCount > 0 && (
                <span className="rounded-full bg-black/30 px-4 py-1.5 text-white/80 ring-1 ring-white/15 backdrop-blur">
                  {leaderboard.length} players · {teamCount} teams
                </span>
              )}
            </div>
          </header>

          {!ready ? (
            <div className="rounded-2xl bg-[#141a30] p-10 text-center text-slate-400">
              ⚙️ Setting things up — the leaderboard appears here once the tournament data is synced.
            </div>
          ) : (
            <div className="flex flex-col gap-9">
              <MatchBanner m={featured} />
              <section>
                <h2 className="mb-4 text-center text-2xl font-extrabold">🏆 Leaderboard</h2>
                <Leaderboard rows={leaderboard} drawDone={draw.drawCompleted} />
              </section>
              <section>
                <h2 className="mb-4 text-center text-2xl font-extrabold">Teams by group</h2>
                <Groups groups={groups} />
              </section>
            </div>
          )}

          <footer className="mt-14 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
            World Cup 2026 Office Sweepstake · live data via football-data.org
            {" "}
            <Link href="/admin" className="text-slate-700 transition-colors hover:text-slate-400" aria-label="Admin">·</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
