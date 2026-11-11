export type MaterialId = 'susu' | 'kakao' | 'tepung' | 'gula' | 'keju';
export type ShopItemId = MaterialId | 'bundle' | 'recipeGacha';
export type DessertId = 'milkChoco' | 'butterCookie' | 'bigChocoBar' | 'cookieBox' | 'royalCake';
export type PriceMode = 'sale' | 'normal' | 'shortage';

export const MATERIALS: { id: MaterialId; emoji: string }[] = [
  { id: 'susu', emoji: '🥛' },
  { id: 'kakao', emoji: '🍫' },
  { id: 'tepung', emoji: '🌾' },
  { id: 'gula', emoji: '🧊' },
  { id: 'keju', emoji: '🧀' },
];
export const MATERIAL_IDS: MaterialId[] = MATERIALS.map((m) => m.id);
export const MATERIAL_EMOJI: Record<MaterialId, string> = Object.fromEntries(MATERIALS.map((m) => [m.id, m.emoji])) as Record<
  MaterialId,
  string
>;

export const PRICE_MODES: Record<PriceMode, number> = { sale: 1, normal: 2, shortage: 4 };
export const PRICE_MODE_ORDER: PriceMode[] = ['sale', 'normal', 'shortage'];

export const BASE_PRICES: Record<ShopItemId, number> = {
  susu: 2,
  kakao: 2,
  tepung: 2,
  gula: 2,
  keju: 2,
  bundle: 5,
  recipeGacha: 3,
};
export const SHOP_ITEM_IDS: ShopItemId[] = [...MATERIAL_IDS, 'bundle', 'recipeGacha'];
export const SPECIAL_ITEMS: { id: 'bundle' | 'recipeGacha'; emoji: string }[] = [
  { id: 'bundle', emoji: '🎁' },
  { id: 'recipeGacha', emoji: '📜' },
];

export const DESSERT_EMOJI: Record<DessertId, string> = {
  milkChoco: '🍬',
  butterCookie: '🍪',
  bigChocoBar: '🍫',
  cookieBox: '🥨',
  royalCake: '🎂',
};

export type IngredientQty = number | 'tier2Need';
export type Ingredient =
  | { kind: 'material'; id: MaterialId; qty: IngredientQty }
  | { kind: 'dessert'; id: DessertId; qty: IngredientQty };

export interface Recipe {
  id: DessertId;
  tier: 1 | 2 | 3;
  ingredients: Ingredient[];
  recipeCard: 'normal' | 'legendary';
  reward: 'mini' | 'medium' | 'royal';
}

export const RECIPES: Recipe[] = [
  {
    id: 'milkChoco',
    tier: 1,
    ingredients: [
      { kind: 'material', id: 'susu', qty: 1 },
      { kind: 'material', id: 'kakao', qty: 1 },
    ],
    recipeCard: 'normal',
    reward: 'mini',
  },
  {
    id: 'butterCookie',
    tier: 1,
    ingredients: [
      { kind: 'material', id: 'tepung', qty: 1 },
      { kind: 'material', id: 'gula', qty: 1 },
    ],
    recipeCard: 'normal',
    reward: 'mini',
  },
  {
    id: 'bigChocoBar',
    tier: 2,
    ingredients: [
      { kind: 'dessert', id: 'milkChoco', qty: 'tier2Need' },
      { kind: 'material', id: 'susu', qty: 1 },
    ],
    recipeCard: 'normal',
    reward: 'medium',
  },
  {
    id: 'cookieBox',
    tier: 2,
    ingredients: [
      { kind: 'dessert', id: 'butterCookie', qty: 'tier2Need' },
      { kind: 'material', id: 'kakao', qty: 2 },
    ],
    recipeCard: 'normal',
    reward: 'medium',
  },
  {
    id: 'royalCake',
    tier: 3,
    ingredients: [
      { kind: 'dessert', id: 'bigChocoBar', qty: 1 },
      { kind: 'dessert', id: 'cookieBox', qty: 1 },
      { kind: 'material', id: 'keju', qty: 2 },
    ],
    recipeCard: 'legendary',
    reward: 'royal',
  },
];
