import { createBrowserRouter } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import ContactLayout from './layouts/ContactLayout'
import PortalLayout from './layouts/PortalLayout'
import PublicLayout from './layouts/PublicLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMessage from './pages/admin/AdminMessage'
import AdminMessages from './pages/admin/AdminMessages'
import AdminNews from './pages/admin/AdminNews'
import AdminStats from './pages/admin/AdminStats'
import AdminVouchers from './pages/admin/AdminVouchers'
import NotFound from './pages/NotFound'
import RouteError from './pages/RouteError'
import Catalog from './pages/portal/Catalog'
import Certifications from './pages/portal/Certifications'
import Course from './pages/portal/Course'
import Dashboard from './pages/portal/Dashboard'
import FinalExams from './pages/portal/FinalExams'
import Profile from './pages/portal/Profile'
import WhiteTestIntro from './pages/portal/WhiteTestIntro'
import WhiteTestResult from './pages/portal/WhiteTestResult'
import WhiteTestTake from './pages/portal/WhiteTestTake'
import Contact from './pages/public/Contact'
import Home from './pages/public/Home'
import Login from './pages/public/Login'
import Signup from './pages/public/Signup'

export const router = createBrowserRouter([
  {
    // Any render crash (e.g. hand-edited demo data) lands here instead of a blank page.
    errorElement: <RouteError />,
    children: [
  { element: <PublicLayout />, children: [{ path: '/', element: <Home /> }, { path: '/login', element: <Login /> }, { path: '/signup', element: <Signup /> }] },
  { element: <ContactLayout />, children: [{ path: '/contact', element: <Contact /> }] },
  {
    element: <PortalLayout />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/catalog', element: <Catalog /> },
      { path: '/certifications', element: <Certifications /> },
      { path: '/course/:certId', element: <Course /> },
      { path: '/white-test/:certId', element: <WhiteTestIntro /> },
      { path: '/white-test/:certId/take', element: <WhiteTestTake /> },
      { path: '/white-test/:certId/result', element: <WhiteTestResult /> },
      { path: '/final-exams', element: <FinalExams /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin', element: <AdminDashboard /> },
      { path: '/admin/vouchers', element: <AdminVouchers /> },
      { path: '/admin/messages', element: <AdminMessages /> },
      { path: '/admin/messages/:id', element: <AdminMessage /> },
      { path: '/admin/news', element: <AdminNews /> },
      { path: '/admin/stats', element: <AdminStats /> },
    ],
  },
  { path: '*', element: <NotFound /> },
    ],
  },
])
