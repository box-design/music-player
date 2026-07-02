import { useState } from 'react';
import { Play } from 'lucide-react';
import { getImageUrl } from '@/utils/format';

interface ImageCoverProps {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  aspectRatio?: string;
  showPlayBtn?: boolean;
  onPlay?: () => void;
}

export default function ImageCover({
  src,
  alt,
  size = 200,
  className = '',
  rounded = 'md',
  aspectRatio = '1/1',
  showPlayBtn = false,
  onPlay,
}: ImageCoverProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`relative overflow-hidden bg-surface-hover group ${roundedClass[rounded]} ${className}`}
      style={{ aspectRatio }}
    >
      {!error && src ? (
        <img
          src={getImageUrl(src, size)}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-hover">
          <span className="text-text-tertiary text-sm">{alt.slice(0, 2)}</span>
        </div>
      )}
      {showPlayBtn && (
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
            onPlay ? 'opacity-0 group-hover:opacity-100 cursor-pointer' : 'opacity-0'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay?.();
          }}
        >
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-primary ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}
