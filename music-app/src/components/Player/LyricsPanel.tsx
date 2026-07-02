import { useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useI18n } from '@/hooks/useI18n';

export default function LyricsPanel() {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lyrics, currentLyricIndex } = usePlayerStore();

  // 自动滚动到当前歌词行
  useEffect(() => {
    if (!scrollRef.current || currentLyricIndex < 0) return;
    const container = scrollRef.current;
    const activeLine = container.children[currentLyricIndex] as HTMLElement | undefined;
    if (activeLine) {
      // 计算目标位置：让当前行在容器垂直中央
      const targetTop =
        activeLine.offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2;
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [currentLyricIndex]);

  return (
    <div className="relative h-full flex flex-col">
      {/* 标题 */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          {t('player.lyrics')}
        </p>
      </div>

      {/* 歌词滚动区域 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 顶部渐隐遮罩 */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />

        {/* 歌词列表 */}
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-6 py-20 space-y-1 scroll-smooth"
          style={{
            scrollbarWidth: 'none',
          }}
        >
          {lyrics.length > 0 ? (
            lyrics.map((line, index) => {
              const isActive = index === currentLyricIndex;
              const isPast = index < currentLyricIndex;
              return (
                <p
                  key={index}
                  className={[
                    'lyric-line leading-relaxed transition-all duration-500 ease-out cursor-default select-none',
                    isActive
                      ? 'text-white text-lg font-bold scale-[1.02] origin-left'
                      : isPast
                      ? 'text-white/25 text-base'
                      : 'text-white/45 text-base',
                  ].join(' ')}
                >
                  {line.text}
                </p>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/30 text-sm">{t('player.noLyrics')}</p>
            </div>
          )}
        </div>

        {/* 底部渐隐遮罩 */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
}
