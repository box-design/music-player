import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageCover from './ImageCover';
import GlassCard from './GlassCard';
import { formatCount } from '@/utils/format';
import { useAppStore } from '@/stores/useAppStore';
import type { Playlist } from '@/types';

interface PlaylistCardProps {
  playlist: Playlist;
  showPlayCount?: boolean;
}

export default function PlaylistCard({ playlist, showPlayCount = true }: PlaylistCardProps) {
  const enableGlassmorphism = useAppStore((s) => s.enableGlassmorphism);

  const content = (
    <>
      <div className="relative">
        <ImageCover
          src={playlist.coverImgUrl}
          alt={playlist.name}
          rounded="md"
          className={enableGlassmorphism ? '' : 'shadow-md'}
        />
        {/* 播放次数 */}
        {showPlayCount && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-white text-xs bg-black/40 rounded-full px-2 py-0.5">
            <Play size={10} fill="white" />
            <span>{formatCount(playlist.playCount)}</span>
          </div>
        )}
        {/* 悬停播放按钮 */}
        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg z-10">
          <Play className="w-4 h-4 text-primary ml-0.5" fill="currentColor" />
        </div>
      </div>
      <p className="mt-2 text-sm text-text-primary line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
        {playlist.name}
      </p>
      {playlist.description && (
        <p className="mt-0.5 text-xs text-text-tertiary line-clamp-1">{playlist.description}</p>
      )}
    </>
  );

  const card = enableGlassmorphism ? (
    <GlassCard className="p-3 group" rounded="rounded-xl">
      {content}
    </GlassCard>
  ) : (
    <div className="group block">
      {content}
    </div>
  );

  return (
    <Link to={`/playlist/${playlist.id}`} className="block">
      {card}
    </Link>
  );
}
