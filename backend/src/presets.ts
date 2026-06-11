// Category presets. Adding a new domain is as simple as adding an entry here;
// the rest of the app stays generic (entrants + options).

export interface PresetSidePrize {
  name: string;
  note?: string;
}

export interface PresetOption {
  label: string;
  // Short code shown on the wheel (e.g. "NED"). Full label is used elsewhere.
  alias?: string;
}

export interface Preset {
  id: string;
  category: string;
  label: string;
  description: string;
  options: PresetOption[];
  sidePrizes: PresetSidePrize[];
}

function opt(label: string, alias?: string): PresetOption {
  return { label, alias };
}

// 48-team format (2026 onwards). Aliases are FIFA-style three-letter codes.
const WORLD_CUP_48: PresetOption[] = [
  opt("Argentina", "ARG"),
  opt("Australia", "AUS"),
  opt("Austria", "AUT"),
  opt("Belgium", "BEL"),
  opt("Bosnia & Herzegovina", "BIH"),
  opt("Brazil", "BRA"),
  opt("Canada", "CAN"),
  opt("Cape Verde", "CPV"),
  opt("Colombia", "COL"),
  opt("Costa Rica", "CRC"),
  opt("Croatia", "CRO"),
  opt("Curaçao", "CUW"),
  opt("Czech Republic", "CZE"),
  opt("Denmark", "DEN"),
  opt("DR Congo", "COD"),
  opt("Ecuador", "ECU"),
  opt("Egypt", "EGY"),
  opt("England", "ENG"),
  opt("France", "FRA"),
  opt("Germany", "GER"),
  opt("Ghana", "GHA"),
  opt("Iraq", "IRQ"),
  opt("Iran", "IRN"),
  opt("Ivory Coast", "CIV"),
  opt("Japan", "JPN"),
  opt("Jordan", "JOR"),
  opt("Mexico", "MEX"),
  opt("Morocco", "MAR"),
  opt("Netherlands", "NED"),
  opt("New Zealand", "NZL"),
  opt("Nigeria", "NGA"),
  opt("Norway", "NOR"),
  opt("Panama", "PAN"),
  opt("Paraguay", "PAR"),
  opt("Poland", "POL"),
  opt("Portugal", "POR"),
  opt("Qatar", "QAT"),
  opt("Saudi Arabia", "KSA"),
  opt("Scotland", "SCO"),
  opt("Senegal", "SEN"),
  opt("South Africa", "RSA"),
  opt("South Korea", "KOR"),
  opt("Spain", "ESP"),
  opt("Sweden", "SWE"),
  opt("Switzerland", "SUI"),
  opt("Turkey", "TUR"),
  opt("USA", "USA"),
  opt("Uzbekistan", "UZB"),
];

const PREMIER_LEAGUE_20: PresetOption[] = [
  opt("Arsenal", "ARS"),
  opt("Aston Villa", "AVL"),
  opt("Bournemouth", "BOU"),
  opt("Brentford", "BRE"),
  opt("Brighton", "BHA"),
  opt("Chelsea", "CHE"),
  opt("Crystal Palace", "CRY"),
  opt("Everton", "EVE"),
  opt("Fulham", "FUL"),
  opt("Liverpool", "LIV"),
  opt("Luton Town", "LUT"),
  opt("Manchester City", "MCI"),
  opt("Manchester United", "MUN"),
  opt("Newcastle United", "NEW"),
  opt("Nottingham Forest", "NFO"),
  opt("Sheffield United", "SHU"),
  opt("Tottenham Hotspur", "TOT"),
  opt("West Ham United", "WHU"),
  opt("Wolves", "WOL"),
  opt("Burnley", "BUR"),
];

const F1_GRID: PresetOption[] = [
  opt("Max Verstappen", "VER"),
  opt("Sergio Perez", "PER"),
  opt("Lewis Hamilton", "HAM"),
  opt("George Russell", "RUS"),
  opt("Charles Leclerc", "LEC"),
  opt("Carlos Sainz", "SAI"),
  opt("Lando Norris", "NOR"),
  opt("Oscar Piastri", "PIA"),
  opt("Fernando Alonso", "ALO"),
  opt("Lance Stroll", "STR"),
  opt("Esteban Ocon", "OCO"),
  opt("Pierre Gasly", "GAS"),
  opt("Alex Albon", "ALB"),
  opt("Logan Sargeant", "SAR"),
  opt("Valtteri Bottas", "BOT"),
  opt("Zhou Guanyu", "ZHO"),
  opt("Kevin Magnussen", "MAG"),
  opt("Nico Hulkenberg", "HUL"),
  opt("Yuki Tsunoda", "TSU"),
  opt("Daniel Ricciardo", "RIC"),
];

export const PRESETS: Preset[] = [
  {
    id: "wc-2026",
    category: "football",
    label: "World Cup (48 teams)",
    description: "All 48 nations from the expanded World Cup format.",
    options: WORLD_CUP_48,
    sidePrizes: [
      { name: "Golden Boot", note: "Top scorer of the tournament" },
      { name: "First Team Eliminated", note: "Wooden spoon" },
    ],
  },
  {
    id: "epl",
    category: "football",
    label: "Premier League (20 clubs)",
    description: "A 20-club English Premier League season.",
    options: PREMIER_LEAGUE_20,
    sidePrizes: [
      { name: "Golden Boot", note: "Top scorer of the season" },
      { name: "First Manager Sacked" },
    ],
  },
  {
    id: "f1",
    category: "motorsport",
    label: "F1 Grid (20 drivers)",
    description: "A full Formula 1 driver grid.",
    options: F1_GRID,
    sidePrizes: [
      { name: "Most DNFs", note: "Did Not Finish count" },
      { name: "Fastest Lap of the Season" },
    ],
  },
  {
    id: "blank",
    category: "custom",
    label: "Blank / Custom",
    description: "Start from scratch with your own options.",
    options: [],
    sidePrizes: [],
  },
];

export function listCategories(): string[] {
  return Array.from(new Set(PRESETS.map((p) => p.category)));
}

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
