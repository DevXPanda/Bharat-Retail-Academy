import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Ticket from '../models/Ticket.js';
import Post from '../models/Post.js';
import Enrollment from '../models/Enrollment.js';
import { Review } from '../models/Engagement.js';
import Counter from '../models/Counter.js';
import { slugify } from '../utils/slug.js';

const HOUR = 3600000;

const POSTS = [
  {
    title: '7 Amazon Listing Mistakes That Quietly Kill Your Sales',
    category: 'Amazon',
    tags: ['amazon', 'listing', 'conversion'],
    excerpt: 'Most new sellers lose rankings before they get their first review. Here are the listing mistakes we see every week and how to fix them.',
    content: `Your listing is your shop window. A weak one costs you impressions, clicks and finally orders, even when the product is good.

## 1. Stuffing keywords into the title
Amazon rewards clear titles. Lead with the brand, the product type and the single most important benefit. Keep it readable on a phone.

## 2. Low quality main image
Your main image decides the click. Use a pure white background, fill about 85% of the frame and show the product only.

## 3. Ignoring bullet points
Each bullet should answer one buyer question. Start with the benefit in capitals, then explain it in one line.

## 4. No A+ content
Brand registered sellers can add A+ content. Listings with it convert noticeably better because buyers see the product in use.

## 5. Wrong category and attributes
A wrong browse node hides you from the right shoppers. Fill every attribute the category offers.

## 6. Pricing without checking the Buy Box
- Compare your landed price with the top three sellers.
- Check shipping speed and fulfilment type.
- Reprice weekly, not daily.

## 7. Skipping search term research
Use the backend search terms field for synonyms and Hindi or Hinglish spellings your buyers actually type.

Fix these seven and re-check your impressions after two weeks. Small listing changes compound quickly.`,
  },
  {
    title: 'Flipkart vs Meesho: Where Should a Beginner Start Selling?',
    category: 'Seller Tips',
    tags: ['flipkart', 'meesho', 'beginners'],
    excerpt: 'Both marketplaces bring millions of buyers, but they reward very different sellers. A simple comparison to help you choose your first platform.',
    content: `Choosing the first marketplace is the most common question we get from new learners.

## Who buys on each platform
Flipkart shoppers compare brands and read reviews. Meesho buyers are price sensitive and shop mostly from smaller cities, often through resellers.

## Margins and fees
- Flipkart charges commission, fixed and shipping fees that vary by category.
- Meesho has zero commission for most sellers, so your margin depends on price discipline.

## Product fit
Branded or differentiated products do better on Flipkart. Fashion, home and low-ticket utility products move fast on Meesho.

## Our recommendation
Start on the platform where your product price fits the buyer. If your selling price is under 500 rupees, test Meesho first. Above that, begin with Flipkart and add Meesho later for volume.`,
  },
  {
    title: 'How to Set Up Your First Shopify Store in One Weekend',
    category: 'Shopify',
    tags: ['shopify', 'store setup'],
    excerpt: 'A practical checklist to take a Shopify store from empty dashboard to first order without getting lost in apps and themes.',
    content: `You do not need a developer to launch a store. You need a clear checklist.

## Saturday morning: foundation
- Pick a short, memorable domain.
- Choose one clean theme and stay with it.
- Set up taxes, shipping zones and your payment gateway.

## Saturday afternoon: products
Add 5 to 10 products with good photos, honest descriptions and clear variants. Quality beats quantity at the start.

## Sunday: trust and traffic
- Add About, Contact, Refund and Shipping pages.
- Install only the apps you truly need.
- Connect Instagram and Google so people can find you.

## Before you launch
Place a test order end to end. Check the email, the invoice and the mobile checkout. Then share the link with ten people you know.`,
  },
  {
    title: 'Facebook Ads for Sellers: A Simple Budget Plan for Your First 30 Days',
    category: 'Digital Marketing',
    tags: ['ads', 'facebook', 'budget'],
    excerpt: 'Do not burn money on ads before you know what works. Use this staged budget to test creatives, audiences and offers safely.',
    content: `Paid ads are a testing tool first and a scaling tool later.

## Week 1: creatives
Run three different creatives to one broad audience with a small daily budget. Look at click-through rate and cost per click.

## Week 2: audiences
Keep the best creative and test two audiences. Do not change the creative while you test.

## Week 3: offer
Test a bundle, a free delivery threshold or a limited time price. Offers move conversion more than design tweaks.

## Week 4: scale carefully
Increase the budget by 20 percent every two days while the cost per purchase stays under your target. If it rises, pause and go back one step.

Track everything in one sheet: spend, clicks, orders and profit per order.`,
  },
  {
    title: 'New on Bharat Retail Academy: Verified Certificates and Live Class Recordings',
    category: 'Platform Updates',
    tags: ['update', 'certificates', 'recordings'],
    excerpt: 'Every completed course now comes with a certificate you can verify online, and every live class is available as a recording.',
    content: `We are happy to share two updates that learners asked for the most.

## Verified certificates
When you complete a course you receive a PDF certificate with a unique ID. Anyone can paste that ID on our verify page to confirm it is genuine. Add it to LinkedIn or share it with clients.

## Live class recordings
Missed a session or want to revisit a topic? Recordings of live classes appear in your dashboard after the class and stay available during your course access.

## Support when you need it
You can now raise a support ticket from your student dashboard for payment, access or class issues. Our team replies inside the platform and you get a notification on every update.`,
  },
];

