// FIFA World Cup 2026 seeding (official draw, 5 Dec 2025).
// "Strong" = Pots 1 + 2 (the 24 highest-ranked); everything else is "weak" (Pots 3 + 4).
// Keyed by football-data team names. Used by the seeded/balanced draw.
const STRONG = new Set<string>([
  // Pot 1
  "United States",
  "Canada",
  "Mexico",
  "Spain",
  "Argentina",
  "France",
  "England",
  "Brazil",
  "Portugal",
  "Netherlands",
  "Belgium",
  "Germany",
  // Pot 2
  "Croatia",
  "Morocco",
  "Colombia",
  "Uruguay",
  "Switzerland",
  "Japan",
  "Senegal",
  "Iran",
  "South Korea",
  "Ecuador",
  "Austria",
  "Australia",
]);

export function isStrongTeam(name: string): boolean {
  return STRONG.has(name);
}
