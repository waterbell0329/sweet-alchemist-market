import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GAME_DURATION_SEC, GRADES, PHASE_AT, ROUND_SCHEDULE, STARTER_PACKS, TUTORIAL_SLIDES } from '../data/gameConfig';
import { BASE_PRICES, DESSERT_EMOJI, MATERIALS, PRICE_MODES, PRICE_MODE_ORDER, SPECIAL_ITEMS } from '../data/recipes';
import { formatSec } from '../engine/timerEngine';
import { OUTCOMES, formatPct } from '../data/investments';
import { recipesForGrade } from '../engine/craftingRules';
import { returnPerGold } from '../engine/investmentEngine';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import type { TKey } from '../i18n';
import { RecipeCard } from './RecipeCard';
import { Bi, Btn, Coin, CoinStack } from './ui';

const TOTAL = TUTORIAL_SLIDES;

function Slide1() {
  const steps = ['tut1_b1', 'tut1_b2', 'tut1_b3', 'tut1_b4', 'tut1_b5'] as TKey[];
  const icons = ['🥛', '📜', '🍬', '🤔', '🏆'];
  return (
    <div className="grid h-full grid-cols-[1fr_640px] items-center gap-12">
      <ol className="flex flex-col gap-4">
        {steps.map((k, i) => (
          <li key={k} className="flex items-center gap-5 border-4 border-black bg-choco px-5 py-3" style={{ boxShadow: '5px 5px 0 #000' }}>
            <span className="font-pixel text-[22px] text-gold">{i + 1}</span>
            <span className="text-[44px]" aria-hidden>
              {icons[i]}
            </span>
            <Bi k={k} size="xl" px={[34, 18]} weight={600} />
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-2" aria-hidden>
        <div className="flex items-center gap-3">
          {['🥛', '🍫'].map((e) => (
            <div key={e} className="slot h-[80px] w-[80px] text-[46px]">
              {e}
            </div>
          ))}
        </div>
        <span className="font-pixel text-[24px] text-cream">▼</span>
        <div className="slot h-[88px] w-[88px] text-[50px]">🍬</div>
        <span className="font-pixel text-[24px] text-cream">▼</span>
        <div className="slot h-[96px] w-[96px] text-[54px]" style={{ background: '#E8954A' }}>
          🍫
        </div>
        <span className="font-pixel text-[24px] text-cream">▼</span>
        <div className="relative">
          <span className="float-crown absolute -top-[46px] left-1/2 -ml-[24px] text-[48px]">👑</span>
          <div className="slot h-[110px] w-[110px] text-[64px]" style={{ background: '#FFD700' }}>
            🎂
          </div>
        </div>
      </div>
    </div>
  );
}

function PackCard({ kind }: { kind: 'rich' | 'technician' }) {
  const grade = useGame((s) => s.grade);
  const p = STARTER_PACKS[kind];
  const count = kind === 'rich' ? GRADES[grade].rich : GRADES[grade].technician;
  const rich = kind === 'rich';
  return (
    <div className="flex flex-col gap-4 border-4 border-black p-6" style={{ background: rich ? '#3d300a' : '#123a2d', boxShadow: `0 0 0 4px ${rich ? '#FFD700' : '#10B981'}, 8px 8px 0 4px #000` }}>
      <div className="flex items-center justify-between">
        <Bi k={rich ? 'tut2_rich' : 'tut2_tech'} size="2xl" px={[42, 20]} weight={700} className={rich ? 'text-gold' : 'text-mint'} />
        <span className="border-[3px] border-black bg-cream px-3 py-1 text-black">
          <Bi k="tut2_people" p={{ count }} size="lg" px={[26, 14]} weight={700} inline />
        </span>
      </div>
      <div className="flex items-center gap-4">
        <CoinStack total={p.total} size={64} />
        <Bi k="tut2_total" p={{ count: p.total }} size="xl" px={[32, 16]} weight={700} />
      </div>
      <div className="flex items-center gap-6 text-[26px]">
        <span className="flex items-center gap-2">
          <span aria-hidden>🃏</span>
          <Bi k="tut2_materials" p={{ count: p.materials }} size="lg" px={[26, 14]} />
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden>📜</span>
          {p.recipes ? <Bi k="tut2_recipes" p={{ count: p.recipes }} size="lg" px={[26, 14]} /> : <Bi k="tut2_noRecipe" size="lg" px={[26, 14]} className="text-coral" />}
        </span>
      </div>
      <Bi k={rich ? 'tut2_rich_desc' : 'tut2_tech_desc'} size="xl" px={[30, 17]} weight={600} />
    </div>
  );
}

function Slide2() {
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="flex items-center justify-center gap-16">
        <span className="flex items-center gap-4">
          <Coin kind="silver" size={88} />
          <Bi k="tut2_silver" size="2xl" px={[44, 20]} weight={700} />
        </span>
        <span className="flex items-center gap-4">
          <Coin kind="gold" size={88} />
          <Bi k="tut2_gold" size="2xl" px={[44, 20]} weight={700} />
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-6">
        <PackCard kind="rich" />
        <span className="font-pixel text-[54px] text-gold" aria-hidden>
          ⇄
        </span>
        <PackCard kind="technician" />
      </div>
      <Bi k="tut2_tradeoff" size="2xl" px={[38, 20]} weight={700} className="items-center text-center text-gold" />
    </div>
  );
}

function Slide3() {
  const zones = [
    { k: 'zone_mission', d: 'zone_mission_desc', e: '🎯', c: '#10B981' },
    { k: 'zone_shop', d: 'zone_shop_desc', e: '⚗️', c: '#E8954A' },
    { k: 'zone_bank', d: 'zone_bank_desc', e: '🏦', c: '#FFD700' },
    { k: 'zone_trade', d: 'zone_trade_desc', e: '🤝', c: '#E2E8F0' },
  ] as const;
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="grid flex-1 grid-cols-2 gap-6">
        {zones.map((z) => (
          <div key={z.k} className="flex items-center gap-6 border-4 border-black bg-choco p-6" style={{ boxShadow: `0 0 0 4px ${z.c}, 8px 8px 0 4px #000` }}>
            <div className="slot slot-dark h-[130px] w-[130px] flex-none text-[76px]" aria-hidden>
              {z.e}
            </div>
            <div>
              <Bi k={z.k as TKey} size="2xl" px={[44, 22]} weight={700} />
              <Bi k={z.d as TKey} size="xl" px={[28, 17]} weight={500} className="mt-2 text-cream/85" />
            </div>
          </div>
        ))}
      </div>
      <Bi k="tut3_teachers" size="xl" px={[32, 18]} weight={700} className="items-center text-center text-gold" />
    </div>
  );
}

function Slide4() {
  const grade = useGame((s) => s.grade);
  const recipes = recipesForGrade(grade);
  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-center gap-6 border-4 border-black bg-coral px-6 py-4 text-cream" style={{ boxShadow: '6px 6px 0 #000' }}>
        <span className="text-[52px]" aria-hidden>
          📜
        </span>
        <Bi k="mustShowRecipe" size="3xl" px={[52, 26]} weight={700} className="items-center text-center" />
        <span className="text-[52px]" aria-hidden>
          ✋
        </span>
      </div>
      <Bi k="recipeUnlimited" size="xl" px={[30, 18]} weight={600} className="items-center text-center text-mint" />
      <div className="grid flex-1 grid-cols-2 content-center gap-5">
        {recipes.map((r) => (
          <div key={r.id} className={r.tier === 3 ? 'col-span-2 mx-auto w-[900px]' : ''}>
            <RecipeCard recipe={r} slot={70} />
          </div>
        ))}
      </div>
      <Bi k="tier2Need" p={{ grade, count: GRADES[grade].tier2Need }} size="lg" px={[26, 16]} weight={700} inline className="text-center text-caramel" />
    </div>
  );
}

