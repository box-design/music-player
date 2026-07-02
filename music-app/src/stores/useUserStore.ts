import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Playlist } from '@/types';

interface UserState {
  isLoggedIn: boolean;
  userInfo: User | null;
  cookie: string;
  userPlaylists: Playlist[];
  likedSongIds: Set<number>;

  // Actions
  setLoggedIn: (loggedIn: boolean) => void;
  setUserInfo: (user: User | null) => void;
  setCookie: (cookie: string) => void;
  setUserPlaylists: (playlists: Playlist[]) => void;
  upsertUserPlaylist: (playlist: Playlist) => void;
  setLikedSongIds: (ids: number[]) => void;
  addLikedSong: (id: number) => void;
  removeLikedSong: (id: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userInfo: null,
      cookie: '',
      userPlaylists: [],
      likedSongIds: new Set(),

      setLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
      setUserInfo: (user) => set({ userInfo: user }),
      setCookie: (cookie) => set({ cookie }),
      setUserPlaylists: (playlists) => set({ userPlaylists: playlists }),
      upsertUserPlaylist: (playlist) =>
        set((state) => {
          const index = state.userPlaylists.findIndex((p) => p.id === playlist.id);
          if (index === -1) {
            return { userPlaylists: [...state.userPlaylists, playlist] };
          }
          const newPlaylists = [...state.userPlaylists];
          newPlaylists[index] = { ...newPlaylists[index], ...playlist };
          return { userPlaylists: newPlaylists };
        }),
      setLikedSongIds: (ids) => set({ likedSongIds: new Set(ids) }),
      addLikedSong: (id) =>
        set((state) => {
          const newSet = new Set(state.likedSongIds);
          newSet.add(id);
          return { likedSongIds: newSet };
        }),
      removeLikedSong: (id) =>
        set((state) => {
          const newSet = new Set(state.likedSongIds);
          newSet.delete(id);
          return { likedSongIds: newSet };
        }),
      logout: () =>
        set({
          isLoggedIn: false,
          userInfo: null,
          cookie: '',
          userPlaylists: [],
          likedSongIds: new Set(),
        }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userInfo: state.userInfo,
        cookie: state.cookie,
        likedSongIds: Array.from(state.likedSongIds),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.likedSongIds) {
          state.likedSongIds = new Set(state.likedSongIds as unknown as number[]);
        }
      },
    }
  )
);
