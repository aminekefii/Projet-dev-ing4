import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface Props {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm(): void
  onCancel(): void
  busy?: boolean
}

/** Replaces v1's window.confirm() with the same texts. */
export function ConfirmModal({ open, title, body, confirmLabel, onConfirm, onCancel, busy = false }: Props) {
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="modal-body p-4">
        <h4 className="mb-3">{title}</h4>
        <p>{body}</p>
        <div className="d-flex gap-2 justify-content-end mt-4">
          <button type="button" className="wt-btn wt-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="wt-btn wt-btn--ghost wt-btn--danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
