import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import env from '../config/env.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Enrollment from '../models/Enrollment.js';
import LiveClass from '../models/LiveClass.js';
import Attendance from '../models/Attendance.js';
import Recording from '../models/Recording.js';
import Certificate from '../models/Certificate.js';
import Payment from '../models/Payment.js';
import Payout from '../models/Payout.js';
import Assignment from '../models/Assignment.js';
import Counter from '../models/Counter.js';
import { Conversation, Message } from '../models/Message.js';
import { Announcement, ClassChat, Lead, Notification, Review } from '../models/Engagement.js';
import { generatePayouts } from '../modules/payouts/payouts.service.js';
import { slugify, randomId } from '../utils/slug.js';
import { seedSupportAndBlog } from './content.js';
import { upsertAdmin } from './admin.js';

const DAY = 86400000;
const now = new Date();
const daysFrom = (n, hour = 10, minute = 0) => {
  const d = new Date(now.getTime() + n * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const pick = (list, i) => list[i % list.length];
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const PASSWORDS = { admin: 'Admin@123', teacher: 'Teacher@123', student: 'Student@123' };

const teacherSeed = [
  { name: 'Rahul Verma', email: 'rahul@ecomedu.in', expertise: 'Amazon', phone: '9876500001', status: 'active', rate: 1500 },
  { name: 'Nikita Yadav', email: 'nikita@ecomedu.in', expertise: 'Flipkart', phone: '9876500002', status: 'active', rate: 1400 },
  { name: 'Satyam Pandey', email: 'satyam@ecomedu.in', expertise: 'Shopify', phone: '9876500003', status: 'active', rate: 1600 },
  { name: 'Priya Mehta', email: 'priya.mehta@ecomedu.in', expertise: 'Digital Marketing', phone: '9876500004', status: 'active', rate: 1300 },
  { name: 'Neha Sharma', email: 'neha.sharma@ecomedu.in', expertise: 'E-Commerce', phone: '9876500005', status: 'active', rate: 1200 },
  { name: 'Kavita Gupta', email: 'kavita@ecomedu.in', expertise: 'Meesho', phone: '9876500006', status: 'inactive', rate: 1000 },
  { name: 'Rohit Mehta', email: 'rohit.mehta@ecomedu.in', expertise: 'Product Sourcing', phone: '9876500007', status: 'active', rate: 1100 },
  { name: 'Anjali Singh', email: 'anjali.singh@ecomedu.in', expertise: 'WhatsApp Marketing', phone: '9876500008', status: 'pending', rate: 1000 },
];

const courseSeed = [
  { title: 'Amazon Seller Mastery', category: 'Amazon', teacher: 0, price: 1499, mrp: 2999, badge: 'Bestseller', level: 'Beginner to Advanced', rating: 4.8, ratingCount: 1200, topic: 'Amazon' },
  { title: 'Flipkart Growth Program', category: 'Flipkart', teacher: 1, price: 1299, mrp: 2499, badge: 'Popular', level: 'Beginner to Intermediate', rating: 4.7, ratingCount: 950, topic: 'Flipkart' },
  { title: 'Meesho Seller Training', category: 'Meesho', teacher: 5, price: 999, mrp: 1999, badge: 'New', level: 'Beginner', rating: 4.6, ratingCount: 780, topic: 'Meesho' },
  { title: 'Shopify Store Setup', category: 'Shopify', teacher: 2, price: 1799, mrp: 3499, badge: 'Trending', level: 'Beginner to Advanced', rating: 4.8, ratingCount: 640, topic: 'Shopify' },
  { title: 'Digital Marketing for eCommerce', category: 'Digital Marketing', teacher: 3, price: 1499, mrp: 2999, badge: 'Most Enrolled', level: 'Intermediate', rating: 4.7, ratingCount: 1100, topic: 'Ads' },
  { title: 'Product Sourcing Mastery', category: 'Product Sourcing', teacher: 6, price: 1199, mrp: 2499, badge: 'New', level: 'All Levels', rating: 4.6, ratingCount: 520, topic: 'Sourcing' },
  { title: 'E-commerce Business Mastery', category: 'E-Commerce', teacher: 4, price: 2499, mrp: 4999, badge: 'Popular', level: 'Beginner to Advanced', rating: 4.8, ratingCount: 1100, topic: 'Business' },
  { title: 'Complete E-Commerce Course', category: 'E-Commerce', teacher: 4, price: 4999, mrp: 9999, badge: 'Bestseller', level: 'All Levels', rating: 4.9, ratingCount: 1500, topic: 'E-commerce' },
  { title: 'WhatsApp Marketing for Sellers', category: 'WhatsApp Marketing', teacher: 7, price: 999, mrp: 1999, badge: '', level: 'Beginner', rating: 4.5, ratingCount: 410, topic: 'WhatsApp' },
  { title: 'Ecommerce SEO & Ranking', category: 'Digital Marketing', teacher: 3, price: 1499, mrp: 2999, badge: '', level: 'Intermediate', rating: 4.6, ratingCount: 360, topic: 'SEO' },
  { title: 'Amazon Advertising Pro', category: 'Amazon', teacher: 0, price: 2999, mrp: 5999, badge: 'Trending', level: 'Advanced', rating: 4.8, ratingCount: 480, topic: 'Amazon Ads' },
  { title: 'Dropshipping Fundamentals', category: 'Business Skills', teacher: 6, price: 899, mrp: 1799, badge: '', level: 'Beginner', rating: 4.4, ratingCount: 290, topic: 'Dropshipping' },
];

const firstNames = ['Rahul', 'Priya', 'Amit', 'Neha', 'Vikas', 'Pooja', 'Sandeep', 'Anjali', 'Rohit', 'Kavita', 'Simran', 'Manish', 'Vikas', 'Sneha', 'Arjun', 'Divya', 'Karan', 'Meera', 'Nitin', 'Ritu', 'Sahil', 'Tanvi', 'Yash', 'Isha', 'Deepak'];
const lastNames = ['Sharma', 'Gupta', 'Verma', 'Singh', 'Patel', 'Mehta', 'Kumar', 'Jain', 'Kaur', 'Yadav', 'Pandey', 'Shah', 'Reddy', 'Das'];

const lessonTemplates = (topic) => [
  { title: 'Getting Started', lessons: [`Welcome to ${topic}`, 'How this course works', `${topic} basics explained`] },
  { title: 'Core Concepts', lessons: ['Account & business setup', 'Listing and catalog essentials', 'Pricing and margins', 'Order management'] },
  { title: 'Growth & Scaling', lessons: ['Promotions and ads', 'Analytics and reports', 'Handling returns and support', 'Scaling your business'] },
].map((m) => ({ ...m, lessons: m.lessons.map((title, i) => ({ title, type: 'video', url: SAMPLE_VIDEO, durationMin: 8 + ((i * 7) % 14), isPreview: m.title === 'Getting Started' && i === 0 })) }));

async function reset() {
  await Promise.all([
    User, Course, Batch, Enrollment, LiveClass, Attendance, Recording, Certificate, Payment, Payout, Assignment, Counter,
    Conversation, Message, Announcement, ClassChat, Lead, Notification, Review,
  ].map((m) => m.deleteMany({})));
}

async function seedUsers() {
  const admin = await User.create({ name: 'Arvind Chaurasiya', email: 'admin@ecomedu.in', phone: '9876500000', password: PASSWORDS.admin, role: 'admin', status: 'active' });

  const teachers = [];
  for (const t of teacherSeed) {
    teachers.push(
      await User.create({
        name: t.name,
        email: t.email,
        phone: t.phone,
        password: PASSWORDS.teacher,
        role: 'teacher',
        status: t.status,
        gender: 'Male',
        location: 'Delhi, India',
        about: `I am an e-commerce expert with 5+ years of experience in ${t.expertise}. I love helping people build successful online businesses through practical, result-oriented training.`,
        lastActiveAt: daysFrom(-1),
        teacher: {
          designation: 'E-Commerce Trainer & Consultant',
          expertise: t.expertise,
          bio: `Helping individuals and businesses grow with practical ${t.expertise} strategies.`,
          experienceYears: 5,
          company: 'Freelance Trainer',
          languages: ['Hindi', 'English', 'Hinglish'],
          workExperience: 'Worked with multiple brands and trained 1000+ students in e-commerce, marketplace management, product listing, ads and growth strategies.',
          skills: [`${t.expertise} Seller Training`, 'Product Listing', 'PPC Ads', 'SEO for E-commerce', 'Marketplace Growth', 'Inventory Management', 'Customer Support', 'Business Planning', 'Live Q&A Sessions'],
          education: [
            { title: 'Bachelor of Commerce (B.Com)', institute: 'Delhi University', year: '2011 - 2014' },
            { title: 'Advanced E-Commerce Certification', institute: 'Amazon', year: '2020' },
          ],
          certifications: [
            { title: 'Digital Marketing Certification', issuer: 'Google', year: '2019' },
            { title: 'E-Commerce Business Strategy', issuer: 'Coursera', year: '2021' },
          ],
          ratePerClass: t.rate,
          bank: { holderName: t.name, bankName: 'HDFC Bank', accountNumber: `50100${Math.floor(1000000 + Math.random() * 8999999)}`, ifsc: 'HDFC0001234', accountType: 'Savings Account', upiId: `${t.name.split(' ')[0].toLowerCase()}@upi`, verified: true },
          availability: [{ day: 'Mon - Fri', from: '10:00', to: '19:00' }],
        },
      }),
    );
  }

  const students = [];
  const total = 42;
  for (let i = 0; i < total; i += 1) {
    const name = i === 0 ? 'Priya Mehta' : `${pick(firstNames, i)} ${pick(lastNames, i * 3 + 1)}`;
    const email = i === 0 ? 'student@ecomedu.in' : `${slugify(name).replace(/-/g, '.')}${i}@example.com`;
    const status = i % 14 === 7 ? 'inactive' : i % 8 === 5 ? 'pending' : 'active';
    const student = new User({ name, email, phone: `98765${String(43000 + i).padStart(5, '0')}`, password: PASSWORDS.student, role: 'student', status, lastActiveAt: daysFrom(-(i % 9)) });
    student.createdAt = daysFrom(-Math.floor(i * 9.5));
    students.push(await student.save({ timestamps: false }));
  }
  return { admin, teachers, students };
}

async function seedCourses(teachers) {
  const courses = [];
  for (const [i, c] of courseSeed.entries()) {
    const teacher = teachers[c.teacher];
    const course = new Course({
      title: c.title,
      slug: slugify(c.title),
      shortDescription: `Complete step-by-step ${c.topic} training with live classes, recordings and a verified certificate.`,
      description: `Learn ${c.topic} from industry experts with practical, hands-on training. Live doubt sessions, lifetime-style recordings and assignments are included.\n\nBy the end of this course you will be able to set up, manage and scale your business confidently.`,
      category: c.category,
      price: c.price,
      mrp: c.mrp,
      level: c.level,
      badge: c.badge,
      rating: c.rating,
      ratingCount: c.ratingCount,
      status: i === 9 || i === 11 ? 'draft' : 'published',
      instructor: teacher._id,
      teachers: [teacher._id],
      liveClassesCount: 8 + (i % 5) * 2,
      modules: lessonTemplates(c.topic),
    });
    await course.save();
    courses.push(course);
  }
  return courses;
}

async function seedBatches(courses, teachers) {
  const plan = [
    { c: 0, name: 'Amazon Batch 01', timing: 'Morning Batch', start: -40, end: 20, status: 'active' },
    { c: 1, name: 'Flipkart Batch 02', timing: 'Evening Batch', start: -35, end: 25, status: 'active' },
    { c: 3, name: 'Shopify Batch 01', timing: 'Weekend Batch', start: -30, end: 30, status: 'active' },
    { c: 4, name: 'Digital Marketing 01', timing: 'Morning Batch', start: -25, end: 35, status: 'active' },
    { c: 0, name: 'Amazon Batch 02', timing: 'Weekend Batch', start: 4, end: 50, status: 'upcoming' },
    { c: 1, name: 'Flipkart Batch 03', timing: 'Afternoon Batch', start: 9, end: 60, status: 'upcoming' },
    { c: 3, name: 'Shopify Batch 02', timing: 'Evening Batch', start: 15, end: 70, status: 'upcoming' },
    { c: 5, name: 'Product Sourcing 01', timing: 'Weekend Batch', start: -120, end: -60, status: 'completed' },
    { c: 6, name: 'E-commerce Mastery 01', timing: 'Evening Batch', start: -110, end: -45, status: 'completed' },
    { c: 7, name: 'Complete Course 01', timing: 'Morning Batch', start: -20, end: 90, status: 'active' },
    { c: 2, name: 'Meesho Batch 01', timing: 'Morning Batch', start: -150, end: -90, status: 'completed' },
  ];
  const batches = [];
  for (const p of plan) {
    const course = courses[p.c];
    batches.push(await Batch.create({ name: p.name, timing: p.timing, course: course._id, teacher: course.instructor, capacity: p.c === 7 ? 60 : 50, startDate: daysFrom(p.start, 0), endDate: daysFrom(p.end, 0), status: p.status }));
  }
  return batches;
}

async function seedEnrollmentsAndPayments(students, courses, batches) {
  const enrollments = [];
  const published = courses.filter((c) => c.status === 'published');
  let pay = 0;

  for (const [i, student] of students.entries()) {
    if (student.status === 'pending') continue;
    const count = i % 3 === 0 ? 2 : 1;
    for (let k = 0; k < count; k += 1) {
      const course = pick(published, i + k * 4);
      if (enrollments.some((e) => String(e.student) === String(student._id) && String(e.course) === String(course._id))) continue;
      const batch = batches.find((b) => String(b.course) === String(course._id) && ['active', 'completed'].includes(b.status)) || batches.find((b) => String(b.course) === String(course._id));
      const isStudentDemo = i === 0;
      const progress = isStudentDemo && k === 0 ? 65 : [80, 60, 40, 20, 75, 100, 55, 90][(i + k) % 8];
      const done = progress === 100;
      const paidAt = new Date(now.getTime() - ((pay * 11) % 330) * DAY - 3 * DAY);

      const payment = await Payment.create({
        student: student._id,
        course: course._id,
        batch: batch?._id,
        amount: course.price,
        method: 'Razorpay',
        status: 'successful',
        razorpayOrderId: `order_${randomId(12)}`,
        razorpayPaymentId: `pay_${randomId(12)}`,
        transactionId: `pay_${randomId(12)}`,
        paidAt,
        createdAt: paidAt,
        updatedAt: paidAt,
      });
      pay += 1;

      const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => String(l._id)));
      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        batch: batch?._id,
        status: student.status === 'inactive' ? 'inactive' : done ? 'completed' : 'active',
        accessStart: paidAt,
        accessEnd: new Date(paidAt.getTime() + 365 * DAY),
        progress,
        completedLessons: lessonIds.slice(0, Math.round((lessonIds.length * progress) / 100)),
        source: 'payment',
        payment: payment._id,
        completedAt: done ? new Date(paidAt.getTime() + 60 * DAY) : undefined,
      });
      enrollments.push(enrollment);
    }
  }

  // payment states other than success
  const extra = [
    ['failed', 0], ['failed', 1], ['failed', 2], ['pending', 3], ['pending', 4], ['refunded', 5], ['refunded', 6], ['refunded', 7],
  ];
  for (const [status, i] of extra) {
    const student = students[i + 10];
    const course = pick(published, i + 2);
    const date = daysFrom(-(i * 6 + 2));
    await Payment.create({
      student: student._id,
      course: course._id,
      amount: course.price,
      status,
      method: 'Razorpay',
      razorpayOrderId: `order_${randomId(12)}`,
      razorpayPaymentId: status === 'refunded' ? `pay_${randomId(12)}` : undefined,
      transactionId: status === 'refunded' ? `pay_${randomId(12)}` : undefined,
      failureReason: status === 'failed' ? 'Payment declined by bank' : undefined,
      paidAt: status === 'refunded' ? date : undefined,
      refund: status === 'refunded' ? { amount: course.price, razorpayRefundId: `rfnd_${randomId(10)}`, reason: 'Requested by student', refundedAt: date } : undefined,
      createdAt: date,
    });
  }
  return enrollments;
}

