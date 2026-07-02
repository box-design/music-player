// 格式化播放次数
export function formatCount(count: number): string {
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + '亿';
  }
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万';
  }
  return count.toString();
}

// 格式化时长 (ms -> mm:ss)
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 格式化日期
export function formatDate(timestamp: number, format = 'YYYY-MM-DD'): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day);
}

// 获取图片URL + 尺寸参数
export function getImageUrl(url: string | undefined, size = 300): string {
  if (!url) return '';
  // 网易云图片添加param参数改变尺寸
  if (url.includes('music.126.net')) {
    return url + `?param=${size}x${size}`;
  }
  return url;
}

// 格式化歌词
export function parseLyric(lyricStr: string): import('@/types').LyricLine[] {
  if (!lyricStr) return [];
  const lines = lyricStr.split('\n');
  const lyrics: import('@/types').LyricLine[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        lyrics.push({ time, text });
      }
    }
  }

  return lyrics;
}

// 防抖
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
