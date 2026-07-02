import { useEffect, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { resumeAudioContext } from '@/lib/audioGraph';

// 应用生命周期内只创建唯一一个 Audio 实例，避免多个组件调用 useAudio 时重复创建。
const audioRef = { current: null as HTMLAudioElement | null };
// 全局共享，确保切换歌曲、canplay 回调、播放/暂停逻辑都读写同一个标记。
const canPlayRef = { current: false };
// 记录上一次设置的 audioUrl，避免新组件挂载时重复加载同一首歌
const lastAudioUrlRef = { current: '' };
// 是否尝试过无 crossOrigin 的回退加载（针对不支持 CORS 的 CDN），
// 避免无限重试。每次换歌重置。
const crossOriginFallbackRef = { current: false };

export function useAudio() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    volume,
    playMode,
    audioUrl,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    playNext,
    lyrics,
    setCurrentLyricIndex,
  } = usePlayerStore();

  // 用 ref 保持最新值，避免回调中的闭包过期问题
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const lyricsRef = useRef(lyrics);
  lyricsRef.current = lyrics;
  const setCurrentTimeRef = useRef(setCurrentTime);
  setCurrentTimeRef.current = setCurrentTime;
  const setCurrentLyricIndexRef = useRef(setCurrentLyricIndex);
  setCurrentLyricIndexRef.current = setCurrentLyricIndex;
  const setDurationRef = useRef(setDuration);
  setDurationRef.current = setDuration;
  const setIsPlayingRef = useRef(setIsPlaying);
  setIsPlayingRef.current = setIsPlaying;
  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;

  // 初始化 audio（仅一次）
  useEffect(() => {
    if (audioRef.current) return;

    const audio = new Audio();
    // 设置 crossOrigin 以便 Web Audio AnalyserNode 能读取跨域音频频谱。
    // 若 CDN 不支持 CORS 会触发 error —— 由 handleError 回退到无 crossOrigin 重试。
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audioRef.current = audio;

    // 如果有持久化的歌曲和 URL，恢复音频源与进度
    if (currentSong && audioUrl) {
      audio.src = audioUrl;
      audio.currentTime = currentTime / 1000;
      audio.load();
    }

    const handleTimeUpdate = () => {
      if (!audio) return;
      const time = audio.currentTime * 1000;
      setCurrentTimeRef.current(time);

      const lyrs = lyricsRef.current;
      if (lyrs.length > 0) {
        let index = -1;
        for (let i = 0; i < lyrs.length; i++) {
          if (lyrs[i].time <= time) {
            index = i;
          } else {
            break;
          }
        }
        setCurrentLyricIndexRef.current(index);
      }
    };

    const handleLoadedMetadata = () => {
      setDurationRef.current(audio.duration * 1000);
    };

    const handleCanPlay = () => {
      canPlayRef.current = true;
      // 回退成功后重置标志，下一首歌仍优先尝试 CORS（可视化优先）。
      crossOriginFallbackRef.current = false;
      if (isPlayingRef.current) {
        audio.play().catch((err) => {
          console.error('Audio play failed on canplay:', err);
          setIsPlayingRef.current(false);
        });
      }
    };

    const handleEnded = () => {
      if (playModeRef.current === 'single') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextRef.current();
      }
    };

    const handleError = () => {
      // crossOrigin 导致加载失败时（CDN 不支持 CORS），回退到无 crossOrigin
      // 重新加载，保证播放永远可用（代价是可视化拿不到数据）。
      if (!crossOriginFallbackRef.current && audio.crossOrigin) {
        console.warn('[useAudio] CORS load failed, retrying without crossOrigin (visualizer disabled for this track)');
        crossOriginFallbackRef.current = true;
        const keepSrc = audio.src;
        canPlayRef.current = false;
        audio.removeAttribute('crossorigin');
        audio.src = keepSrc;
        audio.load();
        return;
      }
      console.error('Audio playback error, code:', audio.error?.code, 'message:', audio.error?.message);
      canPlayRef.current = false;
      setIsPlayingRef.current(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audioRef.current = null;
      canPlayRef.current = false;
      lastAudioUrlRef.current = '';
      crossOriginFallbackRef.current = false;
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
    // 仅在挂载时运行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 播放/暂停
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // 在用户触发的播放手势内 resume AudioContext，解除自动播放挂起。
      resumeAudioContext();
      if (canPlayRef.current) {
        audio.play().catch((err) => {
          console.error('Audio play failed on isPlaying change:', err);
          setIsPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // 切换歌曲时更新 audio src（仅在 URL 真正变化时才重新加载）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // 如果 URL 没有变化，说明是组件重新挂载（如全屏播放器打开），不需要重新加载
    if (audioUrl === lastAudioUrlRef.current && audio.src === audioUrl) return;

    lastAudioUrlRef.current = audioUrl;
    canPlayRef.current = false;
    // 新歌重置回退标志，优先尝试带 CORS 的可视化加载。
    crossOriginFallbackRef.current = false;
    if (!audio.crossOrigin) audio.crossOrigin = 'anonymous';
    audio.src = audioUrl;
    audio.load();
  }, [audioUrl]);

  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time / 1000;
    setCurrentTime(time);
  }, [setCurrentTime]);

  return { audioRef, seek };
}
