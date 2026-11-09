import { Award, CreditCard, Headset, LayoutDashboard, MessageSquare, PlayCircle, Radio, UserCircle, LayoutGrid } from 'lucide-react';
import { PortalShell, useGet, BRAND } from './ui.js';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/courses', label: 'My Courses', icon: LayoutGrid },
  { to: '/app/live-classes', label: 'Live Classes', icon: Radio },
  { to: '/app/recordings', label: 'Class Recordings', icon: PlayCircle },
  { to: '/app/certificates', label: 'Certificates', icon: Award },
  { to: '/app/payments', label: 'Payments', icon: CreditCard },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  { to: '/app/support', label: 'Support', icon: Headset },
  { to: '/app/profile', label: 'Profile', icon: UserCircle },
];

export default function StudentShell() {
  const summary = useGet('/conversations/summary', undefined, { refetchInterval: 60000 });
  return <div className="student-portal"><PortalShell brand={{ name: BRAND.name, caption: 'Student Portal' }} nav={NAV} groups={[{ title: 'Overview', paths: ['/app'] }, { title: 'Learning', paths: ['/app/courses', '/app/live-classes', '/app/recordings', '/app/certificates'] }, { title: 'Account', paths: ['/app/payments', '/app/messages', '/app/support', '/app/profile'] }]} basePath="/app" searchHome="/app/courses" badges={{ '/app/messages': summary.data?.unread?.value || 0 }} profilePath="/app/profile" roleLabel="Student" /></div>;
}
