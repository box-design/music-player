import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, User, Disc3, ListMusic } from 'lucide-react';
import { search } from '@/api/search';
import { useI18n } from '@/hooks/useI18n';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getSongUrl, getLyric } from '@/api/song';
import SongList from '@/components/common/SongList';
import PlaylistCard from '@/components/common/PlaylistCard';
import AlbumCard from '@/components/common/AlbumCard';
import ArtistCard from '@/components/common/ArtistCard';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import type { Song, Artist, Album, Playlist } from '@/types';

export default function SearchPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const keywords = searchParams.get('keywords') || '';
  const [activeTab, setActiveTab] = useState('song');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    songs?: Song[];
    artists?: Artist[];
    albums?: Album[];
    playlists?: Playlist[];
  }>({});

  const tabs = [
    { key: 'song', label: t('common.song'), icon: SearchIcon, type: 1 },
    { key: 'artist', label: t('common.artist'), icon: User, type: 100 },
    { key: 'album', label: t('common.album'), icon: Disc3, type: 10 },
    { key: 'playlist', label: t('common.playlist'), icon: ListMusic, type: 1000 },
  ];

  const fetchResults = useCallback(async () => {
    if (!keywords) return;
    setLoading(true);
    try {
      const tab = tabs.find((t) => t.key === activeTab);
      const res = await search(keywords, tab?.type || 1, 50);
      setResults(res.result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [keywords, activeTab]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const renderContent = () => {
    if (loading) return <Loading className="py-20" />;

    switch (activeTab) {
      case 'song':
        return results.songs?.length ? (
          <SongList songs={results.songs} />
        ) : (
          <Empty text={t('searchPage.noRelatedSong')} />
        );
      case 'artist':
        return results.artists?.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5">
            {results.artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : (
          <Empty text={t('searchPage.noRelatedArtist')} />
        );
      case 'album':
        return results.albums?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {results.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <Empty text={t('searchPage.noRelatedAlbum')} />
        );
      case 'playlist':
        return results.playlists?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {results.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <Empty text={t('searchPage.noRelatedPlaylist')} />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        {keywords ? `"${keywords}" ${t('searchPage.searchResult')}` : t('searchPage.title')}
      </h1>

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

      {renderContent()}
    </div>
  );
}
