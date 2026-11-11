import { useEffect, useState } from 'react';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Scale factor that fits the 1920×1080 design canvas inside the window. */
export function useStageScale(): number {
  const calc = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}
