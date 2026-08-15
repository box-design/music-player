/**
 * LunarDitherVisualizer —— 月相抖动 · LUNAR DITHER 可视化核心。
 *
 * 严格单色：#000000 / #ffffff / 灰阶。
 * 核心：使用 Bayer 矩阵抖动实时渲染一颗大型月球，呈现 1-bit 像素化复古质感。
 * 月球表面：
 *   - procedurally generated 环形山（sin 铃形暗部凹坑，无亮缘）+ 月海斑块
 *   - 径向衰减：中心亮、边缘暗，球体感
 *   - 明暗块网格（细块 0.4~1.7 × 粗块双层叠加）：深浅不一的斑块互相穿插
 *   - 表面无平滑灰度过渡：明暗全靠像素点阵疏密表现（亮处密集、暗处稀疏近透明），
 *     环形山与月海由密度差自然呈现，无实线描边
 *   - 初始（低能量）状态更稀疏，随低/中频能量点阵变密
 *   - 伪 3D 视角：观察者位于月球左侧约 45°（VIEW_TILT），透视反解（VIEW_DIST）
 *     让球面中心放大、边缘色块压缩（近大远小），配合水平透视压缩（VIEW_SQUASH），
 *     月海/环形山随视角偏移，保持右侧受光、左侧明暗交界线的斜视立体观感
 *   - 半月形阴影：受光侧起跳基值提亮、阴影侧环境光压至隐约（SHADOW_LIT），
 *     明暗交界线锐利（硬边界），播放时阴影侧能量驱动减弱以保持对比
 *   - 音乐驱动的随机相位块场：各色块随中/低频能量独立随机明暗波动（非固定位置）
 *   - 伪自转：表面纹理绕竖直轴按真实时间缓慢跳变 + 视角切换时叠加 1.5 圈自转
 *   - 3D 曲率增强（CURVE3D）：采样前屏幕坐标径向变形，中心块放大、边缘块压缩
 *   - 底部边缘轻微雾化淡出，融入黑色背景
 *
 * 双视角模式（由外部 viewMode 驱动）：
 *   - ORBIT：月球居中（原位置/原尺寸/原透视）。
 *   - SURFACE：月球顺滑旋转至特写位置并自转 1.5 圈（横屏贴右、竖屏贴底，
 *     尺寸随长宽比自适应，始终完整入屏、不被裁切），呈现贴近月球表面的
 *     放大特写；视角改为“斜上左方”，方块密度与 ORBIT 一致（稀疏点阵），
 *     并附加方块倾斜角，强化伪 3D。切换回 ORBIT 时按同一轨迹反向运动。
 *   - 两套月球纹理（ORBIT / SURFACE）独立预计算（分辨率与块尺寸相同，
 *     表面随机细节不同），过渡期在反照率与块因子层做线性混合，再经
 *     Bayer 阈值量化，保持严格 1-bit 同时实现表面纹理顺滑切换。
 *
 * 低频反馈：
 *   - 专用 <250Hz 底鼓检测，强 kick 触发像素级 glitch：
 *     月球点阵整体短暂错位、逐点随机打乱后快速回弹聚合，形成故障艺术抖动。
 * 分层（自下而上，单 canvas + 单 rAF）：
 *   L0  纯黑底
 *   L1  星空（大量不同透明度微小白点）
 *   L2  流星轨迹（高频尖峰触发）
 *   L3  Bayer 抖动月球（低频呼吸 / 鼓点像素 glitch / 随机相位块场 / 慢速相位变化）
 *   L4  胶片噪点纹理（全局叠加）
 *   L5  CRT 扫描线（常驻）
 *   L6  底部水平波形扫描线（整体响度驱动）
 *
 * 性能策略：
 *   - DPR 上限 2。
 *   - 月亮表面反照率底图在 resize 时预计算；每帧只做光照 × Bayer 阈值比较 + putImageData。
 *   - 月亮纹理分辨率低于屏幕半径，缩放绘制保持像素块感。
 *   - 鼓点 glitch 仅改变抖动像素落点，不额外拆层；常态仍是单次 drawImage。
 *   - 噪点使用预渲染 256x256 纹理平移采样。
 *   - 暂停且能量衰减后进入空闲节流。
 */

import { useEffect, useRef } from 'react';
import type { AnalyserSnapshot } from '@/hooks/useAnalyser';
import { getAudioContext, AUDIO_FFT_SIZE } from '@/lib/audioGraph';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { reportDiag } from '@/lib/diag';

