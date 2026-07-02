import { usePlayerStore } from '@/stores/usePlayerStore';
import { getImageUrl } from '@/utils/format';

export default function CoverDisplay() {
  const { currentSong, isPlaying } = usePlayerStore();

  if (!currentSong) return null;

  const coverUrl = getImageUrl(
    currentSong.album?.picUrl || currentSong.picUrl,
    500
  );

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-6 gap-5">
      {/* 封面 */}
      <div className="relative group flex-shrink-0">
        {/* 光晕 */}
        <div
          className={`absolute -inset-4 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 blur-2xl transition-opacity duration-700 ${
            isPlaying ? 'opacity-100' : 'opacity-30'
          }`}
        />

        {/* 封面图 */}
        <div
          className={`relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 transition-all duration-700 ease-out ${
            isPlaying ? 'scale-100' : 'scale-[0.96]'
          }`}
          style={{ width: 'min(260px, 80%)', aspectRatio: '1' }}
        >
          <img
            src={coverUrl}
            alt={currentSong.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 歌曲信息 */}
      <div className="text-center space-y-1.5 max-w-full flex-shrink-0">
        <h2 className="text-lg font-bold text-white truncate">{currentSong.name}</h2>
        <p className="text-sm text-white/55 truncate">
          {currentSong.artists?.map((a) => a.name).join(' / ')}
        </p>
        <p className="text-xs text-white/35 truncate">{currentSong.album?.name}</p>
      </div>

      {/* 播放状态指示 */}
      <div className="flex items-center gap-1.5 text-[11px] text-white/35 flex-shrink-0">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            isPlaying ? 'bg-green-400 animate-pulse' : 'bg-white/25'
          }`}
        />
        <span>{isPlaying ? '正在播放' : '已暂停'}</span>
      </div>
    </div>
  );
}
