import { Link } from 'react-router-dom';
import ImageCover from './ImageCover';
import GlassCard from './GlassCard';
import { useAppStore } from '@/stores/useAppStore';
import type { Album } from '@/types';

interface AlbumCardProps {
  album: Album;
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const enableGlassmorphism = useAppStore((s) => s.enableGlassmorphism);

  const inner = (
    <>
      <ImageCover
        src={album.picUrl}
        alt={album.name}
        rounded="md"
        className={enableGlassmorphism ? '' : 'shadow-md'}
      />
      <p className="mt-2 text-sm text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
        {album.name}
      </p>
      <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">
        {album.artist?.name}
      </p>
    </>
  );

  return (
    <Link to={`/album/${album.id}`} className="block">
      {enableGlassmorphism ? (
        <GlassCard className="p-3 group" rounded="rounded-xl">
          {inner}
        </GlassCard>
      ) : (
        <div className="group block">{inner}</div>
      )}
    </Link>
  );
}
