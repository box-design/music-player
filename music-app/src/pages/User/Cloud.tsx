import { Link } from 'react-router-dom';
import { Cloud as CloudIcon } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import api from '@/api';
import { getSongDetail } from '@/api/song';
import { useRequest } from '@/hooks/useRequest';
import { useUserStore } from '@/stores/useUserStore';
import SongList from '@/components/common/SongList';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import type { Song } from '@/types';

interface CloudItem {
  songId: number;
  simpleName?: string;
  fileName?: string;
  album?: string;
  artist?: string;
  songName?: string;
  bitrate?: number;
  size?: number;
  cover?: string;
}

export default function CloudPage() {
  const { t } = useI18n();
  const { isLoggedIn, userInfo } = useUserStore();

  const { data, loading } = useRequest(
    async () => {
      const res = (await api.get('/user/cloud', { params: { limit: 100, offset: 0 } })) as {
        code: number;
        data?: CloudItem[];
        count?: number;
      };
      const list = res.data || [];
      const ids = list.map((c) => c.songId).filter(Boolean);
      if (ids.length === 0) return [];
      const songs = await getSongDetail(ids);
      // preserve cloud order
      const map = new Map(songs.map((s) => [s.id, s]));
      return ids.map((id) => map.get(id)).filter(Boolean) as Song[];
    },
    { deps: [userInfo?.userId] }
  );

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-secondary mb-4">{t('user.loginToViewCloud')}</p>
        <Link
          to="/login"
          className="px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
        >
          {t('common.loginNow')}
        </Link>
      </div>
    );
  }

  if (loading) return <Loading className="py-20" />;

  const songs: Song[] = data || [];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <CloudIcon size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('user.myCloud')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('user.songsCount', { count: songs.length })}</p>
        </div>
      </div>

      {songs.length > 0 ? <SongList songs={songs} /> : <Empty text={t('user.noCloud')} />}
    </div>
  );
}
