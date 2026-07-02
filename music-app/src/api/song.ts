import api from './index';
import type { Song, LyricLine } from '@/types';
import { parseLyric } from '@/utils/format';

export async function getSongDetail(ids: number[]): Promise<Song[]> {
  const res = await api.get('/song/detail', {
    params: { ids: ids.join(',') },
  }) as { code: number; songs: unknown[] };

  return (res.songs || []).map(normalizeSong);
}

export async function getSongUrl(id: number, level = 'standard') {
  const res = await api.get('/song/url/v1', {
    params: { id, level },
  }) as { code: number; data: { url: string; id: number; type: string; size: number; br: number }[] };
  return res.data?.[0] || null;
}

export async function getLyric(id: number): Promise<LyricLine[]> {
  const res = await api.get('/lyric', { params: { id } }) as {
    code: number;
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
  };
  const lyricStr = res.lrc?.lyric || '';
  return parseLyric(lyricStr);
}

export async function checkMusic(id: number) {
  const res = await api.get('/check/music', { params: { id } }) as { code: number; success: boolean; message?: string };
  return res.success;
}

export async function getSimiSongs(id: number) {
  const res = await api.get('/simi/song', { params: { id } }) as { code: number; songs: unknown[] };
  return (res.songs || []).map(normalizeSong);
}

// 标准化歌曲数据
export function normalizeSong(raw: unknown): Song {
  const s = raw as Record<string, unknown>;
  return {
    id: (s.id as number) || 0,
    name: (s.name as string) || '',
    artists: (s.ar || s.artists || []).map((a: unknown) => ({
      id: (a as Record<string, unknown>).id as number,
      name: (a as Record<string, unknown>).name as string,
      picUrl: (a as Record<string, unknown>).picUrl as string,
    })),
    album: {
      id: ((s.al || s.album) as Record<string, unknown>)?.id as number,
      name: ((s.al || s.album) as Record<string, unknown>)?.name as string,
      picUrl: ((s.al || s.album) as Record<string, unknown>)?.picUrl as string,
    },
    duration: (s.dt as number) || (s.duration as number) || 0,
    fee: (s.fee as number) || 0,
    picUrl: ((s.al || s.album) as Record<string, unknown>)?.picUrl as string,
  };
}
