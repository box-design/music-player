import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import type { Song } from '@/types';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getSongUrl, getLyric } from '@/api/song';
import { getImageUrl } from '@/utils/format';

interface RadarCoverStackProps {
  songs: Song[];
  className?: string;
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setWidth(rect.width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { ref, width };
}

export default function RadarCoverStack({ songs, className = '' }: RadarCoverStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { ref: containerRef, width: containerWidth } = useContainerWidth();
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef(0);
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

  const visibleSongs = useMemo(() => songs.slice(0, 5), [songs]);
  const total = visibleSongs.length;

  // 歌曲列表变化时重置选中索引
  useEffect(() => {
    setActiveIndex(0);
  }, [songs]);

  // 根据容器宽度动态计算布局参数
  const layout = useMemo(() => {
    const clampedWidth = Math.min(containerWidth, 420);
    const cardSize = Math.min(Math.max(clampedWidth * 0.46, 140), 200);
    const baseSpread = cardSize * 0.36;
    const baseRotate = 5.5;
    const height = cardSize * 1.5;
    return { cardSize, baseSpread, baseRotate, height };
  }, [containerWidth]);

  // 鼠标滚轮切换
  useEffect(() => {
    const el = containerRef.current;
    if (!el || total === 0) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        if (e.deltaY > 0) {
          setActiveIndex((prev) => (prev + 1) % total);
        } else {
          setActiveIndex((prev) => (prev - 1 + total) % total);
        }
      }, 100);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [total, containerRef]);

  // 触摸滑动切换
  useEffect(() => {
    const el = containerRef.current;
    if (!el || total === 0) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartXRef.current = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartXRef.current - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          setActiveIndex((prev) => (prev + 1) % total);
        } else {
          setActiveIndex((prev) => (prev - 1 + total) % total);
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [total, containerRef]);

  const handlePlay = useCallback(
    async (song: Song, index: number) => {
      // 点击时同时设为当前选中
      setActiveIndex(index);

      if (currentSong?.id === song.id) {
        if (!isPlaying) setIsPlaying(true);
        return;
      }

      const urlRes = await getSongUrl(song.id);
      if (urlRes?.url) {
        setAudioUrl(urlRes.url);
        setCurrentSong(song);
        setIsPlaying(true);
        const lyrics = await getLyric(song.id);
        setLyrics(lyrics);

        const isSamePlaylist =
          playlist.length > 0 &&
          playlist.length === visibleSongs.length &&
          playlist[0]?.id === visibleSongs[0]?.id;
        if (!isSamePlaylist) {
          setPlaylist(visibleSongs);
        } else if (!playlist.find((s) => s.id === song.id)) {
          addToPlaylist(song);
        }
      }
    },
    [
      currentSong,
      isPlaying,
      playlist,
      visibleSongs,
      setCurrentSong,
      setPlaylist,
      setIsPlaying,
      setAudioUrl,
      setLyrics,
      addToPlaylist,
    ]
  );

  const getCardStyle = (index: number): React.CSSProperties => {
    if (total === 0) return {};

    const isActive = index === activeIndex;
    const isHovered = hoveredIndex === index;
    const offset = index - activeIndex;
    const absOffset = Math.abs(offset);

    let translateX = offset * layout.baseSpread;
    let translateY = absOffset * (layout.baseSpread * 0.18);
    let rotate = offset * layout.baseRotate;
    let scale = 1 - absOffset * 0.08;
    let zIndex = total - absOffset;
    let brightness = 0.55;
    let saturate = 0.75;

    if (isActive) {
      // 选中的卡片居中、放大、高亮
      translateX = 0;
      translateY = 0;
      rotate = 0;
      scale = 1.15;
      zIndex = 100;
      brightness = 1;
      saturate = 1;
    } else if (isHovered) {
      // 悬浮的非选中卡片微微提亮
      brightness = 0.8;
      saturate = 0.9;
      zIndex = 50;
    }

    return {
      width: layout.cardSize,
      height: layout.cardSize,
      transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
      zIndex,
      filter: `brightness(${brightness}) saturate(${saturate})`,
      transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };
  };

  if (total === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-[420px] flex items-center justify-center select-none ${className}`}
      style={{ perspective: '1200px', height: layout.height }}
    >
      {visibleSongs.map((song, index) => {
        const isActive = index === activeIndex;
        const isCurrentPlaying = currentSong?.id === song.id;
        const isHovered = hoveredIndex === index;

        return (
          <div
            key={song.id}
            className="absolute rounded-lg overflow-hidden cursor-pointer shadow-[0_10px_40px_rgba(0,0,0,0.35)] border border-border/60"
            style={getCardStyle(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handlePlay(song, index)}
          >
            <img
              src={getImageUrl(song.album?.picUrl || song.picUrl, 300)}
              alt={song.name}
              className="w-full h-full object-cover pointer-events-none"
              loading="lazy"
            />

            {/* 歌曲信息层：选中或悬浮时显示 */}
            <div
              className={`absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-white transition-opacity duration-300 ${
                isActive || isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <p className="text-xs font-semibold truncate">{song.name}</p>
              <p className="text-[10px] text-white/70 truncate mt-0.5">
                {(song.artists ?? []).map((a) => a.name).join(' / ')}
              </p>
            </div>

            {/* 播放状态指示器 */}
            <div
              className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-opacity duration-300 ${
                isCurrentPlaying && isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Pause size={14} fill="currentColor" />
            </div>

            {/* 悬浮播放按钮 */}
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity duration-300 ${
                isHovered && !(isCurrentPlaying && isPlaying) ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/90 text-text-primary flex items-center justify-center shadow-lg">
                <Play size={18} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