const REVIEW_TEXT = [
  [5, 'Very practical course. I listed my first product within a week of starting.'],
  [5, 'The live classes cleared every doubt. Instructor explains with real examples.'],
  [4, 'Good content and recordings are helpful. Would love a few more assignments.'],
  [5, 'Worth every rupee. The certificate also helped me with my client pitches.'],
  [4, 'Step by step approach is great for beginners. Support team replied quickly.'],
  [3, 'Content is good but some sessions felt a little fast for me.'],
  [5, 'Best e-commerce course I have taken. Clear, honest and up to date.'],
  [4, 'Nice batch and very interactive Q&A sessions every weekend.'],
];

const TICKETS = [
  { subject: 'Unable to play Module 2 recording', category: 'live_class', priority: 'high', message: 'I am not able to play the class recording of Module 2. It shows an error message. Please help me resolve this.', status: 'in_progress', reply: 'Hi, we are checking this. Could you share a screenshot of the error and the browser you are using?' },
  { subject: 'Payment deducted but course not unlocked', category: 'payment', priority: 'high', message: 'My payment was deducted from my account yesterday but the course is still locked. Order ID is available in my bank SMS.', status: 'open' },
  { subject: 'Certificate name correction needed', category: 'certificate', priority: 'medium', message: 'My name on the certificate is spelt wrongly. Please correct it so that I can share it on LinkedIn.', status: 'resolved', reply: 'Your name has been corrected and a fresh certificate is available in your dashboard.' },
  { subject: 'Cannot join today\'s live class', category: 'live_class', priority: 'medium', message: 'The join button is disabled for my batch even though the class has started. Please check my enrollment.', status: 'resolved', reply: 'Your batch mapping was fixed. Please refresh and join again.' },
  { subject: 'Need invoice for my purchase', category: 'payment', priority: 'low', message: 'Please share the GST invoice of my course purchase for my accounts team.', status: 'open' },
  { subject: 'Course access expiry date', category: 'course_access', priority: 'low', message: 'Can you confirm until when I will have access to this course? I could not find it in my account.', status: 'closed', reply: 'Your access is valid for 12 months from the purchase date.' },
  { subject: 'App is slow on mobile network', category: 'technical', priority: 'medium', message: 'The course player buffers a lot on my mobile network. Is there a lower quality option?', status: 'in_progress', reply: 'We are looking at adaptive quality for the player. Meanwhile please try downloading the notes.' },
];

export async function seedSupportAndBlog() {
  const [admin, demo, students, courses] = await Promise.all([
    User.findOne({ role: 'admin' }),
    User.findOne({ email: 'student@ecomedu.in' }),
    User.find({ role: 'student', email: { $ne: 'student@ecomedu.in' } }).sort({ createdAt: 1 }).limit(13),
    Course.find({ status: 'published' }).select('_id'),
  ]);
  if (!admin || !students.length) throw new Error('Run the main seed first (npm run seed)');

  await Promise.all([Ticket.deleteMany({}), Post.deleteMany({}), Review.deleteMany({}), Counter.deleteOne({ _id: 'ticket' })]);

  const now = Date.now();
  const owners = [demo, ...students].filter(Boolean);

  let number = 1000;
  const tickets = [];
  for (let i = 0; i < 14; i += 1) {
    const spec = TICKETS[i % TICKETS.length];
    const student = owners[i % owners.length];
    number += 1;
    const created = new Date(now - (14 - i) * 9 * HOUR);
    const replies = [{ author: student._id, role: 'student', text: spec.message, createdAt: created }];
    if (spec.reply) replies.push({ author: admin._id, role: 'admin', text: spec.reply, createdAt: new Date(created.getTime() + 2 * HOUR) });
    tickets.push({
      ticketNumber: number,
      student: student._id,
      course: courses.length ? courses[i % courses.length]._id : undefined,
      subject: spec.subject,
      category: spec.category,
      priority: spec.priority,
      status: spec.status,
      replies,
      lastReplyAt: replies[replies.length - 1].createdAt,
      resolvedAt: ['resolved', 'closed'].includes(spec.status) ? replies[replies.length - 1].createdAt : undefined,
    });
  }
  await Ticket.insertMany(tickets);
  await Counter.create({ _id: 'ticket', seq: number - 1000 });

  await Post.insertMany(
    POSTS.map((post, i) => ({
      ...post,
      slug: slugify(post.title),
      author: admin._id,
      status: 'published',
      publishedAt: new Date(now - (i + 1) * 4 * 24 * HOUR),
      readMinutes: Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200)),
      views: 120 + i * 85,
    })),
  );
  await Post.create({
    title: 'Draft: Meesho Pricing Calculator Walkthrough',
    slug: 'draft-meesho-pricing-calculator-walkthrough',
    category: 'Meesho',
    excerpt: 'Work in progress - a walkthrough of how to calculate your real margin on Meesho after shipping and returns.',
    content: 'Outline: cost price, shipping slab, return rate and the final margin formula. This article is still being written.',
    author: admin._id,
    status: 'draft',
    readMinutes: 1,
  });

  const enrollments = await Enrollment.find({ status: { $in: ['active', 'completed'] } }).sort({ createdAt: 1 }).limit(16);
  const reviews = enrollments.map((e, i) => ({ course: e.course, student: e.student, rating: REVIEW_TEXT[i % REVIEW_TEXT.length][0], comment: REVIEW_TEXT[i % REVIEW_TEXT.length][1], createdAt: new Date(now - (i + 1) * 36 * HOUR) }));
  await Review.insertMany(reviews, { ordered: false }).catch(() => {});

  console.log(`Seeded ${reviews.length} reviews,`);
  console.log(`Seeded ${tickets.length} support tickets and ${POSTS.length + 1} blog posts`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  connectDb()
    .then(seedSupportAndBlog)
    .then(async () => {
      await disconnectDb();
      await mongoose.disconnect();
    })
    .catch(async (err) => {
      console.error(err);
      await disconnectDb();
      process.exit(1);
    });
}
