import { Outlet } from 'react-router-dom'
import { RequireRole } from '../auth/RequireRole'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function PortalLayout() {
  return (
    <RequireRole role="student">
      <ScrollToHash /><Header variant="portal" /><Outlet /><Footer />
    </RequireRole>
  )
}
