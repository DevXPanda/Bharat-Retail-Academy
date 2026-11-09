export function jsonPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.password;
      return ret;
    },
  });
  schema.set('toObject', { virtuals: true });
}
