import {
  ChevronDown,
  Share2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAppStore } from '@/stores/useAppStore';
import CoverDisplay from './CoverDisplay';
import LyricsPanel from './LyricsPanel';
import PlayerControls from './PlayerControls';
import VisualPlayer from './VisualPlayer';
import LunarPlayer from './LunarPlayer';

export default function FullPlayer() {
  const {
    currentSong,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
  } = usePlayerStore();
  const { playerStyle } = useAppStore();

  // Keep the component mounted during the exit animation so the
  // full-screen player can retract before unmounting.
  const [isVisible, setIsVisible] = useState(isFullPlayerOpen);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isFullPlayerOpen) {
      setIsVisible(true);
      setIsExiting(false);
    } else if (isVisible) {
      setIsExiting(true);
      const timer = setTimeout(() => setIsVisible(false), 450);
      return () => clearTimeout(timer);
    }
  }, [isFullPlayerOpen, isVisible]);

  if (!isVisible || !currentSong) return null;

  // ── 可视化风格：委托给 VisualPlayer，沿用同一套可见性/退场动画 ──
  if (playerStyle === 'visual') {
    return <VisualPlayer isExiting={isExiting} />;
  }

  // ── 月相抖动风格：委托给 LunarPlayer ──
  if (playerStyle === 'lunar') {
    return <LunarPlayer isExiting={isExiting} />;
  }

  // ── 经典风格：原双面板布局 ──
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${isExiting ? 'animate-fp-retract-out' : 'animate-fp-fade-in'}`}>
      {/* ── 极轻遮罩，保证共享的动态时间背景可见且内容可读 ── */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* ── 顶部导航栏 ── */}
      <header className="relative z-10 flex items-center justify-between px-8 h-16 flex-shrink-0">
        <button
          onClick={() => setIsFullPlayerOpen(false)}
          className="p-2 -ml-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronDown size={22} />
        </button>

        <div className="text-center pointer-events-none select-none">
          <p className="text-[11px] uppercase tracking-widest text-white/40">
            Now Playing
          </p>
          <p className="text-sm text-white/80 truncate max-w-xs mt-0.5">
            {currentSong.name}
          </p>
        </div>

        <button className="p-2 -mr-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <Share2 size={18} />
        </button>
      </header>

      {/* ── 双面板主体 ── */}
      <main className="relative z-10 flex-1 flex items-stretch gap-5 px-8 pb-8 pt-2 overflow-hidden">

        {/* 左侧：封面（上）+ 操控（下） */}
        <div className="flex flex-col gap-5 w-[46%] flex-shrink-0 min-w-[320px] max-w-[480px]">
          {/* 封面上半 */}
          <section
            className={`fp-glass-panel flex-1 min-h-0 ${isExiting ? 'animate-fp-panel-out' : 'animate-fp-panel-in'}`}
            style={!isExiting ? { animationDelay: '0.05s' } : undefined}
          >
            <CoverDisplay />
          </section>

          {/* 操控下半 */}
          <section
            className={`fp-glass-panel flex-shrink-0 ${isExiting ? 'animate-fp-panel-out' : 'animate-fp-panel-in'}`}
            style={!isExiting ? { animationDelay: '0.12s' } : undefined}
          >
            <PlayerControls />
          </section>
        </div>

        {/* 右侧：歌词面板 */}
        <section
          className={`fp-glass-panel flex-1 min-w-0 ${isExiting ? 'animate-fp-panel-out' : 'animate-fp-panel-in'}`}
          style={!isExiting ? { animationDelay: '0.19s' } : undefined}
        >
          <LyricsPanel />
        </section>
      </main>
    </div>
  );
}
