import type { CSSProperties } from 'react'

/** Replaces WOW.js: plays the animate.css animation on mount. */
export function wow(animation: string, duration?: string, delay?: string, extraClass = ''): { className: string; style: CSSProperties } {
  return {
    className: `${extraClass} wow ${animation} animated`.trim(),
    style: { animationDuration: duration, animationDelay: delay },
  }
}
