import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOLD = "#f5c518";
const RAINBOW = "linear-gradient(90deg,#ff4d4d,#ffb020,#28c76f,#2f7bff,#9b5cff)";

// Scoreboard-style result graphic. Driven by query params so it renders without a
// DB and can be referenced by a public URL in Slack. Flags are flagcdn PNGs (which
// the renderer can embed, unlike the SVG crests).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const home = q.get("home") ?? "Home";
  const away = q.get("away") ?? "Away";
  const hg = q.get("hg") ?? "0";
  const ag = q.get("ag") ?? "0";
  const round = q.get("round") ?? "";
  const ho = q.get("ho") ?? "";
  const ao = q.get("ao") ?? "";
  const hf = q.get("hf") ?? "";
  const af = q.get("af") ?? "";
  const status = q.get("status") ?? "FULL TIME";
  const note = q.get("note") ?? "";

  const side = (name: string, owner: string, flag: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300, gap: 14 }}>
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} width={104} height={104} style={{ borderRadius: 52, objectFit: "cover", border: "3px solid rgba(255,255,255,0.18)" }} />
      ) : (
        <div style={{ display: "flex", width: 104, height: 104 }} />
      )}
      <div style={{ display: "flex", fontSize: 40, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>{name}</div>
      {owner ? <div style={{ display: "flex", fontSize: 22, color: "#8b95b5" }}>{owner}</div> : <div style={{ display: "flex" }} />}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0b1020",
          color: "white",
          fontFamily: "sans-serif",
          padding: 44,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", background: GOLD, color: "#0b1020", fontWeight: 800, fontSize: 24, padding: "6px 20px", borderRadius: 999 }}>
            ⚽ {status}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8b95b5" }}>{round}</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          {side(home, ho, hf)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 84, fontWeight: 900, color: GOLD }}>
              <span style={{ display: "flex" }}>{hg}</span>
              <span style={{ display: "flex", color: "#3a4567", margin: "0 14px" }}>–</span>
              <span style={{ display: "flex" }}>{ag}</span>
            </div>
            {note ? <div style={{ display: "flex", fontSize: 22, color: "#8b95b5" }}>{note}</div> : <div style={{ display: "flex" }} />}
          </div>
          {side(away, ao, af)}
        </div>

        <div style={{ display: "flex", height: 8, borderRadius: 999, backgroundImage: RAINBOW }} />
      </div>
    ),
    { width: 1000, height: 525 },
  );
}
