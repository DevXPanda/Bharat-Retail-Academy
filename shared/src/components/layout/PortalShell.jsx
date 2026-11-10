import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AppProviders.jsx';
import { cx } from '../../lib/format.js';
import { sectionFromPath, useMarkSectionSeen, useSectionNotifications } from '../../hooks/notifications.js';
import { BrandMark, BrandName } from './Brand.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { ProfileMenu } from './ProfileMenu.jsx';

const GROUPS = [
  { title: 'Overview', paths: ['/'] },
  { title: 'Learning', paths: ['/students', '/teachers', '/courses', '/batches', '/live-classes', '/attendance', '/recordings', '/assignments', '/certificates'] },
  { title: 'Business', paths: ['/payments', '/payouts', '/reports'] },
  { title: 'Communication', paths: ['/messages', '/reviews', '/leads', '/support', '/blog'] },
];

export function PortalShell({ brand, nav, groups = GROUPS, basePath = '', searchHome = '/students', profilePath, roleLabel = 'Admin', searchPlaceholder, brandTo, brandLabel }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState('');
  const menuButton = useRef(null);
  const drawerRef = useRef(null);
  const { counts } = useSectionNotifications();
  const markSeen = useMarkSectionSeen();
  const openSection = sectionFromPath(pathname);
  const openCount = openSection ? counts[openSection] || 0 : 0;
  const badgeFor = (item) => counts[sectionFromPath(item.to)] || 0;
  // Opening a section (or sitting on it when something new arrives) clears its sidebar count.
  useEffect(() => { if (openSection && openCount > 0) markSeen(openSection); }, [openSection, openCount, markSeen]);
  const page = nav.find((item) => item.to === pathname)?.label || 'Dashboard';

  useEffect(() => { setDrawer(false); setSearch(''); }, [pathname]);
  useEffect(() => {
    if (!drawer) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector('button')?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { setDrawer(false); menuButton.current?.focus(); }
      if (event.key !== 'Tab') return;
      const focusable = [...drawerRef.current.querySelectorAll('a, button')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 1024) setDrawer(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      menuButton.current?.focus();
    };
  }, [drawer]);

  const sidebar = (compact) => (
    <>
      <Link to={brandTo || basePath || '/'} className="admin-brand" aria-label={brandLabel || `${brand.name} dashboard`}>
        <BrandMark size={40} />
        {!compact && <BrandName name={brand.name} caption={brand.caption} dark />}
      </Link>
      <nav className="admin-navigation" aria-label="Portal navigation">
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.title}>
            {!compact && <p>{group.title}</p>}
            {group.paths.map((path) => nav.find((item) => item.to === path)).filter(Boolean).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} title={compact ? item.label : undefined} aria-label={compact ? item.label : undefined} className={({ isActive }) => cx('admin-nav-link', isActive && 'is-active')}>
                <item.icon aria-hidden="true" size={18} />
                {!compact && <span>{item.label}</span>}
                {!compact && badgeFor(item) > 0 && <small>{badgeFor(item) > 99 ? '99+' : badgeFor(item)}</small>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-footer"><button type="button" onClick={logout} title="Logout" aria-label="Logout"><LogOut size={18} />{!compact && <span>Logout</span>}</button></div>
    </>
  );

  return (
    <div className={cx('admin-portal portal-shell', collapsed && 'admin-collapsed')}>
      <a className="admin-skip-link" href="#admin-content">Skip to content</a>
      <aside className="admin-sidebar">{sidebar(collapsed)}</aside>
      {drawer && <div className="admin-drawer-overlay">
        <div className="admin-drawer-backdrop" onClick={() => setDrawer(false)} />
        <aside ref={drawerRef} className="admin-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="admin-drawer-close" aria-label="Close menu" onClick={() => setDrawer(false)}><X size={18} /></button>
          {sidebar(false)}
        </aside>
      </div>}
      <div className="admin-body" inert={drawer ? '' : undefined}>
        <header className="admin-topbar">
          <button ref={menuButton} type="button" className="admin-menu-toggle" aria-label="Toggle menu" aria-expanded={drawer || (window.innerWidth >= 1024 && !collapsed)} onClick={() => window.innerWidth >= 1024 ? setCollapsed((value) => !value) : setDrawer(true)}><Menu size={20} /></button>
          <form className="admin-global-search" role="search" onSubmit={(event) => { event.preventDefault(); const target = [basePath || '/', `${basePath}/reports`, `${basePath}/attendance`].includes(pathname) ? searchHome : pathname; navigate(`${target}?q=${encodeURIComponent(search.trim())}`); }}>
            <Search size={17} aria-hidden="true" />
            <input aria-label="Search portal" placeholder={searchPlaceholder || (roleLabel === 'Student' ? 'Search courses, classes, recordings...' : 'Search students, courses, classes...')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </form>
          <span className="admin-mobile-page">{page}</span>
          <div className="admin-topbar-actions"><NotificationBell /><span className="admin-topbar-divider" /><ProfileMenu roleLabel={roleLabel} profilePath={profilePath} /></div>
        </header>
        <main id="admin-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}
