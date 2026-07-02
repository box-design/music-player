import { Calendar } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getRecommendSongs } from '@/api/recommend';
import SongList from '@/components/common/SongList';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getSongUrl, getLyric } from '@/api/song';

export default function DailyRecommend() {
  const { t } = useI18n();
  const { data: songs, loading } = useRequest(getRecommendSongs);
  const { setCurrentSong, setPlaylist, setIsPlaying, setAudioUrl, setLyrics } = usePlayerStore();

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;

  const handlePlayAll = async () => {
    if (!songs?.length) return;
    const firstSong = songs[0];
    const urlRes = await getSongUrl(firstSong.id);
    if (urlRes?.url) {
      setAudioUrl(urlRes.url);
      setCurrentSong(firstSong);
      setPlaylist(songs);
      setIsPlaying(true);
      const lyrics = await getLyric(firstSong.id);
      setLyrics(lyrics);
    }
  };

  if (loading) return <Loading className="py-20" />;
  if (!songs?.length) return <Empty text={t('dailyRecommend.noData')} />;

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-28 h-28 rounded-xl bg-primary flex flex-col items-center justify-center text-white shadow-lg flex-shrink-0">
          <Calendar size={24} className="mb-1" />
          <span className="text-3xl font-bold">{day}</span>
          <span className="text-sm opacity-80">{month}{t('dailyRecommend.month')}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{t('dailyRecommend.title')}</h1>
          <p className="text-sm text-text-secondary">{t('dailyRecommend.description')}</p>
        </div>
      </div>

      <SongList songs={songs} />
    </div>
  );
}
