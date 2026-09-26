import { Fragment, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, isApiError, messages } from '../../api'
import { ConfirmModal } from '../../components/ConfirmModal'
import { ErrorBox, Loading } from '../../components/Loading'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { useIdParam } from '../../hooks/useIdParam'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDateAt, senderName } from '../../lib/format'
import { wow } from '../../lib/wow'

export default function AdminMessage() {
  const id = useIdParam('id')
  const navigate = useNavigate()
  // Opening a message marks it read (as v1).
  const { data: msg, error } = useAsync(
    () => (id ? messages.get(id) : Promise.reject(new ApiError(404, 'Message not found.'))),
    [id],
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { busy, run } = useBusy()
  usePageTitle(msg ? `Message from ${senderName(msg)} — Admin` : 'Messages — Admin')

  if (!id || isApiError(error, 404)) return <Navigate to="/admin/messages" replace />
  if (error) return <ErrorBox error={error} />
  if (!msg) return <Loading />

  const name = senderName(msg)
  const initials = `${Array.from(msg.name)[0] ?? ''}${Array.from(msg.surname)[0] ?? ''}`.toUpperCase()

  const onMarkUnread = () => run(async () => {
    await messages.markUnread(msg.id)
    navigate('/admin/messages?flash=marked_unread')
  })
  const onDelete = () => run(async () => {
    await messages.remove(msg.id)
    navigate('/admin/messages?flash=deleted')
  })

  return (
    <>
      <div className="fe-page section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <Link to="/admin/messages" className="back-link"><i className="fa fa-arrow-left"></i> Back to messages</Link>
              <div {...wow('fadeInDown', '0.6s', undefined, 'fe-head')}>
                <h6>TEK-UP Admin Console &middot; Message</h6>
                <h2>From <em>{name}</em></h2>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-10 offset-lg-1">
              <div className="msg-detail">
                <div className="msg-detail__head">
                  <div className="msg-detail__avatar" aria-hidden="true">{initials}</div>
                  <div className="msg-detail__head-meta">
                    <div className="msg-detail__name">{name}</div>
                    <a className="msg-detail__email" href={`mailto:${msg.email}`}>{msg.email}</a>
                    <div className="msg-detail__time">
                      <i className="fa fa-clock-o" aria-hidden="true"></i>
                      {' '}Received {formatDateAt(msg.submittedAt)}
                    </div>
                  </div>
                  <div className="msg-detail__tag">
                    <span className="fe-tag fe-tag--ready"><i className="fa fa-check" aria-hidden="true"></i> Read</span>
                  </div>
                </div>

                <div className="msg-detail__body">
                  {msg.message.split('\n').map((line, i) => (
                    <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>
                  ))}
                </div>

                <div className="msg-detail__actions">
                  <a className="wt-btn wt-btn--primary" href={`mailto:${msg.email}?subject=Re%3A%20your%20message%20to%20TEK-UP`}>
                    <span>Reply by email</span>
                    <span className="wt-btn-arrow" aria-hidden="true">→</span>
                  </a>
                  <button type="button" className="wt-btn wt-btn--soft" disabled={busy} onClick={() => void onMarkUnread()}>Mark as unread</button>
                  <button type="button" className="wt-btn wt-btn--ghost wt-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete message"
        body={`Delete this message from ${name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
        busy={busy}
      />
    </>
  )
}
