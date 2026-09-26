import { useEffect, useState } from 'react'

export function Preloader() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setLoaded(true), 50)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div id="js-preloader" className={`js-preloader${loaded ? ' loaded' : ''}`}>
      <div className="preloader-inner">
        <span className="dot"></span>
        <div className="dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  )
}
