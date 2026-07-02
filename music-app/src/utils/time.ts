/**
 * Time, color interpolation and celestial-position helpers for the
 * day-night cycle background system.
 */

export function interpolateHex(c1: string, c2: string, t: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  t = clamp(t);
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseRgba(rgba: string): Rgba {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

export function interpolateRgba(c1: string, c2: string, t: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  t = clamp(t);
  const a = parseRgba(c1);
  const b = parseRgba(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const b_ = Math.round(a.b + (b.b - a.b) * t);
  const alpha = a.a + (b.a - a.a) * t;
  return `rgba(${r}, ${g}, ${b_}, ${alpha.toFixed(2)})`;
}

export interface BgColors {
  start: string;
  end: string;
}

export interface CelestialPosition {
  x: number; // 0..1 across the viewport
  y: number; // 0..1, lower value = higher in the sky
}

/** Normalize a Date to midnight of the same local day. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 0.0 = midnight, 0.5 = noon, 1.0 = next midnight */
export function getCycleProgress(now: Date): number {
  const start = startOfDay(now).getTime();
  const nextStart = start + 24 * 60 * 60 * 1000;
  return (now.getTime() - start) / (nextStart - start);
}

/**
 * Sun follows an arc during the day (progress relative to sunrise/sunset).
 * Moon follows a mirrored arc during the night.
 */
export function getCelestialPosition(
  now: Date,
  sunrise: string | null,
  sunset: string | null,
  isDaytime: boolean
): CelestialPosition {
  if (sunrise && sunset) {
    const sr = new Date(sunrise).getTime();
    const ss = new Date(sunset).getTime();
    const ms = now.getTime();

    if (isDaytime && ms >= sr && ms <= ss) {
      const t = (ms - sr) / (ss - sr); // 0 at sunrise, 1 at sunset
      return {
        x: t,
        y: 0.15 + 0.55 * Math.pow(2 * t - 1, 2),
      };
    }
  }

  // Fallback / night: use absolute time-of-day progress for the moon arc.
  // Moon rises ~18:00 (progress 0.75), peaks at midnight (0/1), sets ~06:00 (0.25).
  const progress = getCycleProgress(now);
  if (isDaytime) {
    const t = Math.max(0, Math.min(1, (progress - 0.25) / 0.5));
    return {
      x: t,
      y: 0.15 + 0.55 * Math.pow(2 * t - 1, 2),
    };
  }

  let t: number;
  if (progress > 0.75) {
    t = (progress - 0.75) / 0.25 - 1; // -1 at 18:00 -> 0 at midnight
  } else if (progress < 0.25) {
    t = progress / 0.25; // 0 at midnight -> 1 at 06:00
  } else {
    t = 0.5; // daytime guard
  }
  const normalizedT = (t + 1) / 2;
  return {
    x: normalizedT,
    y: 0.15 + 0.55 * Math.pow(2 * normalizedT - 1, 2),
  };
}

export interface ComputedColors {
  lightColor: string;
  isDaytime: boolean;
  bg: BgColors;
  celestialColor: string;
  celestialGlow: string;
  starsOpacity: number;
  shadowColor: string;
}

const DEEP_NIGHT_BG: BgColors = { start: '#0a0f1a', end: '#12121f' };
const NIGHT_BG: BgColors = { start: '#0d1b2a', end: '#1a1a2e' };
const DAWN_START_BG: BgColors = { start: '#1a1025', end: '#2d1b2e' };
const DAWN_END_BG: BgColors = { start: '#5a4a6a', end: '#c48a6a' };
const DAY_START_BG: BgColors = { start: '#f5efe0', end: '#e8edf3' };
const DAY_END_BG: BgColors = { start: '#e8e0d0', end: '#d8dce8' };
const DUSK_START_BG: BgColors = { start: '#3a2a3a', end: '#8a6a5a' };
const DUSK_END_BG: BgColors = { start: '#1a1a2e', end: '#0d1b2a' };

export function computeColors(now: Date, sunrise: string | null, sunset: string | null): ComputedColors {
  if (sunrise && sunset) {
    const sr = new Date(sunrise).getTime();
    const ss = new Date(sunset).getTime();
    const ms = now.getTime();
    const dawn = sr - 60 * 60 * 1000;
    const dusk = ss + 60 * 60 * 1000;

    if (ms < dawn) {
      return {
        lightColor: '#1a237e',
        isDaytime: false,
        bg: DEEP_NIGHT_BG,
        celestialColor: '#e8eaf6',
        celestialGlow: 'rgba(100,120,200,0.15)',
        starsOpacity: 1,
        shadowColor: 'rgba(0,0,0,0.35)',
      };
    }

    if (ms < sr) {
      const t = (ms - dawn) / (sr - dawn);
      return {
        lightColor: interpolateHex('#1a237e', '#ff8f00', t),
        isDaytime: false,
        bg: {
          start: interpolateHex(NIGHT_BG.start, DAWN_START_BG.start, t),
          end: interpolateHex(NIGHT_BG.end, DAWN_END_BG.end, t),
        },
        celestialColor: interpolateHex('#e8eaf6', '#ffe0b2', t),
        celestialGlow: interpolateRgba('rgba(100,120,200,0.15)', 'rgba(255,160,60,0.35)', t),
        starsOpacity: 1 - t * 0.85,
        shadowColor: interpolateRgba('rgba(0,0,0,0.35)', 'rgba(60,40,20,0.18)', t),
      };
    }

    if (ms < ss) {
      const midday = sr + (ss - sr) / 2;
      const halfSpan = (ss - sr) / 2;
      const distFromNoon = Math.abs(ms - midday) / halfSpan; // 0 noon, 1 sunrise/sunset
      return {
        lightColor: interpolateHex('#ffd54f', '#fff8e1', distFromNoon),
        isDaytime: true,
        bg: {
          start: interpolateHex(DAY_START_BG.start, DAY_END_BG.start, distFromNoon),
          end: interpolateHex(DAY_START_BG.end, DAY_END_BG.end, distFromNoon),
        },
        celestialColor: '#fff7e0',
        celestialGlow: `rgba(255, 220, 120, ${0.25 - distFromNoon * 0.08})`,
        starsOpacity: 0,
        shadowColor: 'rgba(80, 60, 20, 0.12)',
      };
    }

    if (ms < dusk) {
      const t = (ms - ss) / (dusk - ss);
      return {
        lightColor: interpolateHex('#ff8f00', '#4a148c', t),
        isDaytime: false,
        bg: {
          start: interpolateHex(DUSK_START_BG.start, DUSK_END_BG.start, t),
          end: interpolateHex(DUSK_START_BG.end, DUSK_END_BG.end, t),
        },
        celestialColor: interpolateHex('#ffe0b2', '#d1c4e9', t),
        celestialGlow: interpolateRgba('rgba(255,120,40,0.35)', 'rgba(120,100,200,0.18)', t),
        starsOpacity: t * 0.9,
        shadowColor: interpolateRgba('rgba(60,30,10,0.2)', 'rgba(0,0,0,0.35)', t),
      };
    }

    return {
      lightColor: '#1a237e',
      isDaytime: false,
      bg: NIGHT_BG,
      celestialColor: '#e8eaf6',
      celestialGlow: 'rgba(100,120,200,0.15)',
      starsOpacity: 1,
      shadowColor: 'rgba(0,0,0,0.35)',
    };
  }

  // Fallback by local hour
  const hour = now.getHours();
  const minute = now.getMinutes();
  const h = hour + minute / 60;

  if (h >= 5 && h < 7) {
    const t = (h - 5) / 2;
    return {
      lightColor: interpolateHex('#1a237e', '#ff8f00', t),
      isDaytime: false,
      bg: {
        start: interpolateHex(NIGHT_BG.start, DAWN_START_BG.start, t),
        end: interpolateHex(NIGHT_BG.end, DAWN_END_BG.end, t),
      },
      celestialColor: interpolateHex('#e8eaf6', '#ffe0b2', t),
      celestialGlow: interpolateRgba('rgba(100,120,200,0.15)', 'rgba(255,160,60,0.35)', t),
      starsOpacity: 1 - t * 0.85,
      shadowColor: interpolateRgba('rgba(0,0,0,0.35)', 'rgba(60,40,20,0.18)', t),
    };
  }

  if (h >= 7 && h < 17) {
    const t = Math.abs(h - 12) / 5;
    return {
      lightColor: interpolateHex('#ffd54f', '#fff8e1', t),
      isDaytime: true,
      bg: {
        start: interpolateHex(DAY_START_BG.start, DAY_END_BG.start, t),
        end: interpolateHex(DAY_START_BG.end, DAY_END_BG.end, t),
      },
      celestialColor: '#fff7e0',
      celestialGlow: `rgba(255, 220, 120, ${0.25 - t * 0.08})`,
      starsOpacity: 0,
      shadowColor: 'rgba(80, 60, 20, 0.12)',
    };
  }

  if (h >= 17 && h < 19) {
    const t = (h - 17) / 2;
    return {
      lightColor: interpolateHex('#ff8f00', '#4a148c', t),
      isDaytime: false,
      bg: {
        start: interpolateHex(DUSK_START_BG.start, DUSK_END_BG.start, t),
        end: interpolateHex(DUSK_START_BG.end, DUSK_END_BG.end, t),
      },
      celestialColor: interpolateHex('#ffe0b2', '#d1c4e9', t),
      celestialGlow: interpolateRgba('rgba(255,120,40,0.35)', 'rgba(120,100,200,0.18)', t),
      starsOpacity: t * 0.9,
      shadowColor: interpolateRgba('rgba(60,30,10,0.2)', 'rgba(0,0,0,0.35)', t),
    };
  }

  return {
    lightColor: '#1a237e',
    isDaytime: false,
    bg: DEEP_NIGHT_BG,
    celestialColor: '#e8eaf6',
    celestialGlow: 'rgba(100,120,200,0.15)',
    starsOpacity: 1,
    shadowColor: 'rgba(0,0,0,0.35)',
  };
}

/**
 * Compute a harmony multiplier to dim the background when the user's
 * manual dark-mode preference conflicts with the real time of day.
 */
export function computeHarmonyIntensity(isDaytime: boolean, isDarkMode: boolean): number {
  if (isDaytime && isDarkMode) return 0.55;
  if (!isDaytime && !isDarkMode) return 0.7;
  return 1;
}
