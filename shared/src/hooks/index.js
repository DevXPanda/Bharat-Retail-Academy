import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { cleanParams } from '../lib/client.js';
import { useClient } from '../context/AppProviders.jsx';
import { useToast } from '../components/ui/Overlay.jsx';

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useGet(url, params, options = {}) {
  const client = useClient();
  const query = useQuery({
    queryKey: [url, params ?? {}],
    queryFn: () => client.get(url, cleanParams(params)),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    ...options,
  });
  return { ...query, data: query.data?.data, meta: query.data?.meta, error: query.error?.message };
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return useCallback(
    (...prefixes) => Promise.all(prefixes.map((prefix) => queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith(prefix) }))),
    [queryClient],
  );
}

export function useAction(fn, { success, invalidate = [], onSuccess, onError } = {}) {
  const toast = useToast();
  const refresh = useInvalidate();
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      try {
        const result = await fnRef.current(...args);
        if (success) toast.success(typeof success === 'function' ? success(result) : success);
        if (invalidate.length) await refresh(...invalidate);
        onSuccess?.(result);
        return result;
      } catch (err) {
        toast.error(err.message || 'Something went wrong');
        onError?.(err);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, refresh, success, onSuccess, onError, invalidate.join('|')],
  );
  return { run, loading };
}

export function useListState(initial = {}, { limit = 10 } = {}) {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('q') || '';
  const [filters, setFilters] = useState({ search: urlSearch, ...initial });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(limit);
  const debouncedSearch = useDebounce(filters.search);

  useEffect(() => {
    if (urlSearch !== filters.search && urlSearch) setFilters((f) => ({ ...f, search: urlSearch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const setFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters({ search: '', ...initial });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = useMemo(() => ({ ...filters, search: debouncedSearch, page, limit: pageSize }), [filters, debouncedSearch, page, pageSize]);

  return { filters, setFilter, setFilters, page, setPage, pageSize, setPageSize: (n) => { setPageSize(n); setPage(1); }, reset, params };
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, show: () => setOpen(true), hide: () => setOpen(false), toggle: () => setOpen((o) => !o) };
}
