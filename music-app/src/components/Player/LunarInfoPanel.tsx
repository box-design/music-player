/**
 * LunarInfoPanel —— 月相抖动可视化播放器的科幻终端面板。
 *
 * 位置：悬浮于顶部栏内、退出键右侧（由 LunarPlayer 放在 header 的 flex 组里）。
 * 外层 wrapper 是零高度锚点（h-0 + self-start，顶部与 header 顶对齐），
 * 面板自身 absolute 定位：折叠时仅露出折叠栏（与退出键同行），
 * 展开时向下溢出 header，形成下拉式控制面板。
 *
 * 美学：
 * - 纯黑底 + 纯白/灰 1px 边框，切角（clip-path）形成登月计划式终端外观。
 * - 等宽字体，大写/小号字距。
 * - 边框发光强度由整体音频响度驱动（直接操作 DOM style，避免每帧 setState 导致子树重渲染）。
 * - 复用 PlayerControls 提供进度/播放/上下首/模式/音量。
 *
 * 折叠栏：
 * - 折叠态只显示歌曲名 + 歌手 + 展开指示，把屏幕空间让给歌词层；
 * - 点击可持久展开/收起（点击后短暂抑制悬浮，保证能再次点击合拢）；
 *   悬浮临时展开，移出鼠标后收起（触摸设备退化为点击切换）。
 */

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getImageUrl } from '@/utils/format';
import type { AnalyserSnapshot } from '@/hooks/useAnalyser';
import PlayerControls from './PlayerControls';

interface LunarInfoPanelProps {
  snapshot: React.MutableRefObject<AnalyserSnapshot | null>;
  available: boolean;
}

export default function LunarInfoPanel({ snapshot, available }: LunarInfoPanelProps) {
  const { currentSong, isPlaying } = usePlayerStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef(0.12);
  // 点击持久锁定展开 / 收起；悬浮只做临时展开。
  // 注意：点击后必须短暂抑制悬浮（hoverSuppressed），否则鼠标仍悬停在面板上时
  // hovered=true 会让「点击合拢」永远不生效。
  const [lockedOpen, setLockedOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoverSuppressed, setHoverSuppressed] = useState(false);
  const expanded = lockedOpen || hovered;

  // 响度驱动边框发光：直接修改 DOM style，不触发 React 重渲染
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let rafId = 0;
    const loop = () => {
      const snap = snapshot.current;
      const loudness = snap && available ? snap.bassEnergy + snap.midEnergy + snap.trebleEnergy : 0;
      const target = 0.08 + Math.min(0.55, loudness * 0.9);
      glowRef.current += (target - glowRef.current) * 0.12;
      const alpha = glowRef.current;
      panel.style.boxShadow = `0 0 ${16 + alpha * 32}px rgba(255,255,255,${alpha * 0.35})`;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [snapshot, available]);

  if (!currentSong) return null;

  const coverUrl = getImageUrl(currentSong.album?.picUrl || currentSong.picUrl, 200);
  const artists = currentSong.artists?.map((a) => a.name).join(' / ');

  return (
    <div
      className="relative h-0 self-start pointer-events-auto"
      style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace' }}
      onMouseEnter={() => {
        if (hoverSuppressed) return;
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        setHoverSuppressed(false);
      }}
    >
      <div
        ref={panelRef}
        className="lunar-panel lunar-panel--header pointer-events-auto transition-shadow duration-200"
        style={{ width: 'min(320px, 46vw)' }}
      >
        {/* 面板装饰角标 */}
        <div className="lunar-panel-corner lunar-panel-corner--tl" />
        <div className="lunar-panel-corner lunar-panel-corner--tr" />
        <div className="lunar-panel-corner lunar-panel-corner--bl" />
        <div className="lunar-panel-corner lunar-panel-corner--br" />

        {/* 折叠栏：仅歌曲名 + 歌手；点击切换展开/收起，悬浮临时展开 */}
        <button
          type="button"
          className="lunar-panel-bar"
          onClick={() => {
            // 点击=切换：翻转锁定态后清掉悬浮占位，避免悬停阻止合拢；
            // 直到鼠标离开再进入，悬浮才恢复「临时展开」。
            setLockedOpen((o) => !o);
            setHovered(false);
            setHoverSuppressed(true);
          }}
          aria-expanded={expanded}
          title={expanded ? 'COLLAPSE' : 'EXPAND'}
        >
          <span className="lunar-panel-bar-name">{currentSong.name}</span>
          <span className="lunar-panel-bar-artist">{artists || 'UNKNOWN ARTIST'}</span>
          <span
            className={`lunar-panel-bar-caret ${expanded ? 'is-open' : ''}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {/* 展开内容：封面 / 专辑 / 遥测 / 完整操控 */}
        {expanded && (
          <div className="lunar-panel-body">
            <div className="flex items-start gap-4 p-4 pb-3">
              <img
                src={coverUrl}
                alt={currentSong.name}
                className="w-14 h-14 object-cover flex-shrink-0 grayscale contrast-125"
                style={{ borderRadius: 0 }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13px] font-bold uppercase truncate tracking-wider"
                  style={{ color: '#ffffff', letterSpacing: '0.06em' }}
                >
                  {currentSong.name}
                </p>
                <p
                  className="text-[11px] uppercase truncate mt-1"
                  style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}
                >
                  {artists || 'UNKNOWN ARTIST'}
                </p>
                {currentSong.album?.name && (
                  <p
                    className="text-[10px] uppercase truncate mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}
                  >
                    {currentSong.album.name}
                  </p>
                )}
                <div
                  className="flex items-center gap-2 mt-2 text-[9px] uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5"
                    style={{
                      background: isPlaying ? '#ffffff' : 'rgba(255,255,255,0.35)',
                      boxShadow: isPlaying ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                    }}
                  />
                  <span>LUNAR.TELEMETRY // {isPlaying ? 'ONLINE' : 'STANDBY'}</span>
                </div>
              </div>
            </div>

            {/* 完整操控组件 */}
            <div className="px-3 pb-3 pt-0">
              <PlayerControls />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
