import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../config.js';

const UPDATED = 'January 2026';

const DOCS = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['Information we collect', 'We collect the details you give us when you sign up, enroll or contact us (name, email, mobile number), your learning activity (progress, attendance, assignments) and basic device data needed to keep your account secure.'],
      ['How we use it', 'To create your account, deliver courses and live classes, issue certificates, process payments, send class reminders and improve the platform. We do not sell your personal data.'],
      ['Payments', 'Payments are processed by Razorpay. We never see or store your card, UPI or net-banking credentials - only the order and payment reference needed to confirm your enrollment.'],
      ['Live classes and recordings', 'Live classes may be recorded for students of the same course. Your name and chat messages can be visible to the teacher and other participants during a class.'],
      ['Your choices', `You can update your profile at any time from your account. To request a copy or deletion of your data, write to ${SUPPORT_EMAIL}.`],
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      ['Your account', 'You are responsible for keeping your login details private and for all activity under your account. Accounts are for personal use and may not be shared or resold.'],
      ['Course access', 'After a successful payment you get access to the course for the period shown on the course page. Course content, live class links and recordings are for your personal learning only.'],
      ['Acceptable use', 'Do not record, copy or redistribute course material, disrupt live classes, or misuse chat. We may suspend accounts that break these rules.'],
      ['Certificates', 'A certificate is issued when you complete the course requirements. Each certificate carries a unique ID that anyone can verify on our website.'],
      ['Changes', 'We may update courses, schedules and these terms from time to time. Material changes will be communicated through the platform.'],
    ],
  },
  'refund-policy': {
    title: 'Refund Policy',
    sections: [
      ['Eligibility', 'If a course is not what you expected, request a refund within 7 days of purchase, provided you have completed less than 20% of the course content and attended no more than one live class.'],
      ['How to request', `Email ${SUPPORT_EMAIL} from your registered address with your order ID. Our team reviews every request within 2 working days.`],
      ['Processing', 'Approved refunds are returned to the original payment method through Razorpay and usually reflect in your account within 5-7 working days, depending on your bank.'],
      ['Cancelled classes', 'If a live class is cancelled we reschedule it or share the recording at no extra cost.'],
      ['Not refundable', 'Courses purchased with a discount coupon during special promotions, and certificates already issued, are not eligible for refund unless the offer says otherwise.'],
    ],
  },
};

export default function Legal({ doc }) {
  const { title, sections } = DOCS[doc];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {UPDATED}</p>
      <div className="mt-8 space-y-7">
        {sections.map(([heading, body], i) => (
          <section key={heading}>
            <h2 className="text-lg font-extrabold text-ink">{i + 1}. {heading}</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Questions? <Link to="/contact" className="font-semibold text-brand-600 hover:underline">Contact us</Link> or write to {SUPPORT_EMAIL}.</p>
    </div>
  );
}
