/**
 * 诊断上报：把前端运行时诊断（低帧率 / 播放卡顿）转发给开发服务器的
 * /__diag 中间件（见 vite.config.ts），由服务端日志直接输出，
 * 无需用户手动复制 DevTools 内容。仅用于定位问题，失败静默。
 */

export function reportDiag(kind: string, payload: Record<string, unknown>): void {
  try {
    fetch('/__diag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, t: Date.now(), ...payload }),
      keepalive: true,
    }).catch(() => {
      // 诊断上报失败不影响业务
    });
  } catch {
    // 静默失败
  }
}
