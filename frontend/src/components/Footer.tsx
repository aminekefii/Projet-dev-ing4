import type { MouseEvent } from 'react'
import { resetDemoData } from '../api'
import { wow } from '../lib/wow'

export function Footer() {
  const onReset = (e: MouseEvent) => {
    e.preventDefault()
    resetDemoData()
    window.location.assign('/')
  }
  return (
    <footer>
      <div className="container">
        <div className="row">
          <div {...wow('fadeIn', '1s', '0.25s', 'col-lg-12')}>
            <p>
              © Copyright {new Date().getFullYear()} TEK-UP University &mdash; Certified Students. All Rights Reserved.
              <br />Reference: <a rel="nofollow" href="https://tek-up.de/certif/">tek-up.de/certif</a>
              <br /><a href="/" onClick={onReset} style={{ fontSize: 12, opacity: 0.7 }}>Reset demo data</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
