import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@/types';

interface BannerCarouselProps {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) index = banners.length - 1;
      if (index >= banners.length) index = 0;
      setCurrent(index);
    },
    [banners.length]
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;
    const timer = setInterval(goNext, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, goNext, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden group"
      style={{ aspectRatio: '2.8/1' }}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* 图片 */}
      <div className="relative w-full h-full">
        {banners.map((banner, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-700 ${
              index === current
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
            }`}
          >
            <img
              src={banner.imageUrl}
              alt={banner.typeTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* 标题标签 */}
      <div className="absolute bottom-4 left-4 bg-primary text-white text-xs px-2 py-1 rounded">
        {banners[current]?.typeTitle}
      </div>

      {/* 左右箭头 */}
      <button
        onClick={goPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={goNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
      >
        <ChevronRight size={20} />
      </button>

      {/* 指示器 */}
      <div className="absolute bottom-4 right-4 flex gap-1.5">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === current
                ? 'w-6 bg-white'
                : 'w-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
