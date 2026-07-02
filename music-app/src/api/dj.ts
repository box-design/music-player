import api from './index';

export async function getDjRecommend() {
  const res = await api.get('/dj/recommend') as {
    code: number;
    djRadios: {
      id: number;
      name: string;
      picUrl: string;
      dj: { userId: number; nickname: string; avatarUrl: string };
      subCount: number;
      programCount: number;
      desc: string;
    }[];
  };
  return res.djRadios || [];
}

export async function getDjCatelist() {
  const res = await api.get('/dj/catelist') as {
    code: number;
    categories: { id: number; name: string }[];
  };
  return res.categories || [];
}

export async function getDjHot(limit = 30, offset = 0) {
  const res = await api.get('/dj/hot', {
    params: { limit, offset },
  }) as {
    code: number;
    djRadios: {
      id: number;
      name: string;
      picUrl: string;
      dj: { userId: number; nickname: string; avatarUrl: string };
      subCount: number;
      programCount: number;
      desc: string;
    }[];
    hasMore: boolean;
  };
  return res;
}

export async function getDjPersonalizeRecommend(limit = 6) {
  const res = await api.get('/dj/personalize/recommend', {
    params: { limit },
  }) as {
    code: number;
    data: {
      id: number;
      name: string;
      picUrl: string;
      dj: { userId: number; nickname: string; avatarUrl: string };
    }[];
  };
  return res.data || [];
}
