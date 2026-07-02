import { Link } from 'react-router-dom';
import ImageCover from './ImageCover';
import GlassCard from './GlassCard';
import { useAppStore } from '@/stores/useAppStore';
import type { Artist } from '@/types';

interface ArtistCardProps {
  artist: Artist;
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const enableGlassmorphism = useAppStore((s) => s.enableGlassmorphism);

  const inner = (
    <>
      <ImageCover
        src={artist.picUrl}
        alt={artist.name}
        rounded="full"
        className={enableGlassmorphism ? '' : 'shadow-md'}
      />
      <p className="mt-2 text-sm text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
        {artist.name}
      </p>
      {artist.alias && artist.alias.length > 0 && (
        <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">
          {artist.alias[0]}
        </p>
      )}
    </>
  );

  return (
    <Link to={`/artist/${artist.id}`} className="block">
      {enableGlassmorphism ? (
        <GlassCard className="p-3 group" rounded="rounded-xl">
          {inner}
        </GlassCard>
      ) : (
        <div className="group block text-center">{inner}</div>
      )}
    </Link>
  );
}
