import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/format.js';

export function Popover({ trigger, children, align = 'right', width, className, open: controlledOpen, onOpenChange }) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (value) => (onOpenChange ? onOpenChange(value) : setInnerOpen(value));
  const anchor = useRef(null);
  const panel = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const panelWidth = width || panel.current?.offsetWidth || 200;
    let left = align === 'right' ? rect.right - panelWidth : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    const panelHeight = panel.current?.offsetHeight || 0;
    const below = rect.bottom + 6;
    const top = below + panelHeight > window.innerHeight - 8 && rect.top - panelHeight - 6 > 8 ? rect.top - panelHeight - 6 : below;
    setPos({ top, left });
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panel.current?.contains(e.target) || anchor.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onScroll = (e) => {
      if (!panel.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <span ref={anchor} className="inline-flex" onClick={() => setOpen(!open)}>
        {trigger}
      </span>
      {open &&
        createPortal(
          <div ref={panel} style={{ top: pos.top, left: pos.left, width }} className={cx('fixed z-[70] rounded-xl border border-slate-200 bg-white shadow-pop', className)}>
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </div>,
          document.body,
        )}
    </>
  );
}
