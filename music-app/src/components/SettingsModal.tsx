import { useEffect, useRef, useState } from 'react';
import { X, Globe, Github } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/hooks/useI18n';
import type { Language } from '@/locales';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    enableGlassmorphism,
    toggleGlassmorphism,
    lightingIntensity,
    setLightingIntensity,
    playerStyle,
    setPlayerStyle,
    language,
    setLanguage,
  } = useAppStore();
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isClosing, handleClose]);

  // Click outside panel to close
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, isClosing, handleClose]);

  if (!isOpen && !isClosing) return null;

  const languages: { key: Language; label: string }[] = [
    { key: 'zh', label: t('settings.chinese') },
    { key: 'en', label: t('settings.english') },
  ];

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm ${
        isClosing ? 'animate-fp-retract-out' : 'animate-fp-fade-in'
      }`}
    >
      <div
        ref={panelRef}
        className={`glass-card w-80 p-6 rounded-2xl ${
          isClosing ? 'animate-fp-panel-out' : 'animate-fp-panel-in'
        }`}
      >
        <div className="glass-card-inner">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">{t('settings.title')}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-text-secondary" />
            </button>
          </div>

          {/* Language switcher */}
          <div className="py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-text-secondary" />
              <p className="text-sm font-medium text-text-primary">{t('settings.language')}</p>
            </div>
            <p className="text-xs text-text-tertiary mb-3">{t('settings.languageDesc')}</p>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/10 rounded-xl">
              {languages.map((lang) => (
                <button
                  key={lang.key}
                  onClick={() => setLanguage(lang.key)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    language === lang.key
                      ? 'bg-primary text-white shadow'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Glassmorphism toggle */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('settings.glassmorphism')}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{t('settings.glassmorphismDesc')}</p>
            </div>
            <button
              onClick={toggleGlassmorphism}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                enableGlassmorphism ? 'bg-primary' : 'bg-white/20'
              }`}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                style={{
                  transform: enableGlassmorphism ? 'translateX(22px)' : 'translateX(0)',
                  left: 2,
                }}
              />
            </button>
          </div>

          {/* Lighting intensity */}
          <div className="py-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">{t('settings.lightingIntensity')}</p>
              <span className="text-xs text-text-secondary font-mono">
                {Math.round(lightingIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(lightingIntensity * 100)}
              onChange={(e) => setLightingIntensity(Number(e.target.value) / 100)}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Player style switcher */}
          <div className="py-3 border-b border-border/50">
            <div className="mb-2">
              <p className="text-sm font-medium text-text-primary">{t('settings.playerStyle')}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{t('settings.playerStyleDesc')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-white/10 rounded-xl">
              <button
                onClick={() => setPlayerStyle('classic')}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  playerStyle === 'classic'
                    ? 'bg-primary text-white shadow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {t('settings.classic')}
              </button>
              <button
                onClick={() => setPlayerStyle('visual')}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  playerStyle === 'visual'
                    ? 'bg-primary text-white shadow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {t('settings.visual')}
              </button>
              <button
                onClick={() => setPlayerStyle('lunar')}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  playerStyle === 'lunar'
                    ? 'bg-primary text-white shadow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {t('settings.lunarDither')}
              </button>
            </div>
          </div>

          {/* Lighting preview */}
          <div className="mt-4 pt-4">
            <p className="text-xs text-text-tertiary mb-2">{t('settings.currentLightColor')}</p>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full shadow-inner ring-1 ring-white/20"
                style={{ backgroundColor: 'var(--card-light-color, #ffd54f)' }}
              />
              <span className="text-xs text-text-secondary font-mono">
                var(--card-light-color)
              </span>
            </div>
          </div>

          {/* Open source */}
          <a
            href="https://github.com/box-design/music-player"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
          >
            <Github size={18} className="text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">{t('settings.openSource')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}