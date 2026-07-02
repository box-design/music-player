import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getUserRecord } from '@/api/user';
import { normalizeSong } from '@/api/song';
import { useUserStore } from '@/stores/useUserStore';
import SongList from '@/components/common/SongList';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import type { Song } from '@/types';

export default function Record() {
  const { t } = useI18n();
  const { isLoggedIn, userInfo } = useUserStore();

  const { data, loading } = useRequest(
    async () => {
      if (!userInfo?.userId) return null;
      const res = await getUserRecord(userInfo.userId, 1);
      const week = (res.weekData || []) as Array<{ song: unknown; score: number }>;
      return week
        .map((item) => normalizeSong(item.song))
        .filter((s) => s.id);
    },
    { deps: [userInfo?.userId] }
  );

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-secondary mb-4">{t('user.loginToViewRecent')}</p>
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
          <Clock size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('user.recentPlay')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('user.songsCount', { count: songs.length })}</p>
        </div>
      </div>

      {songs.length > 0 ? <SongList songs={songs} /> : <Empty text={t('user.noRecent')} />}
    </div>
  );
}
