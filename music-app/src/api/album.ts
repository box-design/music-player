import api from './index';
import type { Album, Song } from '@/types';
import { normalizeSong } from './song';

export async function getAlbumNewest(): Promise<Album[]> {
  const res = await api.get('/album/newest') as {
    code: number;
    albums: {
      id: number;
      name: string;
      picUrl: string;
      artist: { id: number; name: string };
      artists?: { id: number; name: string }[];
      publishTime: number;
      size: number;
    }[];
  };
  return (res.albums || []).map((item) => ({
    id: item.id,
    name: item.name,
    picUrl: item.picUrl,
    artist: item.artist,
    artists: item.artists,
    size: item.size,
    publishTime: item.publishTime,
  }));
}

export async function getAlbumDetail(id: number): Promise<{ album: Album; songs: Song[] }> {
  const res = await api.get('/album', { params: { id } }) as {
    code: number;
    album: {
      id: number;
      name: string;
      picUrl: string;
      artist: { id: number; name: string };
      artists?: { id: number; name: string }[];
      publishTime: number;
      size: number;
      description: string;
      subType: string;
    };
    songs: unknown[];
  };
  return {
    album: {
      id: res.album.id,
      name: res.album.name,
      picUrl: res.album.picUrl,
      artist: res.album.artist,
      artists: res.album.artists,
      size: res.album.size,
      publishTime: res.album.publishTime,
      description: res.album.description,
      subType: res.album.subType,
    },
    songs: (res.songs || []).map(normalizeSong),
  };
}

export async function getTopAlbum(area = 'ALL', type = 'hot', limit = 30, offset = 0) {
  const res = await api.get('/top/album', {
    params: { area, type, limit, offset },
  }) as {
    code: number;
    albums: Album[];
    total: number;
    more: boolean;
  };
  return res;
}
