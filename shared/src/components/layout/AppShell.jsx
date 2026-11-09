import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AppProviders.jsx';
import { cx } from '../../lib/format.js';
import { BrandMark, BrandName } from './Brand.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { ProfileMenu } from './ProfileMenu.jsx';

function Sidebar({ brand, nav, collapsed, onNavigate, badges }) {
  const { logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className={cx('flex h-[72px] items-center gap-3 border-b border-white/5 px-5', collapsed && 'justify-center px-0')}>
        <BrandMark size={collapsed ? 38 : 42} />
        {!collapsed && <BrandName name={brand.name} caption={brand.caption} dark />}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cx('group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition', isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-700/30' : 'hover:bg-white/5 hover:text-white', collapsed && 'justify-center px-0')
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && badges?.[item.to] > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{badges[item.to]}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/5 p-3">
        <button type="button" onClick={logout} title="Logout" className={cx('flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white', collapsed && 'justify-center px-0')}>
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );
}

function Topbar({ onMenu, searchPlaceholder, searchHome, profilePath, roleLabel, basePath }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [term, setTerm] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const segment = pathname.slice(basePath.length).split('/').filter(Boolean)[0];
    const target = segment ? `${basePath}/${segment}` : searchHome;
    navigate(`${target}?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur sm:px-6">
      <button type="button" aria-label="Toggle menu" onClick={onMenu} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100">
        <Menu className="h-5 w-5" />
      </button>
      <form onSubmit={submit} className="relative hidden max-w-xl flex-1 sm:block" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={searchPlaceholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-400" />
      </form>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <NotificationBell />
        <ProfileMenu profilePath={profilePath} roleLabel={roleLabel} />
      </div>
    </header>
  );
}

export function AppShell({ brand, nav, searchPlaceholder = 'Search...', searchHome = '/', profilePath, roleLabel, badges, basePath = '' }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setDrawer(false), [pathname]);

  const toggle = () => (window.matchMedia('(min-width: 1024px)').matches ? setCollapsed((c) => !c) : setDrawer((d) => !d));

  return (
    <div className="min-h-screen">
      <aside className={cx('fixed inset-y-0 left-0 z-40 hidden transition-all lg:block', collapsed ? 'w-[76px]' : 'w-64')}>
        <Sidebar brand={brand} nav={nav} collapsed={collapsed} badges={badges} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-white/70 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
            <Sidebar brand={brand} nav={nav} badges={badges} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className={cx('transition-all', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <Topbar onMenu={toggle} searchPlaceholder={searchPlaceholder} searchHome={searchHome} profilePath={profilePath} roleLabel={roleLabel} basePath={basePath} />
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
