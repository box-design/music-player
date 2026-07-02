import { useLightingContext } from '@/components/Layout/LightingProvider';
import { useAppStore } from '@/stores/useAppStore';
import CelestialBody from './CelestialBody';
import StarsLayer from './StarsLayer';
import AtmosphericHaze from './AtmosphericHaze';

interface BackgroundSystemProps {
  intensity?: number;
}

export default function BackgroundSystem({ intensity = 1 }: BackgroundSystemProps) {
  const {
    bgColorStart,
    bgColorEnd,
    isDaytime,
    celestialGlow,
    starsOpacity,
    intensity: harmonyIntensity,
  } = useLightingContext();

  const { enableGlassmorphism } = useAppStore();
  const effectiveIntensity = Math.max(0, Math.min(1, intensity * harmonyIntensity));

  return (
    <>
      {/* Base sky gradient */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-gradient-layer"
        style={{
          background: `linear-gradient(135deg, ${bgColorStart} 0%, ${bgColorEnd} 100%)`,
          opacity: 0.35 + effectiveIntensity * 0.45,
        }}
      />

      {/* Atmospheric haze around the celestial body */}
      <AtmosphericHaze
        color={celestialGlow}
        intensity={enableGlassmorphism ? 0.9 * effectiveIntensity : 0.55 * effectiveIntensity}
      />

      {/* Stars — only visible at night, opacity driven via CSS variable so twinkle animation works */}
      <StarsLayer
        opacity={starsOpacity * effectiveIntensity}
        count={100}
      />

      {/* Sun / Moon — position and colors driven by root CSS variables */}
      <div
        className="celestial-track"
        style={{
          opacity: effectiveIntensity,
        }}
      >
        <CelestialBody isDaytime={isDaytime} />
      </div>

      {/* Static vignette for depth */}
      <div className="vignette-overlay" style={{ opacity: 0.25 + (isDaytime ? 0 : 0.15) * effectiveIntensity }} />
    </>
  );
}
