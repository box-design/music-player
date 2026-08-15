/**
 * 封面主色提取 —— 纯原生 Canvas，不依赖外部库。
 *
 * 用于把专辑封面映射为可视化点阵的发光色。
 * 若封面跨域不可读或加载失败，返回 null，由调用方回退到默认鼓点黄。
 */

export type RgbTuple = [number, number, number];

const canvasCache = new Map<string, RgbTuple>();

/**
 * 从图片 URL 提取主色调。
 * @param url 封面图片地址
 * @param sampleSize 采样缩略图边长，默认 64（越小越快）
 * @returns RGB 三元组，失败返回 null
 */
export function extractDominantColor(
  url: string | undefined,
  sampleSize = 64
): Promise<RgbTuple | null> {
  if (!url) return Promise.resolve(null);
  if (canvasCache.has(url)) return Promise.resolve(canvasCache.get(url)!);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      try {
        const color = computeDominantColor(img, sampleSize);
        if (color) canvasCache.set(url, color);
        resolve(color);
      } catch {
        resolve(null);
      } finally {
        cleanup();
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(null);
    };

    img.src = url;
  });
}

function computeDominantColor(img: HTMLImageElement, sampleSize: number): RgbTuple | null {
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, sampleSize, sampleSize);
  } catch {
    // 跨域污染
    return null;
  }

  const pixels = data.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  // 采样步长 2，加速并降低噪点影响
  for (let i = 0; i < pixels.length; i += 8) {
    const pr = pixels[i];
    const pg = pixels[i + 1];
    const pb = pixels[i + 2];
    const pa = pixels[i + 3];

    if (pa < 128) continue;

    const brightness = (pr * 0.299 + pg * 0.587 + pb * 0.114) / 255;
    // 过滤掉过暗、过亮、过灰的像素，保留有颜色的区域
    if (brightness < 0.12 || brightness > 0.92) continue;
    const saturation =
      Math.max(pr, pg, pb) - Math.min(pr, pg, pb);
    if (saturation < 18) continue;

    r += pr;
    g += pg;
    b += pb;
    count++;
  }

  if (count === 0) {
    //  fallback：整张图平均色
    for (let i = 0; i < pixels.length; i += 4) {
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      count++;
    }
  }

  if (count === 0) return null;

  const avg: RgbTuple = [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
  return boostSaturation(avg, 1.25);
}

/** 轻微提升饱和度，让发光色更醒目 */
function boostSaturation([r, g, b]: RgbTuple, factor: number): RgbTuple {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return [r, g, b];

  const l = (max + min) / 2 / 255;
  const boosted = [r, g, b].map((c) => {
    const norm = c / 255;
    const adjusted = norm + (norm - l) * (factor - 1);
    return Math.round(Math.max(0, Math.min(1, adjusted)) * 255);
  }) as RgbTuple;

  return boosted;
}
