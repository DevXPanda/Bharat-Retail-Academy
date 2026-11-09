import { cx } from '../../lib/format.js';

const BRAND_STYLES = {
  Amazon: { bg: 'bg-[#131a22]', fg: 'text-white', label: 'amazon', accent: 'text-[#ff9900]' },
  Flipkart: { bg: 'bg-[#2874f0]', fg: 'text-white', label: 'Flipkart', accent: 'text-[#ffe500]' },
  Meesho: { bg: 'bg-[#9f2089]', fg: 'text-white', label: 'm', accent: 'text-white' },
  Shopify: { bg: 'bg-[#5e8e3e]', fg: 'text-white', label: 'S', accent: 'text-white' },
  'Digital Marketing': { bg: 'bg-violet-600', fg: 'text-white', label: 'DM', accent: 'text-white' },
  'WhatsApp Marketing': { bg: 'bg-[#25d366]', fg: 'text-white', label: 'WA', accent: 'text-white' },
  'Product Sourcing': { bg: 'bg-orange-500', fg: 'text-white', label: 'PS', accent: 'text-white' },
  'E-Commerce': { bg: 'bg-indigo-500', fg: 'text-white', label: 'EC', accent: 'text-white' },
  'Business Skills': { bg: 'bg-rose-500', fg: 'text-white', label: 'BS', accent: 'text-white' },
};

export function CourseMark({ category, src, size = 44, className }) {
  const style = BRAND_STYLES[category] || BRAND_STYLES['E-Commerce'];
  if (src) return <img src={src} alt="" style={{ width: size, height: size }} className={cx('shrink-0 rounded-xl object-cover', className)} />;
  const ratio = style.label.length > 6 ? 0.19 : style.label.length > 3 ? 0.22 : 0.4;
  return (
    <span style={{ width: size, height: size, fontSize: size * ratio }} className={cx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-extrabold tracking-tight', style.bg, style.accent, className)}>
      {style.label}
    </span>
  );
}

export const brandGradient = (category) =>
  ({
    Amazon: 'from-amber-100 via-orange-50 to-white',
    Flipkart: 'from-sky-100 via-blue-50 to-white',
    Meesho: 'from-fuchsia-100 via-pink-50 to-white',
    Shopify: 'from-emerald-100 via-green-50 to-white',
    'Digital Marketing': 'from-violet-100 via-purple-50 to-white',
    'WhatsApp Marketing': 'from-green-100 via-emerald-50 to-white',
    'Product Sourcing': 'from-orange-100 via-amber-50 to-white',
    'E-Commerce': 'from-indigo-100 via-blue-50 to-white',
    'Business Skills': 'from-rose-100 via-pink-50 to-white',
  })[category] || 'from-brand-100 via-brand-50 to-white';

export const CATEGORY_OPTIONS = ['Amazon', 'Flipkart', 'Meesho', 'Shopify', 'Digital Marketing', 'WhatsApp Marketing', 'Product Sourcing', 'E-Commerce', 'Business Skills'];
