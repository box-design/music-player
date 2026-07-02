/**
 * SongInfoCard —— 碎裂声纹可视化播放器左上角的歌曲信息卡。
 *
 * 粗野主义美学：
 * - 收起态：歌名 / 歌手纯文字 + 黄色「●」播放指示，无衬线窄体大写。
 * - 悬浮/点击 → 展开为黑底直角面板，黄方块硬阴影、断裂边、缺角裁切。
 *   内含小封面 + 完整 PlayerControls（进度 / 播放 / 上下首 / 模式 / 音量）。
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getImageUrl } from '@/utils/format';
import PlayerControls from './PlayerControls';

export default function SongInfoCard() {
  const { currentSong, isPlaying } = usePlayerStore();
  const [expanded, setExpanded] = useState(false);

  if (!currentSong) return null;

  const coverUrl = getImageUrl(
    currentSong.album?.picUrl || currentSong.picUrl,
    200
  );
  const artists = currentSong.artists?.map((a) => a.name).join(' / ');

  return (
    <div
      className="absolute left-8 top-20 z-20"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="block text-left group"
        aria-expanded={expanded}
      >
        {/* 收起态：纯文字（无衬线窄体大写） */}
        <div
          className={`flex items-center gap-2 transition-all duration-300 ${
            expanded ? 'opacity-0 -translate-y-1 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div
            className="w-2 h-2 flex-shrink-0"
            style={{
              background: isPlaying ? '#FFE600' : 'rgba(245,245,240,0.3)',
              boxShadow: isPlaying ? '0 0 8px rgba(255,230,0,0.8)' : 'none',
              animation: isPlaying ? 'pulse-slow 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <div className="min-w-0">
            <p
              className="text-sm font-bold uppercase tracking-[0.06em] truncate max-w-[240px]"
              style={{ color: '#F5F5F0', letterSpacing: '0.04em' }}
            >
              {currentSong.name}
            </p>
            <p
              className="text-xs uppercase tracking-[0.14em] truncate max-w-[240px] mt-0.5"
              style={{ color: 'rgba(138,138,138,0.9)' }}
            >
              {artists}
            </p>
          </div>
          <ChevronRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
            style={{ color: '#FFE600' }}
          />
        </div>
      </button>

      {/* 展开态：粗野主义面板（黑底 / 直角 / 黄硬阴影 / 缺角裁切） */}
      <div
        className={`viz-info-card overflow-hidden transition-all duration-300 ease-out ${
          expanded
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
        style={{
          marginTop: expanded ? 10 : 0,
          width: 'min(360px, 80vw)',
          borderRadius: 0,
        }}
      >
        <div className="flex items-center gap-4 p-4 pb-3">
          <img
            src={coverUrl}
            alt={currentSong.name}
            className="w-14 h-14 object-cover flex-shrink-0"
            style={{ borderRadius: 0, filter: 'contrast(1.1) brightness(0.85)' }}
          />
          <div className="min-w-0">
            <p
              className="text-sm font-bold uppercase truncate"
              style={{ color: '#F5F5F0', letterSpacing: '0.04em' }}
            >
              {currentSong.name}
            </p>
            <p
              className="text-xs uppercase tracking-[0.12em] truncate mt-1"
              style={{ color: 'rgba(138,138,138,0.9)' }}
            >
              {artists}
            </p>
            {currentSong.album?.name && (
              <p
                className="text-[11px] uppercase tracking-[0.1em] truncate mt-0.5"
                style={{ color: 'rgba(138,138,138,0.5)' }}
              >
                {currentSong.album.name}
              </p>
            )}
          </div>
        </div>
        {/* 完整操控组件（进度/播放/上下首/模式/音量） */}
        <div className="px-4 pb-4 pt-1">
          <PlayerControls />
        </div>
      </div>
    </div>
  );
}
