import { useParams } from 'react-router-dom';
import { Play, Heart, Share2, Clock, Music2 } from 'lucide-react';
import { useRequest } from '@/hooks/useRequest';
import { useI18n } from '@/hooks/useI18n';
import { getPlaylistDetail, subscribePlaylist } from '@/api/playlist';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUserStore } from '@/stores/useUserStore';
import { getSongUrl, getLyric } from '@/api/song';
import { formatCount, getImageUrl } from '@/utils/format';
import SongList from '@/components/common/SongList';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import { useState } from 'react';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const playlistId = Number(id);
  const { t } = useI18n();
  const [isSubscribed, setIsSubscribed] = useState(false);
  // 只订阅稳定 actions：整 store 订阅会让页面随 currentTime(~4次/秒)重渲染，
  // 并级联重渲染未 memo 的 SongList（大歌单数百行 → 主线程被占死）。
  const setCurrentSong = usePlayerStore((s) => s.setCurrentSong);
  const setPlaylist = usePlayerStore((s) => s.setPlaylist);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setAudioUrl = usePlayerStore((s) => s.setAudioUrl);
  const setLyrics = usePlayerStore((s) => s.setLyrics);
  const { isLoggedIn, userInfo, upsertUserPlaylist } = useUserStore();

  const { data, loading } = useRequest(
    async () => {
      if (!playlistId) return null;
      const res = await getPlaylistDetail(playlistId);
      setIsSubscribed(res.playlist.subscribed || false);
      // 如果是自己创建的歌单，同步到侧边栏
      if (res.playlist.creator?.userId === userInfo?.userId) {
        upsertUserPlaylist(res.playlist);
      }
      return res;
    },
    { deps: [playlistId, userInfo?.userId] }
  );

  const handlePlayAll = async () => {
    if (!data?.songs.length) return;
    const firstSong = data.songs[0];
    const urlRes = await getSongUrl(firstSong.id);
    if (urlRes?.url) {
      setAudioUrl(urlRes.url);
      setCurrentSong(firstSong);
      setPlaylist(data.songs);
      setIsPlaying(true);
      const lyrics = await getLyric(firstSong.id);
      setLyrics(lyrics);
    }
  };

  const handleSubscribe = async () => {
    if (!isLoggedIn) return;
    const success = await subscribePlaylist(playlistId, isSubscribed ? 2 : 1);
    if (success) setIsSubscribed(!isSubscribed);
  };

  if (loading) return <Loading className="py-20" />;
  if (!data) return <Empty text={t('playlist.notFound')} />;

  const { playlist, songs } = data;

  return (
    <div>
      {/* 头部信息 */}
      <div className="flex gap-6 mb-8">
        <img
          src={getImageUrl(playlist.coverImgUrl, 300)}
          alt={playlist.name}
          className="w-52 h-52 rounded-xl object-cover shadow-lg flex-shrink-0"
        />
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">{playlist.name}</h1>
          {playlist.creator && (
            <div className="flex items-center gap-2 mb-4">
              <img
                src={getImageUrl(playlist.creator.avatarUrl, 80)}
                alt={playlist.creator.nickname}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-text-secondary">{playlist.creator.nickname}</span>
            </div>
          )}
          {playlist.tags && playlist.tags.length > 0 && (
            <div className="flex gap-2 mb-3">
              {playlist.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-surface rounded-full text-text-secondary">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-text-secondary line-clamp-2 mb-4">{playlist.description}</p>
          <div className="flex items-center gap-4 text-sm text-text-tertiary mb-5">
            <span className="flex items-center gap-1">
              <Music2 size={14} /> {playlist.trackCount} {t('common.songs_unit')}
            </span>
            <span className="flex items-center gap-1">
              <Play size={14} /> {formatCount(playlist.playCount)} {t('playlist.playCount')}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
            >
              <Play size={18} fill="white" /> {t('common.playAll')}
            </button>
            <button
              onClick={handleSubscribe}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-colors ${
                isSubscribed
                  ? 'border-primary text-primary'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <Heart size={16} fill={isSubscribed ? 'currentColor' : 'none'} /> {isSubscribed ? t('common.collected') : t('common.collect')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-text-secondary hover:text-text-primary transition-colors">
              <Share2 size={16} /> {t('common.share')}
            </button>
          </div>
        </div>
      </div>

      {/* 歌曲列表 */}
      {songs.length > 0 ? (
        <SongList songs={songs} />
      ) : (
        <Empty text={t('playlist.noSongs')} />
      )}
    </div>
  );
}
