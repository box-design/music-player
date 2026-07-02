import api from './index';
import type { Comment } from '@/types';

export async function getComments(
  id: number,
  type: 'music' | 'playlist' | 'album' | 'dj' = 'music',
  limit = 20,
  offset = 0,
  before?: number
) {
  const typeMap = {
    music: 0,
    playlist: 2,
    album: 3,
    dj: 4,
  };

  const res = await api.get('/comment/new', {
    params: {
      type: typeMap[type],
      id,
      pageNo: Math.floor(offset / limit) + 1,
      pageSize: limit,
      sortType: 3,
      cursor: before,
    },
  }) as {
    code: number;
    data: {
      comments: Comment[];
      totalCount: number;
      hasMore: boolean;
      cursor?: number;
    };
  };
  return res.data;
}

export async function getHotComments(
  id: number,
  type: 'music' | 'playlist' | 'album' = 'music',
  limit = 20
) {
  const typeMap = {
    music: 0,
    playlist: 2,
    album: 3,
  };

  const res = await api.get('/comment/hot', {
    params: {
      type: typeMap[type],
      id,
      limit,
    },
  }) as {
    code: number;
    hotComments: Comment[];
    hasMore: boolean;
  };
  return res;
}
