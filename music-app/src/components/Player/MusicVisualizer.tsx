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
 * 新增 L0d 点阵深渊：
 *   - 6×6 均匀发光点阵，位于画面最底层
 *   - 伪 3D 透视倾斜，底部点更近更大
 *   - 颜色随专辑封面主色变化
 *   - 鼓点触发整体闪烁爆发
 *   - 中高频驱动点阵起伏，能量低时受重力下落，形成强烈反差
 *
 * 分层（自下而上，单 canvas + 单 rAF）：
 *   L0  暗噪基底      纯黑底 + 极微弱颗粒噪点（DOM 层呼吸颤动）
 *   L0d 点阵深渊      6×6 封面色发光点阵（伪 3D / 鼓点闪烁 / 重力起伏）
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
 * 性能设计（避免逐帧 GC 压力与 shadowBlur 光栅化尖峰导致的随机卡顿）：
 *   - 点阵发光球体用「预渲染径向渐变精灵」+ drawImage 缩放绘制，
 *     不再逐帧 createRadialGradient / 逐帧分配 rgba 字符串 / 不再用 shadowBlur。
 *   - 背景 bass 光晕预渲染成纹理，每帧仅一次 drawImage + globalAlpha。
 *   - 骨脊线 / 飞白 / 余烬统一「固定 fillStyle/strokeStyle + globalAlpha」，
 *     替换逐柱 shadowBlur 为廉价宽版低透明度填充。
 *   - DPR 上限 2；余烬尘埃 40；飞白片段数量硬上限，防极端增长。
 */

import { useEffect, useRef } from 'react';
import type { AnalyserSnapshot } from '@/hooks/useAnalyser';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { reportDiag } from '@/lib/diag';

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

/** 点阵中的一个发光球体 */
interface Dot {
  col: number;
  row: number;
  phase: number;
  baseX: number;
  baseY: number;
  z: number;
  /** 预计算的透视缩放系数（伪 3D 近大远小） */
  zScale: number;
  y: number; // 当前上下偏移
  vy: number; // 垂直速度
}

const SPINE_BARS = 76; // 骨脊线频段数
const EMBER_COUNT = 40; // 余烬尘埃数量（常驻）
const DOT_COLS = 6; // 点阵列数
const DOT_ROWS = 6; // 点阵行数
const DEFAULT_DOT_COLOR: [number, number, number] = [255, 230, 0]; // 鼓点黄
/** 飞白片段数量硬上限，防止极端情况下列表无限增长 */
const FLY_MAX = 140;

// 固定颜色样式，配合 globalAlpha 调透明度——避免逐帧模板字符串分配。
const STYLE_BONE = '#F5F5F0';
const STYLE_YELLOW = '#FFE600';
const STYLE_GRAY = 'rgba(138,138,138,1)';

/**
 * 点阵发光精灵缓存（按颜色缓存）。
 * 精灵即一张含径向渐变（亮核 → 柔边透明）的离屏 canvas，
 * 绘制时用 drawImage 缩放到目标半径，替代逐帧 createRadialGradient + shadowBlur。
 */
const dotSpriteCache = new Map<string, HTMLCanvasElement>();
function getDotSprite(color: [number, number, number]): HTMLCanvasElement {
  const key = `${color[0]},${color[1]},${color[2]}`;
  let sprite = dotSpriteCache.get(key);
  if (sprite) return sprite;

  if (dotSpriteCache.size > 16) dotSpriteCache.clear(); // 防缓存无限增长
  sprite = document.createElement('canvas');
  const SIZE = 128;
  sprite.width = SIZE;
  sprite.height = SIZE;
  const sctx = sprite.getContext('2d');
  if (sctx) {
    const [r, g, b] = color;
    const grad = sctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.45)`);
    grad.addColorStop(0.75, `rgba(${r},${g},${b},0.08)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, SIZE, SIZE);
  }
  dotSpriteCache.set(key, sprite);
  return sprite;
}

interface MusicVisualizerProps {
  snapshot: React.MutableRefObject<AnalyserSnapshot | null>;
  available: boolean;
  isPlaying: boolean;
  coverColor?: [number, number, number];
}

