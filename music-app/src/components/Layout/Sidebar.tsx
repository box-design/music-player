import { useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Radio,
  Disc3,
  ListMusic,
  Clock,
  Cloud,
  Mic2,
  Trophy,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUserStore } from '@/stores/useUserStore';
import { getUserPlaylist } from '@/api/user';
import { getImageUrl } from '@/utils/format';
import SettingsModal from '@/components/SettingsModal';

export default function Sidebar() {
  const { t } = useI18n();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { isLoggedIn, userInfo, userPlaylists, setUserPlaylists } = useUserStore();
  const [myMusicOpen, setMyMusicOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const mainNav = [
    { label: t('sidebar.discoverMusic'), icon: Home, path: '/' },
    { label: t('sidebar.privateFM'), icon: Radio, path: '/fm' },
    { label: t('sidebar.leaderboard'), icon: Trophy, path: '/toplist' },
  ];

  const myMusicNav = [
    { label: t('sidebar.recentPlay'), icon: Clock, path: '/user/record' },
    { label: t('sidebar.myCloud'), icon: Cloud, path: '/user/cloud' },
  ];

  // 登录后自动加载用户歌单，确保侧边栏能显示创建/收藏的歌单
  useEffect(() => {
    if (!isLoggedIn || !userInfo?.userId) return;
    let cancelled = false;
    getUserPlaylist(userInfo.userId).then((res) => {
      if (!cancelled) {
        setUserPlaylists(res.playlist);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userInfo?.userId, setUserPlaylists]);

  const createdPlaylists = userPlaylists.filter((p) => p.creator?.userId === userInfo?.userId);
  const collectedPlaylists = userPlaylists.filter((p) => p.creator?.userId !== userInfo?.userId);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`flex-shrink-0 h-screen bg-background-secondary border-r border-border flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-[clamp(200px,16vw,280px)]'
      }`}
    >
      {/* 上部用户信息 */}
      <div className="border-b border-border p-3 relative">
        {/* Settings button — top right */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`absolute top-3 w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors ${
            sidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-3'
          }`}
          title={t('sidebar.settings')}
        >
          <Settings size={16} />
        </button>
        {isLoggedIn && userInfo ? (
          <Link
            to="/user"
            className={`flex items-center gap-2 hover:bg-surface-hover rounded-lg p-1.5 transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <img
              src={getImageUrl(userInfo.avatarUrl, 80)}
              alt={userInfo.nickname}
              className="w-8 h-8 rounded-full"
            />
            {!sidebarCollapsed && (
              <span className="text-sm text-text-primary truncate">{userInfo.nickname}</span>
            )}
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex items-center gap-2 hover:bg-surface-hover rounded-lg p-1.5 transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogIn size={20} className="text-text-secondary" />
            {!sidebarCollapsed && <span className="text-sm text-text-secondary">{t('common.login')}</span>}
          </Link>
        )}
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-2 space-y-1">
          {mainNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* 我的音乐 */}
        {!sidebarCollapsed && (
          <div className="mt-6">
            <button
              onClick={() => setMyMusicOpen(!myMusicOpen)}
              className="flex items-center gap-2 px-4 mb-2 text-xs text-text-tertiary uppercase tracking-wider"
            >
              <span>{t('sidebar.myMusic')}</span>
            </button>

            {myMusicOpen && (
              <div className="px-2 space-y-1">
                {myMusicNav.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}

                {/* 创建的歌单 */}
                {createdPlaylists.length > 0 && (
                  <div className="mt-4">
                    <p className="px-3 mb-1 text-xs text-text-tertiary">{t('sidebar.createdPlaylists')}</p>
                    {createdPlaylists.map((playlist) => (
                      <Link
                        key={playlist.id}
                        to={`/playlist/${playlist.id}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          location.pathname === `/playlist/${playlist.id}`
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                        }`}
                      >
                        <ListMusic size={16} />
                        <span className="text-sm truncate">{playlist.name}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* 收藏的歌单 */}
                {collectedPlaylists.length > 0 && (
                  <div className="mt-2">
                    <p className="px-3 mb-1 text-xs text-text-tertiary">{t('sidebar.collectedPlaylists')}</p>
                    {collectedPlaylists.map((playlist) => (
                      <Link
                        key={playlist.id}
                        to={`/playlist/${playlist.id}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          location.pathname === `/playlist/${playlist.id}`
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                        }`}
                      >
                        <Disc3 size={16} />
                        <span className="text-sm truncate">{playlist.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 折叠状态下显示图标 */}
        {sidebarCollapsed && (
          <div className="px-2 space-y-1 mt-4">
            {myMusicNav.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
                title={item.label}
              >
                <item.icon size={20} />
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* 折叠按钮 */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-background-secondary border border-border rounded-full flex items-center justify-center hover:bg-surface-hover transition-colors shadow-sm"
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      {/* Settings modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </aside>
  );
}
