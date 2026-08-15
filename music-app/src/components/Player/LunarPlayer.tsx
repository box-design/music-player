/**
 * LunarPlayer —— 月相抖动 · LUNAR DITHER 全屏可视化播放器外壳。
 *
 * 由 FullPlayer 在 playerStyle==='lunar' 时渲染，复用其可见性/退场动画状态。
 * 组合：
 *   - 全屏纯黑底 + LunarDitherVisualizer（Bayer 抖动月球 / 星空 / CRT / 噪点）
 *   - 顶部栏（退出键 + 右侧 VISTA / TERRAIN 视角切换）
 *   - LunarInfoPanel 悬浮于顶部栏内、退出键右侧（科幻切角面板：可折叠歌曲控制栏，
 *     展开时向下溢出）
 *   - LunarLyrics（像素风歌词层：仅 TERRAIN 视角显示，横屏居左、竖屏居顶）
 *
 * 视角模式持久化：上次选择的模式会写入 localStorage，下次进入时默认恢复；
 * 从未选择过时默认使用 VISTA（第一种模式）。
 * 注意：VISTA / TERRAIN 仅为界面显示名，内部状态值与存储键仍为 'orbit' / 'surface'，
 * 以便沿用旧 localStorage 中的已保存视角，无需迁移。
 */

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAudio } from '@/hooks/useAudio';
import { useAnalyser } from '@/hooks/useAnalyser';
import { useI18n } from '@/hooks/useI18n';
import { storage } from '@/utils/storage';
import LunarDitherVisualizer from './LunarDitherVisualizer';
import LunarInfoPanel from './LunarInfoPanel';
import LunarLyrics from './LunarLyrics';

type LunarViewMode = 'orbit' | 'surface';

const VIEW_MODE_STORAGE_KEY = 'lunar-player-view-mode';

interface LunarPlayerProps {
  isExiting: boolean;
}

export default function LunarPlayer({ isExiting }: LunarPlayerProps) {
  const { t } = useI18n();
  const { isPlaying, setIsFullPlayerOpen } = usePlayerStore();
  const { audioRef } = useAudio();
  const { snapshot, available } = useAnalyser(audioRef, true);
  const [viewMode, setViewMode] = useState<LunarViewMode>(
    () => storage.get<LunarViewMode>(VIEW_MODE_STORAGE_KEY, 'orbit') ?? 'orbit'
  );

  // 记住用户上次选择的视角模式
  useEffect(() => {
    storage.set(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-black ${
        isExiting ? 'animate-fp-retract-out' : 'animate-fp-fade-in'
      }`}
    >
      {/* ── 全屏可视化（Bayer 抖动月球 / 星空 / 胶片噪点 / CRT）── */}
      <LunarDitherVisualizer
        snapshot={snapshot}
        available={available}
        isPlaying={isPlaying}
        viewMode={viewMode}
      />

      {/* ── 顶部栏：退出键 + 歌曲控制 + 视角切换 ── */}
      <header className="relative z-20 flex items-center justify-between px-6 h-16 flex-shrink-0 pointer-events-none">
        {/* 左侧：退出键 + 歌曲控制折叠面板（悬浮在退出键右侧，向下展开） */}
        <div className="flex items-center gap-3 pointer-events-auto min-w-0">
          <button
            onClick={() => setIsFullPlayerOpen(false)}
            className="p-2 -ml-2 pointer-events-auto text-white/60 hover:text-white transition-colors flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            aria-label={t('common.collapsePlayer')}
          >
            <ChevronDown size={22} />
          </button>

          <LunarInfoPanel snapshot={snapshot} available={available} />
        </div>

        {/* 右上角：VISTA / TERRAIN 视角切换（白色相框，大写白色英文） */}
        <div className="lunar-mode-group pointer-events-auto flex-shrink-0">
          <button
            onClick={() => setViewMode('orbit')}
            className={`lunar-mode-btn ${viewMode === 'orbit' ? 'lunar-mode-btn--active' : ''}`}
            aria-pressed={viewMode === 'orbit'}
            title="VISTA"
          >
            VISTA
          </button>
          <button
            onClick={() => setViewMode('surface')}
            className={`lunar-mode-btn ${viewMode === 'surface' ? 'lunar-mode-btn--active' : ''}`}
            aria-pressed={viewMode === 'surface'}
            title="TERRAIN"
          >
            TERRAIN
          </button>
        </div>
      </header>

      {/* ── 像素风歌词层（仅 TERRAIN 视角显示；VISTA 视角不显示歌词）── */}
      {viewMode === 'surface' && <LunarLyrics />}
    </div>
  );
}
