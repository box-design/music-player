import { useState, useEffect, useRef, useCallback } from 'react';
import {
  computeColors,
  computeHarmonyIntensity,
  getCycleProgress,
  getCelestialPosition,
  hexToRgb,
} from '@/utils/time';

export interface LightingState {
  lightColor: string;
  lightRgb: [number, number, number];
  bgColorStart: string;
  bgColorEnd: string;
  isDaytime: boolean;
  sunrise: string | null;
  sunset: string | null;
  loading: boolean;
  cycleProgress: number;
  celestialPosition: { x: number; y: number };
  celestialColor: string;
  celestialGlow: string;
  starsOpacity: number;
  shadowOffsets: { x: number; y: number };
  shadowColor: string;
  intensity: number;
}

const TICK_INTERVAL_MS = 60_000;

function applyCssVars(state: Omit<LightingState, 'loading' | 'sunrise' | 'sunset'>) {
  const root = document.documentElement;
  root.style.setProperty('--card-light-color', state.lightColor);
  root.style.setProperty('--card-light-rgb', state.lightRgb.join(','));
  root.style.setProperty('--bg-gradient-start', state.bgColorStart);
  root.style.setProperty('--bg-gradient-end', state.bgColorEnd);
  root.style.setProperty('--celestial-x', `${state.celestialPosition.x * 100}%`);
  root.style.setProperty('--celestial-y', `${state.celestialPosition.y * 100}%`);
  root.style.setProperty('--celestial-color', state.celestialColor);
  root.style.setProperty('--celestial-glow', state.celestialGlow);
  root.style.setProperty('--stars-opacity', state.starsOpacity.toFixed(3));
  root.style.setProperty('--shadow-offset-x', `${state.shadowOffsets.x}px`);
  root.style.setProperty('--shadow-offset-y', `${state.shadowOffsets.y}px`);
  root.style.setProperty('--shadow-color', state.shadowColor);
  root.style.setProperty('--cycle-progress', state.cycleProgress.toFixed(4));
}

function shadowOffsetsFromCelestial(x: number, y: number, isDaytime: boolean): { x: number; y: number } {
  // Shadow falls opposite the light source.
  const factor = isDaytime ? 18 : 10;
  return {
    x: (0.5 - x) * factor,
    y: (0.85 - y) * factor * 0.5,
  };
}

export interface UseLightingOptions {
  /** Override the current time for preview/demo purposes. */
  previewTime?: Date | null;
  /** Manual dark-mode preference used to harmonize background intensity. */
  isDarkMode?: boolean;
  /** Manual intensity override from user settings. */
  lightingIntensity?: number;
}

export function useLighting(options: UseLightingOptions = {}): LightingState {
  const { previewTime = null, isDarkMode = false, lightingIntensity = 1 } = options;

  const [lightColor, setLightColor] = useState('#ffd54f');
  const [bgColorStart, setBgColorStart] = useState('#f5efe0');
  const [bgColorEnd, setBgColorEnd] = useState('#e8edf3');
  const [sunrise, setSunrise] = useState<string | null>(null);
  const [sunset, setSunset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [cycleProgress, setCycleProgress] = useState(0.5);
  const [celestialPosition, setCelestialPosition] = useState({ x: 0.5, y: 0.5 });
  const [celestialColor, setCelestialColor] = useState('#fff7e0');
  const [celestialGlow, setCelestialGlow] = useState('rgba(255, 220, 120, 0.2)');
  const [starsOpacity, setStarsOpacity] = useState(0);
  const [shadowOffsets, setShadowOffsets] = useState({ x: 0, y: 0 });
  const [shadowColor, setShadowColor] = useState('rgba(80, 60, 20, 0.12)');

  const sunTimesRef = useRef<{ sunrise: string; sunset: string } | null>(null);

  const fetchSunlight = async (): Promise<{ sunrise: string; sunset: string }> => {
    let lat = 39.9042;
    let lon = 116.4074;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('no geolocation'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch {
      // Use default Beijing coords
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    const json = await res.json();
    const sr = json?.daily?.sunrise?.[0] ?? null;
    const ss = json?.daily?.sunset?.[0] ?? null;
    if (!sr || !ss) throw new Error('Invalid sun data');
    return { sunrise: sr, sunset: ss };
  };

  const recompute = useCallback(() => {
    const now = previewTime ?? new Date();
    const { sunrise: sr, sunset: ss } = sunTimesRef.current ?? {};
    const colors = computeColors(now, sr ?? null, ss ?? null);
    const position = getCelestialPosition(now, sr ?? null, ss ?? null, colors.isDaytime);
    const progress = getCycleProgress(now);
    const harmony = computeHarmonyIntensity(colors.isDaytime, isDarkMode);
    const intensity = Math.max(0, Math.min(1, harmony * lightingIntensity));
    const shadow = shadowOffsetsFromCelestial(position.x, position.y, colors.isDaytime);

    setLightColor(colors.lightColor);
    setBgColorStart(colors.bg.start);
    setBgColorEnd(colors.bg.end);
    setCycleProgress(progress);
    setCelestialPosition(position);
    setCelestialColor(colors.celestialColor);
    setCelestialGlow(colors.celestialGlow);
    setStarsOpacity(colors.starsOpacity);
    setShadowOffsets(shadow);
    setShadowColor(colors.shadowColor);

    applyCssVars({
      lightColor: colors.lightColor,
      lightRgb: hexToRgb(colors.lightColor),
      bgColorStart: colors.bg.start,
      bgColorEnd: colors.bg.end,
      isDaytime: colors.isDaytime,
      cycleProgress: progress,
      celestialPosition: position,
      celestialColor: colors.celestialColor,
      celestialGlow: colors.celestialGlow,
      starsOpacity: colors.starsOpacity,
      shadowOffsets: shadow,
      shadowColor: colors.shadowColor,
      intensity,
    });
  }, [previewTime, isDarkMode, lightingIntensity]);

  // Initial fetch + timer loop
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    setLoading(true);
    fetchSunlight()
      .then((times) => {
        if (cancelled) return;
        sunTimesRef.current = times;
        setSunrise(times.sunrise);
        setSunset(times.sunset);
        recompute();
      })
      .catch(() => {
        if (cancelled) return;
        sunTimesRef.current = null;
        recompute();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    intervalId = setInterval(recompute, TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [recompute]);

  // Recompute immediately when preview time or dark-mode/intensity changes.
  useEffect(() => {
    recompute();
  }, [recompute]);

  const now = previewTime ?? new Date();
  const currentColors = computeColors(now, sunrise, sunset);

  return {
    lightColor,
    lightRgb: hexToRgb(lightColor),
    bgColorStart,
    bgColorEnd,
    isDaytime: currentColors.isDaytime,
    sunrise,
    sunset,
    loading,
    cycleProgress,
    celestialPosition,
    celestialColor,
    celestialGlow,
    starsOpacity,
    shadowOffsets,
    shadowColor,
    intensity: Math.max(0, Math.min(1, computeHarmonyIntensity(
      currentColors.isDaytime,
      isDarkMode
    ) * lightingIntensity)),
  };
}
