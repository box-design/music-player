interface CelestialBodyProps {
  isDaytime: boolean;
}

export default function CelestialBody({ isDaytime }: CelestialBodyProps) {
  return (
    <div className={`celestial-body ${isDaytime ? 'celestial-sun' : 'celestial-moon'}`} />
  );
}
