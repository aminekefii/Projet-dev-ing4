import type { CSSProperties } from 'react'

// Replaces WOW.js (v1 animation.js: `new WOW({ animateClass: 'animated', offset: 50 })`):
// an element stays hidden with its animation paused until it scrolls into
// view, then the animate.css animation plays once.

let observer: IntersectionObserver | null = null

function reveal(el: HTMLElement): void {
  el.style.visibility = 'visible'
  el.style.animationName = '' // back to the animate.css class's animation
}

function getObserver(): IntersectionObserver | null {
  if (observer || typeof IntersectionObserver === 'undefined') return observer
  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        reveal(entry.target as HTMLElement)
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -50px 0px' }, // WOW offset: 50px from the bottom of the viewport
  )
  return observer
}

/** Ref callback: watch the element until it enters the viewport. */
function watch(el: HTMLElement | null): (() => void) | undefined {
  if (!el) return undefined
  const o = getObserver()
  if (!o) {
    reveal(el)
    return undefined
  }
  o.observe(el)
  return () => o.unobserve(el)
}

/**
 * Spread onto an element: `<div {...wow('fadeInLeft', '1s', '0.2s', 'col-lg-6')}>`.
 * The inline `visibility`/`animationName` stay the same on every render, so
 * React never undoes what `reveal()` set on the DOM node.
 */
export function wow(animation: string, duration?: string, delay?: string, extraClass = ''): {
  className: string
  style: CSSProperties
  ref: (el: HTMLElement | null) => (() => void) | undefined
} {
  return {
    className: `${extraClass} wow ${animation} animated`.trim(),
    style: { animationDuration: duration, animationDelay: delay, visibility: 'hidden', animationName: 'none' },
    ref: watch,
  }
}
