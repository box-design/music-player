/**
 * 单例 Web Audio 图：把共享的 HTMLAudioElement（来自 useAudio）接入
 * AudioContext → MediaElementSource → AnalyserNode → destination。
 *
 * 关键约束：
 * 1. `createMediaElementSource` 每个 media element **只能调用一次**，故用
 *    `boundElement` 守卫，全局只绑定一次。
 * 2. AudioContext 受自动播放策略约束，需在用户手势内 `resume()`。
 * 3. 跨域资源：只有当 audio 元素设置 `crossOrigin="anonymous"` 且服务端
 *    返回 CORS 头时，AnalyserNode 才能拿到非零数据；否则输出静默。
 *    是否可用由 useAnalyser 的「静默检测」判定。
 */

const FFT_SIZE = 2048;

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
// 记录已经绑定过 source 的元素，避免重复 createMediaElementSource 抛错。
let boundElement: HTMLAudioElement | null = null;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export interface AudioGraph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  fftSize: number;
}

export const AUDIO_FFT_SIZE = FFT_SIZE;

/**
 * 确保音频图存在并绑定到指定 audio 元素。可重复调用——每个元素只绑定一次。
 * 返回图实例；若 Web Audio 不可用则返回 null。
 */
export function ensureAudioGraph(audioEl: HTMLAudioElement): AudioGraph | null {
  if (!audioCtx) {
    audioCtx = createAudioContext();
    if (!audioCtx) return null;
  }

  if (!analyser) {
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    // 较高的平滑系数让柱体过渡更柔顺、更有「呼吸感」。
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(audioCtx.destination);
  }

  if (boundElement !== audioEl) {
    try {
      sourceNode = audioCtx.createMediaElementSource(audioEl);
      sourceNode.connect(analyser);
      boundElement = audioEl;
    } catch (err) {
      // 通常是该元素已被绑定过；忽略即可，analyser 仍可能存活。
      console.warn('[audioGraph] createMediaElementSource failed:', err);
    }
  }

  return { ctx: audioCtx, analyser, fftSize: FFT_SIZE };
}

/** 在用户手势内调用，解除自动播放挂起。 */
export function resumeAudioContext(): void {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

/** 音频图当前是否已就绪（context + analyser 都存在）。 */
export function isGraphReady(): boolean {
  return !!(audioCtx && analyser);
}