const STAR_COUNT = 280;
const BAYER_SIZE = 8;
const GRAIN_TEX_SIZE = 256;
const KICK_FREQ = 250;
const CRATER_COUNT = 28;
const MARIA_COUNT = 6;
/** 音乐驱动随机相位块的尺寸（纹理像素），块越大越整、越小越碎；随纹理分辨率提升按比例放大以保持屏幕尺寸 */
const RAND_CELL = 18;
/** 伪 3D：观察者位于月球左侧、绕竖直轴倾斜约 45° */
const VIEW_TILT = Math.PI / 4;
/** 透视观察距离（球半径倍数）：越小透视越强、边缘色块压缩越明显；∞ 退化为正交 */
const VIEW_DIST = 3;
/** 透视椭圆压缩：水平方向轻微压扁，强化斜视立体感 */
const VIEW_SQUASH = 0.92;
/** 半月阴影区色块的暗部亮度基值（0-1）：阴影侧按块因子保留隐约色块、亮度压低 */
const SHADOW_LIT = 0.015;
/** 伪自转：每秒旋转步进（弧度），按真实时间每 1 秒跳变一次（定格动画式） */
const SPIN_RATE = (Math.PI / 180) * 15;
/** 3D 曲率增强：采样前对屏幕坐标做径向变形，中心放大、边缘压缩（近大远小），0 关闭 */
const CURVE3D = 0.45;

/** 视角切换过渡时长（毫秒） */
const TRANSITION_MS = 1200;
/** SURFACE 模式：垂直倾斜（斜上视角），绕 X 轴俯视角度 */
const SURFACE_TILT_V = Math.PI / 6;
/** SURFACE 模式：月面方块相对屏幕的倾斜角（弧度） */
const SURFACE_BLOCK_TILT = 0.32;
/** SURFACE 模式：更强的透视（更近的观察距离） */
const SURFACE_VIEW_DIST = 2.1;
/** SURFACE 模式：更强的 3D 曲率 */
const SURFACE_CURVE3D = 0.7;
/** 视角切换时叠加的自转圈数（1.5 圈 = 3π） */
const SPIN_TURNS = Math.PI * 3;
/** SURFACE 模式：月球直径 ≤ 短边 × 0.72。已为低音呼吸脉冲预留余量，
 *  任何时刻 drawR = radius × pulseScale 都不触边、不被裁切（竖屏即屏宽 ~72%） */
const SURFACE_SHORT_RATIO = 0.72;
/** SURFACE 模式：低音呼吸时半径放大峰值（pulseScale 上限），用于尺寸/位置余量计算 */
const SURFACE_PULSE_MAX = 1.22;
/** SURFACE 模式：横屏时月球右缘（脉冲峰值时）距屏幕右缘的最小留白（屏宽比例） */
const SURFACE_EDGE_PAD = 0.03;
/** SURFACE 模式：竖屏时月球底部（脉冲峰值时）不超过屏高比例，保持在波形扫描线上方 */
const SURFACE_BOTTOM_LIMIT = 0.86;

/** 模块级构建一次 8x8 Bayer 矩阵，供渲染循环复用。 */
const BAYER_MATRIX = buildBayerMatrix(BAYER_SIZE);

type ViewMode = 'orbit' | 'surface';

interface MoonTexture {
  texR: number;
  albedo: Uint8ClampedArray;
  blockTex: Float32Array;
}

interface ViewPose {
  cx: number;
  cy: number;
  radius: number;
  tiltH: number;
  tiltV: number;
  viewDist: number;
  curve3d: number;
  blockTilt: number;
}

interface ViewState {
  mode: ViewMode;
  pose: ViewPose;
  spinOffset: number;
  mix: number;
  mixFrom: number;
  mixTo: number;
  transitioning: boolean;
  from: ViewPose | null;
  to: ViewPose | null;
  spinFrom: number;
  spinTo: number;
  start: number;
  duration: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  len: number;
}

interface LunarVisualizerProps {
  snapshot: React.MutableRefObject<AnalyserSnapshot | null>;
  available: boolean;
  isPlaying: boolean;
  viewMode: ViewMode;
}

