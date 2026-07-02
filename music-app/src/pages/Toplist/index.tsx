import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getToplistDetail } from '@/api/toplist';
import { formatCount, getImageUrl } from '@/utils/format';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import { Play } from 'lucide-react';

export default function ToplistPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: toplists, loading } = useRequest(getToplistDetail);

  if (loading) return <Loading className="py-20" />;
  if (!toplists?.length) return <Empty text={t('toplist.noData')} />;

  // 分离官方榜和全球榜
  const officialList = toplists.filter((t) =>
    ['飙升榜', '新歌榜', '热歌榜', '原创榜', '云音乐国电榜', '潜力爆款榜'].includes(t.name)
  );
  const globalList = toplists.filter((t) => !officialList.includes(t));

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t('toplist.title')}</h1>

      {/* 官方榜 */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-text-primary mb-4">{t('toplist.official')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {officialList.map((toplist) => (
            <ToplistCard key={toplist.id} toplist={toplist} onClick={() => navigate(`/playlist/${toplist.id}`)} />
          ))}
        </div>
      </section>

      {/* 全球榜 */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">{t('toplist.global')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {globalList.map((toplist) => (
            <div
              key={toplist.id}
              onClick={() => navigate(`/playlist/${toplist.id}`)}
              className="cursor-pointer group"
            >
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={getImageUrl(toplist.coverImgUrl, 300)}
                  alt={toplist.name}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-white text-xs bg-black/40 rounded-full px-2 py-0.5">
                  <Play size={10} fill="white" />
                  <span>{formatCount(toplist.playCount)}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
                {toplist.name}
              </p>
              <p className="text-xs text-text-tertiary">{toplist.updateFrequency}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToplistCard({
  toplist,
  onClick,
}: {
  toplist: { id: number; name: string; coverImgUrl: string; tracks?: { first: string; second: string }[]; updateFrequency: string };
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex gap-4 bg-surface rounded-xl p-4 cursor-pointer hover:bg-surface-hover transition-colors"
    >
      <div className="relative flex-shrink-0">
        <img
          src={getImageUrl(toplist.coverImgUrl, 200)}
          alt={toplist.name}
          className="w-28 h-28 rounded-lg object-cover"
        />
        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play size={24} className="text-white" fill="white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-text-primary mb-2">{toplist.name}</h3>
        <p className="text-xs text-text-tertiary mb-3">{toplist.updateFrequency}</p>
        <div className="space-y-1.5">
          {toplist.tracks?.slice(0, 5).map((track, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className={`w-4 text-center text-xs font-bold ${index < 3 ? 'text-primary' : 'text-text-tertiary'}`}>
                {index + 1}
              </span>
              <span className="text-text-primary truncate flex-1">{track.first}</span>
              <span className="text-text-tertiary truncate text-xs">{track.second}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
