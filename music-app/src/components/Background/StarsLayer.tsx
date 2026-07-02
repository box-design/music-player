import { useMemo } from 'react';

interface StarsLayerProps {
  opacity?: number;
  count?: number;
  seed?: number;
}

/** Deterministic seeded random generator. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >> 7), t | 61);
    return ((t ^ (t >> 14)) >> 0) / 4294967296;
  };
}

export default function StarsLayer({ opacity = 1, count = 100, seed = 42 }: StarsLayerProps) {
  const boxShadow = useMemo(() => {
    const rand = mulberry32(seed);
    const shadows: string[] = [];
    for (let i = 0; i < count; i++) {
      const x = (rand() * 100).toFixed(2);
      const y = (rand() * 70).toFixed(2);
      const size = (rand() * 1.5 + 0.5).toFixed(2);
      const alpha = (rand() * 0.5 + 0.3).toFixed(2);
      shadows.push(`${x}vw ${y}vh 0 ${size}px rgba(255,255,255,${alpha})`);
    }
    return shadows.join(', ');
  }, [count, seed]);

  return (
    <div
      className="stars-layer"
      style={{
        '--stars-opacity': opacity,
        boxShadow,
      } as React.CSSProperties}
    />
  );
}
