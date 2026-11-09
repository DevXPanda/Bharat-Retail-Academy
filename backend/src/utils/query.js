import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  sort: z.string().trim().optional(),
});

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function searchFilter(fields, term) {
  if (!term) return null;
  const regex = new RegExp(escapeRegex(term), 'i');
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

export function mergeFilters(...filters) {
  const parts = filters.filter((f) => f && Object.keys(f).length);
  if (!parts.length) return {};
  return parts.length === 1 ? parts[0] : { $and: parts };
}

export function dateRangeFilter(field, from, to) {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
}

export async function paginate(model, filter, { page, limit, sort = { createdAt: -1 }, populate = [], select, lean = false } = {}) {
  let query = model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (select) query = query.select(select);
  populate.forEach((p) => {
    query = query.populate(p);
  });
  if (lean) query = query.lean();
  const [items, total] = await Promise.all([query, model.countDocuments(filter)]);
  return { items, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function monthBounds(offset = 0, ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + offset + 1, 1);
  return { start, end };
}

export async function monthTrend(model, baseFilter = {}, field = 'createdAt') {
  const { start: curStart, end: curEnd } = monthBounds(0);
  const { start: prevStart, end: prevEnd } = monthBounds(-1);
  const [current, previous] = await Promise.all([
    model.countDocuments({ ...baseFilter, [field]: { $gte: curStart, $lt: curEnd } }),
    model.countDocuments({ ...baseFilter, [field]: { $gte: prevStart, $lt: prevEnd } }),
  ]);
  return percentChange(current, previous);
}

// Walks every page of a paginated list so CSV exports are not capped at one page.
export async function collectPages(fetchPage, { limit = 100, maxPages = 50 } = {}) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { items, meta } = await fetchPage(page, limit);
    all.push(...items);
    if (page >= meta.pages) break;
  }
  return all;
}
