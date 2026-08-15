import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Heart, Trash2, Music2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { getPersonalFM } from '@/api/recommend';
import { getSongUrl, getLyric } from '@/api/song';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUserStore } from '@/stores/useUserStore';
import { getImageUrl, formatDuration } from '@/utils/format';
import { likeSong } from '@/api/user';
import Loading from '@/components/common/Loading';
import type { Song } from '@/types';

export default function PrivateFM() {
  const { t } = useI18n();
  const [fmSongs, setFmSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  // 只订阅实际用到的字段：整 store 订阅会让页面随 currentTime(~4次/秒)重渲染
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const setCurrentSong = usePlayerStore((s) => s.setCurrentSong);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setAudioUrl = usePlayerStore((s) => s.setAudioUrl);
  const setLyrics = usePlayerStore((s) => s.setLyrics);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);

  const { isLoggedIn, likedSongIds, addLikedSong, removeLikedSong } = useUserStore();

  const currentSong = fmSongs[currentIndex];

  const loadFM = useCallback(async () => {
    setLoading(true);
    try {
      const songs = await getPersonalFM();
      setFmSongs(songs);
      if (songs.length > 0) {
        playSong(songs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFM();
  }, [loadFM]);

  const playSong = async (song: Song) => {
    const urlRes = await getSongUrl(song.id);
    if (urlRes?.url) {
      setAudioUrl(urlRes.url);
      setCurrentSong(song);
      setIsPlaying(true);
      const lyrics = await getLyric(song.id);
      setLyrics(lyrics);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < fmSongs.length) {
      setCurrentIndex(nextIndex);
      playSong(fmSongs[nextIndex]);
    } else {
      loadFM();
    }
  };

  const handleLike = async () => {
    if (!isLoggedIn || !currentSong) return;
    const isLiked = likedSongIds.has(currentSong.id);
    const success = await likeSong(currentSong.id, !isLiked);
    if (success) {
      if (isLiked) removeLikedSong(currentSong.id);
      else addLikedSong(currentSong.id);
    }
  };

  if (loading) return <Loading className="py-20" />;
  if (!currentSong) return <div className="text-text-tertiary text-center py-20">{t('fm.noSongs')}</div>;

  const isLiked = likedSongIds.has(currentSong.id);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t('fm.title')}</h1>
        <p className="text-sm text-text-secondary">{t('fm.description')}</p>
      </div>

      {/* 封面 */}
      <div className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-2xl mb-8">
        <img
          src={getImageUrl(currentSong.album?.picUrl || currentSong.picUrl, 400)}
          alt={currentSong.name}
          className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse-slow' : ''}`}
        />
      </div>

      {/* 歌曲信息 */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-1">{currentSong.name}</h2>
        <p className="text-text-secondary">
          {currentSong.artists?.map((a) => a.name).join(' / ')}
        </p>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-md flex items-center gap-3 mb-8">
        <span className="text-xs text-text-tertiary w-10 text-right">{formatDuration(currentTime)}</span>
        <div className="flex-1 h-1 bg-surface-hover rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-text-tertiary w-10">{formatDuration(duration)}</span>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center gap-8">
        <button
          onClick={handleLike}
          className={`p-3 rounded-full transition-colors ${
            isLiked ? 'text-primary bg-primary/10' : 'text-text-secondary hover:bg-surface-hover'
          }`}
        >
          <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary-hover transition-colors"
        >
          {isPlaying ? (
            <Pause size={28} className="text-white" fill="white" />
          ) : (
            <Play size={28} className="text-white ml-1" fill="white" />
          )}
        </button>

        <button
          onClick={handleNext}
          className="p-3 rounded-full text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <SkipForward size={22} />
        </button>

        <button className="p-3 rounded-full text-text-secondary hover:bg-surface-hover transition-colors">
          <Trash2 size={22} />
        </button>
      </div>
    </div>
  );
}
