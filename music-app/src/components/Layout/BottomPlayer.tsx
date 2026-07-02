import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Maximize2,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUserStore } from '@/stores/useUserStore';
import { useAudio } from '@/hooks/useAudio';
import { formatDuration, getImageUrl } from '@/utils/format';
import { likeSong } from '@/api/user';
import { useI18n } from '@/hooks/useI18n';
import { PLAY_MODES } from '@/utils/constants';

export default function BottomPlayer() {
  const navigate = useNavigate();
  const { seek } = useAudio();
  const { t } = useI18n();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
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

  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const volumePanelRef = useRef<HTMLDivElement>(null);
  const volumePointerIdRef = useRef<number>(0);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  // 移动端点击切换音量面板
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  // 点击外部关闭音量面板
  const handleClickOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (
      volumePanelRef.current &&
      !volumePanelRef.current.contains(e.target as Node)
    ) {
      setIsVolumeOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isVolumeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isVolumeOpen, handleClickOutside]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const handleLike = async () => {
    if (!isLoggedIn || !currentSong) return;
    const success = await likeSong(currentSong.id, !isLiked);
    if (success) {
      if (isLiked) removeLikedSong(currentSong.id);
      else addLikedSong(currentSong.id);
    }
  };

  const togglePlayMode = () => {
    const modes: ('sequence' | 'random' | 'single')[] = ['sequence', 'random', 'single'];
    const nextIndex = (modes.indexOf(playMode) + 1) % modes.length;
    setPlayMode(modes[nextIndex]);
  };

  const updateVolumeFromPointer = (clientY: number) => {
    if (!volumeTrackRef.current) return;
    const rect = volumeTrackRef.current.getBoundingClientRect();
    // 使用内层可视轨道区域计算（排除触摸热区的 padding）
    const trackTop = rect.top + 8; // 上 padding
    const trackBottom = rect.bottom - 8; // 下 padding
    const ratio = 1 - (clientY - trackTop) / (trackBottom - trackTop);
    setVolume(Math.max(0, Math.min(1, ratio)));
  };

  useEffect(() => {
    if (!isDraggingVolume) return;
    const track = volumeTrackRef.current;
    const handleMove = (e: PointerEvent) => {
      updateVolumeFromPointer(e.clientY);
    };
    const handleUp = () => {
      setIsDraggingVolume(false);
      // 拖拽结束后延迟关闭面板（给用户一点视觉反馈）
      setTimeout(() => {
        setIsVolumeOpen(false);
        setIsVolumeHovered(false);
      }, 600);
    };
    track?.addEventListener('pointermove', handleMove);
    track?.addEventListener('pointerup', handleUp);
    track?.addEventListener('pointerleave', handleUp);
    // 捕获指针以保证拖拽时即使手指滑出元素也能持续追踪
    track?.setPointerCapture(volumePointerIdRef.current);
    return () => {
      track?.removeEventListener('pointermove', handleMove);
      track?.removeEventListener('pointerup', handleUp);
      track?.removeEventListener('pointerleave', handleUp);
    };
  }, [isDraggingVolume]);

  // 没有歌曲时不渲染播放器
  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-[640px] max-w-[calc(100%-2rem)] h-16 bg-background-secondary/95 backdrop-blur-xl border border-border rounded-full shadow-lg shadow-black/5 z-50 bottom-player-float ${
        isFullPlayerOpen
          ? 'opacity-0 translate-y-[130%] scale-90 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div className="flex items-center h-full px-4 gap-3">
        {/* 左侧：歌曲信息 */}
        <div className="flex items-center gap-3 min-w-0 max-w-[35%]">
          <div
            className="relative cursor-pointer group flex-shrink-0"
            onClick={() => setIsFullPlayerOpen(true)}
          >
            <img
              src={getImageUrl(currentSong.album?.picUrl || currentSong.picUrl, 80)}
              alt={currentSong.name}
              className={`w-10 h-10 rounded-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
            />
            <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 size={14} className="text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <p
              className="text-sm text-text-primary truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/artist/${currentSong.artists?.[0]?.id}`)}
            >
              {currentSong.name}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {currentSong.artists?.map((a) => a.name).join(' / ')}
            </p>
          </div>
          <button
            onClick={handleLike}
            className={`p-1 rounded-full transition-colors flex-shrink-0 ${
              isLiked ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* 进度条 — 位于歌曲信息与播放控制之间，拥有更大空间 */}
        <div className="flex-1 min-w-[120px] h-5 group cursor-pointer relative">
          {/* 轨道 */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 rounded-full bg-border/50 transition-all duration-200 group-hover:h-1 overflow-hidden">
            <div className="h-full bg-primary rounded-full shadow-[0_0_6px_rgba(236,65,65,0.45)]" style={{ width: `${progress}%` }} />
          </div>
          {/* 滑块 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 shadow-md ring-2 ring-background-secondary pointer-events-none"
            style={{ left: `${progress}%` }}
          />
          {/* 交互输入 */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={t('common.playbackProgress')}
          />
        </div>

        {/* 中间：播放控制 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={togglePlayMode}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title={playModeLabels[playMode]}
          >
            {playMode === 'sequence' && <Repeat size={14} />}
            {playMode === 'random' && <Shuffle size={14} />}
            {playMode === 'single' && <Repeat1 size={14} />}
          </button>
          <button
            onClick={playPrev}
            className="text-text-primary hover:text-primary transition-colors"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
          >
            {isPlaying ? (
              <Pause size={18} className="text-black" fill="currentColor" />
            ) : (
              <Play size={18} className="text-black ml-0.5" fill="currentColor" />
            )}
          </button>
          <button
            onClick={playNext}
            className="text-text-primary hover:text-primary transition-colors"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>

        {/* 右侧：时间 + 音量 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-text-tertiary whitespace-nowrap hidden sm:inline">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          {/* 音量：点击/悬浮展开垂直滑块（移动端点击切换，桌面端悬浮预览） */}
          <div
            className="relative flex items-center justify-center"
            ref={volumePanelRef}
            onMouseEnter={() => setIsVolumeHovered(true)}
            onMouseLeave={() => {
              setIsVolumeHovered(false);
              // 桌面端鼠标离开时若未在拖拽则关闭
              if (!isDraggingVolume) setIsVolumeOpen(false);
            }}
          >
            <button
              onClick={() => {
                // 移动端：点击切换音量面板；桌面端：点击静音/取消静音
                if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                  setIsVolumeOpen((v) => !v);
                } else {
                  setVolume(volume > 0 ? 0 : 0.7);
                }
              }}
              className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              aria-label={volume === 0 ? t('common.unmute') : t('common.mute')}
            >
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* 音量垂直滑块面板 */}
            <div
              className={[
                'absolute bottom-full left-1/2 -translate-x-1/2 w-12 h-32',
                'bg-background-secondary/95 backdrop-blur-xl border border-border rounded-full shadow-lg',
                'flex flex-col items-center justify-center z-10 transition-opacity duration-200',
                isDraggingVolume || isVolumeHovered || isVolumeOpen
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none',
              ].join(' ')}
            >
              {/* 增大触摸区域：外层 w-10 作触摸热区，内层 w-1.5 为可视轨道 */}
              <div
                ref={volumeTrackRef}
                className="relative w-10 h-24 flex items-center justify-center cursor-pointer"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  volumePointerIdRef.current = e.pointerId;
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  updateVolumeFromPointer(e.clientY);
                  setIsDraggingVolume(true);
                  setIsVolumeOpen(true);
                }}
              >
                {/* 可视轨道 */}
                <div className="relative w-1.5 h-full bg-surface-hover rounded-full overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-text-secondary rounded-full transition-all duration-75"
                    style={{ height: `${volume * 100}%` }}
                  />
                </div>
                {/* 滑块圆点 */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md ring-2 ring-border transition-all duration-75"
                  style={{ bottom: `calc(${volume * 100}% - 6px)` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
