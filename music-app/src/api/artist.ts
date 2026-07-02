import api from './index';
import type { Artist, ArtistDetail, Song, Album } from '@/types';
import { normalizeSong } from './song';

export async function getTopArtists(limit = 30, offset = 0): Promise<Artist[]> {
  const res = await api.get('/top/artists', {
    params: { limit, offset },
  }) as {
    code: number;
    artists: {
      id: number;
      name: string;
      picUrl: string;
      alias?: string[];
    }[];
  };
  return res.artists || [];
}

export async function getArtistDetail(id: number): Promise<ArtistDetail> {
  const res = await api.get('/artist/detail', { params: { id } }) as {
    code: number;
    data: {
      artist: {
        id: number;
        name: string;
        cover: string;
        briefDesc: string;
        musicSize: number;
        albumSize: number;
      };
      user?: {
        followCount: number;
        fanCount: number;
      };
    };
  };
  const artist = res.data.artist;
  return {
    id: artist.id,
    name: artist.name,
    picUrl: artist.cover,
    briefDesc: artist.briefDesc,
    musicSize: artist.musicSize,
    albumSize: artist.albumSize,
    followCount: res.data.user?.followCount,
    fansCount: res.data.user?.fanCount,
  };
}

export async function getArtistSongs(id: number, order = 'hot', limit = 30, offset = 0): Promise<{ songs: Song[]; total: number }> {
  const res = await api.get('/artist/songs', {
    params: { id, order, limit, offset },
  }) as {
    code: number;
    songs: unknown[];
    total: number;
  };
  return {
    songs: (res.songs || []).map(normalizeSong),
    total: res.total,
  };
}

export async function getArtistAlbums(id: number, limit = 30, offset = 0): Promise<{ albums: Album[]; total: number }> {
  const res = await api.get('/artist/album', {
    params: { id, limit, offset },
  }) as {
    code: number;
    hotAlbums: Album[];
    total: number;
  };
  return {
    albums: res.hotAlbums || [],
    total: res.total,
  };
}

export async function getArtistList(area = -1, type = -1, initial = '-1', limit = 30, offset = 0) {
  const res = await api.get('/artist/list', {
    params: { area, type, initial, limit, offset },
  }) as {
    code: number;
    artists: Artist[];
    more: boolean;
  };
  return res;
}

export async function getSimiArtists(id: number): Promise<Artist[]> {
  const res = await api.get('/simi/artist', { params: { id } }) as {
    code: number;
    artists: Artist[];
  };
  return res.artists || [];
}
