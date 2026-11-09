import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format.js';

let locks = 0;
let originalOverflow = '';
let originalInert = false;

export function PortalDrawer({ open, onClose, title, subtitle, size = 'md', footer, children }) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const root = document.getElementById('root');
    if (locks++ === 0) {
      originalOverflow = document.body.style.overflow;
      originalInert = root?.inert || false;
      document.body.style.overflow = 'hidden';
      if (root) root.inert = true;
    }
    panel.current?.querySelector('button')?.focus();
    const onKey = (event) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === 'Escape') { event.stopPropagation(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const items = [...panel.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((item) => item.getClientRects().length);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (--locks === 0) {
        document.body.style.overflow = originalOverflow;
        if (root) root.inert = originalInert;
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="portal-drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close.current?.(); }}>
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx('portal-drawer', `portal-drawer-${size}`)}>
        <header className="portal-drawer-heading">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="portal-drawer-content">{children}</div>
        {footer && <footer className="portal-drawer-footer">{footer}</footer>}
      </section>
    </div>, document.body,
  );
}
