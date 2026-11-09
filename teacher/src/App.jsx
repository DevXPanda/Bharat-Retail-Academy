import { Navigate, Route, Routes } from 'react-router-dom';
import { BRAND, PortalShell, ProtectedRoute, StaffLogin, useGet } from '@ecomedu/ui';
import { NAV } from './nav.js';
import Dashboard from './pages/Dashboard.jsx';
import MyClasses from './pages/MyClasses.jsx';
import LiveClasses from './pages/LiveClasses.jsx';
import MyStudents from './pages/MyStudents.jsx';
import Attendance from './pages/Attendance.jsx';
import Messages from './pages/Messages.jsx';
import Earnings from './pages/Earnings.jsx';
import Profile from './pages/Profile.jsx';
import Assignments from './pages/Assignments.jsx';

const PORTAL = { name: BRAND.name, caption: 'Teacher Portal' };

function Shell() {
  const summary = useGet('/conversations/summary', undefined, { refetchInterval: 60000 });
  return <div className="teacher-portal"><PortalShell brand={PORTAL} nav={NAV} groups={[{ title: 'Overview', paths: ['/'] }, { title: 'Teaching', paths: ['/classes', '/live-classes', '/students', '/attendance', '/assignments'] }, { title: 'Account', paths: ['/messages', '/earnings', '/profile'] }]} badges={{ '/messages': summary.data?.unread?.value || 0 }} searchPlaceholder="Search classes, students, materials..." searchHome="/students" profilePath="/profile" roleLabel="Teacher" /></div>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <StaffLogin
            brand={PORTAL}
            heading="Teacher sign in"
            tagline="Your classes and teaching schedule."
            points={['Live classes and assignments', 'Students and attendance', 'Earnings and payout history']}
          />
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="classes" element={<MyClasses />} />
          <Route path="live-classes" element={<LiveClasses />} />
          <Route path="students" element={<MyStudents />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="messages" element={<Messages />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="assignments" element={<Assignments />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
