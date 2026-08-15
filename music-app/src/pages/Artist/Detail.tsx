import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Heart, UserPlus } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getArtistDetail, getArtistSongs, getArtistAlbums } from '@/api/artist';
import { getSongUrl, getLyric } from '@/api/song';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatCount, getImageUrl } from '@/utils/format';
import SongList from '@/components/common/SongList';
import AlbumCard from '@/components/common/AlbumCard';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';

type Tab = 'songs' | 'albums';

export default function ArtistDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const artistId = Number(id);
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  // 只订阅稳定 actions：整 store 订阅会让页面随 currentTime(~4次/秒)重渲染，
  // 并级联重渲染未 memo 的 SongList（大歌单数百行 → 主线程被占死）。
  const setCurrentSong = usePlayerStore((s) => s.setCurrentSong);
  const setPlaylist = usePlayerStore((s) => s.setPlaylist);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setAudioUrl = usePlayerStore((s) => s.setAudioUrl);
  const setLyrics = usePlayerStore((s) => s.setLyrics);

  const { data: artist, loading: artistLoading } = useRequest(
    async () => {
      if (!artistId) return null;
      return getArtistDetail(artistId);
    },
    { deps: [artistId] }
  );

  const { data: songsData, loading: songsLoading } = useRequest(
    async () => {
      if (!artistId) return null;
      return getArtistSongs(artistId, 'hot', 50);
    },
    { deps: [artistId] }
  );

  const { data: albumsData, loading: albumsLoading } = useRequest(
    async () => {
      if (!artistId || activeTab !== 'albums') return null;
      return getArtistAlbums(artistId, 30);
    },
    { deps: [artistId, activeTab] }
  );

  const handlePlayAll = async () => {
    if (!songsData?.songs.length) return;
    const firstSong = songsData.songs[0];
    const urlRes = await getSongUrl(firstSong.id);
    if (urlRes?.url) {
      setAudioUrl(urlRes.url);
      setCurrentSong(firstSong);
      setPlaylist(songsData.songs);
      setIsPlaying(true);
      const lyrics = await getLyric(firstSong.id);
      setLyrics(lyrics);
    }
  };

  if (artistLoading) return <Loading className="py-20" />;
  if (!artist) return <Empty text={t('artistDetail.notFound')} />;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'songs', label: `${t('artistDetail.hotWorks')} (${artist.musicSize || 0})` },
    { key: 'albums', label: `${t('artistDetail.albums')} (${artist.albumSize || 0})` },
  ];

  return (
    <div>
      {/* 头部信息 */}
      <div className="flex gap-6 mb-8">
        <img
          src={getImageUrl(artist.picUrl, 300)}
          alt={artist.name}
          className="w-44 h-44 rounded-full object-cover shadow-lg flex-shrink-0"
        />
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-text-primary mb-3">{artist.name}</h1>
          {artist.alias && artist.alias.length > 0 && (
            <p className="text-sm text-text-tertiary mb-3">{artist.alias.join(' / ')}</p>
          )}
          <p className="text-sm text-text-secondary line-clamp-2 mb-4">{artist.briefDesc}</p>
          <div className="flex items-center gap-6 text-sm text-text-tertiary mb-5">
            <span>{t('artistDetail.songs')}: {artist.musicSize}</span>
            <span>{t('artistDetail.albums')}: {artist.albumSize}</span>
            {artist.fansCount !== undefined && <span>{t('artistDetail.fans')}: {formatCount(artist.fansCount)}</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
            >
              <Play size={18} fill="white" /> {t('artistDetail.playHot')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-text-secondary hover:text-text-primary transition-colors">
              <Heart size={16} /> {t('common.follow')}
            </button>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-6 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      {activeTab === 'songs' && (
        songsLoading ? <Loading /> :
        songsData?.songs.length ? <SongList songs={songsData.songs} /> : <Empty text={t('artistDetail.noSongs')} />
      )}
      {activeTab === 'albums' && (
        albumsLoading ? <Loading /> :
        albumsData?.albums.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {albumsData.albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        ) : <Empty text={t('artistDetail.noAlbums')} />
      )}
    </div>
  );
}
