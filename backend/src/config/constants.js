export const ROLES = Object.freeze({ ADMIN: 'admin', TEACHER: 'teacher', STUDENT: 'student' });

export const USER_STATUS = ['active', 'pending', 'inactive'];
export const COURSE_STATUS = ['published', 'draft'];
export const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Beginner to Advanced', 'Beginner to Intermediate', 'All Levels'];
export const COURSE_BADGES = ['Bestseller', 'Popular', 'New', 'Trending', 'Most Enrolled'];
export const CATEGORIES = [
  'Amazon',
  'Flipkart',
  'Meesho',
  'Shopify',
  'Digital Marketing',
  'WhatsApp Marketing',
  'Product Sourcing',
  'E-Commerce',
  'Business Skills',
];
export const BATCH_STATUS = ['draft', 'upcoming', 'active', 'completed'];
export const ENROLLMENT_STATUS = ['active', 'pending', 'inactive', 'completed'];
export const CLASS_STATUS = ['upcoming', 'live', 'completed', 'cancelled'];
export const CLASS_PLATFORMS = ['jitsi', 'zoom', 'meet'];
export const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'not_marked'];
export const RECORDING_STATUS = ['published', 'processing', 'unpublished', 'archived'];
export const CERTIFICATE_STATUS = ['pending', 'verified', 'revoked', 'expired'];
export const PAYMENT_STATUS = ['created', 'successful', 'pending', 'failed', 'refunded'];
export const PAYOUT_STATUS = ['pending', 'processing', 'paid', 'failed'];
export const PAYOUT_METHODS = ['Bank Transfer', 'Razorpay', 'Cashfree', 'PayU', 'UPI'];

export const LATE_AFTER_MINUTES = 10;
export const JOIN_WINDOW_MINUTES = 15;
export const PREVIEW_SECONDS = 60;
