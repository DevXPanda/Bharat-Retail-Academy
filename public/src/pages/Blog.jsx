import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Avatar, Badge, EmptyState, ErrorState, Prose, Spinner, formatDate, useDebounce, useGet } from '@ecomedu/ui';
import PageFrame from '../components/PageFrame.jsx';

function Meta({ post }) {
  return <div className="blog-meta"><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time><span>{post.readMinutes} min read</span></div>;
}

function Author({ post, size = 28 }) {
  if (!post.author?.name) return null;
  return <span className="blog-author"><Avatar name={post.author.name} src={post.author.avatar} size={size} /><span>{post.author.name}</span></span>;
}

function PostCard({ post }) {
  return (
    <article className="blog-story">
      {post.coverImage && <Link to={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true" className="blog-story-cover"><img src={post.coverImage} alt="" loading="lazy" /></Link>}
      <Meta post={post} />
      <h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3>
      <p>{post.excerpt}</p>
      <div className="blog-story-footer"><Author post={post} /><Link to={`/blog/${post.slug}`} className="blog-read-link" aria-label={`Read ${post.title}`}><span>Read article</span><ArrowRight size={15} aria-hidden="true" /></Link></div>
    </article>
  );
}

export function Blog() {
  const [category, setCategory] = useState('all');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(term, 350);
  const categories = useGet('/public/blog/categories').data || [];
  const { data = [], meta, isLoading, error, refetch } = useGet('/public/blog', { category, search, page, limit: 9 }, { keepPrevious: true });
  useEffect(() => setPage(1), [category, search]);
  const [featured, ...rest] = page === 1 && !search && category === 'all' ? data : [null, ...data];

  return (
    <PageFrame className="academy-blog" title="Notes on selling online." description="Useful reads for the everyday work of running an online business." actions={<div className="public-search w-full sm:w-72"><Search aria-hidden="true" /><input aria-label="Search articles" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search articles" /></div>}>
      <div className="blog-categories" aria-label="Article categories">{[{ name: 'all', label: 'All' }, ...categories.map((c) => ({ name: c.name, label: c.name }))].map((c) => <button key={c.name} type="button" onClick={() => setCategory(c.name)} aria-pressed={category === c.name}>{c.label}</button>)}</div>
      {isLoading && !data.length ? <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div> : error ? <ErrorState message={error} onRetry={refetch} /> : !data.length ? <EmptyState title="No articles found" description={search || category !== 'all' ? 'Try a different keyword or category.' : 'New articles are on their way.'} /> : <>
        {featured && <article className={`blog-lead${featured.coverImage ? ' has-cover' : ''}`}>
          {featured.coverImage && <Link to={`/blog/${featured.slug}`} tabIndex={-1} aria-hidden="true" className="blog-lead-cover"><img src={featured.coverImage} alt="" /></Link>}
          <div className="blog-lead-copy">
            <div><h2><Link to={`/blog/${featured.slug}`}>{featured.title}</Link></h2><Link to={`/blog/${featured.slug}`} className="blog-read-link">Read article <ArrowRight size={16} aria-hidden="true" /></Link></div>
            <div className="blog-lead-summary"><p>{featured.excerpt}</p><Author post={featured} size={32} /><Meta post={featured} /></div>
          </div>
        </article>}
        {rest.length > 0 && <div className="blog-feed">{rest.map((post) => <PostCard key={post.id} post={post} />)}</div>}
        {meta?.pages > 1 && <nav className="blog-pagination" aria-label="Article pages"><button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {page} of {meta.pages}</span><button type="button" disabled={page >= meta.pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Next page"><ChevronRight size={17} /></button></nav>}
      </>}
    </PageFrame>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { data: post, isLoading, error } = useGet(`/public/blog/${slug}`);
  if (isLoading) return <PageFrame className="academy-article"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></PageFrame>;
  if (error || !post) return <PageFrame className="academy-article"><EmptyState title="Article not found" description="This article may have been removed." action={<Link to="/blog" className="text-link">Explore the blog <ArrowRight size={15} /></Link>} /></PageFrame>;
  return (
    <PageFrame className="academy-article">
      <article>
        <header className="article-heading"><h1>{post.title}</h1><p>{post.excerpt}</p></header>
        <div className="article-byline"><Author post={post} size={34} /><Meta post={post} /></div>
        {post.coverImage && <img src={post.coverImage} alt="" className="article-cover" />}
        <Prose className="article-copy">{post.content}</Prose>
        {post.tags?.length > 0 && <div className="article-tags">{post.tags.map((tag) => <Badge key={tag} tone="slate">#{tag}</Badge>)}</div>}
      </article>
      <div className="article-endnote"><div><h2>Put it into practice.</h2><p>Find a course on the topic you're learning about.</p></div><Link to="/courses" className="text-link">Explore courses <ArrowRight size={16} /></Link></div>
      {post.related?.length > 0 && <section className="article-related"><h2>Keep reading</h2><div className="blog-feed">{post.related.map((item) => <PostCard key={item.id} post={item} />)}</div></section>}
    </PageFrame>
  );
}
