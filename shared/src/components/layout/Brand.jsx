import { cx } from '../../lib/format.js';
import logoLarge from '../../logo/logo.png';
import logoSmall from '../../logo/logo-small.png';

// One place for the brand. Change the logo by replacing the files in shared/src/logo.
export const BRAND = {
  name: 'Bharat Retail Academy',
  short: 'Bharat Retail',
};

export const BRAND_LOGO = logoLarge;

export function BrandMark({ size = 40, className }) {
  return <img src={logoSmall} alt={`${BRAND.name} logo`} width={size} height={size} style={{ width: size, height: size }} className={cx('shrink-0 rounded-full bg-white object-cover shadow-md ring-1 ring-black/10', className)} />;
}

export function BrandName({ name = BRAND.name, caption, dark, className }) {
  return (
    <span className={cx('flex min-w-0 flex-col leading-tight', className)}>
      <span className={cx('text-[17px] font-extrabold tracking-tight', dark ? 'text-white' : 'text-ink')}>{name}</span>
      {caption && <span className={cx('text-xs', dark ? 'text-slate-300' : 'text-slate-500')}>{caption}</span>}
    </span>
  );
}