/** 确定性 0-1 浮点哈希，用于每帧快速生成 glitch 随机量。 */
function hash01(seed: number): number {
  let x = seed >>> 0;
  x = (x ^ (x << 13)) >>> 0;
  x = (x ^ (x >>> 17)) >>> 0;
  x = (x ^ (x << 5)) >>> 0;
  return x / 4294967295;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clampInt(v: number, max: number): number {
  return v < 0 ? 0 : v > max ? max : v;
}

/** 生成一套月球表面反照率 + 块因子纹理（用于 ORBIT / SURFACE 两种分辨率）。 */
function buildMoonTexture(texR: number, blockSize: number): MoonTexture {
  const size = texR * 2;
  const albedo = new Uint8ClampedArray(size * size);
  const blockTex = new Float32Array(size * size);

  // ── 环形山（暗部凹坑：sin 铃形剖面，无亮缘 → 无实线描边）──
  const craters: Array<{ x: number; y: number; r: number; depth: number }> = [];
  for (let i = 0; i < CRATER_COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const r0 = Math.sqrt(Math.random()) * 0.85;
    const x = Math.cos(t) * r0;
    const y = Math.sin(t) * r0;
    const r = 0.045 + Math.pow(Math.random(), 2) * 0.13;
    const depth = 0.12 + Math.random() * 0.18;
    craters.push({ x, y, r, depth });
  }

  // ── 月海（大型暗斑）──
  const maria: Array<{
    amps: number[];
    freqs: number[];
    phases: number[];
  }> = [];
  for (let i = 0; i < MARIA_COUNT; i++) {
    const amps: number[] = [];
    const freqs: number[] = [];
    const phases: number[] = [];
    for (let j = 0; j < 3; j++) {
      amps.push(0.1 + Math.random() * 0.18);
      freqs.push(0.7 + Math.random() * 2.8);
      phases.push(Math.random() * Math.PI * 2);
    }
    maria.push({ amps, freqs, phases });
  }

  // ── 明暗块网格（双层）：细块 + 粗块叠加，深浅不一、互相交错 ──
  const gridW = Math.ceil(size / blockSize);
  const gridH = Math.ceil(size / blockSize);
  const blocks = new Float32Array(gridW * gridH);
  for (let i = 0; i < blocks.length; i++) {
    blocks[i] = 0.4 + Math.random() * 1.3;
  }
  // 粗块层：更大尺度（约 4 倍块宽）的明暗起伏，斑块更丰富
  const coarseSize = blockSize * 4;
  const coarseW = Math.ceil(size / coarseSize);
  const coarseH = Math.ceil(size / coarseSize);
  const coarse = new Float32Array(coarseW * coarseH);
  for (let i = 0; i < coarse.length; i++) {
    coarse[i] = 0.75 + Math.random() * 0.6;
  }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px - texR) / texR;
      const dy = (py - texR) / texR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = py * size + px;
      if (dist > 1) {
        albedo[idx] = 0;
        continue;
      }

      // 径向衰减：轻微球面感（阴影主要由光照产生）
      let val = 0.6 * Math.max(0, 1 - dist * 0.6);

      // 明暗块：细块 × 粗块双层深浅交错（同时单独保存块因子供阴影侧环境光）
      blockTex[idx] =
        blocks[(py / blockSize | 0) * gridW + (px / blockSize | 0)] *
        coarse[(py / coarseSize | 0) * coarseW + (px / coarseSize | 0)];
      val *= blockTex[idx];

      // 环形山：sin 铃形暗部（半程最暗），密度差呈现
      for (const c of craters) {
        const cdx = dx - c.x;
        const cdy = dy - c.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdist < c.r) {
          val -= Math.sin((cdist / c.r) * Math.PI) * c.depth;
        }
      }

      // 月海斑块
      const z = Math.sqrt(1 - dist * dist);
      const lon = Math.atan2(dx, z);
      const lat = Math.asin(Math.max(-1, Math.min(1, dy)));
      for (const m of maria) {
        let v = 0;
        for (let k = 0; k < m.freqs.length; k++) {
          v +=
            m.amps[k] *
            Math.sin(
              lon * m.freqs[k] +
                lat * (m.freqs[k] * 0.6) +
                m.phases[k]
            );
        }
        if (v > 0.18) {
          const darken = Math.min(0.5, (v - 0.18) * 0.7);
          val *= 1 - darken;
        }
      }

      // 块内微噪声（颗粒感）
      val += (Math.random() - 0.5) * 0.12;

      val = Math.max(0, Math.min(1, val));
      albedo[idx] = Math.round(val * 255);
    }
  }

  return { texR, albedo, blockTex };
}

