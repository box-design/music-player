interface AtmosphericHazeProps {
  color?: string;
  intensity?: number;
}

export default function AtmosphericHaze({ color, intensity = 1 }: AtmosphericHazeProps) {
  return (
    <div
      className="atmospheric-haze"
      style={{
        background: `radial-gradient(circle at var(--celestial-x, 50%) var(--celestial-y, 50%), ${color || 'var(--celestial-glow, rgba(255,220,120,0.25))'} 0%, transparent 55%)`,
        opacity: intensity,
      }}
    />
  );
}
