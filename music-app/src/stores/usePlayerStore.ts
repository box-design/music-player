import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, LyricLine, PlayMode } from '@/types';
import { getSongUrl, getLyric } from '@/api/song';

// 用于防止快速切歌时的竞态条件
let fetchId = 0;

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