function Slide5() {
  const facts = ['tut5_b1', 'tut5_b2', 'tut5_b3', 'tut5_b4'] as TKey[];
  return (
    <div className="grid h-full grid-cols-[560px_1fr] items-center gap-10">
      <ul className="flex flex-col gap-4">
        {facts.map((k, i) => (
          <li key={k} className="flex items-center gap-4 border-4 border-black bg-choco px-5 py-4" style={{ boxShadow: '5px 5px 0 #000' }}>
            <span className="text-[38px]" aria-hidden>
              {['5️⃣', '🟡', '⚖️', '🎰'][i]}
            </span>
            <Bi k={k} size="xl" px={[30, 17]} weight={600} />
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-5 gap-4">
        {OUTCOMES.map((o) => {
          const color = o.tone === 'danger' ? '#F43F5E' : o.tone === 'success' ? '#10B981' : '#FFD700';
          return (
            <div key={o.id} className="flex flex-col items-center gap-3 border-4 border-black bg-choco px-2 py-6 text-center" style={{ boxShadow: `0 0 0 4px ${color}, 6px 6px 0 4px #000` }}>
              <span className="text-[64px]" aria-hidden>
                {o.emoji}
              </span>
              <Bi k={`out_${o.id}` as TKey} size="lg" px={[26, 15]} weight={700} className="items-center" />
              <span className="font-pixel text-[30px]" style={{ color }}>
                {formatPct(o.returnPct)}
              </span>
              <span className="border-[3px] border-black bg-cream px-2 py-1 font-pixel text-[20px] text-black">{o.probability}%</span>
              <span className="flex items-center gap-1 font-pixel text-[16px]">
                <Coin kind="gold" size={26} label={false} /> → {returnPerGold(o.id)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- added rule slides (read aloud to students before the game) ---------------- */

const Card = ({ ring, children, className = '' }: { ring: string; children: ReactNode; className?: string }) => (
  <div className={`border-4 border-black bg-choco ${className}`} style={{ boxShadow: `0 0 0 4px ${ring}, 8px 8px 0 4px #000` }}>
    {children}
  </div>
);

function SlideFlow() {
  const parts = [
    { from: GAME_DURATION_SEC, to: PHASE_AT.market, t: 'tutF_p1', d: 'tutF_p1d', e: '📖', c: '#E2E8F0' },
    { from: PHASE_AT.market, to: PHASE_AT.lastCall, t: 'tutF_p2', d: 'tutF_p2d', e: '🛒', c: '#10B981' },
    { from: PHASE_AT.lastCall, to: PHASE_AT.closed, t: 'tutF_p3', d: 'tutF_p3d', e: '🔔', c: '#F43F5E' },
    { from: PHASE_AT.closed, to: 0, t: 'tutF_p4', d: 'tutF_p4d', e: '🏆', c: '#FFD700' },
  ] as const;
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="grid flex-1 grid-cols-4 gap-6">
        {parts.map((p, i) => (
          <Card key={p.t} ring={p.c} className="flex flex-col items-center gap-4 px-5 py-6 text-center">
            <span className="font-pixel text-[20px] text-gold">STEP {i + 1}</span>
            <span className="text-[84px] leading-none" aria-hidden>
              {p.e}
            </span>
            <Bi k={p.t as TKey} size="2xl" px={[40, 20]} weight={700} className="items-center" />
            <span className="font-pixel text-[22px] text-cream">
              {formatSec(p.from)}<span className="mx-2 font-sans" aria-hidden>→</span>{formatSec(p.to)}
            </span>
            <span className="border-[3px] border-black px-3 py-1 text-black" style={{ background: p.c }}>
              <Bi k="tutF_min" p={{ min: (p.from - p.to) / 60 }} size="lg" px={[26, 14]} weight={700} inline />
            </span>
            <Bi k={p.d as TKey} size="lg" px={[26, 16]} weight={500} className="items-center text-cream/85" />
          </Card>
        ))}
      </div>
    </div>
  );
}

const MODE_KEY = { sale: 'modeSale', normal: 'modeNormal', shortage: 'modeShortage' } as const;
const MODE_COLOR = { sale: '#10B981', normal: '#E2E8F0', shortage: '#F43F5E' } as const;

function SlideShop() {
  return (
    <div className="grid h-full grid-cols-[1fr_620px] gap-8">
      <div className="flex flex-col gap-6">
        <Card ring="#E8954A" className="flex flex-col gap-5 p-6">
          <Bi k="tutS_base" p={{ price: BASE_PRICES.susu }} size="2xl" px={[40, 20]} weight={700} className="text-caramel" />
          <div className="grid grid-cols-5 gap-4">
            {MATERIALS.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-2 text-center">
                <div className="slot h-[96px] w-[96px] text-[56px]">{m.emoji}</div>
                <Bi k={`mat_${m.id}` as TKey} size="lg" px={[26, 15]} weight={700} className="items-center" />
              </div>
            ))}
          </div>
        </Card>
        <Card ring="#F43F5E" className="flex flex-1 flex-col justify-center gap-5 p-6">
          <Bi k="tutS_modes" size="2xl" px={[40, 20]} weight={700} className="text-coral" />
          <div className="grid grid-cols-3 gap-4">
            {PRICE_MODE_ORDER.map((m) => (
              <div key={m} className="flex items-center justify-center gap-4 border-4 border-black bg-choco-3 py-4">
                <span className="font-pixel text-[44px]" style={{ color: MODE_COLOR[m], textShadow: '3px 3px 0 #000' }}>
                  {PRICE_MODES[m]}
                </span>
                <Bi k={MODE_KEY[m]} size="xl" px={[30, 16]} weight={700} />
              </div>
            ))}
          </div>
          <Bi k="tutS_news" size="xl" px={[30, 17]} weight={600} />
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        <Card ring="#FFD700" className="flex flex-1 flex-col justify-center gap-5 p-6">
          <Bi k="tutS_special" size="2xl" px={[40, 20]} weight={700} className="text-gold" />
          {SPECIAL_ITEMS.map((it) => (
            <div key={it.id} className="flex items-center gap-4">
              <div className="slot slot-dark h-[88px] w-[88px] flex-none text-[50px]">{it.emoji}</div>
              <div className="min-w-0 flex-1">
                <Bi k={`item_${it.id}` as TKey} size="xl" px={[30, 16]} weight={700} />
                <Bi k={`item_${it.id}_desc` as TKey} size="md" px={[20, 14]} weight={500} className="text-cream/75" />
              </div>
              <span className="font-pixel text-[44px] text-gold" style={{ textShadow: '3px 3px 0 #000' }}>
                {BASE_PRICES[it.id]}
              </span>
            </div>
          ))}
        </Card>
        <Card ring="#E2E8F0" className="flex items-center justify-center gap-4 p-5">
          <Coin kind="gold" size={64} />
          <span className="font-pixel text-[28px]">=</span>
          <CoinStack total={5} size={40} />
          <Bi k="tutS_pay" size="lg" px={[26, 15]} weight={700} className="min-w-0" />
        </Card>
      </div>
    </div>
  );
}

function TierStep({ emoji, qty, tier, reward, bg }: { emoji: string; qty?: number; tier: 1 | 2 | 3; reward: TKey; bg: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="slot h-[96px] w-[96px] text-[52px]" style={{ background: bg }}>
        {emoji}
        {qty && <span className="qty-badge">×{qty}</span>}
      </div>
      <Bi k={`tier${tier}` as TKey} size="lg" px={[24, 14]} weight={700} className="items-center" />
      <Bi k={reward} size="md" px={[22, 14]} weight={600} className="items-center text-gold" />
    </div>
  );
}

function SlideEatOrSave() {
  const grade = useGame((s) => s.grade);
  const need = GRADES[grade].tier2Need;
  const arrow = (
    <span className="font-pixel text-[40px] text-gold" aria-hidden>
      ▶
    </span>
  );
  return (
    <div className="flex h-full flex-col gap-4">
      <Bi k="tutE_make" size="2xl" px={[36, 19]} weight={700} className="items-center text-center" />
      <div className="grid flex-1 grid-cols-[1fr_1.6fr] gap-8">
        <Card ring="#F43F5E" className="flex flex-col items-center justify-center gap-4 p-5 text-center">
          <span className="text-[80px] leading-none" aria-hidden>
            😋
          </span>
          <Bi k="tutE_eat" size="3xl" px={[44, 22]} weight={700} className="items-center text-coral" />
          <Bi k="tutE_eatEnd" size="xl" px={[32, 18]} weight={600} className="items-center" />
        </Card>
        <Card ring="#10B981" className="flex flex-col items-center justify-center gap-4 p-5 text-center">
          <Bi k="tutE_save" size="3xl" px={[44, 22]} weight={700} className="items-center text-mint" />
          <div className="flex items-center gap-5">
            <TierStep emoji={DESSERT_EMOJI.milkChoco} qty={need} tier={1} reward="reward_mini" bg="#3B2819" />
            {arrow}
            <TierStep emoji={DESSERT_EMOJI.bigChocoBar} tier={2} reward="reward_medium" bg="#E8954A" />
            {arrow}
            <TierStep emoji={DESSERT_EMOJI.royalCake} tier={3} reward="reward_royal" bg="#FFD700" />
          </div>
          <Bi k="tier2Need" p={{ grade, count: need }} size="lg" px={[26, 15]} weight={700} className="items-center text-caramel" />
          <Bi k="tutE_royal" size="lg" px={[26, 15]} weight={600} className="items-center" />
        </Card>
      </div>
      <Bi k="tutE_tip" size="2xl" px={[36, 19]} weight={700} className="items-center text-center text-gold" />
    </div>
  );
}

function SlideRounds() {
  const { t } = useT();
  return (
    <div className="grid h-full grid-cols-[1fr_640px] gap-8">
      <Card ring="#FFD700" className="flex flex-col justify-center p-6">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="text-[24px] text-gold">
              <th className="pb-3 font-bold">{t('tutR_colRound')}</th>
              <th className="pb-3 font-bold">{t('tutR_colOpen')}</th>
              <th className="pb-3 font-bold">{t('tutR_colDraw')}</th>
            </tr>
          </thead>
          <tbody>
            {ROUND_SCHEDULE.map((r) => (
              <tr key={r.round} className="border-t-[3px] border-black/60">
                <td className="py-4 font-pixel text-[30px] text-gold">R{r.round}</td>
                <td className="py-4 font-pixel text-[28px]">
                  {formatSec(r.openFrom)}<span className="mx-2 font-sans" aria-hidden>→</span>{formatSec(r.close)}
                </td>
                <td className="py-4">
                  <span className="border-[3px] border-black bg-gold px-3 py-1 font-pixel text-[28px] text-black">{formatSec(r.draw)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ol className="flex flex-col justify-center gap-5">
        {(['tutR_how1', 'tutR_how2', 'tutR_how3'] as TKey[]).map((k, i) => (
          <li key={k} className="flex items-center gap-5 border-4 border-black bg-choco px-5 py-5" style={{ boxShadow: '5px 5px 0 #000' }}>
            <span className="font-pixel text-[28px] text-gold">{i + 1}</span>
            <span className="text-[52px]" aria-hidden>
              {['🏦', '🎰', '💰'][i]}
            </span>
            <Bi k={k} size="xl" px={[30, 17]} weight={600} className="min-w-0" />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Last slide: what the closing notice says will happen, then the four awards (names only). */
function SlideClosing() {
  const steps = ['notice_closed_b1', 'notice_closed_b2', 'notice_closed_b3', 'notice_closed_b4'] as TKey[];
  const awards = [
    { k: 'aw_master', e: '👑' },
    { k: 'aw_investor', e: '📈' },
    { k: 'aw_merchant', e: '🛒' },
    { k: 'aw_negotiator', e: '🤝' },
  ] as const;
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-8">
      <Card ring="#F43F5E" className="flex flex-col justify-center gap-4 p-6">
        <span className="font-pixel text-[26px] text-coral">{formatSec(PHASE_AT.closed)}</span>
        {steps.map((k, i) => (
          <div key={k} className="flex items-center gap-4 border-[3px] border-black bg-choco-3 px-4 py-4">
            <span className="text-[48px]" aria-hidden>
              {['🛒', '⚗️', '🍬', '🏆'][i]}
            </span>
            <Bi k={k} size="2xl" px={[36, 19]} weight={600} className="min-w-0" />
          </div>
        ))}
      </Card>
      <Card ring="#FFD700" className="flex flex-col justify-center gap-5 p-6">
        <Bi k="tutA_awards" size="2xl" px={[44, 22]} weight={700} className="text-gold" />
        <div className="grid grid-cols-2 gap-5">
          {awards.map((a) => (
            <div key={a.k} className="flex flex-col items-center gap-3 border-[3px] border-black bg-choco-3 px-3 py-6 text-center">
              <span className="text-[72px] leading-none" aria-hidden>
                {a.e}
              </span>
              <Bi k={a.k} size="2xl" px={[34, 18]} weight={700} className="items-center text-gold" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Read-aloud order: goal → time → money → room → shop → making → eat/save → bank → schedule → closing & awards.
const SLIDES = [Slide1, SlideFlow, Slide2, Slide3, SlideShop, Slide4, SlideEatOrSave, Slide5, SlideRounds, SlideClosing];
const TITLES: TKey[] = [
  'tut1_title',
  'tutF_title',
  'tut2_title',
  'tut3_title',
  'tutS_title',
  'tut4_title',
  'tutE_title',
  'tut5_title',
  'tutR_title',
  'tutA_title',
];

export function TutorialModal() {
  const tut = useGame((s) => s.tutorial);
  const setTutorial = useGame((s) => s.setTutorial);
  const { t } = useT();
  if (!tut.open) return null;
  const Slide = SLIDES[tut.slide];
  const go = (n: number) => setTutorial({ slide: Math.min(TOTAL - 1, Math.max(0, n)) });

  return (
    <div className="absolute inset-x-4 bottom-4 top-[200px] z-20 flex flex-col overflow-hidden border-4 border-black bg-choco-2" style={{ boxShadow: '0 0 0 4px #FFD700, 10px 10px 0 4px #000' }} role="dialog" aria-modal="true" aria-label={t('tutorial')}>
      <div className="flex items-center gap-4 border-b-4 border-black bg-choco px-6 py-3">
        <span className="border-[3px] border-black bg-gold px-3 py-1 font-pixel text-[18px] text-black">{t('tutSlide', { n: tut.slide + 1, total: TOTAL })}</span>
        <Bi k={TITLES[tut.slide]} size="2xl" px={[44, 20]} weight={700} inline className="flex-1 text-gold" />
        <button type="button" className="btn btn-dark focus-ring h-[56px] w-[56px]" onClick={() => setTutorial({ open: false })} aria-label={t('close')} aria-keyshortcuts="Escape">
          <X size={30} />
        </button>
      </div>
      <div className="min-h-0 flex-1 px-10 py-6">
        <Slide />
      </div>
      <div className="flex items-center justify-between border-t-4 border-black bg-choco px-6 py-3">
        <Btn tone="choco" className="h-[64px] min-w-[200px] text-[22px]" onClick={() => go(tut.slide - 1)} disabled={tut.slide === 0} aria-keyshortcuts="ArrowLeft">
          <ChevronLeft size={28} /> {t('prev')}
        </Btn>
        <div className="flex gap-3" role="tablist">
          {Array.from({ length: TOTAL }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === tut.slide}
              aria-label={`${i + 1}`}
              className={`focus-ring h-[22px] w-[22px] border-[3px] border-black ${i === tut.slide ? 'bg-gold' : 'bg-choco-4'}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        {tut.slide < TOTAL - 1 ? (
          <Btn tone="gold" className="h-[64px] min-w-[200px] text-[22px]" onClick={() => go(tut.slide + 1)} aria-keyshortcuts="ArrowRight">
            {t('next')} <ChevronRight size={28} />
          </Btn>
        ) : (
          <Btn tone="mint" className="h-[64px] min-w-[200px] text-[22px]" onClick={() => setTutorial({ open: false, slide: 0 })}>
            {t('close')} ✓
          </Btn>
        )}
      </div>
    </div>
  );
}
