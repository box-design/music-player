import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { Song, LyricLine, PlayMode } from '@/types';
import { getSongUrl, getLyric } from '@/api/song';

// 用于防止快速切歌时的竞态条件
let fetchId = 0;

/**
 * 节流 localStorage 持久化存储。
 *
 * 背景：`setCurrentTime` 随音频 timeupdate 每 ~250ms 触发一次 store set，
 * persist 默认每次 set 都会同步 `JSON.stringify` 整个 partialize 结果
 * （含完整 currentSong + playlist）并写入 localStorage——歌单越大，主线程
 * 同步阻塞越明显（大歌单可达数毫秒/次），且随会话时间累积、与当前歌曲无关，
 * 是"某些歌单里普遍卡顿"的可疑来源之一。
 *
 * 这里把 stringify + 写入合并为每 ~1s 至多一次（写前才序列化），把主线程上的
 * 同步开销降低到 ~1 次/秒。注意不能做成"最后一次变更后 1s 才写"的纯防抖：
 * 播放中 timeupdate 持续触发 set 会把定时器无限推迟，导致播放期间永不落盘，
 * 刷新/关闭页面后恢复的是陈旧歌曲。因此定时器只按第一个变更排期，之后高频
 * set 仅刷新待写入内容，保证最新状态按 ~1s 周期持续写入。刷新最多丢失最后
 * ~1s 的进度（仅 currentTime 等低频信息）。
 */
let persistWriteTimer: ReturnType<typeof setTimeout> | null = null;
/** 待写入的最新序列化内容：定时器挂起期间由后续 set 刷新 */
let pendingPersistRaw: string | null = null;

/** partialize 持久化的字段子集（persist 要求 storage 匹配该子集类型） */
interface PersistedPlayerState {
  volume: number;
  playMode: PlayMode;
  currentSong: Song | null;
  playlist: Song[];
  currentTime: number;
  audioUrl: string;
}

const throttledPersistStorage: PersistStorage<PersistedPlayerState> = {
  getItem: (name) => {
    try {
      const raw = window.localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<PersistedPlayerState>) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    // 始终缓存最新内容；已有待写入任务时不再重置定时器，
    // 否则播放中高频 timeupdate 会让写入被无限推迟、永不落盘。
    pendingPersistRaw = JSON.stringify(value);
    if (persistWriteTimer) return;
    persistWriteTimer = setTimeout(() => {
      persistWriteTimer = null;
      try {
        if (pendingPersistRaw !== null) {
          window.localStorage.setItem(name, pendingPersistRaw);
        }
      } catch {
        // 配额/隐私模式等失败时静默丢弃
      }
    }, 1000);
  },
  removeItem: (name) => {
    if (persistWriteTimer) {
      clearTimeout(persistWriteTimer);
      persistWriteTimer = null;
    }
    pendingPersistRaw = null;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

interface PlayerState {
  currentSong: Song | null;
  playlist: Song[];
  history: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: PlayMode;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  isFullPlayerOpen: boolean;
  audioUrl: string;

  // Actions
  setCurrentSong: (song: Song | null) => void;
  setPlaylist: (songs: Song[]) => void;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (index: number) => void;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlayMode: (mode: PlayMode) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setCurrentLyricIndex: (index: number) => void;
  setIsFullPlayerOpen: (open: boolean) => void;
  setAudioUrl: (url: string) => void;
  clearPlaylist: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      playlist: [],
      history: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      playMode: 'sequence',
      lyrics: [],
      currentLyricIndex: -1,
      isFullPlayerOpen: false,
      audioUrl: '',

      setCurrentSong: (song) => set({ currentSong: song }),

      setPlaylist: (songs) => set({ playlist: songs }),

      addToPlaylist: (song) => {
        const { playlist } = get();
        if (!playlist.find((s) => s.id === song.id)) {
          set({ playlist: [...playlist, song] });
        }
      },

      removeFromPlaylist: (index) => {
        const { playlist } = get();
        const newPlaylist = playlist.filter((_, i) => i !== index);
        set({ playlist: newPlaylist });
      },

      playNext: async () => {
        const { playlist, currentSong, playMode } = get();
        if (playlist.length === 0) return;

        let nextIndex = 0;
        const currentIndex = currentSong
          ? playlist.findIndex((s) => s.id === currentSong.id)
          : -1;

        if (playMode === 'random') {
          nextIndex = Math.floor(Math.random() * playlist.length);
        } else {
          nextIndex = currentIndex + 1;
          if (nextIndex >= playlist.length) nextIndex = 0;
        }

        const nextSong = playlist[nextIndex];
        if (!nextSong) return;

        const currentFetchId = ++fetchId;

        // 先获取新歌曲的音频 URL 和歌词，再一次性更新状态
        // 避免出现 audioUrl 为空的中间状态，防止 Chromium AUDIO_RENDERER_ERROR
        try {
          const [urlRes, lyrics] = await Promise.all([
            getSongUrl(nextSong.id),
            getLyric(nextSong.id),
          ]);
          // 确保仍是最新的切歌请求
          if (currentFetchId !== fetchId) return;
          if (urlRes?.url) {
            set({
              currentSong: nextSong,
              currentTime: 0,
              isPlaying: true,
              audioUrl: urlRes.url,
              lyrics,
              currentLyricIndex: -1,
              history: [...get().history, nextSong].slice(-50),
            });
          }
        } catch (e) {
          console.error('Failed to fetch song URL for next:', e);
        }
      },

      playPrev: async () => {
        const { playlist, currentSong } = get();
        if (playlist.length === 0) return;

        const currentIndex = currentSong
          ? playlist.findIndex((s) => s.id === currentSong.id)
          : -1;

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = playlist.length - 1;

        const prevSong = playlist[prevIndex];
        if (!prevSong) return;

        const currentFetchId = ++fetchId;

        try {
          const [urlRes, lyrics] = await Promise.all([
            getSongUrl(prevSong.id),
            getLyric(prevSong.id),
          ]);
          if (currentFetchId !== fetchId) return;
          if (urlRes?.url) {
            set({
              currentSong: prevSong,
              currentTime: 0,
              isPlaying: true,
              audioUrl: urlRes.url,
              lyrics,
              currentLyricIndex: -1,
              history: [...get().history, prevSong].slice(-50),
            });
          }
        } catch (e) {
          console.error('Failed to fetch song URL for prev:', e);
        }
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),
      setPlayMode: (mode) => set({ playMode: mode }),
      setLyrics: (lyrics) => set({ lyrics }),
      setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),
      setIsFullPlayerOpen: (open) => set({ isFullPlayerOpen: open }),
      setAudioUrl: (url) => set({ audioUrl: url }),

      clearPlaylist: () =>
        set({ playlist: [], currentSong: null, isPlaying: false }),
    }),
    {
      name: 'player-storage',
      storage: throttledPersistStorage,
      partialize: (state) => ({
        volume: state.volume,
        playMode: state.playMode,
        currentSong: state.currentSong,
        playlist: state.playlist,
        currentTime: state.currentTime,
        audioUrl: state.audioUrl,
      }),
    }
  )
);
