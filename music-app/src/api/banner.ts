import api from './index';
import type { Banner } from '@/types';

export async function getBanners(type = 0): Promise<Banner[]> {
  const res = await api.get('/banner', { params: { type } }) as { code: number; banners: Banner[] };
  return res.banners || [];
}
