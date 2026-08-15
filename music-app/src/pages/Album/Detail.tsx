import { useParams } from 'react-router-dom';
import { Play, Heart, Share2 } from 'lucide-react';
import { useRequest } from '@/hooks/useRequest';
import { useI18n } from '@/hooks/useI18n';
import { getAlbumDetail } from '@/api/album';
import { getSongUrl, getLyric } from '@/api/song';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatDate, getImageUrl } from '@/utils/format';
import SongList from '@/components/common/SongList';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const albumId = Number(id);
  const { t } = useI18n();
  // 只订阅稳定 actions：整 store 订阅会让页面随 currentTime(~4次/秒)重渲染，
  // 并级联重渲染未 memo 的 SongList（大歌单数百行 → 主线程被占死）。
  const setCurrentSong = usePlayerStore((s) => s.setCurrentSong);
  const setPlaylist = usePlayerStore((s) => s.setPlaylist);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setAudioUrl = usePlayerStore((s) => s.setAudioUrl);
  const setLyrics = usePlayerStore((s) => s.setLyrics);

  const { data, loading } = useRequest(
    async () => {
      if (!albumId) return null;
      return getAlbumDetail(albumId);
    },
    { deps: [albumId] }
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

  if (loading) return <Loading className="py-20" />;
  if (!data) return <Empty text={t('albumDetail.notFound')} />;

  const { album, songs } = data;

  return (
    <div>
      <div className="flex gap-6 mb-8">
        <img
          src={getImageUrl(album.picUrl, 300)}
          alt={album.name}
          className="w-52 h-52 rounded-xl object-cover shadow-lg flex-shrink-0"
        />
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">{t('albumDetail.album')}</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{album.name}</h1>
          <p className="text-sm text-text-secondary mb-2">
            {t('albumDetail.artist')}: <span className="text-primary">{album.artist?.name}</span>
          </p>
          <p className="text-sm text-text-tertiary mb-1">
            {t('albumDetail.publishTime')}: {album.publishTime ? formatDate(album.publishTime) : t('common.unknown')}
          </p>
          <p className="text-sm text-text-tertiary mb-4">{t('albumDetail.songCount')}: {album.size || songs.length} {t('common.songs_unit')}</p>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
            >
              <Play size={18} fill="white" /> {t('common.playAll')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-text-secondary hover:text-text-primary transition-colors">
              <Heart size={16} /> {t('common.collect')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-text-secondary hover:text-text-primary transition-colors">
              <Share2 size={16} /> {t('common.share')}
            </button>
          </div>
        </div>
      </div>

      {songs.length > 0 ? (
        <SongList songs={songs} />
      ) : (
        <Empty text={t('albumDetail.noSongs')} />
      )}
    </div>
  );
}
