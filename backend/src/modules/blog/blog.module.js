import { Router } from 'express';
import { z } from 'zod';
import Post, { POST_CATEGORIES } from '../../models/Post.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escapeRegex, mergeFilters, paginate } from '../../utils/query.js';
import { created, noContent, ok } from '../../utils/response.js';
import { randomId, slugify } from '../../utils/slug.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
  category: z.string().optional(),
  search: z.string().trim().optional(),
});

const postBody = z.object({
  title: z.string().trim().min(5).max(140),
  excerpt: z.string().trim().min(10).max(300),
  content: z.string().trim().min(30, 'Write the article content'),
  coverImage: z.string().optional().or(z.literal('').transform(() => undefined)),
  category: z.enum(POST_CATEGORIES).default('Seller Tips'),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
});

const readMinutes = (content) => Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200));

async function uniqueSlug(title, ignoreId) {
  const base = slugify(title) || randomId(6);
  let slug = base;
  while (await Post.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) slug = `${base}-${randomId(4)}`;
  return slug;
}

const withAuthor = (query) => query.populate('author', 'name avatar');

export const blogRouter = Router();
blogRouter.use(authenticate, authorize('admin'));

blogRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const [total, published, drafts, views] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Post.aggregate([{ $group: { _id: null, views: { $sum: '$views' } } }]),
    ]);
    ok(res, { total: { value: total }, published: { value: published }, drafts: { value: drafts }, views: { value: views[0]?.views || 0 } });
  }),
);

blogRouter.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, limit, status, category, search } = req.query;
    const filter = mergeFilters(
      status && status !== 'all' ? { status } : null,
      category && category !== 'all' ? { category } : null,
      search ? { $or: [{ title: new RegExp(escapeRegex(search), 'i') }, { excerpt: new RegExp(escapeRegex(search), 'i') }] } : null,
    );
    const { items, meta } = await paginate(Post, filter, { page, limit, select: '-content', populate: [{ path: 'author', select: 'name avatar' }] });
    ok(res, items, meta);
  }),
);

blogRouter.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const post = await withAuthor(Post.findById(req.params.id));
    if (!post) throw ApiError.notFound('Article not found');
    ok(res, post);
  }),
);

blogRouter.post(
  '/',
  validate({ body: postBody }),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const post = await Post.create({
      ...body,
      slug: await uniqueSlug(body.title),
      author: req.user._id,
      readMinutes: readMinutes(body.content),
      publishedAt: body.status === 'published' ? new Date() : undefined,
    });
    created(res, await withAuthor(Post.findById(post._id)));
  }),
);

blogRouter.patch(
  '/:id',
  validate({ params: idParam, body: postBody.partial() }),
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) throw ApiError.notFound('Article not found');
    const body = req.body;
    if (body.title && body.title !== post.title) post.slug = await uniqueSlug(body.title, post._id);
    if (body.content) post.readMinutes = readMinutes(body.content);
    if (body.status === 'published' && !post.publishedAt) post.publishedAt = new Date();
    Object.assign(post, body);
    if ('coverImage' in body && !body.coverImage) post.coverImage = undefined;
    await post.save();
    ok(res, await withAuthor(Post.findById(post._id)));
  }),
);

blogRouter.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const removed = await Post.findByIdAndDelete(req.params.id);
    if (!removed) throw ApiError.notFound('Article not found');
    noContent(res);
  }),
);

const publicListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(9),
  category: z.string().optional(),
  search: z.string().trim().optional(),
});

export const publicBlogRouter = Router();

publicBlogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = await Post.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    ok(res, rows.map((r) => ({ name: r._id, count: r.count })));
  }),
);

publicBlogRouter.get(
  '/',
  validate({ query: publicListQuery }),
  asyncHandler(async (req, res) => {
    const { page, limit, category, search } = req.query;
    const filter = mergeFilters(
      { status: 'published' },
      category && category !== 'all' ? { category } : null,
      search ? { $or: [{ title: new RegExp(escapeRegex(search), 'i') }, { excerpt: new RegExp(escapeRegex(search), 'i') }] } : null,
    );
    const { items, meta } = await paginate(Post, filter, { page, limit, sort: { publishedAt: -1 }, select: '-content', populate: [{ path: 'author', select: 'name avatar' }] });
    ok(res, items, meta);
  }),
);

publicBlogRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const post = await withAuthor(Post.findOneAndUpdate({ slug: req.params.slug, status: 'published' }, { $inc: { views: 1 } }, { new: true }));
    if (!post) throw ApiError.notFound('Article not found');
    const related = await Post.find({ status: 'published', category: post.category, _id: { $ne: post._id } }).sort({ publishedAt: -1 }).limit(3).select('-content').populate('author', 'name avatar');
    ok(res, { ...post.toJSON(), related });
  }),
);
