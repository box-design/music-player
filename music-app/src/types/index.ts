// 通用API响应
export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  [key: string]: unknown;
}

// 歌曲
export interface Song {
  id: number;
  name: string;
  artists: Artist[];
  album: AlbumBrief;
  duration: number;
  fee?: number;
  alias?: string[];
  picUrl?: string;
}

// 歌手
export interface Artist {
  id: number;
  name: string;
  picUrl?: string;
  alias?: string[];
  briefDesc?: string;
}

// 歌手详情
export interface ArtistDetail extends Artist {
  musicSize: number;
  albumSize: number;
  fansCount?: number;
  followCount?: number;
  description?: string;
}

// 专辑简略
export interface AlbumBrief {
  id: number;
  name: string;
  picUrl?: string;
  artist?: Artist;
}

// 专辑
export interface Album {
  id: number;
  name: string;
  picUrl: string;
  artist: Artist;
  artists?: Artist[];
  size?: number;
  publishTime?: number;
  description?: string;
  songs?: Song[];
  subType?: string;
}

// 歌单
export interface Playlist {
  id: number;
  name: string;
  coverImgUrl: string;
  creator?: User;
  playCount: number;
  trackCount: number;
  description?: string;
  tracks?: Song[];
  subscribed?: boolean;
  tags?: string[];
  createTime?: number;
  updateTime?: number;
}

// 用户
export interface User {
  userId: number;
  nickname: string;
  avatarUrl: string;
  signature?: string;
  followeds?: number;
  follows?: number;
  level?: number;
  listenSongs?: number;
  createTime?: number;
}

// 歌词
export interface LyricLine {
  time: number;
  text: string;
}

// 评论
export interface Comment {
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  liked: boolean;
  user: User;
  beReplied?: Comment[];
}

// Banner
export interface Banner {
  imageUrl: string;
  targetId: number;
  targetType: number;
  typeTitle: string;
  url?: string;
}

// 排行榜
export interface Toplist {
  id: number;
  name: string;
  coverImgUrl: string;
  playCount: number;
  updateFrequency: string;
  tracks?: { first: string; second: string }[];
  description?: string;
}

// 播放模式
export type PlayMode = 'sequence' | 'random' | 'single';

// 搜索结果类型
export type SearchType = 'song' | 'artist' | 'album' | 'playlist';

// 电台
export interface DJRadio {
  id: number;
  name: string;
  picUrl: string;
  dj?: User;
  subCount?: number;
  programCount?: number;
  desc?: string;
}

// 搜索建议
export interface SearchSuggest {
  albums?: Album[];
  artists?: Artist[];
  songs?: Song[];
  playlists?: Playlist[];
}
