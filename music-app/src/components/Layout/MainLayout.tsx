import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomPlayer from './BottomPlayer';
import FullPlayer from '@/components/Player/FullPlayer';
import BackgroundSystem from '@/components/Background/BackgroundSystem';
import { useAppStore } from '@/stores/useAppStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

export default function MainLayout() {
  const location = useLocation();
  const { enableGlassmorphism } = useAppStore();
  // 只订阅 isFullPlayerOpen：整 store 订阅会让 MainLayout 随
  // currentTime 等高频字段（~4 次/秒）无谓重渲染整棵背景树。
  const isFullPlayerOpen = usePlayerStore((s) => s.isFullPlayerOpen);
  const isHome = location.pathname === '/';
  const intensity = isHome ? 1 : 0.35;

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Day-night cycle background system — shared by normal UI and full-screen player */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ '--bg-intensity': intensity } as React.CSSProperties}>
        <BackgroundSystem intensity={intensity} />
      </div>

      {/* Full-screen player sits directly above the shared dynamic background */}
      <FullPlayer />

      {/* Normal UI is hidden while the full-screen player is open */}
      <div className={isFullPlayerOpen ? 'hidden' : undefined}>
        <Sidebar />
      </div>
      <div className={`flex-1 flex flex-col min-w-0 relative z-[1] ${isFullPlayerOpen ? 'hidden' : ''}`}>
        <Header />
        <main
          className="flex-1 overflow-y-auto layout-main"
          style={{
            boxShadow: enableGlassmorphism
              ? 'var(--shadow-offset-x, 0px) var(--shadow-offset-y, 0px) 24px var(--shadow-color, rgba(0,0,0,0.1))'
              : 'none',
          }}
        >
          <div className="p-6 pb-28">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom player stays mounted across full-screen states so it can
          animate in (bounce back) when the full player is collapsing. */}
      <BottomPlayer />
    </div>
  );
}