export default function MusicVisualizer({
  snapshot,
  available,
  isPlaying,
  coverColor,
}: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 把变化的 prop 存进 ref，rAF 闭包内读取最新值，不重启循环。
  const stateRef = useRef({ snapshot, available, isPlaying, coverColor });
  stateRef.current.snapshot = snapshot;
  stateRef.current.available = available;
  stateRef.current.isPlaying = isPlaying;
  stateRef.current.coverColor = coverColor;

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
    // 点阵状态
    dots: [] as Dot[],
    dotsInit: false,
    dotBeatFlash: 0,
    dotBassAvg: 0,
    dotBeatCooldown: 0,
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
    /** 预渲染的背景 bass 光晕纹理（随尺寸重建，每帧仅 drawImage） */
    let glowTex: HTMLCanvasElement | null = null;

    // ── 性能自诊断：每 2s 按墙钟采样 fps ──
    // 低帧率时 rAF 帧数少，若按帧计数会拖很久才出一个窗口，故用定时器采样。
    let framesInWindow = 0;
    let lastSampleT = performance.now();
    let lowFpsLogged = false; // 每次挂载只 warn 一次
    let longTaskCount = 0;
    let longTaskMax = 0;
    let longTaskObserver: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskCount++;
            longTaskMax = Math.max(longTaskMax, entry.duration);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch {
        // 不支持 longtask 时忽略
      }
    }
    /** 汇总当前帧窗口的上下文（读 store 不触发渲染） */
    const buildDiagInfo = (
      fps: number,
      ctxData: {
        playing: boolean;
        available: boolean;
        bass: number;
        mid: number;
        treble: number;
        flyCount: number;
        dotCount: number;
      }
    ) => {
      const store = usePlayerStore.getState();
      const song = store.currentSong;
      let audioHost = '';
      try {
        audioHost = store.audioUrl ? new URL(store.audioUrl).host : '';
      } catch {
        audioHost = '(invalid url)';
      }
      return {
        fps: fps.toFixed(1),
        avgFrameMs: (1000 / fps).toFixed(1),
        longTasksIn2s: longTaskCount,
        maxLongTaskMs: longTaskMax > 0 ? longTaskMax.toFixed(0) : 0,
        song: song ? { id: song.id, name: song.name } : null,
        audioHost,
        playlistLen: store.playlist.length,
        currentTimeMs: Math.round(store.currentTime),
        playing: ctxData.playing,
        available: ctxData.available,
        bass: Number(ctxData.bass.toFixed(3)),
        mid: Number(ctxData.mid.toFixed(3)),
        treble: Number(ctxData.treble.toFixed(3)),
        flyCount: ctxData.flyCount,
        dotCount: ctxData.dotCount,
        canvas: `${width}x${height}@${dpr}x`,
      };
    };

    const buildGlowTexture = () => {
      glowTex = document.createElement('canvas');
      const size = Math.ceil(Math.max(width, height) * 0.8);
      glowTex.width = size;
      glowTex.height = size;
      const gctx = glowTex.getContext('2d');
      if (!gctx) return;
      const r = size / 2;
      const grad = gctx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, 'rgba(255,230,0,0.5)');
      grad.addColorStop(0.4, 'rgba(255,153,0,0.2)');
      grad.addColorStop(0.75, 'rgba(0,255,224,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, size, size);
    };

    const buildDotGrid = () => {
      const a = animRef.current;
      const cols = DOT_COLS;
      const rows = DOT_ROWS;
      const marginX = width * 0.14;
      const gridW = width - marginX * 2;
      const gridH = height * 0.5;
      const cellW = gridW / (cols - 1);
      const cellH = gridH / (rows - 1);

      const focalLength = Math.max(width, height) * 0.75;
      const tilt = 0.42; // rad，约 24°
      const depthStep = 80;

      a.dots = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x3 = (col - (cols - 1) / 2) * cellW;
          const y3 = (row - (rows - 1) / 2) * cellH;
          const z3 = row * depthStep;

          // 绕 X 轴倾斜，制造近大远小
          const yRot = y3 * Math.cos(tilt) - z3 * Math.sin(tilt);
          const zRot = y3 * Math.sin(tilt) + z3 * Math.cos(tilt);
          const scale = focalLength / (focalLength + zRot);

          a.dots.push({
            col,
            row,
            phase: col * 0.9 + row * 0.6 + Math.random() * 0.5,
            baseX: width * 0.5 + x3 * scale,
            baseY: height * 0.56 + yRot * scale,
            z: zRot,
            zScale: scale,
            y: 0,
            vy: 0,
          });
        }
      }
      a.dotsInit = true;
    };

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
      buildDotGrid();
      buildGlowTexture();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawDotGrid = (
      ctx2: CanvasRenderingContext2D,
      playing: boolean,
      bass: number,
      mid: number,
      treble: number,
      color: [number, number, number]
    ) => {
      const a = animRef.current;
      if (!a.dotsInit) return;

      // 中高频驱动起伏；整体阈值让静默时几乎全黑
      const drive = playing
        ? Math.max(0, Math.min(1, (mid + treble) * 1.6 - 0.05))
        : 0;

      // 鼓点检测
      a.dotBassAvg = a.dotBassAvg * 0.88 + bass * 0.12;
      if (a.dotBeatCooldown > 0) a.dotBeatCooldown--;
      if (playing && bass > 0.18 && bass > a.dotBassAvg * 1.32 && a.dotBeatCooldown === 0) {
        a.dotBeatFlash = 1;
        a.dotBeatCooldown = 8;
      }
      a.dotBeatFlash *= 0.82; // 快速衰减

      const minDim = Math.min(width, height);
      const maxLift = minDim * 0.18; // 最大起伏高度
      const gravity = minDim * 0.0035; // 重力下落
      const springK = 0.12; // 弹簧刚度
      const damping = 0.82; // 阻尼
      const sprite = getDotSprite(color);

      ctx2.save();
      for (let i = 0; i < a.dots.length; i++) {
        const dot = a.dots[i];

        // 波浪相位：列与行组合，制造错落起伏
        const wave = Math.sin(a.idlePhase * 2.2 + dot.phase) * 0.5 + 0.5;
        // 每个点的目标高度：能量 × 波浪 × 透视权重
        const targetLift = drive * maxLift * (0.35 + wave * 0.65) * (0.7 + dot.zScale * 0.3);

        // 简单弹簧 + 重力物理：高能量弹起，低能量下落
        const force = (targetLift - dot.y) * springK;
        dot.vy += force;
        dot.vy *= damping;
        dot.vy -= gravity;
        dot.y += dot.vy;

        if (dot.y < 0) {
          dot.y = 0;
          if (dot.vy < 0) dot.vy *= -0.25; // 触底微弹
        }
        // 物理安全钳位：防止极端帧率 / 数值发散导致 y 无限增长
        const maxY = maxLift * 4;
        if (dot.y > maxY) {
          dot.y = maxY;
          if (dot.vy > 0) dot.vy = 0;
        }
        if (dot.y < -maxY) {
          dot.y = -maxY;
          if (dot.vy < 0) dot.vy = 0;
        }

        // 当前绘制位置
        const cx = dot.baseX;
        const cy = dot.baseY - dot.y;
        const baseRadius = minDim * 0.006 * dot.zScale;
        // 半径随能量与鼓点爆发
        const radius = baseRadius * (1 + drive * 1.4 + a.dotBeatFlash * 2.2);

        // 亮度：平时极低，能量高时亮起，鼓点爆发
        const baseAlpha = 0.025 + drive * 0.55 + a.dotBeatFlash * 0.75;
        const alpha = baseAlpha > 1 ? 1 : baseAlpha < 0 ? 0 : baseAlpha;

        // 用预渲染精灵缩放绘制，替代逐帧渐变 + shadowBlur
        const glowRadius = radius * 3.5;
        ctx2.globalAlpha = alpha;
        ctx2.drawImage(sprite, cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);
      }
      ctx2.globalAlpha = 1;
      ctx2.restore();
    };

    const draw = () => {
      const a = animRef.current;
      const { snapshot: snapRef, available: avail, isPlaying: playing, coverColor: color } =
        stateRef.current;
      const snap = snapRef.current;

      // ── 帧计数（性能自诊断）：由 2s 墙钟定时器采样 ──
      framesInWindow++;

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

      // ── L0d 点阵深渊 ──
      const dotColor = color || DEFAULT_DOT_COLOR;
      drawDotGrid(ctx, playing, bass, mid, treble, dotColor);

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
      if (glowTex) {
        ctx.globalAlpha = glowBase;
        ctx.drawImage(glowTex, cxGlow - rGlow, cyGlow - rGlow, rGlow * 2, rGlow * 2);
        ctx.globalAlpha = 1;
      }

      // ── L0c 余烬尘埃 ──
      if (a.embersInit) {
        ctx.fillStyle = STYLE_GRAY;
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
          if (isYellow) ctx.fillStyle = STYLE_YELLOW;
          ctx.globalAlpha = isYellow ? op * 0.9 : op;
          ctx.fillRect(e.x, e.y, e.size, e.size);
          if (isYellow) ctx.fillStyle = STYLE_GRAY;
        }
        ctx.globalAlpha = 1;
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
          // 硬上限：达到后丢弃最旧的片段，防止极端情况无限增长
          if (a.fly.length >= FLY_MAX) a.fly.shift();
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
      ctx.strokeStyle = STYLE_GRAY;
      ctx.lineCap = 'round';
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
        ctx.globalAlpha = 0.35 * f.life;
        ctx.lineWidth = Math.max(0.4, 1.6 * f.life);
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x - f.vx * f.len, f.y - f.vy * f.len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── L1a 骨脊倒影 ──
      ctx.save();
      ctx.fillStyle = STYLE_GRAY;
      for (let i = 0; i < SPINE_BARS; i += 2) {
        const h = a.heights[i] * maxBarH * 0.6;
        if (h < 0.4 && !playing) continue;
        const t = i / (SPINE_BARS - 1);
        const cxBar = startX + t * drawW + a.offsets[i];
        const w = a.widths[i] * 0.75;
        const wobble = playing ? Math.sin(a.idlePhase * 1.5 + i * 0.3) * bass * 8 : 0;
        const loudness = Math.min(1, h / maxBarH);
        ctx.globalAlpha = 0.22 * (0.35 + loudness * 0.4);
        ctx.fillRect(cxBar - w / 2 + wobble, baseY + 1, w, h);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── L1 骨脊线 ──
      ctx.save();
      const baseShake = playing ? (bass - a.bassAvg) * minDim * 0.04 : 0;
      const cy = baseY + baseShake;

      ctx.fillStyle = STYLE_BONE;
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

        // 辉光层：宽版低透明度填充，替代逐柱 shadowBlur（廉价且稳定）
        ctx.globalAlpha = op * 0.18;
        ctx.fillRect(cxBar - w / 2 - 3, cy - h + topJitter, w + 6, h);

        // 主体（保留顶端斜切）
        ctx.globalAlpha = op;
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
          ctx.fillStyle = STYLE_YELLOW;
          ctx.globalAlpha = 0.7 + loudness * 0.3;
          ctx.beginPath();
          ctx.moveTo(cxBar - w / 2 + bevel, tipY);
          ctx.lineTo(cxBar + w / 2 + bevel, tipY);
          ctx.lineTo(cxBar + bevel * 0.5, tipY - tipH);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = STYLE_BONE;
        }
      }
      ctx.globalAlpha = 1;

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

    // ── 性能自诊断采样：每 2s 墙钟上报 fps（播放中），低帧率额外 warn ──
    const sampleTimer = setInterval(() => {
      const now = performance.now();
      const dtMs = now - lastSampleT;
      lastSampleT = now;
      const fps = (framesInWindow * 1000) / dtMs;
      framesInWindow = 0;
      const snap = stateRef.current.snapshot.current;
      const ctxData = {
        playing: stateRef.current.isPlaying,
        available: stateRef.current.available,
        bass: snap ? snap.bassEnergy : 0,
        mid: snap ? snap.midEnergy : 0,
        treble: snap ? snap.trebleEnergy : 0,
        flyCount: animRef.current.fly.length,
        dotCount: animRef.current.dots.length,
      };
      if (stateRef.current.isPlaying) {
        reportDiag('vizFps', buildDiagInfo(fps, ctxData));
      }
      if (fps < 25 && stateRef.current.isPlaying && !lowFpsLogged) {
        lowFpsLogged = true;
        const info = buildDiagInfo(fps, ctxData);
        console.warn('[MusicVisualizer] 低帧率诊断', info);
        reportDiag('lowFps', info);
      }
      longTaskCount = 0;
      longTaskMax = 0;
    }, 2000);

    // 挂载信标：确认页面运行的是最新代码且客户端在线
    const st0 = usePlayerStore.getState();
    reportDiag('vizMounted', {
      song: st0.currentSong
        ? { id: st0.currentSong.id, name: st0.currentSong.name }
        : null,
      playlistLen: st0.playlist.length,
    });

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(sampleTimer);
      ro.disconnect();
      longTaskObserver?.disconnect();
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
