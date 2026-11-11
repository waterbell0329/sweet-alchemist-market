import { useMemo } from 'react';
import { FlaskConical } from 'lucide-react';
import { recipesForGrade, tier2Need } from '../engine/craftingRules';
import { useGame } from '../store/gameStore';
import type { TKey } from '../i18n';
import { ClosedStamp } from './MarketPanel';
import { RecipeCard } from './RecipeCard';
import { Bi, PanelTitle } from './ui';

function TierLabel({ tier, rewardKey, children }: { tier: 1 | 2 | 3; rewardKey: TKey; children?: React.ReactNode }) {
  const color = tier === 1 ? 'bg-silver text-black' : tier === 2 ? 'bg-caramel text-black' : 'bg-gold text-black';
  return (
    <div className="flex w-[280px] flex-none flex-col gap-[3px]">
      <div className="flex items-center gap-2">
        <span className={`flex-none border-[3px] border-black px-2 py-[3px] font-pixel text-[13px] ${color}`}>T{tier}</span>
        <Bi k={`tier${tier}` as TKey} size="md" px={[20, 12]} weight={700} className="min-w-0 leading-tight text-cream" />
      </div>
      <Bi k={rewardKey} size="xs" px={[15, 11]} weight={600} inline className="text-gold" />
      {children}
    </div>
  );
}

// Logical-px budget of one tier row (see layout below): used to size recipe slots so everything fits.
const FIXED_H = 188; // title + padding + banner + gaps
const LABEL_W = 294; // tier label + gap
const T12_EXTRA = 324; // card padding, gaps, operators and a minimum name width beside 4 slots
const T3_EXTRA = 428; // same for the 5-slot royal recipe

/** w/h: logical size of the screen (already divided by the content zoom). */
export function CraftingTree({ w, h }: { w: number; h: number }) {
  const grade = useGame((s) => s.grade);
  const closed = useGame((s) => s.sec <= 600);
  const recipes = useMemo(() => recipesForGrade(grade), [grade]);
  const rowH = (h - FIXED_H) / 3;
  const area = w - 28 - LABEL_W;
  const cardW = (area - 14) / 2;
  const fit = (n: number) => Math.max(32, Math.floor(n));
  const slot = fit(Math.min(80, rowH - 40, (cardW - T12_EXTRA) / 4));
  // Very short rows (largest size + task strip) get a one-line ingredient caption.
  const captionLines = rowH < 130 ? 1 : 2;
  const slot3 = fit(Math.min(80, rowH - 64, (area - T3_EXTRA) / 5));
  const t1 = recipes.filter((r) => r.tier === 1);
  const t2 = recipes.filter((r) => r.tier === 2);
  const t3 = recipes.filter((r) => r.tier === 3);

  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="crafting">
      <PanelTitle
        k="craftTitle"
        icon={<FlaskConical size={26} className="text-gold" strokeWidth={2.5} />}
        right={
          <span className="flex max-w-[330px] items-center gap-2 border-2 border-black bg-mint px-2 py-[2px] text-black">
            <span className="font-pixel text-[16px]">∞</span>
            <Bi k="recipeUnlimited" size="xs" px={[14, 11]} weight={700} />
          </span>
        }
      />
      <div className="relative flex min-h-0 flex-1 flex-col gap-[12px] p-[14px]">
        <div className="flex items-center justify-between gap-3 border-[3px] border-black bg-coral px-3 py-[6px] text-cream" style={{ boxShadow: '4px 4px 0 #000' }}>
          <span className="text-[30px]" aria-hidden>
            📜
          </span>
          <Bi k="mustShowRecipe" size="lg" px={[26, 16]} weight={700} inline className="flex-1 text-center" />
          <span className="text-[30px]" aria-hidden>
            ✋
          </span>
        </div>

        <div className="flex min-h-0 flex-1 items-center gap-[14px]">
          <TierLabel tier={1} rewardKey="reward_mini" />
          <div className="grid flex-1 grid-cols-2 gap-[14px]">
            {t1.map((r) => (
              <RecipeCard key={r.id} recipe={r} slot={slot} captionLines={captionLines} />
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center gap-[14px]">
          <TierLabel tier={2} rewardKey="reward_medium">
            <span className="flex w-fit items-center gap-2 border-2 border-black bg-caramel px-2 py-[2px] text-black">
              <span className="font-pixel text-[13px]">×{tier2Need(grade)}</span>
              <Bi k="tier2Need" p={{ grade, count: tier2Need(grade) }} size="xs" px={[14, 11]} weight={700} />
            </span>
            {/* The return-rule reminder only fits when rows are tall (smaller sizes); the tutorial also covers it. */}
            {rowH >= 185 && <Bi k="tier2Return" size="xs" px={[12, 10]} className="text-cream/70" weight={500} />}
          </TierLabel>
          <div className="grid flex-1 grid-cols-2 gap-[14px]">
            {t2.map((r) => (
              <RecipeCard key={r.id} recipe={r} slot={slot} captionLines={captionLines} />
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center gap-[14px]">
          <TierLabel tier={3} rewardKey="reward_royal" />
          <div className="flex-1 pt-[24px]">
            {t3.map((r) => (
              <RecipeCard key={r.id} recipe={r} slot={slot3} captionLines={captionLines} />
            ))}
          </div>
        </div>
        {closed && <ClosedStamp k="craftClosed" />}
      </div>
    </section>
  );
}
