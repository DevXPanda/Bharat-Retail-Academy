import { MessageSquareText, Star } from 'lucide-react';
import { Card, CourseMark, DataTable, DateRangeField, FilterBar, FilterSelect, PageHeader, PersonCell, PortalWorkspace, ProgressBar, StatCard, StatGrid, TableCard, TableFooter, formatDate, indexColumn, useGet, useListState } from '../components/ui.jsx';

const Stars = ({ value }) => (
  <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}
  </span>
);

export default function Reviews() {
  const list = useListState({ course: 'all', rating: 'all', from: '', to: '' });
  const summary = useGet('/reviews/summary').data;
  const courses = useGet('/courses/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/reviews', { ...list.params, rating: list.filters.rating === 'all' ? undefined : list.filters.rating }, { keepPrevious: true });

  const columns = [
    indexColumn(meta),
    { key: 'student', header: 'Student', render: (r) => <PersonCell name={r.student?.name} src={r.student?.avatar} sub={r.student?.studentCode} size={34} /> },
    { key: 'course', header: 'Course', render: (r) => <div className="flex min-w-[160px] items-center gap-2.5"><CourseMark category={r.course?.category} src={r.course?.thumbnail} size={32} /><span className="line-clamp-2 text-xs text-slate-600">{r.course?.title}</span></div> },
    { key: 'rating', header: 'Rating', render: (r) => <Stars value={r.rating} /> },
    { key: 'comment', header: 'Review', render: (r) => <p className="line-clamp-3 min-w-[240px] max-w-[420px] text-[13px] text-slate-700">{r.comment || <span className="text-slate-400">No comment</span>}</p> },
    { key: 'date', header: 'Date', render: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Reviews" subtitle="What students say about your courses." />

      <StatGrid cols={2}>
        <StatCard icon={MessageSquareText} tone="blue" label="Total Reviews" value={summary?.total.value ?? '—'} />
        <StatCard icon={Star} tone="orange" label="Average Rating" value={summary ? `${summary.average.value} / 5` : '—'} />
      </StatGrid>
      <PortalWorkspace insights={<Card title="Rating Breakdown">
          <ul className="grid gap-4 sm:grid-cols-5">
            {!summary?.byRating?.length && <li className="text-xs text-slate-500">No ratings yet.</li>}
            {(summary?.byRating || []).map((r) => (
              <li key={r.rating} className="flex items-center gap-3 text-xs"><span className="w-10 font-semibold text-slate-600">{r.rating} star</span><ProgressBar value={summary.total.value ? Math.round((r.count / summary.total.value) * 100) : 0} tone="orange" /><span className="w-8 text-right text-slate-500">{r.count}</span></li>
            ))}
          </ul>
        </Card>}>

      <TableCard title="All Reviews">
        <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search review text..." onReset={list.reset}>
          <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-52" />
          <FilterSelect value={list.filters.rating} onChange={(v) => list.setFilter('rating', v)} allLabel="All Ratings" options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))} className="w-36" />
          <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="Date Range" className="w-48" />
        </FilterBar>
        <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={820} />
        <TableFooter meta={meta} noun="reviews" onPage={list.setPage} />
      </TableCard>
      </PortalWorkspace>
    </>
  );
}
