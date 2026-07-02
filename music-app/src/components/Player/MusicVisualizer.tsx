/**
 * MusicVisualizer —— 碎裂声纹 · FRACTURED FREQUENCY 可视化。
 *
 * 美学：粗野主义凌厉边缘 + 故障艺术错位 + 东方书法飞白。
 * 色彩规则：90% 黑 / 9% 白系 / 1% 鼓点黄。
 *
 * 本版本已移除所有鼓点触发的粒子/迸射/震动特效，改为纯频谱驱动：
 *   - 背景 bass 光晕随低频连续呼吸
 *   - 骨脊线直接映射频谱
 *   - 飞白由中高频持续音产生
 *   - 余烬尘埃常驻缓慢浮动
 * 以保证低功耗、高帧率。
 *
 * 分层（自下而上，单 canvas + 单 rAF）：
 *   L0  暗噪基底      纯黑底 + 极微弱颗粒噪点（DOM 层呼吸颤动）
 *   L0b 背景光晕      随 bass 连续呼吸的暗黄色径向光晕
 *   L0c 余烬尘埃      深渊中缓慢上升的微亮点，密度随能量呼吸
 *   L1a 骨脊倒影      基线下方微弱水波倒影（构深度）
 *   L1  骨脊线        横向贯穿、不规则断裂折线（频段宽度/高度错位、顶端斜切）
 *   L1b 骨脊黄尖      高能量柱顶部锐角黄尖
 *   L2  飞白          中高频持续音拖出的灰白断裂尾迹（书法飞白）
 *   L4  断裂相框      画面四角 45° 白色短线（不闭合）
 *   L5  待机坍缩      无信号时画面保留极淡基线
 *
 * 封面：DOM 层（避免 canvas CORS 污染），居中、压暗 30% + 扫描线 + RGB 色散。
 *
 * DPR 上限 2；余烬尘埃 40。
 */

import { useEffect, useRef } from 'react';
import type { AnalyserSnapshot } from '@/hooks/useAnalyser';

/** 飞白尾迹片段（一段断裂的灰白线） */
interface FlySegment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  len: number;
  gap: boolean; // 是否处于随机中断空隙
}
/** 余烬尘埃（深渊中缓慢上升的微亮点） */
interface Ember {
  x: number;
  y: number;
  vy: number;
  size: number;
  twinkle: number; // 闪烁相位
}

const SPINE_BARS = 76; // 骨脊线频段数
const EMBER_COUNT = 40; // 余烬尘埃数量（常驻）

interface MusicVisualizerProps {
  snapshot: React.MutableRefObject<AnalyserSnapshot | null>;
  available: boolean;
  isPlaying: boolean;
}

