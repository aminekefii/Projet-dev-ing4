import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function PublicLayout() {
  return (<><ScrollToHash /><Header variant="public" /><Outlet /><Footer /></>)
}
