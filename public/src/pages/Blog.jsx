import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, Eye, Search } from 'lucide-react';
import { Avatar, Badge, EmptyState, Prose, Spinner, cx, formatDate, formatNumber, useDebounce, useGet } from '@ecomedu/ui';

function Cover({ post, className, children }) {
  return (
    <div className={cx('relative overflow-hidden bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-600', className)}>
      {post.coverImage ? <img src={post.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-3xl font-extrabold tracking-tight text-white/90">{post.category}</span>}
      {children}
    </div>
  );
}

const Meta = ({ post }) => (
  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(post.publishedAt)}</span>
    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{post.readMinutes} min read</span>
  </p>
);

function PostCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:border-brand-300">
      <Cover post={post} className="h-44" />
      <div className="flex flex-1 flex-col p-5">
        <Badge tone="blue" className="self-start">{post.category}</Badge>
        <h3 className="mt-3 line-clamp-2 text-[17px] font-extrabold leading-snug text-ink group-hover:text-brand-600">{post.title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2 text-xs font-semibold text-ink"><Avatar name={post.author?.name} src={post.author?.avatar} size={26} />{post.author?.name}</span><Meta post={post} /></div>
      </div>
    </Link>
  );
}

export function Blog() {
  const [category, setCategory] = useState('all');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(term, 350);
  const categories = useGet('/public/blog/categories').data || [];
  const { data = [], meta, isLoading } = useGet('/public/blog', { category, search, page, limit: 9 }, { keepPrevious: true });

  useEffect(() => setPage(1), [category, search]);

  const [featured, ...rest] = page === 1 && !search && category === 'all' ? data : [null, ...data];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">Blog</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Articles on selling online and platform updates.</p>
        </div>
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search articles..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-brand-400" /></div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ name: 'all', label: 'All' }, ...categories.map((c) => ({ name: c.name, label: c.name }))].map((c) => (
          <button key={c.name} type="button" onClick={() => setCategory(c.name)} className={cx('rounded-full border px-4 py-1.5 text-xs font-semibold transition', category === c.name ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300')}>{c.label}</button>
        ))}
      </div>

      {isLoading && !data.length ? <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div> : data.length === 0 ? (
        <EmptyState title="No articles found" description={search || category !== 'all' ? 'Try a different keyword or category.' : 'New articles are on their way.'} />
      ) : (
        <>
          {featured && (
            <Link to={`/blog/${featured.slug}`} className="group mt-8 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:border-brand-300 md:grid-cols-2">
              <Cover post={featured} className="h-60 md:h-full md:min-h-[300px]" />
              <div className="flex flex-col justify-center p-7 md:p-10">
                <Badge tone="blue" className="self-start">Featured · {featured.category}</Badge>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink group-hover:text-brand-600">{featured.title}</h2>
                <p className="mt-3 leading-relaxed text-slate-600">{featured.excerpt}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4"><span className="flex items-center gap-2 text-sm font-semibold text-ink"><Avatar name={featured.author?.name} src={featured.author?.avatar} size={30} />{featured.author?.name}</span><Meta post={featured} /></div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          )}
          {rest.length > 0 && <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rest.map((p) => <PostCard key={p.id} post={p} />)}</div>}
          {meta?.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-slate-600">Page {page} of {meta.pages}</span>
              <button type="button" disabled={page >= meta.pages} onClick={() => setPage(page + 1)} aria-label="Next page" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { data: post, isLoading, error } = useGet(`/public/blog/${slug}`);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (error || !post) return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Article not found" description="This article may have been removed." action={<Link to="/blog" className="text-sm font-semibold text-brand-600 hover:underline">Back to blog →</Link>} /></div>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All articles</Link>
      <Badge tone="blue" className="mt-5">{post.category}</Badge>
      <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-ink">{post.title}</h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-500">{post.excerpt}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-200 py-4">
        <span className="flex items-center gap-2.5 text-sm font-semibold text-ink"><Avatar name={post.author?.name} src={post.author?.avatar} size={34} />{post.author?.name}</span>
        <Meta post={post} />
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><Eye className="h-3.5 w-3.5" />{formatNumber(post.views)} views</span>
      </div>
      {post.coverImage && <img src={post.coverImage} alt="" className="mt-7 max-h-[420px] w-full rounded-2xl object-cover" />}
      <Prose className="mt-8">{post.content}</Prose>
      {post.tags?.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{post.tags.map((t) => <Badge key={t} tone="slate">#{t}</Badge>)}</div>}

      <div className="mt-10 rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-7 text-white">
        <p className="text-xl font-extrabold">Explore the courses</p>
        <p className="mt-1 text-white/80">Find a course on the topic you are reading about.</p>
        <Link to="/courses" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-brand-700">Explore courses <ArrowRight className="h-4 w-4" /></Link>
      </div>

      {post.related?.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-ink">More in {post.category}</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">{post.related.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      )}
    </article>
  );
}
