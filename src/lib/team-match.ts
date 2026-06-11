// Shared fuzzy team-name matching for the no-key result fallbacks (openfootball,
// TheSportsDB). Those feeds use slightly different country names than
// football-data, so we normalise both sides to a common key before matching.

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

// Reconcile the few names that differ between feeds and football-data.
const ALIAS: Record<string, string> = {
  unitedstates: "usa",
  korearepublic: "southkorea",
  czechia: "czech",
  czechrepublic: "czech",
  iriran: "iran",
  cotedivoire: "ivorycoast",
  caboverde: "capeverde",
  congodr: "drcongo",
};

export function key(s: string): string {
  const n = norm(s);
  return ALIAS[n] ?? n;
}

export function pairKey(a: string, b: string): string {
  return [key(a), key(b)].sort().join("|");
}

export function dateKey(d: Date | string): string {
  return (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
}
