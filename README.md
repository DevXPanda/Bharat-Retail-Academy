# Bharat Retail Academy

E-commerce learning platform: public portal + student area, admin panel, teacher portal and a Node/MongoDB API.

```
backend/   Express + Mongoose API, Socket.io, Razorpay, seed data      (port 5000)
public/    Public website + student portal (/app/*)                    (port 5173)
admin/     Admin panel                                                 (port 5174)
teacher/   Teacher portal                                              (port 5175)
shared/    @ecomedu/ui - design system used by all three frontends
reference-ui/  The original UI PDFs
```

## Run locally

```bash
npm install
cp backend/.env.example backend/.env      # set JWT_SECRET, MONGODB_URI, Razorpay keys
npm run dev:db      # optional: local MongoDB (no install needed). Skip if you use Atlas / own mongod
npm run seed        # demo data
npm run dev         # api + public + admin + teacher
```

Seed logins: `admin@ecomedu.in / Admin@123`, `rahul@ecomedu.in / Teacher@123`, `student@ecomedu.in / Student@123`.
Each portal only accepts its own role. Admin creates teachers; students sign up themselves (or the admin adds them and shares the temporary password).

## Backend layout

`src/modules/<feature>/` holds routes, controller, service and validation per feature (auth, students, teachers, courses,
batches, liveClasses, recordings, attendance, certificates, payments, payouts, messages, reports, ...).
Shared pieces: `config/`, `middleware/`, `models/`, `services/` (realtime, notifications, access scope, Jitsi), `jobs/`, `seed/`.

## Payments (Razorpay)

1. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
2. Add a webhook in the Razorpay dashboard: `POST https://<api>/api/v1/payments/webhook` with events
   `payment.captured`, `payment.failed`, `refund.processed`.
3. Flow: student clicks Buy -> `/payments/orders` -> Razorpay Checkout -> `/payments/verify` (HMAC check) -> enrollment is created.
   The webhook is the safety net if the browser closes. Refunds are issued from Admin > Payments.

Teacher payouts are tracked and marked paid manually (UTR id); automated RazorpayX payouts are not wired.

## Live classes

Classes use Jitsi inside the app (mic, camera, screen share, tile view, custom control bar) with in-class chat/Q&A over Socket.io.
`meet.jit.si` limits embedded use, so for production set the `JAAS_*` variables (8x8 Jitsi as a Service, signed JWT, moderator rights
for teachers) or point `JITSI_DOMAIN` to a self-hosted Jitsi. Zoom / Google Meet links are also supported per class.
Attendance is recorded automatically when students join/leave; teachers can correct it.
Recording needs JaaS or a Jibri deployment - recordings are otherwise uploaded by the admin.

## Notes

- GST, platform fee, business/invoice details and footer contact/social links are managed in Admin > Platform Settings (stored in MongoDB). They are not set in `.env` (defaults on first run: GST 18% included in price, platform fee 10%).
- Blog articles are written in Admin > Blog; support tickets are raised by students (Support) and answered in Admin > Support Tickets.
- Admin also has Attendance, Assignments, Reviews and Leads & Enquiries (hero/contact/newsletter submissions) pages.
- `npm run seed -w backend` resets everything; `npm run seed:content -w backend` re-seeds only tickets, blog posts and reviews.
- Uploads are stored inside MongoDB (GridFS) and served from `/api/v1/files/<id>`; no Cloudinary, S3 or Redis. Images are resized and converted to WebP on upload (input up to 10 MB), videos are re-encoded to 720p H.264 in the background (input up to 200 MB, one at a time, playable immediately and swapped under the same link when done), PDFs/zips/text are stored as they are. `npm run compress:uploads -w backend` shrinks images stored before this existed. A free Atlas cluster has only 512 MB, so for long recordings prefer pasting a video link.
- Forgot-password / email sending is not implemented.
- Replace the hero illustration by setting `HERO_IMAGE` in `public/src/config.js`.
