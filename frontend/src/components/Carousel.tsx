import { useEffect, useState } from 'react'
import type { NewsImage } from '../api'

export function Carousel({ images }: { images: NewsImage[] }) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const current = count === 0 ? 0 : index % count

  useEffect(() => {
    if (count < 2) return
    const id = window.setInterval(() => setIndex(i => (i + 1) % count), 3500)
    return () => window.clearInterval(id)
  }, [count])

  const go = (i: number) => setIndex((i + count) % count)
  return (
    <div id="newsCarousel" className="carousel slide news-carousel">
      {count > 1 && (
        <div className="carousel-indicators">
          {images.map((img, i) => (
            <button key={img.id} type="button" className={i === current ? 'active' : undefined} aria-current={i === current} aria-label={`Slide ${i + 1}`} onClick={() => go(i)}></button>
          ))}
        </div>
      )}
      <div className="carousel-inner">
        {images.map((img, i) => (
          <div key={img.id} className={`carousel-item${i === current ? ' active' : ''}`}>
            <img src={img.url} className="d-block w-100" alt="TEK-UP student achievement" />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button className="carousel-control-prev" type="button" onClick={() => go(current - 1)}>
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </button>
          <button className="carousel-control-next" type="button" onClick={() => go(current + 1)}>
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </button>
        </>
      )}
    </div>
  )
}
