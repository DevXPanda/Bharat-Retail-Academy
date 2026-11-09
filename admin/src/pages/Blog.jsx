import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, FileEdit, Newspaper, Pencil, Plus, Trash2, ExternalLink } from 'lucide-react';
import {
  Badge, Button, ConfirmDialog, DataTable, Field, FileUpload, FilterBar, FilterSelect, IconButton, Input, Modal, PageHeader, PersonCell, RowMenu, Select, StatCard, StatGrid, StatusBadge,
  TableCard, TableFooter, Tabs, Textarea, formatDate, formatNumber, indexColumn, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';

const CATEGORIES = ['Seller Tips', 'Amazon', 'Flipkart', 'Meesho', 'Shopify', 'Digital Marketing', 'Product Sourcing', 'Platform Updates'];
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173';
const BLANK = { title: '', category: 'Seller Tips', excerpt: '', content: '', coverImage: '', tags: '', status: 'draft' };

function PostModal({ open, post, onClose }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [lastId, setLastId] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const full = useGet(post ? `/blog/${post.id}` : '/blog/none', undefined, { enabled: open && Boolean(post) }).data;
  const source = post ? full : null;
  const key = open ? `${post?.id || 'new'}:${source ? 'ready' : 'wait'}` : null;

  if (key && key !== lastId && (!post || source)) {
    setLastId(key);
    setErrors({});
    setForm(source ? { title: source.title, category: source.category, excerpt: source.excerpt, content: source.content, coverImage: source.coverImage || '', tags: (source.tags || []).join(', '), status: source.status } : BLANK);
  }
  if (!open && lastId) setLastId(null);

  const save = useAction(
    (status) => {
      const body = { ...form, status, coverImage: form.coverImage || '', tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
      return post ? client.patch(`/blog/${post.id}`, body) : client.post('/blog', body);
    },
    { success: post ? 'Article updated' : 'Article saved', invalidate: ['/blog', '/public/blog'], onSuccess: onClose },
  );

  const submit = (status) => {
    const next = {};
    if (form.title.trim().length < 5) next.title = 'Enter a title (min 5 characters)';
    if (form.excerpt.trim().length < 10) next.excerpt = 'Write a short summary (min 10 characters)';
    if (form.content.trim().length < 30) next.content = 'Write the article content';
    setErrors(next);
    if (Object.keys(next).length) return;
    save.run(status);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={post ? 'Edit article' : 'New article'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="outline" loading={save.loading} onClick={() => submit('draft')}>Save as draft</Button>
          <Button loading={save.loading} onClick={() => submit('published')}>{form.status === 'published' && post ? 'Update & publish' : 'Publish'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title} className="sm:col-span-2"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 7 Amazon Listing Mistakes That Kill Your Sales" /></Field>
        <Field label="Category"><Select value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Tags" hint="Comma separated, up to 8"><Input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="amazon, listing, seo" /></Field>
        <Field label="Short summary" required error={errors.excerpt} className="sm:col-span-2"><Textarea rows={2} maxLength={300} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="Shown on the blog list and in search results" /></Field>
        <Field label="Article content" required error={errors.content} className="sm:col-span-2" hint="Use '## Heading' for headings, '- item' for bullet lists and a blank line between paragraphs.">
          <Textarea rows={12} value={form.content} onChange={(e) => set('content', e.target.value)} placeholder={'Write your article here...\n\n## First heading\nYour paragraph...'} />
        </Field>
        <div className="sm:col-span-2"><FileUpload label="Cover image" kind="image" value={form.coverImage} onChange={(url) => set('coverImage', url)} title="Upload cover image" hint="JPG, PNG or WebP (Max 2MB). Optional" /></div>
      </div>
    </Modal>
  );
}

export default function Blog() {
  const client = useClient();
  const list = useListState({ status: 'all', category: 'all' }, { limit: 8 });
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useGet('/blog/summary').data;
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/blog', list.params, { keepPrevious: true });

  const setStatus = useAction((post, status) => client.patch(`/blog/${post.id}`, { status }), { success: 'Article updated', invalidate: ['/blog', '/public/blog'] });
  const remove = useAction((post) => client.delete(`/blog/${post.id}`), { success: 'Article deleted', invalidate: ['/blog', '/public/blog'], onSuccess: () => setDeleting(null) });

  const tabs = [
    { key: 'all', label: 'All Articles', count: summary?.total.value },
    { key: 'published', label: 'Published', count: summary?.published.value },
    { key: 'draft', label: 'Drafts', count: summary?.drafts.value },
  ];

  const columns = [
    indexColumn(meta),
    {
      key: 'title',
      header: 'Article',
      render: (p) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-violet-100">{p.coverImage && <img src={p.coverImage} alt="" className="h-full w-full object-cover" />}</div>
          <div className="min-w-0"><p className="line-clamp-1 text-[13px] font-bold text-ink">{p.title}</p><p className="line-clamp-1 text-xs text-slate-500">{p.excerpt}</p></div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (p) => <Badge tone="blue">{p.category}</Badge> },
    { key: 'author', header: 'Author', render: (p) => <PersonCell name={p.author?.name} src={p.author?.avatar} size={28} /> },
    { key: 'date', header: 'Published', render: (p) => <span className="whitespace-nowrap">{p.publishedAt ? formatDate(p.publishedAt) : '—'}</span> },
    { key: 'read', header: 'Read', render: (p) => <span className="whitespace-nowrap">{p.readMinutes} min</span> },
    { key: 'views', header: 'Views', align: 'center', render: (p) => formatNumber(p.views) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <IconButton icon={ExternalLink} label="View on site" disabled={p.status !== 'published'} onClick={() => window.open(`${PUBLIC_URL}/blog/${p.slug}`, '_blank', 'noopener')} />
          <IconButton icon={Pencil} label="Edit" onClick={() => setModal({ post: p })} />
          <RowMenu
            items={[
              p.status === 'draft' ? { label: 'Publish', icon: Eye, onClick: () => setStatus.run(p, 'published') } : { label: 'Move to drafts', icon: EyeOff, onClick: () => setStatus.run(p, 'draft') },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(p) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Blog" subtitle="Write, publish and manage articles shown on the public website." actions={<Button size="lg" icon={Plus} onClick={() => setModal({})}>New Article</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={Newspaper} tone="blue" label="Total Articles" value={summary?.total.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="green" label="Published" value={summary?.published.value ?? '—'} sub="Visible on the website" />
        <StatCard icon={FileEdit} tone="orange" label="Drafts" value={summary?.drafts.value ?? '—'} sub="Not published yet" />
        <StatCard icon={Eye} tone="purple" label="Total Views" value={formatNumber(summary?.views.value)} sub="Across all articles" />
      </StatGrid>

      <TableCard className="mt-6" tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
        <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search articles by title or summary..." onReset={list.reset}>
          <FilterSelect value={list.filters.category} onChange={(v) => list.setFilter('category', v)} allLabel="All Categories" options={CATEGORIES.map((c) => ({ value: c, label: c }))} className="w-48" />
        </FilterBar>
        <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={980} />
        <TableFooter meta={meta} noun="articles" onPage={list.setPage} />
      </TableCard>

      <PostModal open={Boolean(modal)} post={modal?.post} onClose={() => setModal(null)} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete article" confirmLabel="Delete" message={`Delete "${deleting?.title}"? This cannot be undone.`} />
    </>
  );
}