async function seedClasses(courses, batches, teachers, enrollments) {
  const classes = [];
  const activeBatches = batches.filter((b) => b.status === 'active' || b.status === 'completed');
  const topics = ['Product Listing Best Practices', 'Catalog & Pricing Strategy', 'Store Theme Customization', 'Ads Strategy Planning', 'Order Management', 'Doubt Clearing Session', 'Account Health & Policies', 'Scaling Your Store'];
  const teacherFor = (course) => teachers.find((t) => String(t._id) === String(course.instructor));

  for (const [bi, batch] of activeBatches.entries()) {
    const course = courses.find((c) => String(c._id) === String(batch.course));
    const teacher = teacherFor(course);
    const pastCount = batch.status === 'completed' ? 8 : 6;
    for (let k = 0; k < pastCount; k += 1) {
      const offset = batch.status === 'completed' ? Number(batch.endDate) / DAY - now.getTime() / DAY - k * 5 - 2 : -(k * 4 + 1 + bi);
      const startsAt = daysFrom(Math.round(offset), 10 + (k % 3) * 2);
      classes.push(
        await LiveClass.create({
          title: `${course.title.split(' ').slice(0, 2).join(' ')}: ${pick(topics, k + bi)}`,
          topic: pick(topics, k + bi),
          course: course._id,
          batch: batch._id,
          teacher: teacher._id,
          startsAt,
          durationMin: k % 3 === 0 ? 90 : 60,
          maxStudents: 50,
          platform: 'jitsi',
          roomName: `ecomedu-${randomId(10)}`,
          status: 'completed',
          startedAt: startsAt,
          endedAt: new Date(startsAt.getTime() + 60 * 60000),
          earning: teacher.teacher.ratePerClass,
        }),
      );
    }
  }

  // live now + upcoming
  const first = batches[0];
  const amazon = courses[0];
  const live = await LiveClass.create({
    title: 'Amazon Product Listing Best Practices',
    topic: 'Listing quality',
    course: amazon._id,
    batch: first._id,
    teacher: amazon.instructor,
    startsAt: new Date(now.getTime() - 40 * 60000),
    startedAt: new Date(now.getTime() - 35 * 60000),
    durationMin: 90,
    maxStudents: 50,
    platform: 'jitsi',
    roomName: `ecomedu-amazon-listing-${randomId(6)}`,
    status: 'live',
  });
  classes.push(live);

  const upcomingPlan = [
    [1, 0, 1, 11], [2, 1, 1, 14], [3, 3, 2, 15], [5, 4, 3, 14], [6, 10, 4, 16], [7, 0, 1, 10], [9, 2, 1, 12],
  ];
  for (const [dayOffset, batchIdx, , hour] of upcomingPlan) {
    const batch = activeBatches[batchIdx % activeBatches.length];
    const course = courses.find((c) => String(c._id) === String(batch.course));
    const teacher = teacherFor(course);
    classes.push(
      await LiveClass.create({
        title: `${course.title.split(' ').slice(0, 2).join(' ')} Workshop: ${pick(topics, dayOffset)}`,
        topic: pick(topics, dayOffset),
        course: course._id,
        batch: batch._id,
        teacher: teacher._id,
        startsAt: daysFrom(dayOffset, hour),
        durationMin: dayOffset % 2 ? 60 : 90,
        maxStudents: 50,
        platform: dayOffset === 5 ? 'zoom' : 'jitsi',
        meetingLink: dayOffset === 5 ? 'https://zoom.us/j/123456789' : undefined,
        roomName: dayOffset === 5 ? undefined : `ecomedu-${randomId(10)}`,
        status: 'upcoming',
      }),
    );
  }
  classes.push(
    await LiveClass.create({ title: 'Advanced Listing Optimization', course: amazon._id, batch: first._id, teacher: amazon.instructor, startsAt: daysFrom(-9, 16), durationMin: 90, status: 'cancelled', platform: 'jitsi', roomName: `ecomedu-${randomId(10)}` }),
  );

  // attendance for completed classes
  for (const cls of classes.filter((c) => c.status === 'completed')) {
    const eligible = enrollments.filter((e) => String(e.course) === String(cls.course) && (!cls.batch || String(e.batch) === String(cls.batch)));
    const rows = eligible.map((e, i) => {
      const roll = (i + Number(String(cls._id).slice(-2).charCodeAt(0))) % 10;
      const status = roll < 7 ? 'present' : roll < 8 ? 'late' : 'absent';
      const joined = status !== 'absent';
      return {
        liveClass: cls._id,
        student: e.student,
        status,
        joinTime: joined ? new Date(cls.startsAt.getTime() + (status === 'late' ? 15 : 2) * 60000) : undefined,
        leaveTime: joined ? cls.endedAt : undefined,
        durationMin: joined ? cls.durationMin - (status === 'late' ? 15 : 3) : 0,
      };
    });
    if (rows.length) await Attendance.insertMany(rows);
  }
  return classes;
}

