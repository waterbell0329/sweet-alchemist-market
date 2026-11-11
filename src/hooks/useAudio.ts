import { useEffect, useState } from 'react';
import { sound, type AudioStatus } from '../engine/soundEngine';

/** Unlocks the AudioContext on the first user gesture and reports its status. */
export function useAudioUnlock(): AudioStatus {
  const [status, setStatus] = useState<AudioStatus>(sound.status);
  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    const off = sound.subscribe(setStatus);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      off();
    };
  }, []);
  return status;
}
