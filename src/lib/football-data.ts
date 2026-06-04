// Client for football-data.org (v4). Free tier covers the World Cup (code "WC")
// — fixtures, results, standings — with slightly delayed scores. Auth via the
// X-Auth-Token header (free personal token from football-data.org/client/register).

const BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

export type FdTeam = {
  id: number;
  name: string;
  tla: string | null;
  crest: string | null;
};

export type FdStandings = {
  standings: {
    stage: string;
    type: string;
    group: string | null;
    table: { position: number; team: { id: number } }[];
  }[];
};

export type FdMatch = {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, SUSPENDED, POSTPONED, CANCELLED, AWARDED
  stage: string; // GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, THIRD_PLACE, FINAL
  group: string | null; // GROUP_A … or null for knockouts
  homeTeam: { id: number | null; name: string | null; crest: string | null };
  awayTeam: { id: number | null; name: string | null; crest: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration?: string; // REGULAR, EXTRA_TIME, PENALTY_SHOOTOUT
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
};

async function fd<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN is not set");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${path} → HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTeams(): Promise<FdTeam[]> {
  const data = await fd<{ teams: FdTeam[] }>(`/competitions/${COMPETITION}/teams`);
  return data.teams ?? [];
}

export function fetchStandings(): Promise<FdStandings> {
  return fd<FdStandings>(`/competitions/${COMPETITION}/standings`);
}

export async function fetchMatches(): Promise<FdMatch[]> {
  const data = await fd<{ matches: FdMatch[] }>(`/competitions/${COMPETITION}/matches`);
  return data.matches ?? [];
}

export const FD_FINISHED = new Set(["FINISHED", "AWARDED"]);
export const FD_LIVE = new Set(["IN_PLAY", "PAUSED"]);

// Map a football-data stage to a friendly round label that scoring.roundKeyFromApi understands.
export function stageToRoundLabel(stage: string): string {
  switch (stage) {
    case "GROUP_STAGE":
      return "Group Stage";
    case "LAST_32":
      return "Round of 32";
    case "LAST_16":
      return "Round of 16";
    case "QUARTER_FINALS":
      return "Quarter-finals";
    case "SEMI_FINALS":
      return "Semi-finals";
    case "THIRD_PLACE":
      return "Third-place final";
    case "FINAL":
      return "Final";
    default:
      return stage;
  }
}