async function seedRecordings(classes, courses) {
  const done = classes.filter((c) => c.status === 'completed').slice(0, 14);
  const statuses = ['published', 'published', 'published', 'processing', 'published', 'unpublished', 'published', 'published', 'processing', 'published', 'published', 'archived', 'published', 'published'];
  for (const [i, cls] of done.entries()) {
    await Recording.create({
      title: cls.title,
      course: cls.course,
      batch: cls.batch,
      teacher: cls.teacher,
      liveClass: cls._id,
      videoUrl: SAMPLE_VIDEO,
      durationSec: 2700 + ((i * 731) % 3600),
      classDate: cls.startsAt,
      status: statuses[i % statuses.length],
      processingProgress: statuses[i % statuses.length] === 'processing' ? Math.min(95, 32 + i * 9) : 0,
      views: statuses[i % statuses.length] === 'published' ? 90 + ((i * 53) % 260) : 0,
    });
  }
  return courses;
}

async function seedCertificates(enrollments, admin) {
  let n = 0;
  for (const e of enrollments.filter((x) => x.status === 'completed')) {
    const course = await Course.findById(e.course);
    const status = ['verified', 'verified', 'pending', 'verified', 'revoked'][n % 5];
    await Certificate.create({
      certificateId: `EC-${e.completedAt.getFullYear()}-${course.category.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${1000 + n}`,
      student: e.student,
      course: e.course,
      batch: e.batch,
      completionDate: e.completedAt,
      status,
      downloads: status === 'verified' && n % 2 === 0 ? 2 : 0,
      issuedBy: admin._id,
    });
    n += 1;
  }
}

