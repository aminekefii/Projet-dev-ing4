import { Outlet } from 'react-router-dom'
import { RequireRole } from '../auth/RequireRole'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function AdminLayout() {
  return (
    <RequireRole role="admin">
      <ScrollToHash /><Header variant="admin" /><Outlet /><Footer />
    </RequireRole>
  )
}
