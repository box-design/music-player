import api from './index';
import type { Song, Artist, Album, Playlist } from '@/types';
import { normalizeSong } from './song';

interface SearchResult {
  songs?: Song[];
  artists?: Artist[];
  albums?: Album[];
  playlists?: Playlist[];
}

interface CloudSearchRaw {
  result: {
    songs?: unknown[];
    artists?: unknown[];
    albums?: unknown[];
    playlists?: unknown[];
    hasMore?: boolean;
  };
}

function normalizeArtist(raw: unknown): Artist {
  const a = raw as Record<string, unknown>;
  return {
    id: (a.id as number) || 0,
    name: (a.name as string) || '',
    picUrl: (a.picUrl as string) || ((a.img1v1Url as string) || ''),
    alias: (a.alias as string[]) || [],
  };
}

function normalizeAlbum(raw: unknown): Album {
  const a = raw as Record<string, unknown>;
  const artist = normalizeArtist(a.artist || {});
  return {
    id: (a.id as number) || 0,
    name: (a.name as string) || '',
    picUrl: (a.picUrl as string) || '',
    artist,
    artists: ((a.artists as unknown[]) || []).map(normalizeArtist),
    size: (a.size as number) || 0,
    publishTime: (a.publishTime as number) || 0,
    description: (a.description as string) || (a.trans as string) || '',
  };
}

function normalizePlaylist(raw: unknown): Playlist {
  const p = raw as Record<string, unknown>;
  return {
    id: (p.id as number) || 0,
    name: (p.name as string) || '',
    coverImgUrl: (p.coverImgUrl as string) || (p.picUrl as string) || '',
    playCount: (p.playCount as number) || 0,
    trackCount: (p.trackCount as number) || 0,
    description: (p.description as string) || '',
    creator: p.creator as Playlist['creator'],
  };
}

export async function search(
  keywords: string,
  type = 1,
  limit = 30,
  offset = 0
): Promise<{ result: SearchResult; hasMore: boolean }> {
  const res = (await api.get('/cloudsearch', {
    params: { keywords, type, limit, offset },
  })) as CloudSearchRaw;
  const r = res.result || {};
  return {
    result: {
      songs: (r.songs || []).map(normalizeSong),
      artists: (r.artists || []).map(normalizeArtist),
      albums: (r.albums || []).map(normalizeAlbum),
      playlists: (r.playlists || []).map(normalizePlaylist),
    },
    hasMore: r.hasMore ?? false,
  };
}

export async function getSearchHotDetail() {
  const res = (await api.get('/search/hot/detail')) as {
    code: number;
    data: { searchWord: string; score: number; content: string }[];
  };
  return res.data || [];
}

export async function getSearchSuggest(keywords: string) {
  const res = (await api.get('/search/suggest', { params: { keywords, type: 'mobile' } })) as {
    code: number;
    result: {
      songs?: unknown[];
      artists?: unknown[];
      albums?: unknown[];
      playlists?: unknown[];
    };
  };
  const r = res.result || {};
  return {
    songs: (r.songs || []).map(normalizeSong),
    artists: (r.artists || []).map(normalizeArtist),
    albums: (r.albums || []).map(normalizeAlbum),
    playlists: (r.playlists || []).map(normalizePlaylist),
  };
}

export async function getDefaultSearchWord() {
  const res = (await api.get('/search/default')) as {
    code: number;
    data: { realkeyword: string; showKeyword: string };
  };
  return res.data || {};
}
