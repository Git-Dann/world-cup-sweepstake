// Sample dataset for previewing the presentation before real data is synced.
// Flags come from flagcdn.com (free, no key). England uses the gb-eng subdivision.

export type DemoTeam = { name: string; code: string; group: string; iso2: string };

export const DEMO_TEAMS: DemoTeam[] = [
  // Group A
  { name: "Brazil", code: "BRA", group: "A", iso2: "br" },
  { name: "Spain", code: "ESP", group: "A", iso2: "es" },
  { name: "Germany", code: "GER", group: "A", iso2: "de" },
  { name: "Mexico", code: "MEX", group: "A", iso2: "mx" },
  // Group B
  { name: "Argentina", code: "ARG", group: "B", iso2: "ar" },
  { name: "France", code: "FRA", group: "B", iso2: "fr" },
  { name: "Netherlands", code: "NED", group: "B", iso2: "nl" },
  { name: "USA", code: "USA", group: "B", iso2: "us" },
  // Group C
  { name: "England", code: "ENG", group: "C", iso2: "gb-eng" },
  { name: "Portugal", code: "POR", group: "C", iso2: "pt" },
  { name: "Belgium", code: "BEL", group: "C", iso2: "be" },
  { name: "Japan", code: "JPN", group: "C", iso2: "jp" },
  // Group D
  { name: "Italy", code: "ITA", group: "D", iso2: "it" },
  { name: "Morocco", code: "MAR", group: "D", iso2: "ma" },
  { name: "Senegal", code: "SEN", group: "D", iso2: "sn" },
  { name: "South Korea", code: "KOR", group: "D", iso2: "kr" },
];

export const DEMO_PLAYERS = ["Alex", "Sam", "Jordan", "Priya", "Liam", "Noah", "Mia", "Chloe"];

export function flagUrl(iso2: string): string {
  return `https://flagcdn.com/w160/${iso2}.png`;
}
