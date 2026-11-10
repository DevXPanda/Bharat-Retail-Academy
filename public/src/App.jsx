import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute, useAuth } from '@ecomedu/ui';
import { AuthModalProvider, useAuthModal } from './components/AuthModal.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import Home from './pages/Home.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import { About, PublicLiveClasses, Teachers } from './pages/Discover.jsx';
import { Blog, BlogPost } from './pages/Blog.jsx';
import { Contact, VerifyCertificate } from './pages/ContactVerify.jsx';
import Legal from './pages/Legal.jsx';
import JoinClass from './pages/JoinClass.jsx';
import TeacherDetail from './pages/TeacherDetail.jsx';
import StudentShell from './student/StudentShell.jsx';
import Dashboard from './student/Dashboard.jsx';
import MyCourses from './student/MyCourses.jsx';
import CoursePlayer from './student/CoursePlayer.jsx';
import LiveClasses from './student/LiveClasses.jsx';
import { Certificates, Payments, Recordings } from './student/Library.jsx';
import { Messages, Profile } from './student/Account.jsx';
import Support from './student/Support.jsx';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

// /login, /signup and friends are no longer pages: they open the popup over the page the visitor came from.
// Links in old emails (reset password) and protected pages still land here.
function OpenAuth({ view }) {
  const { open } = useAuthModal();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const next = params.get('next') || location.state?.from || '';
    if (user && view !== 'reset') {
      navigate(next || '/app', { replace: true });
      return;
    }
    open(view, { next: next || undefined, token: params.get('token') || undefined, email: params.get('email') || undefined });
    navigate(next && !next.startsWith('/app') ? next : '/', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function App() {
  return (
    <AuthModalProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:slug" element={<CourseDetail />} />
          <Route path="live-classes" element={<PublicLiveClasses />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="teachers/:id" element={<TeacherDetail />} />
          <Route path="privacy" element={<Legal doc="privacy" />} />
          <Route path="terms" element={<Legal doc="terms" />} />
          <Route path="refund-policy" element={<Legal doc="refund-policy" />} />
          <Route path="about" element={<About />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="contact" element={<Contact />} />
          <Route path="join/:id" element={<JoinClass />} />
          <Route path="verify" element={<VerifyCertificate />} />
          <Route path="verify/:id" element={<VerifyCertificate />} />
          <Route path="login" element={<OpenAuth view="login" />} />
          <Route path="signup" element={<OpenAuth view="signup" />} />
          <Route path="forgot-password" element={<OpenAuth view="forgot" />} />
          <Route path="reset-password" element={<OpenAuth view="reset" />} />
        </Route>

        <Route path="app" element={<ProtectedRoute redirectTo="/login" />}>
          <Route element={<StudentShell />}>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<MyCourses />} />
            <Route path="courses/:courseId" element={<CoursePlayer />} />
            <Route path="live-classes" element={<LiveClasses />} />
            <Route path="recordings" element={<Recordings />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="payments" element={<Payments />} />
            <Route path="messages" element={<Messages />} />
            <Route path="support" element={<Support />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthModalProvider>
  );
}
