import api from './index';
import type { Song, Playlist } from '@/types';
import { normalizeSong } from './song';

export async function getPersonalized(limit = 10): Promise<Playlist[]> {
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

export async function getRecommendSongs(): Promise<Song[]> {
  const res = await api.get('/recommend/songs') as {
    code: number;
    data: {
      dailySongs: unknown[];
    };
  };
  return (res.data?.dailySongs || []).map(normalizeSong);
}

export async function getRecommendResource(): Promise<Playlist[]> {
  const res = await api.get('/recommend/resource') as {
    code: number;
    recommend: Playlist[];
  };
  return res.recommend || [];
}

export async function getPersonalizedNewsong(limit = 12): Promise<Song[]> {
  const res = await api.get('/personalized/newsong', { params: { limit } }) as {
    code: number;
    result: { id: number; name: string; picUrl: string; song: unknown }[];
  };
  return (res.result || []).map((item) => normalizeSong(item.song));
}

export async function getPersonalizedDjprogram() {
  const res = await api.get('/personalized/djprogram') as {
    code: number;
    result: { id: number; name: string; picUrl: string; copywriter?: string }[];
  };
  return res.result || [];
}

export async function getPersonalFM(): Promise<Song[]> {
  const res = await api.get('/personal_fm') as {
    code: number;
    data: unknown[];
  };
  return (res.data || []).map(normalizeSong);
}

// 私人雷达歌单 ID（网易云官方固定歌单）
const PRIVATE_RADAR_PLAYLIST_ID = 2829883282;

export async function getPrivateRadarSongs(limit = 5): Promise<Song[]> {
  const res = await api.get('/playlist/detail', {
    params: { id: PRIVATE_RADAR_PLAYLIST_ID },
  }) as {
    code: number;
    playlist: {
      tracks: unknown[];
    };
  };
  return (res.playlist?.tracks || []).slice(0, limit).map(normalizeSong);
}
