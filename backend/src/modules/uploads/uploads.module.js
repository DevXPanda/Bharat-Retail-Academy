import { Router } from 'express';
import env from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { uploaders, uploadKinds } from '../../middleware/upload.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created } from '../../utils/response.js';
import { findFile, getBucket, toObjectId } from '../../services/gridfs.js';
import { uploadLimiter } from '../../middleware/security.js';
import { verifyFileSignature } from '../../services/fileLinks.js';
import { compressImage, enqueueVideo, storeBuffer } from '../../services/media.js';

export const fileUrl = (id, name) => `${env.PUBLIC_API_URL}/api/v1/files/${id}/${encodeURIComponent(name || 'file')}`;

// Upload (login required): stores the file in MongoDB and returns a link to it.
export const uploadsRouter = Router();
uploadsRouter.use(authenticate, uploadLimiter);

uploadsRouter.post('/:kind', (req, res, next) => {
  const { kind } = req.params;
  if (!uploadKinds.includes(kind)) return next(ApiError.badRequest('Unknown upload type'));
  if (kind === 'video' && req.user.role === 'student') return next(ApiError.forbidden());
  return uploaders[kind](req, res, async (err) => {
    try {
      if (err) throw err;
      const file = req.file;
      if (!file) throw ApiError.badRequest('No file received');

      if (kind === 'video') {
        enqueueVideo(file.id);
        return created(res, { url: fileUrl(file.id, file.originalname), name: file.originalname, size: file.size, mime: file.mimetype, optimizing: true });
      }

      // Images are shrunk to WebP before they ever reach the database; other files are stored as they are.
      const stored = file.mimetype.startsWith('image/')
        ? await compressImage(file.buffer, file.originalname, file.mimetype)
        : { buffer: file.buffer, filename: file.originalname, mime: file.mimetype };
      const id = await storeBuffer(stored.buffer, { filename: stored.filename, contentType: stored.mime, metadata: { kind, uploadedBy: req.user.id, originalSize: file.size } });
      return created(res, { url: fileUrl(id, stored.filename), name: stored.filename, size: stored.buffer.length, originalSize: file.size, mime: stored.mime });
    } catch (error) {
      return next(error);
    }
  });
});

// Download (public link, ids are unguessable): supports Range so videos can seek.
export const filesRouter = Router();

filesRouter.get(
  '/:id/:name?',
  asyncHandler(async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw ApiError.notFound('File not found');
    const file = await findFile(req.params.id);
    if (!file) throw ApiError.notFound('File not found');

    // Images (avatars, thumbnails, logos) are public; videos and documents need a signed, expiring link.
    const isImage = String(file.contentType || '').startsWith('image/');
    if (!isImage && !verifyFileSignature(req.params.id, req.query.exp, req.query.sig)) throw ApiError.notFound('File not found');
    const inline = isImage || /^(video\/|application\/pdf)/.test(file.contentType || '');

    const etag = `"${file._id}"`;
    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      ETag: etag,
      'Cache-Control': isImage ? 'public, max-age=31536000, immutable' : 'private, max-age=3600',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    let start = 0;
    let end = file.length - 1;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      if (range[1]) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(Number(range[2]), end);
      } else {
        start = Math.max(0, file.length - Number(range[2]));
      }
      if (start > end || start >= file.length) {
        res.set('Content-Range', `bytes */${file.length}`);
        return res.status(416).end();
      }
      res.status(206).set('Content-Range', `bytes ${start}-${end}/${file.length}`);
    }
    res.set('Content-Length', String(file.length === 0 ? 0 : end - start + 1));
    if (file.length === 0) return res.end();

    const stream = getBucket().openDownloadStream(toObjectId(req.params.id), { start, end: end + 1 });
    stream.on('error', () => res.destroy());
    return stream.pipe(res);
  }),
);
