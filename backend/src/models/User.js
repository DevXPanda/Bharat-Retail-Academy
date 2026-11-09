import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, USER_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';
import { nextSequence } from './Counter.js';

const { Schema } = mongoose;

const teacherProfileSchema = new Schema(
  {
    designation: String,
    expertise: { type: String, trim: true },
    bio: String,
    experienceYears: { type: Number, default: 0 },
    company: String,
    languages: [String],
    workExperience: String,
    skills: [String],
    education: [{ title: String, institute: String, year: String }],
    certifications: [{ title: String, issuer: String, year: String }],
    ratePerClass: { type: Number, default: 1000, min: 0 },
    bank: {
      holderName: String,
      bankName: String,
      accountNumber: String,
      ifsc: String,
      accountType: { type: String, default: 'Savings Account' },
      upiId: String,
      verified: { type: Boolean, default: false },
    },
    availability: [{ day: String, from: String, to: String }],
    social: { linkedin: String, youtube: String, instagram: String, website: String },
    permissions: {
      scheduleClasses: { type: Boolean, default: true },
      uploadRecordings: { type: Boolean, default: true },
      messageStudents: { type: Boolean, default: true },
      viewEarnings: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT, index: true },
    status: { type: String, enum: USER_STATUS, default: 'active', index: true },
    avatar: String,
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    dob: Date,
    location: String,
    about: String,
    studentCode: { type: String, index: true, sparse: true },
    mustChangePassword: { type: Boolean, default: false },
    lastActiveAt: Date,
    teacher: teacherProfileSchema,
  },
  { timestamps: true },
);

userSchema.index({ name: 'text', email: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (this.isNew && this.role === ROLES.STUDENT && !this.studentCode) {
    const seq = await nextSequence('student');
    this.studentCode = `STU${String(seq).padStart(5, '0')}`;
  }
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.plugin(jsonPlugin);

export default mongoose.model('User', userSchema);
