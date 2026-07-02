import { ReactNode } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useCard3D } from '@/hooks/useCard3D';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  enable3D?: boolean;         // default true
  rounded?: string;           // Tailwind rounded class override, default 'rounded-2xl'
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = '',
  enable3D = true,
  rounded = 'rounded-2xl',
  onClick,
}: GlassCardProps) {
  const enableGlassmorphism = useAppStore((s) => s.enableGlassmorphism);
  const { style, onMouseMove, onMouseLeave, onMouseDown, onMouseUp, containerRef } = useCard3D();

  if (!enableGlassmorphism) {
    // Plain fallback — just a div with no special styling
    return (
      <div
        className={`bg-surface rounded-xl shadow-sm ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  const cardClasses = [
    'glass-card',
    rounded,
    enable3D ? 'glass-card-3d' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      className={cardClasses}
      style={enable3D ? style : undefined}
      onMouseMove={enable3D ? onMouseMove : undefined}
      onMouseLeave={enable3D ? onMouseLeave : undefined}
      onMouseDown={enable3D ? onMouseDown : undefined}
      onMouseUp={enable3D ? onMouseUp : undefined}
      onClick={onClick}
    >
      <div className="glass-card-inner h-full">{children}</div>
    </div>
  );
}
