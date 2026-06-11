// Builds the public URL for the rendered scoreboard graphic (/api/og/match) and
// the human labels that go with a finished result. Shared by the poller and the
// admin re-post action so the Slack card is identical wherever it's sent.

type CardFixture = {
  round: string;
  homeGoals: number | null;
  awayGoals: number | null;
  duration: string | null;
  penHome: number | null;
  penAway: number | null;
  homeTeam: { name: string; flagUrl: string | null; owner: { name: string } | null } | null;
  awayTeam: { name: string; flagUrl: string | null; owner: { name: string } | null } | null;
};

export function statusLabelFor(f: { duration: string | null }): string {
  return f.duration === "PENALTY_SHOOTOUT"
    ? "PENALTIES"
    : f.duration === "EXTRA_TIME"
      ? "AFTER EXTRA TIME"
      : "FULL TIME";
}

export function penaltyNoteFor(f: {
  duration: string | null;
  penHome: number | null;
  penAway: number | null;
}): string {
  return f.duration === "PENALTY_SHOOTOUT" && f.penHome != null && f.penAway != null
    ? `${f.penHome}–${f.penAway} on penalties`
    : "";
}

// Root-relative path (querystring driven) for the scoreboard graphic. Prefix with
// an absolute base for Slack; use as-is for an in-browser <img> preview.
export function matchCardPath(f: CardFixture): string {
  const mp = new URLSearchParams({
    home: f.homeTeam?.name ?? "",
    away: f.awayTeam?.name ?? "",
    hg: String(f.homeGoals ?? 0),
    ag: String(f.awayGoals ?? 0),
    round: f.round,
    ho: f.homeTeam?.owner?.name ?? "",
    ao: f.awayTeam?.owner?.name ?? "",
    hf: f.homeTeam?.flagUrl ?? "",
    af: f.awayTeam?.flagUrl ?? "",
    status: statusLabelFor(f),
    note: penaltyNoteFor(f),
  });
  return `/api/og/match?${mp.toString()}`;
}
