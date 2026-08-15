/**
 * LunarLyrics —— 月相抖动 · LUNAR DITHER 全屏播放器的像素风歌词层。
 *
 * 仅由 LunarPlayer 在 TERRAIN（surface）视角下渲染；VISTA（orbit）视角不显示
 * 歌词，避免遮挡居中的月球。
 *
 * 定位（纯 CSS 媒体查询驱动，与 TERRAIN 视角的月球位置互补）：
 * - 横屏：月球贴右 → 歌词落在屏幕左侧，垂直居中，宽度受限（min(30vw, 460px)），
 *   折行后右缘始终不与右侧月球重叠。
 * - 竖屏：月球贴底 → 歌词落在屏幕顶部，水平居中，max-height 约束在月球顶缘
 *   之上（85vh - 90vw 经验留白），超出部分裁切，保证不遮挡月球。
 * - 一律使用折行（pre-wrap + overflow-wrap:anywhere）与 max-height 裁切，
 *   保证长句不遮挡月球。
 *
 * 美学（呼应 Bayer 抖动 / 单色 / CRT 主题）：
 * - 等宽字体 + 硬阴影错位（无模糊的像素重影）+ 大写拉丁字距，单色灰阶。
 * - 切换动画：当前行「像素步进」扫描展开入场（steps 分跳）+ 上下分层单色
 *   glitch 错位残影；旧行像素步进上收淡出；整块切换时 1-2px 抖动（呼应月球
 *   鼓点 glitch）。
 * - 当前行前有闪烁方块光标（终端输入感），顶部 LRC FEED 状态标签。
 *
 * 性能：无逐帧动画 / 无 rAF，仅 index 变化时重挂载触发 CSS 动画。
 */

import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface ActiveLine {
  text: string;
  /** 每次文本变化时自增，用作 key 触发重新挂载动画 */
  key: number;
}

export default function LunarLyrics() {
  const { lyrics, currentLyricIndex } = usePlayerStore();
  const [active, setActive] = useState<ActiveLine | null>(null);
  const [prev, setPrev] = useState<ActiveLine | null>(null);
  const [seq, setSeq] = useState(0);

  // 切行：旧行交给 prev 播放退场动画，新行携带新 key 播放入场 + glitch
  useEffect(() => {
    if (currentLyricIndex < 0 || !lyrics[currentLyricIndex]) {
      // 间奏 / 无当前行：把当前行淡出为空
      setActive((cur) => {
        if (cur) setPrev(cur);
        return null;
      });
      return;
    }
    const text = lyrics[currentLyricIndex].text.trim();
    setActive((cur) => {
      if (cur && cur.text === text) return cur; // 同一行不重复触发
      if (cur) setPrev(cur);
      const nextSeq = seq + 1;
      setSeq(nextSeq);
      return { text, key: nextSeq };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLyricIndex, lyrics]);

  const hasLyrics = lyrics.length > 0;
  const next =
    hasLyrics &&
    currentLyricIndex >= 0 &&
    currentLyricIndex + 1 < lyrics.length
      ? lyrics[currentLyricIndex + 1].text.trim()
      : '';

  return (
    <div className="lunar-lyrics" aria-live="polite">
      <p className="lunar-lyrics-label">LUNAR // LRC FEED</p>

      {hasLyrics ? (
        // key 随切行自增：整块重挂载，重放入场 / 退场 / 抖动动画
        <div key={seq} className="lunar-lyric-stack lunar-lyric-kick">
          <div className="lunar-lyric-slot">
            {/* 旧行：像素步进上收 + 渐隐（与当前行同槽交叉淡出） */}
            {prev && (
              <p
                key={`prev-${prev.key}`}
                className="lunar-lyric-line lunar-lyric-line--dim lunar-lyric-out"
              >
                {prev.text}
              </p>
            )}
            {/* 当前行：扫描展开入场 + 分层 glitch 残影 + 闪烁光标 */}
            {active ? (
              <p
                key={`cur-${active.key}`}
                data-text={active.text}
                className="lunar-lyric-line lunar-lyric-line--active lunar-lyric-in"
              >
                <span className="lunar-lyric-cursor" aria-hidden="true" />
                {active.text}
              </p>
            ) : (
              <p className="lunar-lyric-line lunar-lyric-line--active">♪</p>
            )}
          </div>
          {/* 下一行：静态预览 */}
          {next && (
            <p className="lunar-lyric-line lunar-lyric-line--next">{next}</p>
          )}
        </div>
      ) : (
        <div className="lunar-lyric-slot">
          <p className="lunar-lyric-line lunar-lyric-line--active">
            <span className="lunar-lyric-cursor" aria-hidden="true" />
            NO LRC SIGNAL
          </p>
        </div>
      )}
    </div>
  );
}
