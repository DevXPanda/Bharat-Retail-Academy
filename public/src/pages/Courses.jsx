import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { EmptyState, ErrorState, Pagination, Select, Spinner, useDebounce, useGet } from '@ecomedu/ui';
import CourseCard from '../components/CourseCard.jsx';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export default function Courses() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  useEffect(() => {
    const q = params.get('search');
    if (q !== null && q !== search) setSearch(q);
    const nextCategory = params.get('category');
    setCategory(nextCategory || 'all');
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPage(1), [debounced, category, level, sort]);

  const categories = useGet('/public/categories').data || [];
  const { data = [], meta, isLoading, error, refetch } = useGet('/public/courses', { search: debounced, category, level, sort, page, limit: 9 }, { keepPrevious: true });

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <header className="mb-8"><h1 className="text-4xl font-extrabold tracking-tight text-ink">All Courses</h1><p className="mt-2 text-slate-500">Browse by platform, level or price.</p></header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 w-full sm:min-w-[240px] sm:flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setParams({}, { replace: true }); }} placeholder="Search courses..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-brand-400" /></div>
        <div className="w-44"><Select value={level} onChange={(e) => setLevel(e.target.value)} compact><option value="">All levels</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select></div>
        <div className="w-48"><Select value={sort} onChange={(e) => setSort(e.target.value)} compact><option value="popular">Most popular</option><option value="rating">Highest rated</option><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></Select></div>
      </div>

      <div className="platform-filters">
        {[{ name: 'all', label: 'All' }, ...categories.map((c) => ({ name: c.name, label: `${c.name} (${c.count})` }))].map((c) => (
          <button key={c.name} type="button" onClick={() => setCategory(c.name)} aria-pressed={category === c.name} className={category === c.name ? 'selected' : ''}>{c.name !== 'all' && <PlatformLogo category={c.name} size={28} />}{c.label}</button>
        ))}
      </div>

      {isLoading && !data.length ? <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div> : error ? <ErrorState message={error} onRetry={refetch} /> : data.length === 0 ? <EmptyState title="No courses match your search" description="Try a different keyword or category." /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      )}
      <div className="mt-10 flex justify-center"><Pagination page={meta?.page || 1} pages={meta?.pages || 1} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /></div>
    </div>
  );
}
