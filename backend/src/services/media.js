import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';
import sharp from 'sharp';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { ApiError } from '../utils/ApiError.js';
import { findFile, getBucket, toObjectId } from './gridfs.js';

const IMAGE_MAX_SIDE = 1600;
const IMAGE_QUALITY = 80;
const VIDEO_MAX_WIDTH = 1280;
const VIDEO_TIMEOUT_MS = 45 * 60 * 1000;

const swapExt = (name, ext) => name.replace(/\.[^./\\]+$/, '') + ext;
const filesCol = () => mongoose.connection.db.collection('uploads.files');
const chunksCol = () => mongoose.connection.db.collection('uploads.chunks');

// Images become resized WebP (usually 70-90% smaller); the original is kept only if it is already smaller.
export async function compressImage(buffer, filename, mime) {
  let output;
  try {
    output = await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: IMAGE_MAX_SIDE, height: IMAGE_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();
  } catch {
    throw ApiError.badRequest('This image could not be read. Upload a valid JPG, PNG or WebP');
  }
  if (output.length >= buffer.length) return { buffer, filename, mime };
  return { buffer: output, filename: swapExt(filename, '.webp'), mime: 'image/webp' };
}

export async function storeBuffer(buffer, { filename, contentType, metadata }) {
  const stream = getBucket().openUploadStream(filename, { contentType, metadata });
  await new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.end(buffer);
  });
  return stream.id;
}

function runFfmpeg(input, output) {
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-vf', `scale=trunc(min(${VIDEO_MAX_WIDTH}\\,iw)/2)*2:-2`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', output,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg.path, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.on('data', (d) => { errors = (errors + d).slice(-500); });
    const timer = setTimeout(() => child.kill('SIGKILL'), VIDEO_TIMEOUT_MS);
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => { clearTimeout(timer); return code === 0 ? resolve() : reject(new Error(errors || `ffmpeg exited with ${code}`)); });
  });
}

const markState = (id, state) => filesCol().updateOne({ _id: toObjectId(id) }, { $set: { 'metadata.compression': state } });

// Moves freshly written chunks under an existing id, so links keep working during and after the swap.
async function relabel(id, fresh) {
  const oldId = toObjectId(id);
  const [doc] = await filesCol().find({ _id: fresh }).toArray();
  await chunksCol().deleteMany({ files_id: oldId });
  await chunksCol().updateMany({ files_id: fresh }, { $set: { files_id: oldId } });
  await filesCol().updateOne({ _id: oldId }, { $set: { length: doc.length, chunkSize: doc.chunkSize, filename: doc.filename, contentType: doc.contentType, metadata: doc.metadata, uploadDate: doc.uploadDate } });
  await filesCol().deleteOne({ _id: fresh });
}

async function swapContents(id, tempPath, original) {
  const fresh = getBucket().openUploadStream(swapExt(original.filename, '.mp4'), {
    contentType: 'video/mp4',
    metadata: { ...original.metadata, compression: 'done', originalSize: original.length },
  });
  await pipeline(fs.createReadStream(tempPath), fresh);
  await relabel(id, fresh.id);
}

// One-off: shrinks images that were stored before compression existed. Same links, smaller bytes.
export async function recompressStoredImages() {
  const files = await filesCol().find({ contentType: /^image\//, 'metadata.compression': { $ne: 'done' } }).toArray();
  const report = { checked: files.length, shrunk: 0, savedBytes: 0 };
  for (const file of files) {
    const chunks = [];
    for await (const chunk of getBucket().openDownloadStream(file._id)) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    let result;
    try {
      result = await compressImage(buffer, file.filename, file.contentType);
    } catch {
      continue;
    }
    if (result.buffer.length >= buffer.length) {
      await markState(file._id, 'done');
      continue;
    }
    const fresh = await storeBuffer(result.buffer, { filename: result.filename, contentType: result.mime, metadata: { ...file.metadata, compression: 'done', originalSize: buffer.length } });
    await relabel(file._id, fresh);
    report.shrunk += 1;
    report.savedBytes += buffer.length - result.buffer.length;
  }
  return report;
}

async function compressVideo(id) {
  const original = await findFile(id);
  if (!original || original.metadata?.compression !== 'pending') return;

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ecomedu-video-'));
  const input = path.join(dir, 'input');
  const output = path.join(dir, 'output.mp4');
  try {
    await pipeline(getBucket().openDownloadStream(toObjectId(id)), fs.createWriteStream(input));
    await runFfmpeg(input, output);
    const { size } = await fs.promises.stat(output);
    if (size < original.length * 0.95) await swapContents(id, output, original);
    else await markState(id, 'skipped');
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

// One video at a time so uploads never starve the API of CPU. No Redis: a simple in-memory queue.
const queue = [];
let running = false;

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const id = queue.shift();
    try {
      await compressVideo(id);
    } catch (err) {
      console.error(`Video compression failed for ${id}: ${err.message}`);
      await markState(id, 'failed').catch(() => {});
    }
  }
  running = false;
}

export function enqueueVideo(id) {
  queue.push(String(id));
  drain();
}

// After a restart, pick up any video that was still waiting to be compressed.
export async function resumePendingVideos() {
  const pending = await filesCol().find({ 'metadata.compression': 'pending' }).project({ _id: 1 }).toArray();
  pending.forEach((f) => enqueueVideo(f._id));
  return pending.length;
}
