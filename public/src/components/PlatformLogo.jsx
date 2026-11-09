import { Store, BriefcaseBusiness, PackageSearch } from 'lucide-react';
import { cx } from '@ecomedu/ui';

const LOGOS = {
  Amazon: 'amazon.svg', Flipkart: 'flipkart.svg', Meesho: 'meesho.ico',
  Shopify: 'shopify.svg', 'WhatsApp Marketing': 'whatsapp.svg', 'Digital Marketing': 'googleads.svg',
};

export function PlatformLogo({ category, src, size = 40, className }) {
  const logo = LOGOS[category];
  const Icon = category === 'Product Sourcing' ? PackageSearch : category === 'Business Skills' ? BriefcaseBusiness : Store;
  return (
    <span style={{ width: size, height: size }} className={cx('platform-logo', !logo && !src && 'platform-logo-commerce', className)}>
      {src ? <img src={src} alt="" className="h-full w-full rounded-[inherit] object-cover" />
        : logo ? <img src={`/brands/${logo}`} alt={category} style={{ width: size * 0.75, height: size * 0.75 }} className="object-contain" />
          : <Icon aria-hidden="true" style={{ width: size * 0.68, height: size * 0.68 }} />}
    </span>
  );
}
