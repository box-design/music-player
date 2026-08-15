/**
 * VisualLyrics —— 碎裂声纹可视化播放器的歌词层。
 *
 * 设计（呼应设计文档 6.1 字体与文字）：
 * - 无衬线窄体（Helvetica Neue Condensed Bold 风）、大字号、宽字距、大写。
 * - 文字处理：裁切错位（ff-glitch 上下分裂 1px 重影）。
 * - 颜色：骨骼白；鼓点瞬间文字边缘泛出黄色辉光（ff-beat-pulse）。
 * - 定位：压在中央封面之上的「断裂线」位置（画面上 1/3），不居中。
 * - 切行动画：错位散开淡出 / 错位复位淡入。
 *
 * 性能设计：
 * - 鼓点黄辉光用 Web Animations API 重放（element.animate），
 *   不再把 beatTick 塞进 key 导致每拍重挂载整行歌词（重建字符 span + 重放入场动画）。
 */

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import type { AnalyserSnapshot } from '@/hooks/useAnalyser';

interface ActiveLine {
  text: string;
  /** 每次文本变化时自增，用作 key 触发重新挂载动画 */
  key: number;
}

interface VisualLyricsProps {
  snapshot: React.MutableRefObject<AnalyserSnapshot | null>;
  available: boolean;
  isPlaying: boolean;
}

export default function VisualLyrics({
  snapshot,
  available,
  isPlaying,
}: VisualLyricsProps) {
  const { lyrics, currentLyricIndex } = usePlayerStore();
  const [active, setActive] = useState<ActiveLine | null>(null);
  const [prev, setPrev] = useState<ActiveLine | null>(null);
  const [seq, setSeq] = useState(0);
  // 鼓点触发黄辉光的计数器（每次鼓点 +1，触发辉光动画重放）
  const [beatTick, setBeatTick] = useState(0);
  // 当前行 DOM 引用，用于 WAAPI 重放鼓点辉光
  const lineRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (currentLyricIndex < 0 || !lyrics[currentLyricIndex]) {
      // 间奏（无当前行）：把当前行淡出为空。
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

  // ── 鼓点检测：轻量 rAF 监控 bass 能量，触发文字黄辉光 ──
  const beatState = useRef({ bassAvg: 0, cooldown: 0 });
  useEffect(() => {
    if (!isPlaying || !available) return;
    let rafId = 0;
    const loop = () => {
      const snap = snapshot.current;
      if (snap) {
        const bass = snap.bassEnergy;
        const st = beatState.current;
        st.bassAvg = st.bassAvg * 0.92 + bass * 0.08;
        st.cooldown = Math.max(0, st.cooldown - 1);
        if (bass > 0.16 && bass > st.bassAvg * 1.32 && st.cooldown === 0) {
          st.cooldown = 8;
          setBeatTick((t) => t + 1); // 触发辉光动画重放
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, available, snapshot]);

  // ── 鼓点黄辉光：WAAPI 重放，避免每拍重挂载整行歌词 ──
  useEffect(() => {
    if (beatTick === 0) return;
    const el = lineRef.current;
    if (!el) return;
    // 只清除 WAAPI 生成的辉光动画（animationName 为 'none'），
    // 避免把切行时的 CSS 入场动画（viz-lyric-in）一并取消。
    el.getAnimations().forEach((a) => {
      if ((a as CSSAnimation).animationName === 'none') a.cancel();
    });
    el.animate(
      [
        { textShadow: '0 0 0 rgba(255,230,0,0)' },
        {
          textShadow: '-2px 0 14px rgba(255,230,0,0.85), 2px 0 4px rgba(255,153,0,0.6)',
          offset: 0.18,
        },
        { textShadow: '0 0 0 rgba(255,230,0,0)' },
      ],
      { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }, [beatTick]);

  return (
    <div
      className="pointer-events-none absolute z-10 select-none"
      style={{
        top: '20%',
        left: '50%',
        width: 'clamp(280px, 46vw, 720px)',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="relative min-h-[2.4em] text-center">
        {/* 旧行：错位散开 + 渐隐 */}
        {prev && (
          <p
            key={`prev-${prev.key}`}
            className="viz-lyric-line viz-lyric-out absolute inset-0"
          >
            {prev.text}
          </p>
        )}
        {/* 当前行：错位复位 + 渐显 + 鼓点黄辉光 + 字符级故障 */}
        {active ? (
          <p
            key={`cur-${active.key}`}
            ref={lineRef}
            className="viz-lyric-line viz-lyric-in relative"
          >
            <GlitchText text={active.text} beatTick={beatTick} />
          </p>
        ) : (
          <p
            className="viz-lyric-line viz-lyric-in relative"
            style={{ color: 'rgba(245,245,240,0.25)' }}
          >
            ♪
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * GlitchText —— 字符级故障文字。
 *
 * 每个字符是独立的 inline-block span：
 *  - 鼓点触发（beatTick 变化）时，随机挑 ~20% 字符做一次强错位 + 裁切。
 *  - 持续期：每个字符以低速概率做 ±1px 微抖（呼吸故障）。
 * 呼应设计文档 6.1「部分笔画被裁切缺失 / 错位重影」。
 */
function GlitchText({ text, beatTick }: { text: string; beatTick: number }) {
  // 帧计数器：驱动持续微抖
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  // 鼓点强错位的随机种子（每次 beatTick 变化刷新）
  const beatSeed = useRef<Record<number, { dx: number; dy: number; sliced: boolean }>>({});
  if (Object.keys(beatSeed.current).length !== text.length) {
    beatSeed.current = {};
    for (let i = 0; i < text.length; i++) {
      beatSeed.current[i] = {
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 3,
        sliced: Math.random() < 0.2,
      };
    }
  }

  return (
    <>
      {text.split('').map((ch, i) => {
        // 鼓点时刻：~20% 字符强错位；其余时刻持续微抖
        const beat = beatSeed.current[i];
        const jitterNow = Math.random() < 0.08; // 持续微抖概率
        const dx =
          beat && Math.abs(beat.dx) > 1.5 && (beatTick % 3 === 0 || jitterNow)
            ? beat.dx
            : jitterNow
            ? (Math.random() - 0.5) * 2
            : 0;
        const dy =
          beat && Math.abs(beat.dy) > 1 && (beatTick % 3 === 0 || jitterNow)
            ? beat.dy
            : jitterNow
            ? (Math.random() - 0.5) * 1.5
            : 0;
        const sliced = beat?.sliced && beatTick % 4 === 0;
        // tick 引用避免被 lint 标未使用
        void tick;
        const isSpace = ch === ' ';
        return (
          <span
            key={i}
            className={`ff-char ${sliced ? 'ff-char--sliced' : ''} ${
              dx !== 0 || dy !== 0 ? 'ff-char--jitter' : ''
            }`}
            style={
              dx !== 0 || dy !== 0
                ? { transform: `translate(${dx}px, ${dy}px)` }
                : undefined
            }
          >
            {isSpace ? '\u00A0' : ch}
          </span>
        );
      })}
    </>
  );
}
