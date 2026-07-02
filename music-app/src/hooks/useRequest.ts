import { useState, useEffect, useCallback, useRef } from 'react';

interface UseRequestOptions {
  immediate?: boolean;
  deps?: unknown[];
}

export function useRequest<T>(
  requestFn: () => Promise<T>,
  options: UseRequestOptions = {}
) {
  const { immediate = true, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestFn();
      if (isMounted.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [requestFn]);

  const refresh = useCallback(() => {
    return execute();
  }, [execute]);

  useEffect(() => {
    isMounted.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, execute, refresh };
}
