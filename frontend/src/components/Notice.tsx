import type { ReactNode } from 'react'

export function Notice({ type, message }: { type: 'success' | 'error' | 'info'; message: ReactNode }) {
  return <div className={`form-notice is-${type}`}>{message}</div>
}

/** v1 `.fe-flash` (final-exams, admin-vouchers, admin-messages). */
export function FeFlash({ error = false, icon = 'fa-check-circle', className = '', children }: { error?: boolean; icon?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`fe-flash${error ? ' is-error' : ''} ${className}`.trim()}>
      <i className={`fa ${error ? 'fa-exclamation-triangle' : icon}`}></i>
      {children}
    </div>
  )
}
