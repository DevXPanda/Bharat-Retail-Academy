import { Award, BarChart3, Settings, BookOpen, CalendarCheck, ClipboardList, CreditCard, Headset, Inbox, Layers, LayoutDashboard, MessageSquare, Newspaper, PlayCircle, Radio, Star, UserSquare2, Users, Wallet } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/teachers', label: 'Teachers', icon: UserSquare2 },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/batches', label: 'Batches', icon: Layers },
  { to: '/live-classes', label: 'Live Classes', icon: Radio },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/recordings', label: 'Class Recordings', icon: PlayCircle },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/certificates', label: 'Certificates', icon: Award },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/leads', label: 'Leads & Enquiries', icon: Inbox },
  { to: '/support', label: 'Support Tickets', icon: Headset },
  { to: '/blog', label: 'Blog', icon: Newspaper },
  { to: '/settings', label: 'Platform Settings', icon: Settings },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
];