async function seedPayouts(teachers) {
  const results = [];
  for (let m = 6; m >= 0; m -= 1) {
    const from = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
    results.push(...(await generatePayouts({ from, to })));
  }
  const ordered = results.sort((a, b) => a.periodTo - b.periodTo);
  for (const [i, payout] of ordered.entries()) {
    const recent = payout.periodTo > new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (!recent) {
      payout.status = 'paid';
      payout.payoutDate = new Date(payout.periodTo.getTime() + 5 * DAY);
      payout.transactionId = `TRX${12345678 + i}`;
      payout.method = pick(['Bank Transfer', 'Razorpay', 'Cashfree', 'PayU'], i);
    } else if (i % 5 === 0) {
      payout.status = 'processing';
    } else if (i % 7 === 0) {
      payout.status = 'failed';
      payout.failureReason = 'Beneficiary account details mismatch';
    }
    await payout.save();
  }
  return teachers;
}

async function seedMessages(admin, teachers, students) {
  const demoStudent = students[0];
  const rahul = teachers[0];
  const key = (a, b) => [String(a._id), String(b._id)].sort().join(':');

  const make = async (a, b, lines) => {
    const conversation = await Conversation.create({ participants: [a._id, b._id], participantKey: key(a, b) });
    let last = null;
    let unread = 0;
    for (const [i, [senderIsA, text]] of lines.entries()) {
      const sender = senderIsA ? a : b;
      last = await Message.create({ conversation: conversation._id, sender: sender._id, text, readBy: [sender._id], createdAt: new Date(now.getTime() - (lines.length - i) * 18 * 60000) });
      if (!senderIsA) unread += 1;
    }
    conversation.lastMessage = { text: last.text, sender: last.sender };
    conversation.lastMessageAt = last.createdAt;
    conversation.unread.set(String(a._id), unread);
    await conversation.save();
  };

  await make(demoStudent, rahul, [
    [true, "Hello Sir, I am not able to play the class recording of Module 2. It shows an error message. Please help me resolve this issue."],
    [false, 'Hi Priya, thank you for reaching out. We are checking this issue. Could you please share a screenshot of the error message?'],
    [true, "It's working now. Thank you so much for the quick support!"],
  ]);
  await make(demoStudent, admin, [
    [true, 'Hi, when will my certificate be issued?'],
    [false, 'Hi Priya, certificates are issued within 2 working days after course completion.'],
  ]);
  await make(students[1], admin, [[true, 'Ma\'am, aaj ki class recording kab upload hogi?'], [true, 'Please let me know.']]);
  await make(teachers[1], admin, [[true, 'Kal ke batch ke liye materials ready hain.']]);
  await make(students[3], rahul, [[true, 'Sir, assignment submit kar diya hai, please check.']]);
}

