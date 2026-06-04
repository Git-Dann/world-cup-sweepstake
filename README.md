# World Cup 2026 — Office Sweepstake ⚽🏆

A tiny, self-contained app that runs an office World Cup sweepstake: it randomly
draws all 48 teams across the players, tracks results from
[football-data.org](https://www.football-data.org/), keeps a points-based leaderboard,
and posts updates to Slack.

- **Public page** (`/`) — live leaderboard + group standings, no login.
- **Hidden admin** (`/admin`) — password-gated; add players, set the prize, tick
  who's paid, and run the draw. (Reachable via the discreet `·` in the footer.)
- **Slack** — match results post as they finish; a daily standings image posts each morning.

## How it works

```
GitHub Action (every 15 min) ─▶ /api/cron/poll-results ─┐
Vercel Cron   (daily 08:00)  ─▶ /api/cron/daily-sync    ─┤
                                                          ├▶ football-data.org ─▶ Neon DB ─▶ leaderboard + Slack
```

- The **poller** only calls football-data.org when a match is in its live window.
  The free tier allows **10 requests/min with no daily cap** — we use a tiny fraction.
- The **daily sync** (Vercel Cron — the only schedule Hobby allows) does a full
  refresh of teams/groups/fixtures and posts the morning preview + standings.
- Scoring: group win **+3**, draw **+1**; reaching R32 **+3**, R16 **+5**, QF **+8**,
  SF **+12**, Final **+18**, winning it **+30**. All editable in code (`src/lib/scoring.ts`).

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 6 · Neon Postgres · Vercel.

## Environment variables

| Var | What |
|---|---|
| `FOOTBALL_DATA_TOKEN` | football-data.org token ([register](https://www.football-data.org/client/register)) |
| `SLACK_WEBHOOK_URL` | Incoming webhook for the `#world-cup` channel |
| `CRON_SECRET` | Random secret guarding the cron endpoints |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `NEXT_PUBLIC_APP_URL` | Deployed URL (for absolute Slack image links) |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Added automatically by the Vercel **Neon** integration |

## Deploy to Vercel

1. **Import** this repo at vercel.com → *Add New → Project* (auto-detects Next.js).
2. **Storage → Neon**: add the Neon Postgres integration — it provisions the DB and
   injects `DATABASE_URL` + `DATABASE_URL_UNPOOLED`.
3. Add the other env vars from the table above.
4. **Deploy.** The build runs `prisma db push` automatically (additive only).
5. In **GitHub → repo Settings → Secrets → Actions**, add `APP_URL` (the deployed URL)
   and `CRON_SECRET` so the 15-min poller can reach the app.
6. Trigger an initial data load: `POST /api/cron/daily-sync?secret=<CRON_SECRET>`.

## Going live (checklist)

1. Add every player in `/admin`.
2. **Sync now** to pull the 48 teams.
3. **Run draw** — assigns teams randomly and reveals them on the public page.
4. Set the **prize / stakes** text.
5. Kick-off is **11 June 2026** — results and standings flow automatically from there.

## Local development

```bash
cp .env.example .env.local   # fill in the values (point DATABASE_URL at a Neon branch)
npm install
npx prisma db push
npm run dev
```
