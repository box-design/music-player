import api from './index';
import type { Playlist, Song } from '@/types';
import { normalizeSong } from './song';

export async function getPersonalizedPlaylist(limit = 10): Promise<Playlist[]> {
  const res = await api.get('/personalized', { params: { limit } }) as {
    code: number;
    result: {
      id: number;
      name: string;
      picUrl: string;
      playCount: number;
      trackCount: number;
      copywriter?: string;
    }[];
  };
  return (res.result || []).map((item) => ({
    id: item.id,
    name: item.name,
    coverImgUrl: item.picUrl,
    playCount: item.playCount,
    trackCount: item.trackCount,
    description: item.copywriter,
  }));
}

export async function getPlaylistDetail(id: number): Promise<{ playlist: Playlist; songs: Song[] }> {
  const res = await api.get('/playlist/detail', { params: { id } }) as {
    code: number;
    playlist: {
      id: number;
      name: string;
      coverImgUrl: string;
      playCount: number;
      trackCount: number;
      description: string;
      tags: string[];
      creator: {
        userId: number;
        nickname: string;
        avatarUrl: string;
      };
      subscribed: boolean;
      tracks: unknown[];
      trackIds: { id: number }[];
    };
  };

  const playlist = res.playlist;

  // 如果 tracks 为空（超过1000首），需要另外获取
  let songs: Song[] = [];
  if (playlist.tracks && playlist.tracks.length > 0) {
    songs = playlist.tracks.map(normalizeSong);
  } else if (playlist.trackIds && playlist.trackIds.length > 0) {
    const ids = playlist.trackIds.slice(0, 500).map((t) => t.id);
    const songRes = await api.get('/song/detail', {
      params: { ids: ids.join(',') },
    }) as { code: number; songs: unknown[] };
    songs = (songRes.songs || []).map(normalizeSong);
  }

  return {
    playlist: {
      id: playlist.id,
      name: playlist.name,
      coverImgUrl: playlist.coverImgUrl,
      playCount: playlist.playCount,
      trackCount: playlist.trackCount,
      description: playlist.description,
      tags: playlist.tags,
      creator: playlist.creator,
      subscribed: playlist.subscribed,
      tracks: songs,
    },
    songs,
  };
}

export async function getPlaylistCatlist() {
  const res = await api.get('/playlist/catlist') as {
    code: number;
    sub: { name: string; category: number }[];
    categories: Record<string, string>;
  };
  return res;
}

export async function getTopPlaylist(cat = '全部', order = 'hot', limit = 30, offset = 0) {
  const res = await api.get('/top/playlist', {
    params: { cat, order, limit, offset },
  }) as {
    code: number;
    playlists: Playlist[];
    total: number;
    more: boolean;
  };
  return res;
}

export async function getTopPlaylistHighquality(cat = '全部', limit = 30, before?: number) {
  const res = await api.get('/top/playlist/highquality', {
    params: { cat, limit, before },
  }) as {
    code: number;
    playlists: Playlist[];
    total: number;
    more: boolean;
    lasttime: number;
  };
  return res;
}

export async function subscribePlaylist(id: number, t: 1 | 2 = 1) {
  const res = await api.get('/playlist/subscribe', { params: { id, t } }) as { code: number };
  return res.code === 200;
}
