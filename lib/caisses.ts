import skinsData from "./skins.json";

// ---------------------------------------------------------------------------
// Portage EXACT (en TypeScript) de la logique de tirage de bot.py, pour que le site puisse
// ouvrir une vraie caisse sans jamais donner un résultat que le bot n'aurait pas pu donner.
// Toute constante ci-dessous (prix, odds, poids) doit rester identique à bot.py -- si tu changes
// une valeur d'un côté, change-la aussi de l'autre.
// ---------------------------------------------------------------------------

export type SkinWearInfo = { image: string; prices: Record<string, number> };
export type Skin = {
  name: string;
  weapon: string;
  rarity: string;
  variants: string[];
  wears: Record<string, SkinWearInfo>;
};

const SKINS_DATABASE = skinsData as Skin[];

// Mêmes 7 paliers, même ordre, que RARITY_TIERS dans bot.py.
export const RARITY_TIERS = [
  "Industrial Grade ⚪",
  "Mil-Spec Grade 🔵",
  "Restricted 🟣",
  "Classified 🩷",
  "Covert 🔴",
  "★ Couteau 🔪",
  "★ Gants 🧤",
] as const;

export const RARITY_COLORS: Record<string, string> = {
  "Industrial Grade ⚪": "#5E98D9",
  "Mil-Spec Grade 🔵": "#4B69FF",
  "Restricted 🟣": "#8847FF",
  "Classified 🩷": "#D32CE6",
  "Covert 🔴": "#EB4B4B",
  "★ Couteau 🔪": "#E4B740",
  "★ Gants 🧤": "#00C2CB",
};

export const SKINS_BY_RARITY: Record<string, Skin[]> = {};
for (const r of RARITY_TIERS) {
  SKINS_BY_RARITY[r] = SKINS_DATABASE.filter((s) => s.rarity === r);
}

// Amortissement du prix dans la pondération intra-palier -- identique à RARITY_PRICE_DAMPING.
const RARITY_PRICE_DAMPING = 0.3;

function skinAvgPrice(skin: Skin): number {
  const prices: number[] = [];
  for (const w of Object.values(skin.wears)) {
    const p = w.prices["Normal"] ?? Object.values(w.prices)[0];
    if (p) prices.push(p);
  }
  if (!prices.length) return 0.01;
  return Math.max(prices.reduce((a, b) => a + b, 0) / prices.length, 0.01);
}

function skinRarityWeight(skin: Skin): number {
  return 1 / Math.pow(skinAvgPrice(skin), RARITY_PRICE_DAMPING);
}

// Toutes les usures ont la même chance (20% chacune) -- identique à WEAR_WEIGHTS dans bot.py.
const WEAR_WEIGHTS: Record<string, number> = {
  "Factory New": 20,
  "Minimal Wear": 20,
  "Field-Tested": 20,
  "Well-Worn": 20,
  "Battle-Scarred": 20,
};

const VARIANT_WEIGHTS: Record<string, number> = { Normal: 100, StatTrak: 10, Souvenir: 2 };

// Équivalent de random.choices(items, weights=weights, k=1)[0] en Python.
function weightedChoice<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export type RollResult = {
  skin: Skin;
  rarity: string;
  wear: string;
  variant: string;
  price: number;
  image: string;
};

function rollFromPool(pool: Skin[]) {
  const skin = weightedChoice(pool, pool.map(skinRarityWeight));
  const wears = Object.keys(skin.wears);
  const wear = weightedChoice(wears, wears.map((w) => WEAR_WEIGHTS[w] ?? 1));
  const wearInfo = skin.wears[wear];
  const variants = skin.variants.filter((v) => v in wearInfo.prices);
  const variant = weightedChoice(variants, variants.map((v) => VARIANT_WEIGHTS[v] ?? 1));
  const price = wearInfo.prices[variant];
  const image = wearInfo.image;
  return { skin, wear, variant, price, image };
}

// Tire une rareté (pondérée par les "weights" de la caisse choisie), puis un skin dans ce palier.
export function rollSkin(weights: Record<string, number>): RollResult {
  const tiers = RARITY_TIERS.filter((r) => SKINS_BY_RARITY[r].length > 0);
  const poids = tiers.map((r) => weights[r] ?? 0);
  const rarity = weightedChoice(tiers as unknown as string[], poids);
  const { skin, wear, variant, price, image } = rollFromPool(SKINS_BY_RARITY[rarity]);
  return { skin, rarity, wear, variant, price, image };
}

// Doublon -> converti en XP, mêmes montants que DUPLICATE_XP dans bot.py.
export const DUPLICATE_XP: Record<string, number> = {
  "Industrial Grade ⚪": 5,
  "Mil-Spec Grade 🔵": 10,
  "Restricted 🟣": 25,
  "Classified 🩷": 60,
  "Covert 🔴": 150,
  "★ Couteau 🔪": 400,
  "★ Gants 🧤": 400,
};

export type CaseConfig = {
  key: string;
  name: string;
  price: number;
  color: string;
  free?: boolean;
  weights: Record<string, number>;
};

// Les 5 caisses payantes -- prix/couleurs/odds copiés EXACTEMENT de la liste CASES dans bot.py.
export const CASES: CaseConfig[] = [
  {
    key: "recrue",
    name: "Caisse Recrue",
    price: 40,
    color: "#95A5A6",
    weights: {
      "Industrial Grade ⚪": 6,
      "Mil-Spec Grade 🔵": 22,
      "Restricted 🟣": 42,
      "Classified 🩷": 26,
      "Covert 🔴": 4,
    },
  },
  {
    key: "standard",
    name: "Caisse Standard",
    price: 100,
    color: "#1ABC9C",
    weights: {
      "Industrial Grade ⚪": 1,
      "Mil-Spec Grade 🔵": 9,
      "Restricted 🟣": 30,
      "Classified 🩷": 40,
      "Covert 🔴": 20,
    },
  },
  {
    key: "elite",
    name: "Caisse Élite",
    price: 220,
    color: "#3498DB",
    weights: {
      "Mil-Spec Grade 🔵": 2,
      "Restricted 🟣": 15,
      "Classified 🩷": 40,
      "Covert 🔴": 42,
      "★ Couteau 🔪": 0.5,
      "★ Gants 🧤": 0.5,
    },
  },
  {
    key: "legendaire",
    name: "Caisse Légendaire",
    price: 400,
    color: "#F1C40F",
    weights: {
      "Restricted 🟣": 5,
      "Classified 🩷": 27,
      "Covert 🔴": 65,
      "★ Couteau 🔪": 1.5,
      "★ Gants 🧤": 1.5,
    },
  },
  {
    key: "mythique",
    name: "Caisse Mythique",
    price: 700,
    color: "#9B59B6",
    weights: {
      "Classified 🩷": 8,
      "Covert 🔴": 88,
      "★ Couteau 🔪": 2,
      "★ Gants 🧤": 2,
    },
  },
];

// Odds alignées sur la Caisse Élite -- même choix que bot.py (FREE_CASE["weights"] = CASES[2]["weights"]).
export const FREE_CASE: CaseConfig = {
  key: "gratuite",
  name: "Caisse Gratuite",
  price: 0,
  color: "#2ECC71",
  free: true,
  weights: CASES[2].weights,
};

export function findCase(key: string): CaseConfig | undefined {
  if (key === FREE_CASE.key) return FREE_CASE;
  return CASES.find((c) => c.key === key);
}

// "daily:YYYY-MM-DD" en UTC -- identique à mission_day_key() dans bot.py (reset à minuit UTC).
export function missionDayKey(): string {
  return "daily:" + new Date().toISOString().slice(0, 10);
}
