import { useState, useCallback } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useRequest } from '@/hooks/useRequest';
import { getArtistList } from '@/api/artist';
import ArtistCard from '@/components/common/ArtistCard';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import { ARTIST_CATEGORIES } from '@/utils/constants';

export default function ArtistList() {
  const { t } = useI18n();
  const [area, setArea] = useState(-1);
  const [offset, setOffset] = useState(0);

  const categoryLabels: Record<number, string> = {
    [-1]: t('artistList.all'),
    [7]: t('artistList.chinese'),
    [96]: t('artistList.western'),
    [8]: t('artistList.japan'),
    [16]: t('artistList.korea'),
  };

  const { data, loading } = useRequest(
    async () => getArtistList(area, -1, '-1', 30, offset),
    { deps: [area, offset] }
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t('artistList.title')}</h1>

      {/* 地区筛选 */}
      <div className="flex gap-2 mb-6">
        {ARTIST_CATEGORIES.map((cat) => (
          <button
            key={cat.area}
            onClick={() => { setArea(cat.area); setOffset(0); }}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              area === cat.area
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            {categoryLabels[cat.area]}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading className="py-20" />
      ) : data?.artists.length ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5">
          {data.artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <Empty text={t('artistList.noArtists')} />
      )}

      {/* 分页 */}
      {data?.more && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setOffset((prev) => prev + 30)}
            className="px-6 py-2 bg-surface rounded-full text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {t('common.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
