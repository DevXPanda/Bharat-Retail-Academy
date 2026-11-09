import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

// One row per successful sign-in, so admins can see when and from what device someone logged in.
const loginEventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    portal: String,
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

loginEventSchema.plugin(jsonPlugin);

export default mongoose.model('LoginEvent', loginEventSchema);
