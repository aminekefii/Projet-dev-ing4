import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function ContactLayout() {
  const { user, ready } = useAuth()
  if (!ready) return null
  return (<><ScrollToHash /><Header variant={user?.role === 'student' ? 'portal' : 'public'} /><Outlet /><Footer /></>)
}
