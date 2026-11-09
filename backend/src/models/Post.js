import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

export const POST_CATEGORIES = ['Seller Tips', 'Amazon', 'Flipkart', 'Meesho', 'Shopify', 'Digital Marketing', 'Product Sourcing', 'Platform Updates'];

const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    coverImage: String,
    category: { type: String, enum: POST_CATEGORIES, default: 'Seller Tips', index: true },
    tags: [String],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: Date,
    readMinutes: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

postSchema.plugin(jsonPlugin);

export default mongoose.model('Post', postSchema);
