import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose(): void
  children: ReactNode
  staticBackdrop?: boolean
  dialogClassName?: string
  contentClassName?: string
  labelledBy?: string
}

/** Bootstrap 5 modal markup, driven by React state instead of bootstrap.js. */
export function Modal({ open, onClose, children, staticBackdrop = false, dialogClassName = 'modal-dialog-centered', contentClassName = '', labelledBy }: Props) {
  useEffect(() => {
    if (!open) return
    document.body.classList.add('modal-open')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !staticBackdrop) onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKey)
    }
  }, [open, staticBackdrop, onClose])

  if (!open) return null
  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={e => { if (e.target === e.currentTarget && !staticBackdrop) onClose() }}
      >
        <div className={`modal-dialog ${dialogClassName}`}>
          <div className={`modal-content ${contentClassName}`.trim()}>{children}</div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  )
}
