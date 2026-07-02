import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Music2, Heart, Clock, Cloud, LogOut } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getUserDetail, getUserPlaylist, getUserRecord } from '@/api/user';
import { getLoginStatus, logout as logoutApi } from '@/api/login';
import { useUserStore } from '@/stores/useUserStore';
import { storage } from '@/utils/storage';
import { formatCount, formatDate, getImageUrl } from '@/utils/format';
import PlaylistCard from '@/components/common/PlaylistCard';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';

export default function UserProfile() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { userInfo, isLoggedIn, setUserInfo, setUserPlaylists, userPlaylists, logout: logoutStore } = useUserStore();

  const handleLogout = async () => {
    await logoutApi();
    storage.remove('cookie');
    logoutStore();
    navigate('/');
  };

  useRequest(
    async () => {
      if (!isLoggedIn) return null;
      const status = await getLoginStatus();
      const uid = status.profile?.userId ?? status.account?.id ?? userInfo?.userId;
      if (!uid) return null;
      const detail = await getUserDetail(uid);
      setUserInfo(detail);
      return detail;
    },
    { deps: [isLoggedIn] }
  );

  const userId = userInfo?.userId;

  const { data: playlistsData, loading: playlistsLoading } = useRequest(
    async () => {
      if (!userId) return null;
      const res = await getUserPlaylist(userId);
      setUserPlaylists(res.playlist);
      return res;
    },
    { deps: [userId] }
  );

  const { data: recordData } = useRequest(
    async () => {
      if (!userId) return null;
      return getUserRecord(userId, 1);
    },
    { deps: [userId] }
  );

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-text-secondary mb-4">{t('user.loginToView')}</p>
        <Link
          to="/login"
          className="px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
        >
          {t('common.loginNow')}
        </Link>
      </div>
    );
  }

  if (!userInfo) return <Loading className="py-20" />;

  const createdPlaylists = userPlaylists.filter((p) => p.creator?.userId === userInfo.userId);
  const collectedPlaylists = userPlaylists.filter((p) => p.creator?.userId !== userInfo.userId);

  return (
    <div>
      {/* 用户信息 */}
      <div className="flex items-center gap-6 mb-8">
        <img
          src={getImageUrl(userInfo.avatarUrl, 200)}
          alt={userInfo.nickname}
          className="w-24 h-24 rounded-full object-cover shadow-lg flex-shrink-0"
        />
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{userInfo.nickname}</h1>
          <p className="text-sm text-text-secondary mb-3">{userInfo.signature || t('user.bioEmpty')}</p>
          <div className="flex items-center gap-4 text-sm text-text-tertiary mb-3">
            <span>{t('user.following')}: {formatCount(userInfo.follows || 0)}</span>
            <span>{t('user.followers')}: {formatCount(userInfo.followeds || 0)}</span>
            <span>{t('user.level')}: Lv.{userInfo.level || 0}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={14} />
            {t('common.logout')}
          </button>
        </div>
      </div>

      {/* 创建的歌单 */}
      {createdPlaylists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">{t('user.myPlaylists')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {createdPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      {/* 收藏的歌单 */}
      {collectedPlaylists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">{t('sidebar.collectedPlaylists')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {collectedPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      {/* 播放记录 */}
      {recordData?.weekData && recordData.weekData.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-4">{t('user.weeklyPlay')}</h2>
          <div className="bg-surface rounded-xl p-4">
            <p className="text-text-secondary">{t('user.weeklyPlayCount', { count: recordData.weekData.length })}</p>
          </div>
        </section>
      )}
    </div>
  );
}
