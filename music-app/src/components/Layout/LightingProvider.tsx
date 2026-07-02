import { createContext, useContext, ReactNode } from 'react';
import { useLighting, LightingState, UseLightingOptions } from '@/hooks/useLighting';
import { useAppStore } from '@/stores/useAppStore';

const LightingContext = createContext<LightingState | null>(null);

export function useLightingContext(): LightingState {
  const ctx = useContext(LightingContext);
  if (!ctx) {
    return {
      lightColor: '#ffd54f',
      lightRgb: [255, 213, 79],
      bgColorStart: '#f5efe0',
      bgColorEnd: '#e8edf3',
      isDaytime: true,
      sunrise: null,
      sunset: null,
      loading: false,
      cycleProgress: 0.5,
      celestialPosition: { x: 0.5, y: 0.5 },
      celestialColor: '#fff7e0',
      celestialGlow: 'rgba(255, 220, 120, 0.2)',
      starsOpacity: 0,
      shadowOffsets: { x: 0, y: 0 },
      shadowColor: 'rgba(80, 60, 20, 0.12)',
      intensity: 1,
    };
  }
  return ctx;
}

export interface LightingProviderProps {
  children: ReactNode;
}

export default function LightingProvider({ children }: LightingProviderProps) {
  const { isDarkMode, lightingIntensity } = useAppStore();
  const options: UseLightingOptions = {
    isDarkMode,
    lightingIntensity,
  };
  const lighting = useLighting(options);

  return (
    <LightingContext.Provider value={lighting}>
      {children}
    </LightingContext.Provider>
  );
}
