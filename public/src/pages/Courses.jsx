import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { EmptyState, ErrorState, Pagination, Select, Spinner, useDebounce, useGet } from '@ecomedu/ui';
import CourseCard from '../components/CourseCard.jsx';
import PageFrame from '../components/PageFrame.jsx';

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
    <PageFrame title="Find your next course." description="Learn the platform you sell on, or the skill your business needs next.">

      <div className="course-search-controls">
        <div className="public-search"><Search aria-hidden="true" /><input aria-label="Search courses" value={search} onChange={(e) => { setSearch(e.target.value); setParams({}, { replace: true }); }} placeholder="Search a course or topic" /></div>
        <div><Select aria-label="Course level" value={level} onChange={(e) => setLevel(e.target.value)} compact><option value="">All levels</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select></div>
        <div><Select aria-label="Sort courses" value={sort} onChange={(e) => setSort(e.target.value)} compact><option value="popular">Most popular</option><option value="rating">Highest rated</option><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></Select></div>
      </div>

      <div className="platform-filters" aria-label="Filter by platform">
        {[{ name: 'all', label: 'All' }, ...categories.map((c) => ({ name: c.name, label: `${c.name} (${c.count})` }))].map((c) => (
          <button key={c.name} type="button" onClick={() => setCategory(c.name)} aria-pressed={category === c.name} className={category === c.name ? 'selected' : ''}>{c.name !== 'all' && <PlatformLogo category={c.name} size={28} />}{c.label}</button>
        ))}
      </div>

      {!isLoading && !error && <p className="course-results-count">{meta?.total ?? data.length} {(meta?.total ?? data.length) === 1 ? 'course' : 'courses'}{category !== 'all' ? ` in ${category}` : ' to explore'}</p>}
      {isLoading && !data.length ? <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div> : error ? <ErrorState message={error} onRetry={refetch} /> : data.length === 0 ? <EmptyState title="No courses match your search" description="Try a different keyword or category." /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      )}
      <div className="mt-10 flex justify-center"><Pagination page={meta?.page || 1} pages={meta?.pages || 1} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /></div>
    </PageFrame>
  );
}
