import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

type Variant = 'public' | 'portal' | 'admin'
interface Item { label: string; to: string; match?: string[]; scroll?: boolean }

const NAV: Record<Variant, Item[]> = {
  public: [
    { label: 'Home', to: '/#top', scroll: true },
    { label: 'About', to: '/#about', scroll: true },
    { label: 'News', to: '/#news', scroll: true },
    { label: 'Certifications', to: '/#services', scroll: true },
    { label: 'Categories', to: '/#portfolio', scroll: true },
    { label: 'Endorsements', to: '/#blog', scroll: true },
    { label: 'Contact', to: '/#contact', scroll: true },
  ],
  portal: [
    { label: 'Dashboard', to: '/dashboard', match: ['/dashboard'] },
    { label: 'My Certifications', to: '/certifications', match: ['/certifications', '/catalog', '/course', '/white-test'] },
    { label: 'Profile', to: '/profile', match: ['/profile'] },
    { label: 'Contact', to: '/contact', match: ['/contact'] },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', match: ['/admin'] },
    { label: 'Vouchers', to: '/admin/vouchers', match: ['/admin/vouchers'] },
    { label: 'Statistics', to: '/admin/stats', match: ['/admin/stats'] },
    { label: 'News', to: '/admin/news', match: ['/admin/news'] },
    { label: 'Messages', to: '/admin/messages', match: ['/admin/messages'] },
  ],
}

export function Header({ variant }: { variant: Variant }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isHome = variant === 'public' && pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  // Sticky header: only the home page starts transparent (INV §4).
  useEffect(() => {
    if (!isHome) return
    const onScroll = () => {
      const text = document.querySelector<HTMLElement>('.header-text')
      const header = document.querySelector<HTMLElement>('header')
      const limit = (text?.offsetHeight ?? 0) - (header?.offsetHeight ?? 0)
      setScrolled(window.scrollY >= limit)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  const solid = !isHome || scrolled
  const isActive = (item: Item): boolean => {
    if (item.label === 'Home' && isHome) return true
    if (!item.match) return false
    return item.match.some(m => (m === '/admin' ? pathname === '/admin' : pathname === m || pathname.startsWith(`${m}/`)))
  }
  const onSignOut = async (e: MouseEvent) => {
    e.preventDefault()
    await logout()
    navigate('/')
  }
  const brand = variant === 'admin'
    ? { to: '/admin', alt: 'TEK-UP Admin', sub: ' Admin Console' }
    : { to: '/', alt: 'TEK-UP Certif', sub: ' Certified Students' }

  return (
    <header className={`header-area header-sticky${solid ? ' background-header' : ''} wow slideInDown animated`} style={{ animationDuration: '0.75s', animationDelay: '0s' }}>
      <div className="container">
        <div className="row">
          <div className="col-12">
            <nav className="main-nav">
              <Link to={brand.to} className="logo">
                <img src="/assets/images/logo1.png" alt={brand.alt} />
                <h4>TEK-UP<span>{brand.sub}</span></h4>
              </Link>
              <ul className="nav" style={menuOpen ? { display: 'block' } : undefined}>
                {NAV[variant].map(item => (
                  <li key={item.label} className={item.scroll ? 'scroll-to-section' : undefined}>
                    <Link to={item.to} className={isActive(item) ? 'active' : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>
                  </li>
                ))}
                <li>
                  <div className="main-red-button">
                    {variant === 'public'
                      ? <Link to="/login">Login</Link>
                      : <a href="/" onClick={onSignOut}>Sign Out</a>}
                  </div>
                </li>
              </ul>
              <a className={`menu-trigger${menuOpen ? ' active' : ''}`} onClick={() => setMenuOpen(o => !o)} role="button" aria-label="Menu">
                <span>Menu</span>
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
