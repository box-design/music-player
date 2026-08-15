/**
 * VisualPlayer —— 碎裂声纹 · FRACTURED FREQUENCY 可视化全屏播放器外壳。
 *
 * 由 FullPlayer 在 playerStyle==='visual' 时渲染，复用其可见性/退场动画状态。
 * 组合：
 *   - 全屏黑底 + MusicVisualizer（canvas 可视化：骨脊线 / 飞白 / 裂光 / 暗噪）
 *   - 顶部栏（关闭按钮）
 *   - 左上 SongInfoCard（粗野主义面板，悬浮展开操控）
 *   - 右侧 VisualLyrics（无衬线窄体 + 裁切错位 + 鼓点黄辉光）
 */

import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudio } from '@/hooks/useAudio';
import { useAnalyser } from '@/hooks/useAnalyser';
import { useI18n } from '@/hooks/useI18n';
import { getImageUrl } from '@/utils/format';
import { extractDominantColor, type RgbTuple } from '@/utils/coverColor';
import MusicVisualizer from './MusicVisualizer';
import SongInfoCard from './SongInfoCard';
import VisualLyrics from './VisualLyrics';

interface VisualPlayerProps {
  isExiting: boolean;
}

export default function VisualPlayer({ isExiting }: VisualPlayerProps) {
  const { t } = useI18n();
  const { currentSong, isPlaying, setIsFullPlayerOpen } = usePlayerStore();
  const { audioRef } = useAudio();
  const { snapshot, available } = useAnalyser(audioRef, true);
  const [coverColor, setCoverColor] = useState<RgbTuple | undefined>(undefined);

  // 切歌时提取封面主色，驱动点阵发光色
  useEffect(() => {
    let cancelled = false;
    const url = getImageUrl(currentSong?.album?.picUrl || currentSong?.picUrl, 200);
    if (!url) {
      setCoverColor(undefined);
      return;
    }
    extractDominantColor(url, 64).then((color) => {
      if (!cancelled) setCoverColor(color ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-black ${
        isExiting ? 'animate-fp-retract-out' : 'animate-fp-fade-in'
      }`}
    >
      {/* ── 全屏可视化（点阵深渊 / 骨脊线 / 飞白 / 裂光 / 暗噪 / 断裂相框）── */}
      <MusicVisualizer
        snapshot={snapshot}
        available={available}
        isPlaying={isPlaying}
        coverColor={coverColor}
      />

      {/* ── 顶部栏：关闭按钮 ── */}
      <header className="relative z-20 flex items-center px-6 h-16 flex-shrink-0">
        <button
          onClick={() => setIsFullPlayerOpen(false)}
          className="p-2 -ml-2 text-bone/70 hover:text-[#FFE600] transition-colors"
          style={{ color: 'rgba(245,245,240,0.7)' }}
          aria-label={t('common.collapsePlayer')}
        >
          <ChevronDown size={22} />
        </button>
      </header>

      {/* ── 左上歌曲信息卡（粗野主义面板，悬浮展开操控）── */}
      <SongInfoCard />

      {/* ── 右侧歌词（无衬线窄体 + 裁切错位 + 鼓点黄辉光）── */}
      <VisualLyrics snapshot={snapshot} available={available} isPlaying={isPlaying} />
    </div>
  );
}
