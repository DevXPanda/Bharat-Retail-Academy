import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per unpaid student per class: remembers when their free preview started, so refreshing never resets it.
const classPreviewSchema = new Schema(
  {
    liveClass: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

classPreviewSchema.index({ liveClass: 1, student: 1 }, { unique: true });

export default mongoose.model('ClassPreview', classPreviewSchema);
