import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, History, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { getSearchHotDetail, getSearchSuggest, getDefaultSearchWord } from '@/api/search';
import { debounce } from '@/utils/format';
import { useI18n } from '@/hooks/useI18n';

interface HotSearch {
  searchWord: string;
  score: number;
}

type DropdownPhase = 'closed' | 'open' | 'closing';

export default function Header() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { addSearchHistory, searchHistory, removeSearchHistory } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPhase, setDropdownPhase] = useState<DropdownPhase>('closed');
  const [hotSearches, setHotSearches] = useState<HotSearch[]>([]);
  const [suggestions, setSuggestions] = useState<{ songs?: { id: number; name: string; artists: { name: string }[] }[]; artists?: { name: string }[] }>({});
  const [defaultKeyword, setDefaultKeyword] = useState(t('header.searchPlaceholder'));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const openDropdown = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    setDropdownPhase('open');
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownPhase((prev) => {
      if (prev !== 'open') return prev; // 已经是关闭或正在关闭中，不再重复触发关闭动画
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setDropdownPhase('closed');
      }, 250);
      return 'closing';
    });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    getSearchHotDetail().then((data) => setHotSearches(data.slice(0, 10)));
    getDefaultSearchWord().then((data) => {
      if (data?.showKeyword) setDefaultKeyword(data.showKeyword);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestions({});
        return;
      }
      const data = await getSearchSuggest(query);
      setSuggestions(data);
    }, 300)
  ).current;

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSearch = (keyword: string) => {
    if (!keyword.trim()) return;
    addSearchHistory(keyword);
    closeDropdown();
    setSearchQuery('');
    navigate(`/search?keywords=${encodeURIComponent(keyword)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border sticky top-0 z-40">
      {/* 搜索框 */}
      <div className="relative w-80" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={openDropdown}
            onKeyDown={handleKeyDown}
            placeholder={defaultKeyword}
            className="w-full pl-9 pr-8 py-2 rounded-full bg-white/5 backdrop-blur-md text-text-primary text-sm placeholder-text-tertiary border border-white/10 focus:border-primary/50 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSuggestions({});
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 搜索下拉 */}
        {dropdownPhase !== 'closed' && (
          <div
            className="absolute top-full left-0 right-0 mt-2"
          >
            <div
              className={`bg-background-secondary/95 backdrop-blur-xl border border-border rounded-xl shadow-lg overflow-hidden ${
                dropdownPhase === 'open' ? 'dropdown-enter' : 'dropdown-exit'
              }`}
            >
            {searchQuery && suggestions.songs && suggestions.songs.length > 0 ? (
              <div className="py-2">
                <p className="px-4 py-1 text-xs text-text-tertiary">{t('common.song')}</p>
                {suggestions.songs.slice(0, 5).map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleSearch(song.name)}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-white/5 flex items-center gap-2"
                  >
                    <Search size={12} className="text-text-tertiary" />
                    <span>{song.name}</span>
                    <span className="text-text-tertiary text-xs">-</span>
                    <span className="text-text-secondary text-xs">{(song.artists ?? []).map((a) => a.name).join('/')}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-3">
                {/* 搜索历史 */}
                {searchHistory.length > 0 && !searchQuery && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between px-4 mb-2">
                      <p className="text-xs text-text-tertiary">{t('header.searchHistory')}</p>
                      <button
                        onClick={() => {
                          const store = useAppStore.getState();
                          store.clearSearchHistory();
                        }}
                        className="text-xs text-text-tertiary hover:text-text-secondary"
                      >
                        {t('header.clearHistory')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 px-4">
                      {searchHistory.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleSearch(keyword)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-xs text-text-secondary hover:text-text-primary hover:bg-white/15 transition-colors"
                        >
                          <History size={10} />
                          {keyword}
                          <X
                            size={10}
                            className="hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSearchHistory(keyword);
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 热门搜索 */}
                <div>
                  <p className="px-4 mb-2 text-xs text-text-tertiary flex items-center gap-1">
                    <TrendingUp size={12} /> {t('header.hotSearch')}
                  </p>
                  <div className="space-y-0.5">
                    {hotSearches.map((item, index) => (
                      <button
                        key={item.searchWord}
                        onClick={() => handleSearch(item.searchWord)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-3"
                      >
                        <span
                          className={`w-5 text-center text-xs font-bold ${
                            index < 3 ? 'text-primary' : 'text-text-tertiary'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="text-text-primary">{item.searchWord}</span>
                        <span className="text-xs text-text-tertiary ml-auto">{formatScore(item.score, language === 'zh' ? '万' : 'K')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

    </header>
  );
}

function formatScore(score: number, wanLabel: string): string {
  if (score >= 10000) {
    return (score / 10000).toFixed(0) + wanLabel;
  }
  return score.toString();
}
