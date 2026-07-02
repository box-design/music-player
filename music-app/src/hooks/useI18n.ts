import { useAppStore } from '@/stores/useAppStore';
import { getLocale } from '@/locales';
import type { LocaleType } from '@/locales/zh';

type PathsToString<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? `${K & string}.${PathsToString<T[K]>}`
    : `${K & string}`;
}[keyof T];

type LocalePath = PathsToString<LocaleType>;

export function useI18n() {
  const language = useAppStore((s) => s.language);

  const t = (path: LocalePath, replacements?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let value: unknown = getLocale(language);
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return path;
      }
    }
    let result = typeof value === 'string' ? value : path;
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        result = result.replace(`{${k}}`, String(v));
      }
    }
    return result;
  };

  return { t, language };
}