import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Replaces the template's smooth-scroll: /#about scrolls to #about; other navigations go to top. */
export function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1))
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 1, behavior: 'smooth' })
    }, 0)
    return () => window.clearTimeout(id)
  }, [pathname, hash])
  return null
}