export default function LunarDitherVisualizer({
  snapshot,
  available,
  isPlaying,
  viewMode,
}: LunarVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ snapshot, available, isPlaying, viewMode });
  stateRef.current.snapshot = snapshot;
  stateRef.current.available = available;
  stateRef.current.isPlaying = isPlaying;
  stateRef.current.viewMode = viewMode;

  const animRef = useRef({
    stars: [] as Star[],
    starsInit: false,
    shootingStars: [] as ShootingStar[],
    bassAvg: 0,
    trebleAvg: 0,
    loudnessAvg: 0,
    kickAvg: 0,
    moonPhase: 0,
    frameCount: 0,
    idlePhase: 0,
    idleSkip: 0,
    idleThrottling: false,
    glitchIntensity: 0,
    glitchCooldown: 0,
    // 视角状态（插值 + 过渡）
    view: {
      mode: 'orbit' as ViewMode,
      pose: {
        cx: 0,
        cy: 0,
        radius: 0,
        tiltH: VIEW_TILT,
        tiltV: 0,
        viewDist: VIEW_DIST,
        curve3d: CURVE3D,
        blockTilt: 0,
      },
      spinOffset: 0,
      mix: 0,
      mixFrom: 0,
      mixTo: 0,
      transitioning: false,
      from: null as ViewPose | null,
      to: null as ViewPose | null,
      spinFrom: 0,
      spinTo: 0,
      start: 0,
      duration: TRANSITION_MS,
    } as ViewState,
    // 纹理缓存：ORBIT / SURFACE 两套
    texOrbit: null as MoonTexture | null,
    texSurface: null as MoonTexture | null,
    moonOutTexR: 0,
    moonImgData: null as ImageData | null,
    bayer: BAYER_MATRIX.slice(),
    grainTex: null as HTMLCanvasElement | null,
    glowSprite: null as HTMLCanvasElement | null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // 可复用的月球离屏 canvas
    let moonCanvas: HTMLCanvasElement | null = null;
    let moonCtx: CanvasRenderingContext2D | null = null;

    // 性能诊断
    let framesInWindow = 0;
    let lastSampleT = performance.now();
    let lowFpsLogged = false;

    const buildGrainTexture = () => {
      const tex = document.createElement('canvas');
      tex.width = GRAIN_TEX_SIZE;
      tex.height = GRAIN_TEX_SIZE;
      const gctx = tex.getContext('2d');
      if (!gctx) return;
      const img = gctx.createImageData(GRAIN_TEX_SIZE, GRAIN_TEX_SIZE);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 80; // 基噪透明度，绘制时再调 globalAlpha
      }
      gctx.putImageData(img, 0, 0);
      animRef.current.grainTex = tex;
    };

    const buildGlowSprite = () => {
      const s = document.createElement('canvas');
      s.width = 128;
      s.height = 128;
      const g = s.getContext('2d');
      if (!g) return;
      const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      animRef.current.glowSprite = s;
    };

    const buildStars = () => {
      const a = animRef.current;
      a.stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const r = Math.random();
        a.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: r < 0.6 ? 1 : r < 0.95 ? 2 : 3,
          baseAlpha: 0.22 + Math.random() * 0.58,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.02 + Math.random() * 0.05,
        });
      }
      a.starsInit = true;
    };

    // 预计算 ORBIT / SURFACE 两套月球纹理
    const buildMoonTextures = () => {
      const a = animRef.current;
      const minDim = Math.min(width, height);
      const orbitR = minDim * 0.35;

      // 两套纹理统一使用与 ORBIT 相同的分辨率与块尺寸：
      // SURFACE 模式保持与 ORBIT 一致的稀疏点阵密度（不再更密、更小）。
      const texR = Math.max(48, Math.min(256, Math.round(orbitR / 3)));
      const blockSize = Math.max(4, Math.round(texR / 14));

      a.texOrbit = buildMoonTexture(texR, blockSize);
      a.texSurface = buildMoonTexture(texR, blockSize);
    };

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 转屏/缩放发生在视角过渡期间时，用新尺寸重算目标姿态，避免落点漂移
      const a = animRef.current;
      if (a.view.transitioning && a.view.to) {
        a.view.to = poseFor(a.view.mode);
      }
      buildStars();
      if (!animRef.current.grainTex) buildGrainTexture();
      if (!animRef.current.glowSprite) buildGlowSprite();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildMoonTextures, 180);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 视角目标参数
    const poseFor = (mode: ViewMode): ViewPose => {
      const minDim = Math.min(width, height);
      if (mode === 'surface') {
        // 长宽比自适应布局：
        // 直径 = 短边 × SURFACE_SHORT_RATIO，已为低音呼吸（pulseScale ≤ 1.22）
        //   预留余量，任何时刻月球完整入屏、不触边不裁切；
        // 横屏：贴右垂直居中，右缘保留 SURFACE_EDGE_PAD 留白，脉冲时向边缘生长；
        // 竖屏：水平居中贴底，脉冲峰值时球底也不超过 SURFACE_BOTTOM_LIMIT
        //   （波形扫描线上方），避免与底部波形重叠，构图匀称。
        const isPortrait = height > width;
        const radius = (minDim * SURFACE_SHORT_RATIO) / 2;
        const pulseR = radius * SURFACE_PULSE_MAX;
        let cx: number;
        let cy: number;
        if (isPortrait) {
          cx = width * 0.5;
          cy = height * SURFACE_BOTTOM_LIMIT - pulseR;
        } else {
          cx = width - pulseR - width * SURFACE_EDGE_PAD;
          cy = height * 0.5;
        }
        return {
          cx,
          cy,
          radius,
          tiltH: VIEW_TILT,
          tiltV: SURFACE_TILT_V,
          viewDist: SURFACE_VIEW_DIST,
          curve3d: SURFACE_CURVE3D,
          blockTilt: SURFACE_BLOCK_TILT,
        };
      }
      return {
        cx: width * 0.5,
        cy: height * 0.48,
        radius: minDim * 0.35,
        tiltH: VIEW_TILT,
        tiltV: 0,
        viewDist: VIEW_DIST,
        curve3d: CURVE3D,
        blockTilt: 0,
      };
    };

    resize();
    buildMoonTextures();

    const syncView = (now: number) => {
      const a = animRef.current;
      const v = a.view;
      const targetMode = stateRef.current.viewMode;

      if (targetMode !== v.mode) {
        v.from = { ...v.pose };
        v.to = poseFor(targetMode);
        v.spinFrom = v.spinOffset;
        v.spinTo =
          v.spinOffset + (targetMode === 'surface' ? SPIN_TURNS : -SPIN_TURNS);
        v.mixFrom = v.mix;
        v.mixTo = targetMode === 'surface' ? 1 : 0;
        v.start = now;
        v.duration = TRANSITION_MS;
        v.transitioning = true;
        v.mode = targetMode;
      }

      if (v.transitioning && v.from && v.to) {
        const p = Math.min(1, (now - v.start) / v.duration);
        const e = easeInOutCubic(p);
        const f = v.from;
        const t = v.to;
        v.pose = {
          cx: lerp(f.cx, t.cx, e),
          cy: lerp(f.cy, t.cy, e),
          radius: lerp(f.radius, t.radius, e),
          tiltH: lerp(f.tiltH, t.tiltH, e),
          tiltV: lerp(f.tiltV, t.tiltV, e),
          viewDist: lerp(f.viewDist, t.viewDist, e),
          curve3d: lerp(f.curve3d, t.curve3d, e),
          blockTilt: lerp(f.blockTilt, t.blockTilt, e),
        };
        v.spinOffset = lerp(v.spinFrom, v.spinTo, e);
        v.mix = lerp(v.mixFrom, v.mixTo, e);
        if (p >= 1) {
          v.pose = { ...t };
          v.spinOffset = v.spinTo;
          v.mix = v.mixTo;
          v.transitioning = false;
          v.from = null;
          v.to = null;
        }
      } else {
        v.pose = poseFor(v.mode);
        v.mix = v.mode === 'surface' ? 1 : 0;
      }
    };

    const drawStars = (treble: number) => {
      const a = animRef.current;
      if (!a.starsInit) return;
      const trebleDrive = Math.min(1, treble * 2.5);
      for (let i = 0; i < a.stars.length; i++) {
        const s = a.stars[i];
        s.twinklePhase += s.twinkleSpeed * (1 + trebleDrive);
        const twinkle = 0.6 + Math.sin(s.twinklePhase) * 0.4;
        const alpha = s.baseAlpha * (0.5 + trebleDrive * 0.8) * twinkle;
        const aa = alpha > 1 ? 1 : alpha < 0 ? 0 : alpha;
        if (aa < 0.005) continue;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = aa;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1;
    };

    const drawShootingStars = (treble: number, trebleAvg: number) => {
      const a = animRef.current;
      if (treble > 0.2 && treble > trebleAvg * 1.45 && Math.random() < 0.25) {
        const startX = Math.random() * width;
        const startY = Math.random() * height * 0.6;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
        const speed = 3 + Math.random() * 4;
        a.shootingStars.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 22 + Math.random() * 16,
          len: 20 + Math.random() * 24,
        });
      }

      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      for (let i = a.shootingStars.length - 1; i >= 0; i--) {
        const s = a.shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1 / s.maxLife;
        if (s.life <= 0 || s.x > width + 60 || s.y > height + 60) {
          a.shootingStars.splice(i, 1);
          continue;
        }
        const alpha = s.life * (0.3 + treble * 0.5);
        ctx.globalAlpha = alpha > 1 ? 1 : alpha;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(
          s.x - s.vx * (s.len / Math.max(1, Math.hypot(s.vx, s.vy))),
          s.y - s.vy * (s.len / Math.max(1, Math.hypot(s.vx, s.vy)))
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const computeKickEnergy = (freq: Uint8Array | undefined): number => {
      if (!freq || freq.length === 0) return 0;
      const sampleRate = getAudioContext()?.sampleRate || 44100;
      const binHz = sampleRate / AUDIO_FFT_SIZE;
      const bins = Math.max(2, Math.floor(KICK_FREQ / binHz));
      const limit = Math.min(bins, freq.length);
      let sum = 0;
      for (let i = 1; i < limit; i++) sum += freq[i];
      return sum / ((limit - 1) * 255);
    };

    const drawMoon = (
      bass: number,
      mid: number,
      treble: number,
      loudness: number,
      now: number
    ) => {
      const a = animRef.current;
      const v = a.view;
      const texOrbit = a.texOrbit;
      const texSurface = a.texSurface;
      if (!texOrbit || !texSurface) return;

      // <250Hz 底鼓能量
      const freq = stateRef.current.snapshot.current?.freq;
      const kick = computeKickEnergy(freq);
      a.kickAvg = a.kickAvg * 0.92 + kick * 0.08;

      // 低频呼吸
      const pulseScale = 1 + kick * 0.1 + bass * 0.03 + loudness * 0.02;
      const drawR = v.pose.radius * pulseScale;

      // 慢速月相变化：太阳位于右侧 → 右亮左暗，明暗交界线清晰落在左侧
      a.moonPhase += 0.002 + mid * 0.003 + bass * 0.01;
      const phaseAngle =
        0.55 +
        Math.sin(a.moonPhase * 0.06) * 0.3 +
        Math.sin(a.frameCount * 0.4) * 0.06 * a.glitchIntensity;
      const sx = Math.sin(phaseAngle);
      const sz = Math.cos(phaseAngle);

      // 视角参数（含插值后的倾斜与方块倾斜）
      const cosT = Math.cos(v.pose.tiltH);
      const sinT = Math.sin(v.pose.tiltH);
      const cosV = Math.cos(v.pose.tiltV);
      const sinV = Math.sin(v.pose.tiltV);
      const cosB = Math.cos(v.pose.blockTilt);
      const sinB = Math.sin(v.pose.blockTilt);

      // 伪自转：真实时间缓慢跳变 + 视角切换叠加的 1.5 圈自转
      const spinAngle = Math.floor(now / 1000) * SPIN_RATE + v.spinOffset;
      const cosS = Math.cos(spinAngle);
      const sinS = Math.sin(spinAngle);

      // 能量驱动密度：安静时稀疏、低/中频响起时点阵变密
      const densityShift = Math.min(0.3, mid * 0.4 + bass * 0.12 - treble * 0.08);

      // 鼓点 glitch 触发 / 衰减
      if (a.glitchCooldown > 0) a.glitchCooldown--;
      if (
        kick > 0.1 &&
        kick > a.kickAvg * 1.45 &&
        a.glitchCooldown === 0
      ) {
        a.glitchIntensity = Math.min(1.35, 0.55 + kick * 0.85);
        a.glitchCooldown = 14;
      } else {
        a.glitchIntensity *= 0.76;
        if (a.glitchIntensity < 0.005) a.glitchIntensity = 0;
      }
      const gi = a.glitchIntensity;

      let gOffX = 0;
      let gOffY = 0;
      if (gi > 0.01) {
        const gMax = 3.75 * gi;
        gOffX = Math.round((hash01(a.frameCount) - 0.5) * 2 * gMax);
        gOffY = Math.round((hash01(a.frameCount + 1) - 0.5) * 2 * gMax);
      }

      // 输出纹理分辨率：过渡期用较大分辨率，非过渡期用当前模式分辨率
      const transitioning = v.transitioning && v.from && v.to;
      const outTexR = transitioning
        ? Math.max(texOrbit.texR, texSurface.texR)
        : v.mode === 'surface'
          ? texSurface.texR
          : texOrbit.texR;
      const size = outTexR * 2;

      if (outTexR !== a.moonOutTexR || !a.moonImgData) {
        if (!moonCanvas) {
          moonCanvas = document.createElement('canvas');
          moonCtx = moonCanvas.getContext('2d');
        }
        moonCanvas.width = size;
        moonCanvas.height = size;
        a.moonImgData = moonCtx!.createImageData(size, size);
        a.moonOutTexR = outTexR;
      }

      const img = a.moonImgData;
      const data = img.data;
      const bayer = a.bayer;
      const mix = v.mix;
      const curve3d = v.pose.curve3d;
      const viewDist = v.pose.viewDist;

      // 预取两套纹理数据
      const texRO = texOrbit.texR;
      const sizeO = texRO * 2;
      const albedoO = texOrbit.albedo;
      const blockO = texOrbit.blockTex;
      const texRS = texSurface.texR;
      const sizeS = texRS * 2;
      const albedoS = texSurface.albedo;
      const blockS = texSurface.blockTex;

      // 非过渡期激活纹理
      const activeTex = v.mode === 'surface' ? texSurface : texOrbit;
      const activeTexR = activeTex.texR;
      const activeSize = activeTexR * 2;
      const activeAlbedo = activeTex.albedo;
      const activeBlock = activeTex.blockTex;

      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const idx = py * size + px;
          const dx = (px - outTexR) / outTexR;
          const dy = (py - outTexR) / outTexR;
          const r2 = dx * dx + dy * dy;
          if (r2 > 1) {
            data[idx * 4 + 3] = 0;
            continue;
          }

          // 3D 曲率增强：屏幕坐标径向变形 → 中心放大、边缘压缩
          const warpF = (1 + curve3d * r2) / (1 + curve3d);
          const dxw = dx * warpF;
          const dyw = dy * warpF;

          // 透视投影反解：屏幕点 → 球面法线（水平倾斜视角）
          const r2s = dxw * dxw + dyw * dyw;
          const sqrtTerm = Math.sqrt(
            viewDist * viewDist - r2s * (viewDist * viewDist - 1)
          );
          const w =
            (viewDist * viewDist - sqrtTerm) / (r2s + viewDist * viewDist);
          const nx = dxw * w * cosT - viewDist * (1 - w) * sinT;
          const ny = dyw * w;
          const nz = dxw * w * sinT + viewDist * (1 - w) * cosT;

          // 垂直倾斜（斜上视角）：绕 X 轴旋转法线
          const nx2 = nx;
          const ny2 = ny * cosV - nz * sinV;
          const nz2 = ny * sinV + nz * cosV;

          // 自转（绕 Y 轴）后得到表面采样坐标
          const rx = nx2 * cosS + nz2 * sinS;

          // 方块倾斜：对采样坐标做 2D 旋转，使月面方块相对屏幕倾斜
          const rxt = rx * cosB - ny2 * sinB;
          const nyt = rx * sinB + ny2 * cosB;

          let alb: number;
          let blockFactor: number;
          if (transitioning) {
            const txO = clampInt(Math.round((rxt + 1) * texRO), sizeO - 1);
            const tyO = clampInt(Math.round((nyt + 1) * texRO), sizeO - 1);
            const iO = tyO * sizeO + txO;
            const txS = clampInt(Math.round((rxt + 1) * texRS), sizeS - 1);
            const tyS = clampInt(Math.round((nyt + 1) * texRS), sizeS - 1);
            const iS = tyS * sizeS + txS;
            alb = lerp(albedoO[iO] / 255, albedoS[iS] / 255, mix);
            blockFactor = lerp(blockO[iO], blockS[iS], mix);
          } else {
            const tx = clampInt(Math.round((rxt + 1) * activeTexR), activeSize - 1);
            const ty = clampInt(Math.round((nyt + 1) * activeTexR), activeSize - 1);
            const i = ty * activeSize + tx;
            alb = activeAlbedo[i] / 255;
            blockFactor = activeBlock[i];
          }

          // 月相光照：右侧受光，明暗交界线在左侧（半月形阴影）
          const litRaw = nx2 * sx + nz2 * sz;
          const lit = litRaw > 0 ? 0.2 + Math.pow(litRaw, 0.75) * 0.55 : 0;
          // 半月形阴影：阴影侧按块因子施加暗部环境光
          const shadowAmbient = SHADOW_LIT * blockFactor;

          // 中/低频驱动的空间随机相位块场
          const cellX = (px / RAND_CELL) | 0;
          const cellY = (py / RAND_CELL) | 0;
          const cellSeed = (cellY * 73856093) ^ (cellX * 19349663);
          const cellPhase = hash01(cellSeed) * Math.PI * 2;
          const cellDrive =
            (Math.sin(cellPhase + a.moonPhase * 0.6 + mid * 2.5) * 0.5 + 0.5) *
              mid *
              0.5 +
            (Math.sin(cellPhase * 1.7 + a.frameCount * 0.06 + bass * 4) * 0.5 + 0.5) *
              bass *
              0.2;

          const energyGain = 0.3 + 0.7 * lit;
          let value =
            alb * lit + shadowAmbient + (cellDrive + densityShift) * energyGain;

          // 逐点随机闪烁（随响度增强）
          const shimmerSeed = (a.frameCount * 73856093) ^ (idx * 83492791);
          value += (hash01(shimmerSeed) - 0.5) * 0.055 * (0.5 + loudness * 1.5);

          // 底部边缘轻微雾化淡出
          if (dy > 0.7) {
            const t = Math.min(1, (dy - 0.7) / 0.3);
            value *= 1 - t * t * (3 - 2 * t);
          }

          value = Math.max(0, Math.min(1, value));

          // Bayer 阈值比较
          const bx = px % BAYER_SIZE;
          const by = py % BAYER_SIZE;
          const bIdx = by * BAYER_SIZE + bx;
          const threshold = bayer[bIdx];

          if (value <= threshold) {
            data[idx * 4 + 3] = 0;
            continue;
          }

          // 落点：glitch 时逐点随机门控，部分点整体错位
          let destX = px;
          let destY = py;
          if (gOffX !== 0 || gOffY !== 0) {
            const seed = (a.frameCount * 73856093) ^ (idx * 83492791);
            if (hash01(seed) < gi) {
              destX = px + gOffX;
              destY = py + gOffY;
            }
          }

          const d4 = destY * size * 4 + destX * 4;
          if (destX !== px || destY !== py) {
            data[idx * 4 + 3] = 0;
            const ddx = (destX - outTexR) / outTexR;
            const ddy = (destY - outTexR) / outTexR;
            if (
              destX < 0 ||
              destX >= size ||
              destY < 0 ||
              destY >= size ||
              ddx * ddx + ddy * ddy > 1
            ) {
              continue;
            }
          }
          data[d4] = 255;
          data[d4 + 1] = 255;
          data[d4 + 2] = 255;
          data[d4 + 3] = 255;
        }
      }

      if (!moonCanvas || !moonCtx) return;
      moonCtx.putImageData(img, 0, 0);

      const cx = v.pose.cx;
      const cy = v.pose.cy;
      const rot = Math.sin(a.moonPhase * 0.25) * 0.012;

      // 柔光
      const glow = a.glowSprite;
      if (glow && loudness > 0.05) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.3, loudness * 0.45);
        ctx.drawImage(glow, cx - drawR * 1.9, cy - drawR * 1.9, drawR * 3.8, drawR * 3.8);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.imageSmoothingEnabled = false;
      // 透视椭圆：水平轻微压缩（VIEW_SQUASH），强化斜视立体感
      ctx.drawImage(moonCanvas, -drawR * VIEW_SQUASH, -drawR, drawR * 2 * VIEW_SQUASH, drawR * 2);
      ctx.restore();
    };

    const drawGrain = () => {
      const tex = animRef.current.grainTex;
      if (!tex) return;
      const offsetX = Math.floor(Math.random() * GRAIN_TEX_SIZE);
      const offsetY = Math.floor(Math.random() * GRAIN_TEX_SIZE);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = ctx.createPattern(tex, 'repeat') || '#000000';
      ctx.translate(-offsetX, -offsetY);
      ctx.fillRect(offsetX, offsetY, width + GRAIN_TEX_SIZE, height + GRAIN_TEX_SIZE);
      ctx.restore();
    };

    const drawCRTScanlines = (treble: number) => {
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.06;
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 2);
      }

      const a = animRef.current;
      a.trebleAvg = a.trebleAvg * 0.92 + treble * 0.08;
      ctx.restore();
    };

    const drawWaveform = (loudness: number, wave: Uint8Array | undefined, idlePhase: number) => {
      const baseY = height * 0.92;
      const amp = height * 0.03 * Math.min(1, loudness * 1.5);
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.2 + loudness * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      const step = Math.max(2, Math.floor(width / 120));
      const bins = wave ? wave.length : 0;
      for (let x = 0; x <= width; x += step) {
        const t = x / width;
        const waveVal = bins > 0 ? wave![Math.floor(t * bins)] / 255 - 0.5 : 0;
        const y =
          baseY +
          waveVal * amp +
          Math.sin(t * Math.PI * 8 + idlePhase * 2) * amp * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      const a = animRef.current;
      const { snapshot: snapRef, available: avail, isPlaying: playing } = stateRef.current;
      const snap = snapRef.current;
      const now = performance.now();

      framesInWindow++;
      a.frameCount++;

      // 同步视角模式并推进过渡动画
      syncView(now);

      const bass = snap && avail ? snap.bassEnergy : 0;
      const mid = snap && avail ? snap.midEnergy : 0;
      const treble = snap && avail ? snap.trebleEnergy : 0;
      const loudness = bass + mid + treble;
      const wave = snap?.wave;

      a.loudnessAvg = a.loudnessAvg * 0.92 + loudness * 0.08;

      // 空闲节流
      if (!playing) {
        if (a.loudnessAvg < 0.005) {
          a.idleThrottling = true;
          a.idleSkip++;
          if (a.idleSkip % 8 !== 0) {
            a.idlePhase += 0.03;
            rafId = requestAnimationFrame(draw);
            return;
          }
        }
      } else {
        a.idleThrottling = false;
        a.idleSkip = 0;
      }

      // L0 纯黑底
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // L1 星空
      drawStars(treble);

      // L2 流星
      drawShootingStars(treble, a.trebleAvg);

      // L3 Bayer 抖动月球
      drawMoon(bass, mid, treble, loudness, now);

      // L4 胶片噪点
      drawGrain();

      // L5 CRT 扫描线
      drawCRTScanlines(treble);

      // L6 底部波形扫描线
      drawWaveform(loudness, wave, a.idlePhase);

      a.idlePhase += 0.02 + loudness * 0.05;

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    // 性能采样
    const sampleTimer = setInterval(() => {
      const now = performance.now();
      const dtMs = now - lastSampleT;
      lastSampleT = now;
      const fps = (framesInWindow * 1000) / dtMs;
      framesInWindow = 0;
      const snap = stateRef.current.snapshot.current;
      if (stateRef.current.isPlaying) {
        reportDiag('lunarVizFps', {
          fps: fps.toFixed(1),
          bass: snap ? Number(snap.bassEnergy.toFixed(3)) : 0,
          mid: snap ? Number(snap.midEnergy.toFixed(3)) : 0,
          treble: snap ? Number(snap.trebleEnergy.toFixed(3)) : 0,
          canvas: `${width}x${height}@${dpr}x`,
        });
      }
      if (fps < 25 && stateRef.current.isPlaying && !lowFpsLogged) {
        lowFpsLogged = true;
        console.warn('[LunarDitherVisualizer] 低帧率', {
          fps: fps.toFixed(1),
          canvas: `${width}x${height}`,
        });
      }
    }, 2000);

    const st0 = usePlayerStore.getState();
    reportDiag('lunarVizMounted', {
      song: st0.currentSong ? { id: st0.currentSong.id, name: st0.currentSong.name } : null,
    });

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(sampleTimer);
      clearTimeout(resizeTimer);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-black" />;
}

/** 生成归一化 Bayer 矩阵（值域 0..1） */
function buildBayerMatrix(size: number): Float32Array {
  const m = new Float32Array(size * size);
  // 递归生成 Bayer 矩阵
  const temp: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const fill = (n: number, x: number, y: number, val: number, step: number) => {
    if (n === 2) {
      temp[y][x] = val;
      temp[y][x + 1] = val + step * 2;
      temp[y + 1][x] = val + step * 3;
      temp[y + 1][x + 1] = val + step;
      return;
    }
    const half = n / 2;
    fill(half, x, y, val, step * 4);
    fill(half, x + half, y, val + step * 2, step * 4);
    fill(half, x, y + half, val + step * 3, step * 4);
    fill(half, x + half, y + half, val + step, step * 4);
  };
  fill(size, 0, 0, 0, 1);
  const max = size * size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      m[y * size + x] = temp[y][x] / max;
    }
  }
  return m;
}
