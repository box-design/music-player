// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 主题色
export const THEME_COLORS = {
  primary: '#ec4141',
  primaryHover: '#d63636',
} as const;

// 播放模式
export const PLAY_MODES = [
  { value: 'sequence' as const, label: '顺序播放', icon: 'ListMusic' },
  { value: 'random' as const, label: '随机播放', icon: 'Shuffle' },
  { value: 'single' as const, label: '单曲循环', icon: 'Repeat1' },
] as const;

// 歌手分类
export const ARTIST_CATEGORIES = [
  { area: -1, label: '全部' },
  { area: 7, label: '华语' },
  { area: 96, label: '欧美' },
  { area: 8, label: '日本' },
  { area: 16, label: '韩国' },
] as const;

// 搜索类型
export const SEARCH_TYPES = [
  { type: 1, label: '单曲', value: 'song' as const },
  { type: 100, label: '歌手', value: 'artist' as const },
  { type: 10, label: '专辑', value: 'album' as const },
  { type: 1000, label: '歌单', value: 'playlist' as const },
] as const;
