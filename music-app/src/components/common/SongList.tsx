import { Play, Pause, Heart, MoreHorizontal } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUserStore } from '@/stores/useUserStore';
import { formatDuration, getImageUrl } from '@/utils/format';
import { getSongUrl, getLyric } from '@/api/song';
import { likeSong } from '@/api/user';
import { useI18n } from '@/hooks/useI18n';
import type { Song } from '@/types';

interface SongListProps {
  songs: Song[];
  showHeader?: boolean;
  showAlbum?: boolean;
  showIndex?: boolean;
  className?: string;
}

export default function SongList({
  songs,
  showHeader = true,
  showAlbum = true,
  showIndex = true,
  className = '',
}: SongListProps) {
  const { t } = useI18n();
  const {
    currentSong,
    isPlaying,
    playlist,
    setCurrentSong,
    setPlaylist,
    setIsPlaying,
    setAudioUrl,
    setLyrics,
    addToPlaylist,
  } = usePlayerStore();

  const { isLoggedIn, likedSongIds, addLikedSong, removeLikedSong } = useUserStore();

  const handlePlay = async (song: Song, index: number) => {
    if (currentSong?.id === song.id) {
      // 点击当前歌曲：暂停则恢复，播放中则保持（不再 toggle）
      if (!isPlaying) {
        setIsPlaying(true);
      }
      return;
    }

    // 获取歌曲URL
    const urlRes = await getSongUrl(song.id);
    if (urlRes?.url) {
      setAudioUrl(urlRes.url);
      setCurrentSong(song);
      setIsPlaying(true);

      // 获取歌词
      const lyrics = await getLyric(song.id);
      setLyrics(lyrics);

      // 更新播放列表：如果当前歌曲列表与播放列表不同，则替换
      const isSamePlaylist =
        playlist.length > 0 &&
        playlist.length === songs.length &&
        playlist[0]?.id === songs[0]?.id;
      if (!isSamePlaylist) {
        setPlaylist(songs);
      } else if (!playlist.find((s) => s.id === song.id)) {
        addToPlaylist(song);
      }
    }
  };

  const handleLike = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) return;

    const isLiked = likedSongIds.has(song.id);
    const success = await likeSong(song.id, !isLiked);
    if (success) {
      if (isLiked) {
        removeLikedSong(song.id);
      } else {
        addLikedSong(song.id);
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showHeader && (
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs text-text-tertiary border-b border-border">
          {showIndex && <div className="w-10 text-center">#</div>}
          <div>{t('songList.title')}</div>
          {showAlbum && <div className="hidden md:block w-48">{t('songList.album')}</div>}
          <div className="w-16 text-right">{t('songList.duration')}</div>
          <div className="w-16 text-center">{t('songList.actions')}</div>
        </div>
      )}
      <div>
        {songs.map((song, index) => {
          const isActive = currentSong?.id === song.id;
          const isLiked = likedSongIds.has(song.id);
          const isLast = index === songs.length - 1;

          return (
            <div
              key={song.id}
              className={`relative grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center group cursor-pointer rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10'
                  : 'hover:bg-surface-hover'
              }`}
              onClick={() => handlePlay(song, index)}
            >
              {!isLast && (
                <div
                  className="absolute bottom-0 left-[7.75rem] right-20 h-px pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, var(--color-border) 8%, var(--color-border) 92%, transparent 100%)',
                    opacity: 0.45,
                  }}
                />
              )}
              {showIndex && (
                <div className="w-10 text-center text-sm text-text-tertiary flex items-center justify-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-primary animate-pulse h-2" />
                      <div className="w-1 bg-primary animate-pulse h-4" />
                      <div className="w-1 bg-primary animate-pulse h-3" />
                    </div>
                  ) : isActive ? (
                    <Pause size={14} className="text-primary" />
                  ) : (
                    <span className="group-hover:hidden">{index + 1}</span>
                  )}
                  <Play
                    size={14}
                    className={`hidden group-hover:block ${isActive ? 'text-primary' : 'text-text-secondary'}`}
                    fill="currentColor"
                  />
                </div>
              )}

              {/* 歌曲信息 */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={getImageUrl(song.album?.picUrl || song.picUrl, 48)}
                  alt={song.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className={`text-sm truncate ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                    {song.name}
                  </p>
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {(song.artists ?? []).map((a) => a.name).join(' / ')}
                  </p>
                </div>
              </div>

              {/* 专辑 */}
              {showAlbum && (
                <div className="hidden md:block w-48 text-sm text-text-secondary truncate">
                  {song.album?.name}
                </div>
              )}

              {/* 时长 */}
              <div className="w-16 text-right text-sm text-text-tertiary">
                {formatDuration(song.duration)}
              </div>

              {/* 操作 */}
              <div className="w-16 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleLike(song, e)}
                  className={`p-1.5 rounded-full hover:bg-surface transition-colors ${
                    isLiked ? 'text-primary' : 'text-text-tertiary'
                  }`}
                  title={isLiked ? t('common.unlike') : t('common.like')}
                >
                  <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <button className="p-1.5 rounded-full hover:bg-surface text-text-tertiary transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
