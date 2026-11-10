import { Navigate, Route, Routes } from 'react-router-dom';
import { BRAND, ProtectedRoute, StaffForgotPassword, StaffLogin, StaffResetPassword } from '@ecomedu/ui';
import PortalLayout from './components/PortalLayout.jsx';
import { NAV } from './nav.js';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Teachers from './pages/Teachers.jsx';
import Courses from './pages/Courses.jsx';
import Batches from './pages/Batches.jsx';
import LiveClasses from './pages/LiveClasses.jsx';
import Recordings from './pages/Recordings.jsx';
import Certificates from './pages/Certificates.jsx';
import Payments from './pages/Payments.jsx';
import Payouts from './pages/Payouts.jsx';
import Messages from './pages/Messages.jsx';
import Reports from './pages/Reports.jsx';
import Support from './pages/Support.jsx';
import Blog from './pages/Blog.jsx';
import Attendance from './pages/Attendance.jsx';
import Assignments from './pages/Assignments.jsx';
import Reviews from './pages/Reviews.jsx';
import Leads from './pages/Leads.jsx';
import PlatformSettings from './pages/PlatformSettings.jsx';

const PORTAL = { name: BRAND.name, caption: 'Admin Portal' };

function Shell() {
  return <PortalLayout brand={PORTAL} nav={NAV} />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <StaffLogin
            brand={PORTAL}
            forgotPath="/forgot-password"
            heading="Admin sign in"
            tagline="Manage your academy."
            points={['Students, teachers and courses', 'Classes and attendance', 'Payments and reports']}
          />
        }
      />
      <Route path="/forgot-password" element={<StaffForgotPassword brand={PORTAL} />} />
      <Route path="/reset-password" element={<StaffResetPassword brand={PORTAL} />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="courses" element={<Courses />} />
          <Route path="batches" element={<Batches />} />
          <Route path="live-classes" element={<LiveClasses />} />
          <Route path="recordings" element={<Recordings />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="payments" element={<Payments />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="messages" element={<Messages />} />
          <Route path="support" element={<Support />} />
          <Route path="blog" element={<Blog />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="leads" element={<Leads />} />
          <Route path="settings" element={<PlatformSettings />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
