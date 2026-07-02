import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getPlaylistDetail } from '@/api/playlist';
import { getUserPlaylist } from '@/api/user';
import { useUserStore } from '@/stores/useUserStore';
import SongList from '@/components/common/SongList';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import type { Song } from '@/types';

const LIKED_PLAYLIST_NAME = '我喜欢的音乐';

export default function LikedMusic() {
  const { t } = useI18n();
  const { isLoggedIn, userInfo } = useUserStore();

  const { data, loading } = useRequest(
    async () => {
      if (!userInfo?.userId) return null;
      const res = await getUserPlaylist(userInfo.userId, 100, 0);
      const liked = (res.playlist || []).find((p: { name: string }) => p.name === LIKED_PLAYLIST_NAME);
      if (!liked) return { playlist: null, songs: [] as Song[] };
      const detail = await getPlaylistDetail(liked.id);
      return { playlist: detail.playlist, songs: detail.songs };
    },
    { deps: [userInfo?.userId] }
  );

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-secondary mb-4">{t('user.loginToViewLiked')}</p>
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

  if (!data?.playlist) {
    return <Empty text={t('user.likedNotFound')} />;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Heart size={28} className="text-primary" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('user.likedMusic')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('user.songsCount', { count: data.songs.length })}</p>
        </div>
      </div>

      {data.songs.length > 0 ? (
        <SongList songs={data.songs} />
      ) : (
        <Empty text={t('user.noLiked')} />
      )}
    </div>
  );
}