async function seedMisc(admin, courses, teachers, students) {
  await Announcement.create({ title: 'Diwali Special Batch', body: 'A special weekend batch starts on 25th. Limited seats available.', audience: 'all', sentAt: daysFrom(-3), createdBy: admin._id });
  await Announcement.create({ title: 'Platform maintenance', body: 'Brief maintenance window this Sunday 2 AM - 3 AM.', audience: 'all', scheduledAt: daysFrom(3), createdBy: admin._id });

  for (const [i, teacher] of teachers.slice(0, 5).entries()) {
    const own = courses.filter((c) => String(c.instructor) === String(teacher._id));
    for (const course of own.slice(0, 2)) {
      await Assignment.create({
        title: pick(['Product Research Task', 'Catalog Optimization', 'Store Setup Assignment', 'Marketing Strategy Plan', 'Final Project'], i + course.title.length),
        description: 'Submit your work as a PDF or share a link.',
        course: course._id,
        teacher: teacher._id,
        dueDate: daysFrom(5 + i),
        status: i === 3 ? 'closed' : 'active',
        submissions: students.slice(0, 6 + i).map((s) => ({ student: s._id, note: 'Submitted', submittedAt: daysFrom(-1) })),
      });
    }
  }

  await Notification.create([
    { user: students[0]._id, title: 'Class is live now', body: 'Amazon Product Listing Best Practices has started. Join now!', type: 'live-class', link: '/app/live-classes' },
    { user: admin._id, title: 'Certificate awaiting verification', body: 'A student completed a course.', type: 'certificate' },
  ]);
  await Lead.create({ name: 'Demo Lead', email: 'lead@example.com', phone: '9000000000', goal: 'Start selling on Amazon' });
}

async function main() {
  await connectDb();
  console.log('Resetting collections...');
  await reset();

  const { admin, teachers, students } = await seedUsers();
  await upsertAdmin();
  const courses = await seedCourses(teachers);
  const batches = await seedBatches(courses, teachers);
  const enrollments = await seedEnrollmentsAndPayments(students, courses, batches);
  const classes = await seedClasses(courses, batches, teachers, enrollments);
  await seedRecordings(classes, courses);
  await seedCertificates(enrollments, admin);
  await seedPayouts(teachers);
  await seedMessages(admin, teachers, students);
  await seedMisc(admin, courses, teachers, students);
  await seedSupportAndBlog();

  console.log('\nSeed complete. Sign-in credentials');
  console.log(`  Admin    : admin@ecomedu.in   / ${PASSWORDS.admin}`);
  console.log(`  Teacher  : rahul@ecomedu.in   / ${PASSWORDS.teacher}   (satyam@, nikita@, ... same password)`);
  console.log(`  Student  : student@ecomedu.in / ${PASSWORDS.student}`);
  console.log(`  Razorpay configured: ${env.razorpayEnabled}`);
  await disconnectDb();
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
