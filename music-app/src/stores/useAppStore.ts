import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/locales';
import { detectLanguage } from '@/locales';

interface AppState {
  sidebarCollapsed: boolean;
  isDarkMode: boolean;
  enableGlassmorphism: boolean;
  lightingIntensity: number;
  searchHistory: string[];
  /** 全屏播放器风格：经典双面板 / Aurora Pulse 可视化 / Lunar Dither */
  playerStyle: 'classic' | 'visual' | 'lunar';
  /** 界面语言 */
  language: Language;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
  toggleGlassmorphism: () => void;
  setGlassmorphism: (enabled: boolean) => void;
  setLightingIntensity: (intensity: number) => void;
  setPlayerStyle: (style: 'classic' | 'visual' | 'lunar') => void;
  setLanguage: (lang: Language) => void;
  addSearchHistory: (keyword: string) => void;
  clearSearchHistory: () => void;
  removeSearchHistory: (keyword: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      isDarkMode: true,
      enableGlassmorphism: true,
      lightingIntensity: 1,
      searchHistory: [],
      playerStyle: 'visual',
      language: detectLanguage(),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleTheme: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      toggleGlassmorphism: () =>
        set((state) => ({ enableGlassmorphism: !state.enableGlassmorphism })),
      setGlassmorphism: (enabled) => set({ enableGlassmorphism: enabled }),
      setLightingIntensity: (intensity) =>
        set({ lightingIntensity: Math.max(0, Math.min(1, intensity)) }),
      setPlayerStyle: (style) => set({ playerStyle: style }),
      setLanguage: (lang) => set({ language: lang }),
      addSearchHistory: (keyword) =>
        set((state) => {
          const filtered = state.searchHistory.filter((k) => k !== keyword);
          return { searchHistory: [keyword, ...filtered].slice(0, 10) };
        }),
      clearSearchHistory: () => set({ searchHistory: [] }),
      removeSearchHistory: (keyword) =>
        set((state) => ({
          searchHistory: state.searchHistory.filter((k) => k !== keyword),
        })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        isDarkMode: state.isDarkMode,
        enableGlassmorphism: state.enableGlassmorphism,
        lightingIntensity: state.lightingIntensity,
        searchHistory: state.searchHistory,
        playerStyle: state.playerStyle,
        language: state.language,
      }),
    }
  )
);