export default function MusicVisualizer({
  snapshot,
  available,
  isPlaying,
}: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 把变化的 prop 存进 ref，rAF 闭包内读取最新值，不重启循环。
  const stateRef = useRef({ snapshot, available, isPlaying });
  stateRef.current.snapshot = snapshot;
  stateRef.current.available = available;
  stateRef.current.isPlaying = isPlaying;

  // 持久化的动画状态（不触发渲染）。
  const animRef = useRef({
    heights: new Array<number>(SPINE_BARS).fill(0), // 骨脊线当前柱高 0..1
    rawHeights: new Array<number>(SPINE_BARS).fill(0), // 原始映射（未缓动）
    // 每个频段的固定“个性”：宽度、顶端斜切方向、横向错位、y 抖动相位
    widths: [] as number[],
    bevels: [] as number[], // -1..1，顶端斜切偏移方向
    offsets: [] as number[], // 横向错位 px
    yJitter: [] as number[],
    fly: [] as FlySegment[],
    embers: [] as Ember[],
    bassAvg: 0,
    idlePhase: 0, // 待机呼吸相位
    noisePhase: 0, // 暗噪颤动相位
    embersInit: false,
    /** 空闲节流计数器：停止播放且柱体衰减归零后，跳帧渲染以降低 GPU 占用 */
    idleSkip: 0,
    /** 是否已进入空闲节流模式 */
    idleThrottling: false,
  });
  // 初始化每个频段的固定个性（一次性）。
  if (animRef.current.widths.length === 0) {
    for (let i = 0; i < SPINE_BARS; i++) {
      animRef.current.widths.push(3 + Math.random() * 14); // 3..17px
      animRef.current.bevels.push(Math.random() * 2 - 1);
      animRef.current.offsets.push((Math.random() * 2 - 1) * 1.8); // ±1.8px
      animRef.current.yJitter.push(Math.random() * Math.PI * 2);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 重置余烬（适配新尺寸）
      const a = animRef.current;
      a.embers = [];
      for (let i = 0; i < EMBER_COUNT; i++) {
        a.embers.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vy: 0.1 + Math.random() * 0.4,
          size: 0.5 + Math.random() * 1.2,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
      a.embersInit = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const a = animRef.current;
      const { snapshot: snapRef, available: avail, isPlaying: playing } =
        stateRef.current;
      const snap = snapRef.current;

      const minDim = Math.min(width, height);
      // 骨脊线基线：位于画面下 1/3 处，整体向上偏移 10%（制造不稳定感）
      const baseY = height * 0.66 - height * 0.04;
      const maxBarH = minDim * 0.32;
      const startX = width * 0.06;
      const drawW = width * 0.88;

      const bass = snap && avail ? snap.bassEnergy : 0;
      const mid = snap && avail ? snap.midEnergy : 0;
      const treble = snap && avail ? snap.trebleEnergy : 0;
      const totalEnergy = bass + mid + treble;

      // ── 空闲节流：停止播放且柱体已衰减归零时，降低 rAF 帧率 ──
      if (!playing) {
        // 检查所有骨脊线柱体是否已衰减到可忽略的水平
        let allDormant = true;
        for (let i = 0; i < SPINE_BARS; i++) {
          if (a.heights[i] > 0.005) { allDormant = false; break; }
        }
        if (allDormant) {
          a.idleThrottling = true;
          a.idleSkip++;
          // 每 8 帧渲染一次（约 7.5 fps），其余帧仅推进 idlePhase/时间，跳过全部绘制
          if (a.idleSkip % 8 !== 0) {
            a.idlePhase += 0.04;
            a.noisePhase += 0.08;
            rafId = requestAnimationFrame(draw);
            return;
          }
        }
      } else {
        // 恢复播放：立即退出节流模式，保证首帧即全速渲染
        a.idleThrottling = false;
        a.idleSkip = 0;
      }

      // ── L0 清屏 + 纯黑底 ──
      ctx.clearRect(0, 0, width, height);

      // ── 低频均值（用于背景光晕呼吸）──
      a.bassAvg = a.bassAvg * 0.92 + bass * 0.08;

      // ── L0b 背景 bass 光晕（连续呼吸，非鼓点脉冲）──
      const glowBase = playing
        ? Math.min(0.35, a.bassAvg * 0.7 + totalEnergy * 0.1)
        : 0.02;
      const glowPulse = 1 + a.bassAvg * 0.25;
      const cxGlow = width * 0.5;
      const cyGlow = height * 0.62;
      const rGlow = Math.max(width, height) * 0.55 * glowPulse;
      const gradGlow = ctx.createRadialGradient(cxGlow, cyGlow, 0, cxGlow, cyGlow, rGlow);
      gradGlow.addColorStop(0, `rgba(255, 230, 0, ${glowBase * 0.5})`);
      gradGlow.addColorStop(0.4, `rgba(255, 153, 0, ${glowBase * 0.2})`);
      gradGlow.addColorStop(0.75, `rgba(0, 255, 224, ${glowBase * 0.06})`);
      gradGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradGlow;
      ctx.fillRect(0, 0, width, height);

      // ── L0c 余烬尘埃 ──
      if (a.embersInit) {
        for (let i = 0; i < a.embers.length; i++) {
          const e = a.embers[i];
          e.y -= e.vy * (playing ? 1 : 0.3);
          e.twinkle += 0.05;
          if (e.y < -4) {
            e.y = height + 4;
            e.x = Math.random() * width;
          }
          const breathe = playing ? 0.18 + totalEnergy * 0.7 : 0.08;
          const flicker = 0.5 + Math.sin(e.twinkle) * 0.5;
          const op = breathe * flicker;
          const isYellow = i % 33 === 0;
          ctx.fillStyle = isYellow
            ? `rgba(255,230,0,${op * 0.9})`
            : `rgba(138,138,138,${op})`;
          ctx.fillRect(e.x, e.y, e.size, e.size);
        }
      }

      // ── 骨脊线频段映射（对数，强调低中频；不对称、不镜像）──
      if (snap && avail && playing) {
        const freq = snap.freq;
        const bins = freq.length;
        const usable = Math.floor(bins * 0.72);
        for (let i = 0; i < SPINE_BARS; i++) {
          const t = i / (SPINE_BARS - 1);
          const bin = Math.min(usable - 1, Math.floor(Math.pow(t, 2.0) * usable) + 1);
          a.rawHeights[i] = freq[bin] / 255;
        }
      } else {
        for (let i = 0; i < SPINE_BARS; i++) a.rawHeights[i] *= 0.9;
      }

      // 骨脊线缓动
      for (let i = 0; i < SPINE_BARS; i++) {
        const target = a.rawHeights[i];
        const cur = a.heights[i];
        if (target > cur) {
          a.heights[i] = cur + (target - cur) * 0.55;
        } else {
          a.heights[i] = cur + (target - cur) * 0.12;
        }
      }

      // ── 飞白生成（中高频持续音）──
      if (playing && avail && mid + treble > 0.12) {
        const flyProb = (mid + treble) * 0.5;
        const count = flyProb > 0.4 ? 2 : 1;
        for (let c = 0; c < count; c++) {
          if (Math.random() > flyProb * 0.7) continue;
          const barIdx = Math.floor(
            SPINE_BARS * 0.3 + Math.random() * SPINE_BARS * 0.5
          );
          const px = startX + (barIdx / (SPINE_BARS - 1)) * drawW;
          const py = baseY - a.heights[barIdx] * maxBarH;
          a.fly.push({
            x: px,
            y: py,
            vx: -0.3 - Math.random() * 0.5,
            vy: -0.4 - Math.random() * 1.1,
            life: 1,
            maxLife: 30 + Math.random() * 50,
            len: 6 + Math.random() * 18,
            gap: Math.random() < 0.25,
          });
        }
      }

      // ── L2 飞白（先画，处于骨脊线后方）──
      ctx.save();
      for (let i = a.fly.length - 1; i >= 0; i--) {
        const f = a.fly[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy *= 0.99;
        f.life -= 1 / f.maxLife;
        if (f.life <= 0 || f.x < -20 || f.y < -20) {
          a.fly.splice(i, 1);
          continue;
        }
        if (f.gap) continue;
        const op = 0.35 * f.life;
        const lw = Math.max(0.4, 1.6 * f.life);
        ctx.strokeStyle = `rgba(138,138,138,${op})`;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x - f.vx * f.len, f.y - f.vy * f.len);
        ctx.stroke();
      }
      ctx.restore();

      // ── L1a 骨脊倒影 ──
      ctx.save();
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < SPINE_BARS; i += 2) {
        const h = a.heights[i] * maxBarH * 0.6;
        if (h < 0.4 && !playing) continue;
        const t = i / (SPINE_BARS - 1);
        const cxBar = startX + t * drawW + a.offsets[i];
        const w = a.widths[i] * 0.75;
        const wobble = playing ? Math.sin(a.idlePhase * 1.5 + i * 0.3) * bass * 8 : 0;
        const loudness = Math.min(1, h / maxBarH);
        ctx.fillStyle = `rgba(138,138,138,${0.35 + loudness * 0.4})`;
        ctx.fillRect(cxBar - w / 2 + wobble, baseY + 1, w, h);
      }
      ctx.restore();

      // ── L1 骨脊线 ──
      ctx.save();
      const baseShake = playing ? (bass - a.bassAvg) * minDim * 0.04 : 0;
      const cy = baseY + baseShake;

      for (let i = 0; i < SPINE_BARS; i++) {
        const h = a.heights[i] * maxBarH;
        if (h < 0.4 && !playing) continue;
        const t = i / (SPINE_BARS - 1);
        const cxBar = startX + t * drawW + a.offsets[i];
        const w = a.widths[i];
        const bevel = a.bevels[i] * w * 0.5;
        const topJitter =
          playing && treble > 0.2 ? Math.sin(a.idlePhase + a.yJitter[i]) * treble * 4 : 0;

        const loudness = Math.min(1, h / maxBarH);
        const op = 0.5 + loudness * 0.5;

        ctx.fillStyle = `rgba(245,245,240,${op})`;
        ctx.shadowColor = 'rgba(245,245,240,0.25)';
        ctx.shadowBlur = 6 + loudness * 14;

        ctx.beginPath();
        ctx.moveTo(cxBar - w / 2, cy);
        ctx.lineTo(cxBar - w / 2 + bevel, cy - h + topJitter);
        ctx.lineTo(cxBar + w / 2 + bevel, cy - h + topJitter);
        ctx.lineTo(cxBar + w / 2, cy);
        ctx.closePath();
        ctx.fill();

        // ── L1b 骨脊黄尖 ──
        if (loudness > 0.55) {
          const tipH = w * (0.6 + loudness * 0.8);
          const tipY = cy - h + topJitter;
          ctx.shadowColor = 'rgba(255,230,0,0.8)';
          ctx.shadowBlur = 10 + loudness * 12;
          ctx.fillStyle = `rgba(255,230,0,${0.7 + loudness * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(cxBar - w / 2 + bevel, tipY);
          ctx.lineTo(cxBar + w / 2 + bevel, tipY);
          ctx.lineTo(cxBar + bevel * 0.5, tipY - tipH);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      // 骨脊线基线
      ctx.strokeStyle = playing ? 'rgba(245,245,240,0.42)' : 'rgba(245,245,240,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, cy);
      ctx.lineTo(startX + drawW, cy);
      ctx.stroke();
      ctx.restore();

      // ── L5 待机坍缩 ──
      if (!playing || !avail) {
        const breathe = 0.04 + Math.abs(Math.sin(a.idlePhase * 0.5)) * 0.03;
        ctx.strokeStyle = `rgba(245,245,240,${breathe})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, baseY);
        ctx.lineTo(startX + drawW, baseY);
        ctx.stroke();
      }

      a.idlePhase += 0.04;
      a.noisePhase += 0.08 + bass * 0.3;

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* L0 暗噪颗粒（DOM 层，呼吸颤动）—— CSS 动画驱动 */}
      <div className="ff-noise-layer" />

      {/* L4 断裂相框：四角 45° 白色短线（不闭合） */}
      <CornerFrame />
    </div>
  );
}

/** 四角断裂相框：每组 2 条 45° 白色短线，不闭合 */
function CornerFrame() {
  const lineStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: '28px',
    height: '2px',
    background: '#f5f5f0',
    opacity: 0.7,
    ...extra,
  });
  return (
    <div className="absolute inset-0 pointer-events-none z-[3]">
      {/* 左上：水平 + 垂直，构成 L 形角 */}
      <div style={lineStyle({ top: '24px', left: '24px' })} />
      <div style={lineStyle({ top: '24px', left: '24px', width: '2px', height: '28px' })} />
      {/* 右上 */}
      <div style={lineStyle({ top: '24px', right: '24px' })} />
      <div style={lineStyle({ top: '24px', right: '24px', width: '2px', height: '28px' })} />
      {/* 左下 */}
      <div style={lineStyle({ bottom: '24px', left: '24px' })} />
      <div style={lineStyle({ bottom: '24px', left: '24px', width: '2px', height: '28px' })} />
      {/* 右下（故意比其它角短，制造“不闭合/未完成”感） */}
      <div style={{ ...lineStyle({ bottom: '24px', right: '24px' }), width: '18px', opacity: 0.4 }} />
    </div>
  );
}
