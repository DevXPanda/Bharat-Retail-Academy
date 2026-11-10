import { CalendarCheck, ClipboardList, LayoutDashboard, Headset, MessageSquare, Radio, UserCircle, Users, Video, IndianRupee } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/classes', label: 'My Classes', icon: Video },
  { to: '/live-classes', label: 'Live Classes', icon: Radio },
  { to: '/students', label: 'My Students', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/earnings', label: 'Earnings & Payouts', icon: IndianRupee },
  { to: '/support', label: 'Support', icon: Headset },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];
