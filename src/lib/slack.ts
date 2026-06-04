type SlackElement =
  | { type: "mrkdwn"; text: string }
  | { type: "image"; image_url: string; alt_text: string };
type SlackBlock = Record<string, unknown>;

export async function postToSlack(message: {
  text: string;
  blocks?: SlackBlock[];
}): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn("[slack] SLACK_WEBHOOK_URL not set — skipping post");
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) console.warn(`[slack] webhook returned ${res.status}`);
    return res.ok;
  } catch (e) {
    console.warn("[slack] post failed:", e);
    return false;
  }
}

export type TeamLine = {
  name: string;
  logo: string | null;
  goals: number | null;
  owner: string | null;
  points: number;
};

const pts = (n: number) => `${n} pt${n === 1 ? "" : "s"}`;

// A single match result / live update.
export function resultMessage(args: {
  finished: boolean;
  statusLabel: string;
  round: string;
  base: string;
  home: TeamLine;
  away: TeamLine;
}) {
  const { finished, statusLabel, round, home, away, base } = args;
  const hg = home.goals ?? 0;
  const ag = away.goals ?? 0;
  const head = finished ? `⚽ FULL TIME — ${round}` : `🔴 ${statusLabel} — ${round}`;

  const ownerLine = (t: TeamLine) =>
    `*${t.name}* — ${t.owner ?? "_unowned_"} · ${pts(t.points)}`;

  const elements: SlackElement[] = [];
  if (home.logo) elements.push({ type: "image", image_url: home.logo, alt_text: home.name });
  elements.push({ type: "mrkdwn", text: ownerLine(home) });
  if (away.logo) elements.push({ type: "image", image_url: away.logo, alt_text: away.name });
  elements.push({ type: "mrkdwn", text: ownerLine(away) });
  if (base) elements.push({ type: "mrkdwn", text: `<${base}|Leaderboard ↗>` });

  return {
    text: `${statusLabel}: ${home.name} ${hg}-${ag} ${away.name}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: head, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${home.name}*   ${hg} – ${ag}   *${away.name}*` } },
      { type: "context", elements },
    ],
  };
}

// The standings, with the rendered leaderboard image.
export function leaderboardMessage(args: {
  base: string;
  title?: string;
  top: { rank: number; name: string; total: number }[];
  imageUrl?: string;
}) {
  const title = args.title ?? "🏆 World Cup Sweepstake — Leaderboard";
  const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}.`);
  const lines =
    args.top.map((t) => `${medal(t.rank)} *${t.name}* — ${pts(t.total)}`).join("\n") ||
    "_No scores yet._";

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: title, emoji: true } },
  ];
  if (args.imageUrl) blocks.push({ type: "image", image_url: args.imageUrl, alt_text: "Leaderboard" });
  blocks.push({ type: "section", text: { type: "mrkdwn", text: lines } });
  if (args.base)
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `<${args.base}|View the live leaderboard ↗>` }],
    });

  return { text: title, blocks };
}

// Morning preview of the day's fixtures.
export function fixturesPreviewMessage(args: {
  dateLabel: string;
  matches: { time: string; home: string; away: string; owners?: string }[];
}) {
  const lines = args.matches
    .map(
      (m) =>
        `\`${m.time}\`  *${m.home}* v *${m.away}*${m.owners ? `  —  ${m.owners}` : ""}`,
    )
    .join("\n");
  return {
    text: `Today's matches — ${args.dateLabel}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📅 Today's matches — ${args.dateLabel}`, emoji: true },
      },
      { type: "section", text: { type: "mrkdwn", text: lines || "_No matches today._" } },
    ],
  };
}
