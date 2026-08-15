/**
 * useAnalyser —— 为可视化器提供音频频谱数据。
 *
 * 设计要点：
 * - 懒初始化 audioGraph，把共享的 audioRef 绑定进 Web Audio 图。
 * - 当 `active` 为 true（且 isPlaying）时启动单个 rAF 循环读取频谱，
 *   暂停或卸载时立即停掉，省电并避免无效计算。
 * - 静默检测：isPlaying 为真且时间在前进，但频谱连续多帧全 0 → 判定该
 *   曲目被跨域污染，`available` 置为 false。此时 UI 显示「该歌曲暂不支持
 *   可视化」，绝不伪造反应数据。
 */

import { useEffect, useRef, useState } from 'react';
import { ensureAudioGraph, AUDIO_FFT_SIZE } from '@/lib/audioGraph';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { reportDiag } from '@/lib/diag';

// 连续多少帧「应该有声但频谱全 0」才判定不可用。
const SILENCE_FRAMES_LIMIT = 30;

export interface AnalyserSnapshot {
  /** 频域数据（0-255），长度 = fftSize / 2 */
  freq: Uint8Array;
  /** 时域波形（0-255），长度 = fftSize / 2 */
  wave: Uint8Array;
  /** 低频能量 0-1 */
  bassEnergy: number;
  /** 中频能量 0-1 */
  midEnergy: number;
  /** 高频能量 0-1 */
  trebleEnergy: number;
}

export interface UseAnalyserResult {
  /** 当前最新一帧快照（通过 ref 读取，避免每帧 setState） */
  snapshot: React.MutableRefObject<AnalyserSnapshot | null>;
  /** 该曲目是否支持可视化（false 时应显示不可用提示） */
  available: boolean;
}

export function useAnalyser(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  /** 是否激活：仅可视化播放器打开时为 true */
  active: boolean
): UseAnalyserResult {
  const { isPlaying } = usePlayerStore();
  const snapshotRef = useRef<AnalyserSnapshot | null>(null);
  const [available, setAvailable] = useState(true);

  // 用 ref 跟踪 isPlaying，避免将它放入 useEffect 依赖 → 暂停/播放切换不重启 rAF 循环
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // 用于静默检测的本地变量（不放进 state，避免触发渲染）。
  const stateRef = useRef({
    silenceFrames: 0,
    lastTime: 0,
    decided: false, // 本曲已判定，不再反复翻转
    // 播放卡顿诊断：isPlaying 为真但 currentTime 停滞的连续帧数
    stallFrames: 0,
    stalledLogged: false,
  });

  useEffect(() => {
    if (!active || !audioRef.current) return;
    const audioEl = audioRef.current;
    const graph = ensureAudioGraph(audioEl);
    if (!graph) return;
    const analyser = graph.analyser;

    const binCount = analyser.frequencyBinCount; // = fftSize / 2
    const freq = new Uint8Array(binCount);
    const wave = new Uint8Array(binCount);

    if (!snapshotRef.current) {
      snapshotRef.current = {
        freq: new Uint8Array(binCount),
        wave: new Uint8Array(binCount),
        bassEnergy: 0,
        midEnergy: 0,
        trebleEnergy: 0,
      };
    }

    let rafId = 0;

    const bassEnd = Math.max(1, Math.floor(binCount * 0.08)); // ~低频
    const midEnd = Math.max(bassEnd + 1, Math.floor(binCount * 0.35)); // 中频
    const trebleEnd = binCount; // 其余为高频

    const computeBand = (data: Uint8Array, from: number, to: number): number => {
      let sum = 0;
      for (let i = from; i < to; i++) sum += data[i];
      return sum / ((to - from) * 255);
    };

    const loop = () => {
      const playing = isPlayingRef.current;
      const snap = snapshotRef.current!;

      // 暂停时不读取 analyser 数据，避免无意义的 Web Audio API 调用消耗 GPU/音频线程
      if (playing) {
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(wave);

        snap.freq.set(freq);
        snap.wave.set(wave);
        snap.bassEnergy = computeBand(freq, 0, bassEnd);
        snap.midEnergy = computeBand(freq, bassEnd, midEnd);
        snap.trebleEnergy = computeBand(freq, midEnd, trebleEnd);
      }

      // ── 静默检测：仅在「确实在播放且进度在走」时统计 ──
      if (playing && !audioEl.paused && !audioEl.seeking) {
        const now = audioEl.currentTime;
        const progressing = now > stateRef.current.lastTime;
        stateRef.current.lastTime = now;

        if (progressing) {
          // 全频段都接近 0 视为静默帧。
          const total = snap.bassEnergy + snap.midEnergy + snap.trebleEnergy;
          if (total < 0.01) {
            stateRef.current.silenceFrames += 1;
            if (
              stateRef.current.silenceFrames >= SILENCE_FRAMES_LIMIT &&
              !stateRef.current.decided
            ) {
              stateRef.current.decided = true;
              setAvailable(false);
            }
          } else {
            stateRef.current.silenceFrames = 0;
            if (!stateRef.current.decided) {
              stateRef.current.decided = true;
              setAvailable(true);
            }
          }
          // 进度在走 → 卡顿计数清零
          stateRef.current.stallFrames = 0;
        } else {
          // ── 播放卡顿诊断：曾正常播放过（lastTime > 0），随后 currentTime
          //    连续 ~1s 不动，说明音频解码/缓冲把主线程或音频线程占死了，
          //    与 canvas 渲染无关（每首歌只记录一次）。──
          if (stateRef.current.lastTime > 0) {
            stateRef.current.stallFrames += 1;
            if (
              stateRef.current.stallFrames > 60 &&
              !stateRef.current.stalledLogged
            ) {
              stateRef.current.stalledLogged = true;
              const song = usePlayerStore.getState().currentSong;
              const stallInfo = {
                song: song ? { id: song.id, name: song.name } : null,
                stalledMs: Math.round(stateRef.current.stallFrames * 16.7),
                readyState: audioEl.readyState,
                networkState: audioEl.networkState,
                ctxState: graph.ctx.state,
              };
              console.warn('[useAnalyser] 播放卡住(解码/缓冲阻塞)', stallInfo);
              reportDiag('audioStall', stallInfo); // 同步上报到开发服务器日志
            }
          }
        }
      } else {
        // 暂停 / 拖拽期间不累计卡顿
        stateRef.current.stallFrames = 0;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
    // active / audioRef 切换时重挂；isPlaying 通过 ref 读取，不触发重启。
  }, [active, audioRef]);

  // 切歌（currentSong 变化）时重置静默判定，重新探测新曲可用性。
  const currentSong = usePlayerStore((s) => s.currentSong);
  useEffect(() => {
    stateRef.current.silenceFrames = 0;
    stateRef.current.decided = false;
    stateRef.current.lastTime = 0;
    stateRef.current.stallFrames = 0;
    stateRef.current.stalledLogged = false;
    setAvailable(true);
  }, [currentSong?.id]);

  return { snapshot: snapshotRef, available };
}

export { AUDIO_FFT_SIZE };
