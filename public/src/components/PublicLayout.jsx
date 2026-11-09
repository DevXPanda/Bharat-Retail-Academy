import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutGrid, ChevronDown, LogOut, Menu, Search, UserRound, X } from 'lucide-react';
import { Avatar, BRAND, BrandMark, BrandName, Popover, useAuth, cx } from '@ecomedu/ui';
import { PlatformLogo } from './PlatformLogo.jsx';
import Footer from './Footer.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/live-classes', label: 'Live classes' },
  { to: '/teachers', label: 'Teachers' },
  { to: '/about', label: 'About us' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];
const PLATFORMS = ['Amazon', 'Flipkart', 'Meesho', 'Shopify', 'Digital Marketing', 'Product Sourcing'];

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search: locationSearch } = useLocation();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [term, setTerm] = useState('');
  const menuButton = useRef(null);
  const searchButton = useRef(null);
  const searchInput = useRef(null);
  const courseMenu = useRef(null);
  const courseButton = useRef(null);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setCoursesOpen(false);
  }, [pathname, locationSearch]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (open) menuButton.current?.focus();
      else if (searchOpen) searchButton.current?.focus();
      else if (coursesOpen) courseButton.current?.focus();
      setOpen(false);
      setSearchOpen(false);
      setCoursesOpen(false);
    };
    const onOutside = (event) => {
      if (!courseMenu.current?.contains(event.target)) setCoursesOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [open, searchOpen, coursesOpen]);

  const search = (event) => {
    event.preventDefault();
    navigate(`/courses?search=${encodeURIComponent(term.trim())}`);
    setOpen(false);
    setSearchOpen(false);
  };

  const signOut = () => {
    logout();
    navigate('/');
    setOpen(false);
  };

  const searchForm = (mobile = false) => (
    <form onSubmit={search} role="search" className="navbar-search-form">
      <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-slate-400" />
      <input ref={mobile ? undefined : searchInput} aria-label="Search courses" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search courses or topics" />
      <button type="submit" aria-label="Submit course search"><ArrowRight className="h-4 w-4" /></button>
    </form>
  );

  return (
    <header className="public-navbar">
      <div className="navbar-inner">
        <Link to="/" aria-label={`${BRAND.name} home`} className="navbar-brand"><BrandMark size={46} /><BrandName caption={BRAND.tagline} /></Link>

        <nav className="navbar-desktop" aria-label="Primary navigation">
          {LINKS.map((link) => link.to === '/courses' ? (
            <div key={link.to} ref={courseMenu} className="navbar-course-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCoursesOpen(false); }}>
              <div className={cx('navbar-course-link', pathname.startsWith('/courses') && 'active')}>
                <NavLink to={link.to}>{link.label}</NavLink>
                <button ref={courseButton} type="button" aria-label="Browse course categories" aria-expanded={coursesOpen} aria-controls="navbar-categories" onClick={() => { setCoursesOpen((value) => !value); setSearchOpen(false); }}><ChevronDown className={cx('h-3.5 w-3.5 transition-transform', coursesOpen && 'rotate-180')} /></button>
              </div>
              {coursesOpen && <div id="navbar-categories" className="navbar-categories"><p className="section-kicker">Browse by topic</p><div className="navbar-category-grid">{PLATFORMS.map((category) => <Link key={category} to={`/courses?category=${encodeURIComponent(category)}`} onClick={() => setCoursesOpen(false)}><PlatformLogo category={category} size={32} /><span>{category}</span></Link>)}</div><Link to="/courses" className="navbar-all-courses" onClick={() => setCoursesOpen(false)}>View all courses <ArrowRight className="h-4 w-4" /></Link></div>}
            </div>
          ) : <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => cx('navbar-link', isActive && 'active')}>{link.label}</NavLink>)}
        </nav>

        <div className="navbar-actions">
          <button ref={searchButton} type="button" aria-label={searchOpen ? 'Close search' : 'Open search'} aria-expanded={searchOpen} aria-controls="navbar-search" className="navbar-icon navbar-desktop-search" onClick={() => { setSearchOpen((value) => !value); setCoursesOpen(false); }}>{searchOpen ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}</button>
          <span className="navbar-divider" aria-hidden="true" />
          {user ? <>
            <Link to="/app" className="navbar-learning">My learning <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Popover width={224} trigger={<button type="button" aria-label="Open account menu" className="navbar-account"><Avatar name={user.name} src={user.avatar} size={34} /><ChevronDown className="h-3.5 w-3.5 text-slate-500" /></button>}>
              {(close) => <div className="navbar-profile"><div className="border-b border-slate-100 px-4 py-3"><p className="truncate text-sm font-semibold">{user.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p></div><Link to="/app" onClick={close}><LayoutGrid className="h-4 w-4" />My learning</Link><Link to="/app/profile" onClick={close}><UserRound className="h-4 w-4" />My profile</Link><button type="button" onClick={() => { close(); signOut(); }}><LogOut className="h-4 w-4" />Sign out</button></div>}
            </Popover>
          </> : <><Link to="/login" className="navbar-login">Log in</Link><Link to="/signup" className="navbar-signup">Sign up <ArrowRight className="h-3.5 w-3.5" /></Link></>}
          <button ref={menuButton} type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="public-mobile-menu" className="navbar-icon navbar-menu-button" onClick={() => { setOpen((value) => !value); setSearchOpen(false); }}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>

      {searchOpen && <div id="navbar-search" className="navbar-search-panel"><div className="navbar-inner">{searchForm()}</div></div>}
      {open && <>
        <button type="button" tabIndex={-1} aria-label="Close navigation" className="navbar-backdrop" onClick={() => setOpen(false)} />
        <div id="public-mobile-menu" className="navbar-mobile-panel">
          {searchForm(true)}
          <nav aria-label="Mobile navigation">{LINKS.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setOpen(false)} className={({ isActive }) => cx('navbar-mobile-link', isActive && 'active')}>{link.label}<ArrowRight className="h-4 w-4" /></NavLink>)}</nav>
          <div className="navbar-mobile-footer">{user ? <Link to="/app" onClick={() => setOpen(false)} className="public-primary w-full">My learning <ArrowRight className="h-4 w-4" /></Link> : <><Link to="/login" onClick={() => setOpen(false)} className="public-secondary">Log in</Link><Link to="/signup" onClick={() => setOpen(false)} className="public-primary">Create account <ArrowRight className="h-4 w-4" /></Link></>}</div>
        </div>
      </>}
    </header>
  );
}

export default function PublicLayout() {
  return <div className="public-site flex min-h-screen flex-col"><Navbar /><main className="flex-1"><Outlet /></main><Footer /></div>;
}
