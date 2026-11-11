import { DESSERT_EMOJI, MATERIAL_EMOJI } from '../data/recipes';
import type { ResolvedIngredient, ResolvedRecipe } from '../engine/craftingRules';
import { translate, type TKey } from '../i18n';
import { useT } from '../hooks/useT';
import { Bi } from './ui';

const ingKey = (i: ResolvedIngredient): TKey => (i.kind === 'material' ? `mat_${i.id}` : `d_${i.id}`) as TKey;
const ingEmoji = (i: ResolvedIngredient) => (i.kind === 'material' ? MATERIAL_EMOJI[i.id] : DESSERT_EMOJI[i.id]);

const TIER_STYLE = {
  1: { border: '#E2E8F0', bg: '#3B2819', text: 'text-silver' },
  2: { border: '#E8954A', bg: '#3f2614', text: 'text-caramel' },
  3: { border: '#FFD700', bg: '#3d300a', text: 'text-gold' },
} as const;

function Slot({ emoji, qty, size, kind = 'plain', label }: { emoji: string; qty?: number; size: number; kind?: 'plain' | 'recipe' | 'legendary' | 'result'; label: string }) {
  const style =
    kind === 'recipe'
      ? { background: '#f3e3b5' }
      : kind === 'legendary'
        ? { background: '#FFD700' }
        : kind === 'result'
          ? { background: '#5a3d22' }
          : undefined;
  return (
    <div className={`slot flex-none ${kind === 'result' ? 'slot-dark' : ''}`} style={{ width: size, height: size, fontSize: size * 0.52, ...style }} role="img" aria-label={label}>
      <span aria-hidden>{emoji}</span>
      {qty !== undefined && qty > 1 && <span className="qty-badge">×{qty}</span>}
    </div>
  );
}

const Op = ({ c }: { c: string }) => (
  <span className="flex-none font-pixel text-[18px] text-cream/80" aria-hidden>
    {c}
  </span>
);

export function RecipeCard({ recipe, slot = 58, compact, captionLines = 2 }: { recipe: ResolvedRecipe; slot?: number; compact?: boolean; captionLines?: 1 | 2 }) {
  const st = TIER_STYLE[recipe.tier];
  const legendary = recipe.recipeCard === 'legendary';
  const caption = (lang: 'id' | 'ko') =>
    [
      ...recipe.ingredients.map((i) => `${translate(lang, ingKey(i))}${i.qty > 1 ? ` ×${i.qty}` : ''}`),
      translate(lang, legendary ? 'legendaryRecipe' : 'recipe'),
    ].join(' + ');
  const { lang } = useT();

  return (
    <div
      className={`relative flex ${compact ? 'flex-col items-start gap-2' : 'items-center gap-4'} border-[3px] p-[10px]`}
      style={{ borderColor: st.border, background: st.bg, boxShadow: recipe.tier === 3 ? '0 0 0 3px #000, 6px 6px 0 3px #000' : '0 0 0 3px #000' }}
    >
      <div className="flex items-center" style={{ gap: compact ? 6 : 9 }}>
        {recipe.ingredients.map((ing, i) => (
          <span key={i} className="flex items-center" style={{ gap: compact ? 6 : 9 }}>
            {i > 0 && <Op c="+" />}
            <Slot emoji={ingEmoji(ing)} qty={ing.qty} size={slot} label={`${translate('id', ingKey(ing))} ×${ing.qty}`} />
          </span>
        ))}
        <Op c="+" />
        <Slot emoji="📜" size={slot} kind={legendary ? 'legendary' : 'recipe'} label={translate('id', legendary ? 'legendaryRecipe' : 'recipe')} />
        <Op c="→" />
        <div className="relative">
          {recipe.tier === 3 && (
            <span className="absolute -top-[26px] left-1/2 -translate-x-1/2 text-[26px]" aria-hidden>
              👑
            </span>
          )}
          <Slot emoji={DESSERT_EMOJI[recipe.id]} size={slot + 10} kind="result" label={translate('id', `d_${recipe.id}` as TKey)} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <Bi k={`d_${recipe.id}` as TKey} size="md" px={recipe.tier === 3 ? [26, 15] : [22, 14]} weight={700} className={st.text} />
        <span className={`mt-[3px] block font-medium text-cream/75 ${captionLines === 1 ? 'truncate' : 'line-clamp-2'} leading-tight ${compact ? 'text-[14px]' : 'text-[13px]'}`} title={`${caption('id')} / ${caption('ko')}`}>
          {caption(lang)}
        </span>
      </div>
    </div>
  );
}
