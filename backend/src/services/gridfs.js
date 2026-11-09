import mongoose from 'mongoose';

const BUCKET = 'uploads';

let bucket;

// Files live in MongoDB (GridFS), in the uploads.files / uploads.chunks collections.
export function getBucket() {
  if (!bucket) bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
  return bucket;
}

export const toObjectId = (id) => new mongoose.mongo.ObjectId(id);

export async function findFile(id) {
  const [file] = await getBucket().find({ _id: toObjectId(id) }).limit(1).toArray();
  return file || null;
}

export const deleteFile = (id) => getBucket().delete(toObjectId(id));
