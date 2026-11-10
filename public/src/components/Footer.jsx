import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND, BrandMark, BrandName, useAction, useClient, useGet } from '@ecomedu/ui';
import { useAuthModal } from './AuthModal.jsx';
import { ADDRESS as DEFAULT_ADDRESS, FOOTER_COURSE_LINKS, SOCIALS as DEFAULT_SOCIALS, SUPPORT_EMAIL as DEFAULT_EMAIL, SUPPORT_HOURS as DEFAULT_HOURS, SUPPORT_PHONE as DEFAULT_PHONE } from '../config.js';

const COLUMNS = [
  ['Courses', [...FOOTER_COURSE_LINKS.map((category) => [category, `/courses?category=${encodeURIComponent(category)}`]), ['All courses', '/courses']]],
  ['Learning', [['Live classes', '/live-classes'], ['Teachers', '/teachers'], ['Verify certificate', '/verify'], ['Blog', '/blog']]],
  [BRAND.short, [['About us', '/about'], ['Contact us', '/contact'], ['Log in', '#login'], ['Create account', '#signup']]],
];
const LEGAL = [['Privacy policy', '/privacy'], ['Terms of use', '/terms'], ['Refund policy', '/refund-policy']];

function Newsletter() {
  const client = useClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const subscribe = useAction(() => client.post('/public/leads', { name: 'Newsletter subscriber', email: email.trim(), source: 'newsletter' }), {
    success: 'You are subscribed.',
    onSuccess: () => setEmail(''),
  });

  const submit = (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
    setError('');
    return subscribe.run();
  };

  return (
    <form onSubmit={submit} noValidate className="footer-newsletter">
      <label htmlFor="footer-newsletter-email">Course updates<span>New courses and class schedules.</span></label>
      <div className="footer-newsletter-field">
        <div className="footer-email-input">
          <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
          <input id="footer-newsletter-email" type="email" autoComplete="email" value={email} aria-invalid={Boolean(error)} aria-describedby={error ? 'footer-newsletter-error' : undefined} onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }} placeholder="Your email address" />
          <button type="submit" disabled={subscribe.loading} aria-label="Subscribe to course updates">{subscribe.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</button>
        </div>
        {error && <p id="footer-newsletter-error" role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    </form>
  );
}

export default function Footer() {
  const { open: openAuth } = useAuthModal();
  // Contact details and social links come from Admin > Platform Settings; config.js is only the fallback.
  const site = useGet('/public/settings').data;
  const SUPPORT_EMAIL = site?.supportEmail || DEFAULT_EMAIL;
  const SUPPORT_PHONE = site?.supportPhone || DEFAULT_PHONE;
  const SUPPORT_HOURS = site?.supportHours ?? DEFAULT_HOURS;
  const ADDRESS = [site?.businessName, site?.address].filter(Boolean).join(', ') || DEFAULT_ADDRESS;
  const SOCIALS = site ? DEFAULT_SOCIALS.map((s) => ({ ...s, href: site.social?.[s.key] })).filter((s) => s.href) : DEFAULT_SOCIALS;
  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="footer-top">
          <Link to="/" aria-label={`${BRAND.name} home`} className="footer-brand"><BrandMark size={46} /><BrandName dark /></Link>
          <Newsletter />
        </div>

        <div className="footer-grid">
          {COLUMNS.map(([title, items]) => (
            <nav key={title} aria-label={`Footer ${title}`}>
              <h2>{title}</h2>
              <ul>{items.map(([label, to]) => <li key={to}>{to.startsWith('#') ? <button type="button" onClick={() => openAuth(to.slice(1))}>{label}</button> : <Link to={to}>{label}</Link>}</li>)}</ul>
            </nav>
          ))}
          <div className="footer-contact">
            <h2>Get in touch</h2>
            <address>
              <a href={`mailto:${SUPPORT_EMAIL}`}><Mail aria-hidden="true" /><span>{SUPPORT_EMAIL}</span></a>
              <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}><Phone aria-hidden="true" /><span>{SUPPORT_PHONE}<small>{SUPPORT_HOURS}</small></span></a>
              <p><MapPin aria-hidden="true" /><span>{ADDRESS}</span></p>
            </address>
            <div className="footer-socials" aria-label="Social links">{SOCIALS.map((social) => <a key={social.key} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label}><img src={`/brands/${social.key}.svg`} alt="" width="17" height="17" /></a>)}</div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <nav aria-label="Legal"><ul>{LEGAL.map(([label, to]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul></nav>
        </div>
      </div>
    </footer>
  );
}
