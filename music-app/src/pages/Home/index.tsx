import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useRequest } from '@/hooks/useRequest';
import { useI18n } from '@/hooks/useI18n';
import { getPersonalized, getPersonalizedNewsong, getRecommendSongs } from '@/api/recommend';
import { getAlbumNewest } from '@/api/album';
import { getTopArtists } from '@/api/artist';
import { getToplistDetail } from '@/api/toplist';
import PlaylistCard from '@/components/common/PlaylistCard';
import AlbumCard from '@/components/common/AlbumCard';
import ArtistCard from '@/components/common/ArtistCard';
import SongList from '@/components/common/SongList';
import GlassCard from '@/components/common/GlassCard';
import Loading from '@/components/common/Loading';
import GreetingTypewriter from '@/components/home/GreetingTypewriter';
import RadarCoverStack from '@/components/home/RadarCoverStack';
import { useAppStore } from '@/stores/useAppStore';

function SectionHeader({ title, moreLink, onMore }: { title: string; moreLink?: string; onMore?: () => void }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      {(moreLink || onMore) && (
        <button
          onClick={() => moreLink ? navigate(moreLink) : onMore?.()}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
        >
          {t('common.more')} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const enableGlassmorphism = useAppStore((s) => s.enableGlassmorphism);

  const { data: playlists, loading: playlistsLoading } = useRequest(() => getPersonalized(10));
  const { data: newSongs, loading: newSongsLoading } = useRequest(() => getPersonalizedNewsong(12));
  const { data: newAlbums, loading: albumsLoading } = useRequest(getAlbumNewest);
  const { data: topArtists, loading: artistsLoading } = useRequest(() => getTopArtists(10));
  const { data: toplists, loading: toplistsLoading } = useRequest(getToplistDetail);
  const { data: radarSongs, loading: radarLoading } = useRequest(async () => {
    const songs = await getRecommendSongs();
    return songs.slice(0, 5);
  });

  const isLoading = playlistsLoading || newSongsLoading || albumsLoading || artistsLoading || toplistsLoading || radarLoading;

  if (isLoading) {
    return <Loading className="py-20" />;
  }

  return (
    <div className="space-y-10">
      {/* 顶部欢迎区 + 私人雷达封面 */}
      <section className="relative min-h-[220px] sm:min-h-[260px] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
        <div className="relative grid grid-cols-1 sm:grid-cols-[minmax(0,400px)_auto] items-center gap-8 sm:gap-12 p-4 sm:p-6">
          <div className="min-w-0">
            <GreetingTypewriter />
          </div>
          <div className="w-full sm:w-auto flex sm:block justify-center">
            <RadarCoverStack songs={radarSongs || []} />
          </div>
        </div>
      </section>

      {/* 推荐歌单 */}
      {playlists && playlists.length > 0 && (
        <section>
          <SectionHeader title={t('home.recommendedPlaylists')} moreLink="/toplist" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      {/* 最新专辑 */}
      {newAlbums && newAlbums.length > 0 && (
        <section>
          <SectionHeader title={t('home.newAlbums')} moreLink="/toplist" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {newAlbums.slice(0, 6).map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {/* 最新音乐 */}
      {newSongs && newSongs.length > 0 && (
        <section>
          <SectionHeader title={t('home.newestMusic')} />
          {enableGlassmorphism ? (
            <GlassCard enable3D={false} className="p-4" rounded="rounded-xl">
              <SongList songs={newSongs.slice(0, 10)} showHeader={false} />
            </GlassCard>
          ) : (
            <div className="bg-surface rounded-xl p-4">
              <SongList songs={newSongs.slice(0, 10)} showHeader={false} />
            </div>
          )}
        </section>
      )}

      {/* 热门歌手 */}
      {topArtists && topArtists.length > 0 && (
        <section>
          <SectionHeader title={t('home.hotArtists')} moreLink="/artist/list" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-5">
            {topArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {/* 排行榜 */}
      {toplists && toplists.length > 0 && (
        <section>
          <SectionHeader title={t('sidebar.leaderboard')} moreLink="/toplist" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {toplists.slice(0, 3).map((toplist) => {
              const content = (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={toplist.coverImgUrl}
                      alt={toplist.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-text-primary">{toplist.name}</h3>
                      <p className="text-xs text-text-tertiary">{toplist.updateFrequency}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {toplist.tracks?.slice(0, 5).map((track, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <span className={`w-5 text-center font-bold ${index < 3 ? 'text-primary' : 'text-text-tertiary'}`}>
                          {index + 1}
                        </span>
                        <span className="text-text-primary truncate flex-1">{track.first}</span>
                        <span className="text-text-tertiary truncate">{track.second}</span>
                      </div>
                    ))}
                  </div>
                </>
              );

              return enableGlassmorphism ? (
                <GlassCard
                  key={toplist.id}
                  className="p-5"
                  rounded="rounded-xl"
                  onClick={() => navigate(`/playlist/${toplist.id}`)}
                >
                  {content}
                </GlassCard>
              ) : (
                <div
                  key={toplist.id}
                  onClick={() => navigate(`/playlist/${toplist.id}`)}
                  className="bg-surface rounded-xl p-5 cursor-pointer hover:bg-surface-hover transition-colors"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
