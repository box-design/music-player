import api from './index';
import type { User, Playlist } from '@/types';

export async function getUserDetail(uid: number): Promise<User> {
  const res = await api.get('/user/detail', { params: { uid } }) as {
    code: number;
    profile: User;
    level?: number;
    listenSongs?: number;
    createTime?: number;
  };
  return {
    ...res.profile,
    level: res.level,
    listenSongs: res.listenSongs,
    createTime: res.createTime,
  };
}

export async function getUserPlaylist(uid: number, limit = 30, offset = 0): Promise<{ playlist: Playlist[]; total: number }> {
  const res = await api.get('/user/playlist', {
    params: { uid, limit, offset },
  }) as {
    code: number;
    playlist: Playlist[];
    total: number;
  };
  return { playlist: res.playlist || [], total: res.total };
}

export async function getUserRecord(uid: number, type = 0): Promise<{ weekData?: unknown[]; allData?: unknown[] }> {
  const res = await api.get('/user/record', {
    params: { uid, type },
  }) as {
    code: number;
    weekData?: unknown[];
    allData?: unknown[];
  };
  return res;
}

export async function getUserSubcount() {
  const res = await api.get('/user/subcount') as {
    code: number;
    artistCount: number;
    createdPlaylistCount: number;
    subPlaylistCount: number;
  };
  return res;
}

export async function getLikelist(uid: number): Promise<number[]> {
  const res = await api.get('/likelist', { params: { uid } }) as {
    code: number;
    ids: number[];
  };
  return res.ids || [];
}

export async function likeSong(id: number, like = true) {
  const res = await api.get('/like', {
    params: { id, like },
  }) as { code: number };
  return res.code === 200;
}

export async function getUserLevel() {
  const res = await api.get('/user/level') as {
    code: number;
    data: {
      level: number;
      nextPlayCount: number;
      nextLoginCount: number;
      nowPlayCount: number;
      nowLoginCount: number;
    };
  };
  return res.data;
}

export interface DailySigninResult {
  success: boolean;
  code: number;
  point?: number;
  msg?: string;
  type: 'android' | 'web';
}

export async function dailySignin(type = 0): Promise<DailySigninResult> {
  const res = await api.get('/daily_signin', { params: { type } }) as {
    android?: { code: number; point?: number; msg?: string };
    web?: { code: number; point?: number; msg?: string };
  };

  const key = type === 1 ? 'web' : 'android';
  const item = res[key] || res.android || res.web || { code: -1 };

  return {
    success: item.code === 200,
    code: item.code,
    point: item.point,
    msg: item.msg,
    type: key,
  };
}

export async function getUserCloud(limit = 30, offset = 0) {
  const res = await api.get('/user/cloud', { params: { limit, offset } }) as {
    code: number;
    data: unknown[];
    count: number;
    size: string;
    maxSize: string;
  };
  return res;
}
