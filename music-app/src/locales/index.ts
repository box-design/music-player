import zh from './zh';
import en from './en';
import type { LocaleType } from './zh';

export type Language = 'zh' | 'en';
export type { LocaleType };

const locales: Record<Language, LocaleType> = { zh, en };

/** 根据浏览器语言自动检测，返回 'zh' 或 'en' */
export function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'zh';
  const lang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getLocale(lang: Language): LocaleType {
  return locales[lang] || locales.zh;
}

export { zh, en };