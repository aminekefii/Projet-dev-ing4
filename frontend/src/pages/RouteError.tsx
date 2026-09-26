import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { resetDemoData } from '../api'
import { usePageTitle } from '../hooks/usePageTitle'

/** Root error boundary: shown when a page crashes while rendering. */
export default function RouteError() {
  usePageTitle('Something went wrong — TEK-UP Certified Students')
  const onReset = (e: MouseEvent) => {
    e.preventDefault()
    resetDemoData()
    window.location.assign('/')
  }
  return (
    <div className="container not-found">
      <h2>Something went <em>wrong</em></h2>
      <p>This page could not be displayed. The demo data may be damaged.</p>
      <div className="main-blue-button"><Link to="/">Back to home</Link></div>
      <p style={{ marginTop: 20 }}><a href="/" onClick={onReset}>Reset demo data</a></p>
    </div>
  )
}
