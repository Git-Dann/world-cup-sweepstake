// Thin client for API-Football (api-sports.io direct endpoint).
// Free plan: 100 requests/day, resets 00:00 UTC. Auth via x-apisports-key header.
// World Cup 2026 = league 1, season 2026.

const BASE = "https://v3.football.api-sports.io";

export type ApiTeam = {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    logo: string;
  };
};

export type ApiStanding = {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
};

export type ApiStandingsResponse = {
  league: {
    id: number;
    season: number;
    standings: ApiStanding[][];
  };
};

export type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: { id: number; season: number; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
};

async function apiFootball<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not set");

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football ${path} → HTTP ${res.status}`);

  const json = (await res.json()) as { response: T[]; errors?: unknown };
  const errs = json.errors;
  const hasErrors =
    errs &&
    ((Array.isArray(errs) && errs.length > 0) ||
      (!Array.isArray(errs) && typeof errs === "object" && Object.keys(errs).length > 0));
  if (hasErrors) throw new Error(`API-Football ${path} errors: ${JSON.stringify(errs)}`);

  return json.response ?? [];
}

export function fetchTeams(leagueId: number, season: number) {
  return apiFootball<ApiTeam>("/teams", { league: leagueId, season });
}

export function fetchStandings(leagueId: number, season: number) {
  return apiFootball<ApiStandingsResponse>("/standings", { league: leagueId, season });
}

export function fetchFixtures(
  leagueId: number,
  season: number,
  extra: Record<string, string | number> = {},
) {
  return apiFootball<ApiFixture>("/fixtures", { league: leagueId, season, ...extra });
}

// Status codes that mean the match is finished.
export const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
// Status codes that mean the match is in progress.
export const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
