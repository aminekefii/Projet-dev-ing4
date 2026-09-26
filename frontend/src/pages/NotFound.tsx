import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found — TEK-UP Certified Students')
  return (
    <>
      <Header variant="public" />
      <div className="container not-found">
        <h2>Page <em>not found</em></h2>
        <p>The page you are looking for does not exist.</p>
        <div className="main-blue-button"><Link to="/">Back to home</Link></div>
      </div>
      <Footer />
    </>
  )
}
