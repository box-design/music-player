import api from './index';
import type { Toplist, Song } from '@/types';
import { normalizeSong } from './song';

export async function getToplist(): Promise<Toplist[]> {
  const res = await api.get('/toplist') as {
    code: number;
    list: {
      id: number;
      name: string;
      coverImgUrl: string;
      playCount: number;
      updateFrequency: string;
      tracks: { first: string; second: string }[];
      description: string;
    }[];
  };
  return (res.list || []).map((item) => ({
    id: item.id,
    name: item.name,
    coverImgUrl: item.coverImgUrl,
    playCount: item.playCount,
    updateFrequency: item.updateFrequency,
    tracks: item.tracks,
    description: item.description,
  }));
}

export async function getToplistDetail(): Promise<Toplist[]> {
  const res = await api.get('/toplist/detail') as {
    code: number;
    list: Toplist[];
  };
  return res.list || [];
}

export async function getPlaylistDetail(id: number, limit?: number): Promise<{ playlist: { name: string; coverImgUrl: string; description?: string }; songs: Song[] }> {
  const res = await api.get('/playlist/detail', { params: { id } }) as {
    code: number;
    playlist: {
      name: string;
      coverImgUrl: string;
      description?: string;
      trackIds: { id: number }[];
    };
  };

  const trackIds = res.playlist.trackIds;
  const ids = (limit ? trackIds.slice(0, limit) : trackIds).map((t) => t.id);

  let songs: Song[] = [];
  if (ids.length > 0) {
    const songRes = await api.get('/song/detail', {
      params: { ids: ids.join(',') },
    }) as { code: number; songs: unknown[] };
    songs = (songRes.songs || []).map(normalizeSong);
  }

  return {
    playlist: {
      name: res.playlist.name,
      coverImgUrl: res.playlist.coverImgUrl,
      description: res.playlist.description,
    },
    songs,
  };
}
