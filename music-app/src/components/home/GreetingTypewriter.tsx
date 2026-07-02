import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

const TIME_GREETING_KEYS: Record<number, string> = {
  0: 'greeting.t0',
  6: 'greeting.t6',
  9: 'greeting.t9',
  12: 'greeting.t12',
  14: 'greeting.t14',
  18: 'greeting.t18',
  20: 'greeting.t20',
};

function getTimeGreetingKey(): string {
  const hour = new Date().getHours();
  const keys = Object.keys(TIME_GREETING_KEYS)
    .map(Number)
    .sort((a, b) => a - b);
  let selected = keys[0];
  for (const key of keys) {
    if (hour >= key) selected = key;
  }
  return TIME_GREETING_KEYS[selected];
}

function pickGreetingKey(): string {
  const pool = [
    'greeting.g0', 'greeting.g1', 'greeting.g2', 'greeting.g3',
    'greeting.g4', 'greeting.g5', 'greeting.g6', 'greeting.g7',
    getTimeGreetingKey(),
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

interface GreetingTypewriterProps {
  className?: string;
  typingSpeed?: number;
}

export default function GreetingTypewriter({
  className = '',
  typingSpeed = 80,
}: GreetingTypewriterProps) {
  const { t } = useI18n();
  const greetingKey = useMemo(() => pickGreetingKey(), []);
  const greeting = t(greetingKey);
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    setDisplayText('');
    const timer = setInterval(() => {
      index += 1;
      setDisplayText(greeting.slice(0, index));
      if (index >= greeting.length) {
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [greeting, typingSpeed]);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(blinkTimer);
  }, []);

  return (
    <div className={`${className}`}>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary leading-snug break-words">
        {displayText}
        <span
          className={`inline-block w-[3px] h-[0.95em] align-middle ml-1 rounded-sm bg-primary transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        {t('home.dailyRecommendHint')}
      </p>
    </div>
  );
}
