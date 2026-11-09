import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { deleteFile, getBucket } from '../services/gridfs.js';

const KINDS = {
  image: { mimes: ['image/jpeg', 'image/png', 'image/webp'], maxMb: 10, memory: true },
  video: { mimes: ['video/mp4', 'video/webm', 'video/quicktime'], maxMb: 200, memory: false },
  file: { mimes: ['application/pdf', 'image/jpeg', 'image/png', 'application/zip', 'text/plain'], maxMb: 10, memory: true },
};

export const uploadKinds = Object.keys(KINDS);

// Videos are too big for memory, so they stream straight into MongoDB GridFS and are compressed afterwards.
const videoStorage = () => ({
  _handleFile(req, file, cb) {
    const stream = getBucket().openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { kind: 'video', uploadedBy: req.user?.id, compression: 'pending' },
    });
    file.stream.pipe(stream);
    stream.on('error', cb);
    stream.on('finish', () => cb(null, { id: stream.id, size: stream.length }));
  },
  _removeFile(_req, file, cb) {
    deleteFile(file.id).then(() => cb(null), () => cb(null));
  },
});

export function createUploader(kind) {
  const config = KINDS[kind];
  return multer({
    storage: config.memory ? multer.memoryStorage() : videoStorage(),
    limits: { fileSize: config.maxMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!config.mimes.includes(file.mimetype)) return cb(ApiError.badRequest(`Unsupported file type for ${kind}`));
      return cb(null, true);
    },
  }).single('file');
}

export const uploaders = Object.fromEntries(uploadKinds.map((k) => [k, createUploader(k)]));
