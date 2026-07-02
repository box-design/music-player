import { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAudio } from '@/hooks/useAudio';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUserStore } from '@/stores/useUserStore';
import { formatDuration } from '@/utils/format';
import { likeSong } from '@/api/user';
import { PLAY_MODES } from '@/utils/constants';
import { useI18n } from '@/hooks/useI18n';

export default function PlayerControls() {
  const { t } = useI18n();
  const { seek } = useAudio();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    togglePlay,
    setVolume,
    setPlayMode,
    playNext,
    playPrev,
  } = usePlayerStore();

  const { isLoggedIn, likedSongIds, addLikedSong, removeLikedSong } = useUserStore();

  const isLiked = currentSong ? likedSongIds.has(currentSong.id) : false;
  const playModeLabels: Record<string, string> = {
    sequence: t('player.sequence'),
    random: t('player.random'),
    single: t('player.single'),
  };
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── 进度条拖拽 ──
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const progressPointerIdRef = useRef<number>(0);

  const seekFromPointer = (clientX: number) => {
    if (!progressTrackRef.current) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  useEffect(() => {
    if (!isDraggingProgress) return;
    const track = progressTrackRef.current;
    const handleMove = (e: PointerEvent) => seekFromPointer(e.clientX);
    const handleUp = () => setIsDraggingProgress(false);
    track?.addEventListener('pointermove', handleMove);
    track?.addEventListener('pointerup', handleUp);
    track?.addEventListener('pointerleave', handleUp);
    track?.setPointerCapture(progressPointerIdRef.current);
    return () => {
      track?.removeEventListener('pointermove', handleMove);
      track?.removeEventListener('pointerup', handleUp);
      track?.removeEventListener('pointerleave', handleUp);
    };
  }, [isDraggingProgress, duration]);

  // ── 音量拖拽 ──
  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const volumePointerIdRef = useRef<number>(0);

  const updateVolumeFromPointer = (clientX: number) => {
    if (!volumeTrackRef.current) return;
    const rect = volumeTrackRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setVolume(Math.max(0, Math.min(1, ratio)));
  };

  useEffect(() => {
    if (!isDraggingVolume) return;
    const track = volumeTrackRef.current;
    const handleMove = (e: PointerEvent) => updateVolumeFromPointer(e.clientX);
    const handleUp = () => setIsDraggingVolume(false);
    track?.addEventListener('pointermove', handleMove);
    track?.addEventListener('pointerup', handleUp);
    track?.addEventListener('pointerleave', handleUp);
    track?.setPointerCapture(volumePointerIdRef.current);
    return () => {
      track?.removeEventListener('pointermove', handleMove);
      track?.removeEventListener('pointerup', handleUp);
      track?.removeEventListener('pointerleave', handleUp);
    };
  }, [isDraggingVolume]);

  // ── 收藏 ──
  const handleLike = async () => {
    if (!isLoggedIn || !currentSong) return;
    const success = await likeSong(currentSong.id, !isLiked);
    if (success) {
      if (isLiked) removeLikedSong(currentSong.id);
      else addLikedSong(currentSong.id);
    }
  };

  // ── 播放模式 ──
  const togglePlayMode = () => {
    const modes: ('sequence' | 'random' | 'single')[] = ['sequence', 'random', 'single'];
    const nextIndex = (modes.indexOf(playMode) + 1) % modes.length;
    setPlayMode(modes[nextIndex]);
  };

  return (
    <div className="flex flex-col px-6 py-5 gap-4">

      {/* ── 进度条 ── */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] text-white/40 tabular-nums">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        <div
          ref={progressTrackRef}
          className="relative h-5 flex items-center group cursor-pointer rounded-full"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault();
            progressPointerIdRef.current = e.pointerId;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            seekFromPointer(e.clientX);
            setIsDraggingProgress(true);
          }}
        >
          {/* 可视轨道 — 内层保持 h-1.5，overflow-hidden 裁剪进度条填充 */}
          <div className="absolute left-0 right-0 h-1.5 rounded-full overflow-hidden bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/60 to-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* 滑块圆点 — 在 overflow-hidden 外层以防被裁剪 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── 控制按钮行 ── */}
      <div className="flex items-center justify-between">
        {/* 播放模式 */}
        <button
          onClick={togglePlayMode}
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5"
          title={playModeLabels[playMode]}
        >
          {playMode === 'sequence' && <Repeat size={16} />}
          {playMode === 'random' && <Shuffle size={16} />}
          {playMode === 'single' && <Repeat1 size={16} />}
        </button>

        {/* 核心控制 */}
        <div className="flex items-center gap-5">
          <button
            onClick={playPrev}
            className="text-white/60 hover:text-white transition-colors active:scale-90"
          >
            <SkipBack size={22} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
          >
            {isPlaying ? (
              <Pause size={24} className="text-black" fill="currentColor" />
            ) : (
              <Play size={24} className="text-black ml-0.5" fill="currentColor" />
            )}
          </button>

          <button
            onClick={playNext}
            className="text-white/60 hover:text-white transition-colors active:scale-90"
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>

        {/* 收藏 + 音量 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            className={`transition-colors active:scale-90 ${
              isLiked ? 'text-red-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            {/* 外层增大触摸热区 h-6，内层保持视觉高度 h-1 */}
            <div
              ref={volumeTrackRef}
              className="relative w-16 h-6 flex items-center cursor-pointer group"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                e.preventDefault();
                volumePointerIdRef.current = e.pointerId;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                updateVolumeFromPointer(e.clientX);
                setIsDraggingVolume(true);
              }}
            >
              {/* 可视轨道 */}
              <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/50 transition-all"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
              {/* 滑块圆点 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
