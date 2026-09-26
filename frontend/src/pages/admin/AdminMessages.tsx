import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { messages, type ContactMessage, type MessageFilter } from '../../api'
import { ConfirmModal } from '../../components/ConfirmModal'
import { ErrorBox, Loading } from '../../components/Loading'
import { FeFlash } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDateTime, senderName } from '../../lib/format'
import { wow } from '../../lib/wow'

const CHIPS: [MessageFilter, string][] = [['all', 'All'], ['unread', 'Unread'], ['read', 'Read']]
const FLASH: Record<string, string> = { deleted: 'Message deleted.', marked_unread: 'Marked as unread.' }

function toFilter(value: string | null): MessageFilter {
  return value === 'unread' || value === 'read' ? value : 'all'
}

function preview(text: string): string {
  const chars = Array.from(text) // count characters like PHP mb_substr, not UTF-16 units
  return chars.length > 140 ? `${chars.slice(0, 140).join('')}…` : text
}

export default function AdminMessages() {
  usePageTitle('Messages — Admin')
  const [params, setParams] = useSearchParams()
  const filter = toFilter(params.get('filter'))
  const flash = FLASH[params.get('flash') ?? '']
  const { data, error, reload } = useAsync(() => messages.list(filter), [filter])
  const [toDelete, setToDelete] = useState<ContactMessage | null>(null)
  const { busy, error: actionError, run } = useBusy()

  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  const onDelete = () => {
    if (!toDelete) return
    const id = toDelete.id
    void run(async () => {
      try {
        await messages.remove(id)
        setParams({ flash: 'deleted' })
      } finally {
        setToDelete(null)
        reload()
      }
    })
  }

  return (
    <>
      <div className="fe-page section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div {...wow('fadeInDown', '0.8s', undefined, 'fe-head')}>
                <h6>TEK-UP Admin Console</h6>
                <h2>Inbound <em>Messages</em></h2>
                <p>Read and respond to enquiries submitted through the public contact form and the student portal.</p>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="row">
              <div className="col-lg-12">
                <FeFlash error><span>{actionError}</span></FeFlash>
              </div>
            </div>
          )}

          {flash && !actionError && (
            <div className="row">
              <div className="col-lg-12">
                <FeFlash><span>{flash}</span></FeFlash>
              </div>
            </div>
          )}

          <div className="row">
            <div className="col-lg-12">
              <div className="admin-filters">
                {CHIPS.map(([key, label]) => (
                  <Link key={key} className={`admin-chip${filter === key ? ' is-active' : ''}`} to={`/admin/messages?filter=${key}`}>
                    {label}
                    <span className="admin-chip-count">{data.counts[key]}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <div className="row">
              <div className="col-lg-8 offset-lg-2">
                <div className="fe-empty">
                  <div className="fe-empty__icon"><i className="fa fa-inbox" aria-hidden="true"></i></div>
                  <h3>Inbox empty</h3>
                  <p>No messages match this filter. New submissions through the public contact form will appear here.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="row">
              <div className="col-lg-12">
                <ul className="fe-list msg-list">
                  {data.rows.map(m => (
                    <li key={m.id} className={`fe-row msg-row${m.status === 'unread' ? ' is-unread' : ''}`}>
                      <div className="fe-row__seal" aria-hidden="true">
                        <i className={`fa ${m.status === 'unread' ? 'fa-envelope' : 'fa-envelope-open-o'}`}></i>
                      </div>
                      <div className="fe-row__meta">
                        <div className="fe-row__provider">{m.email} &middot; {formatDateTime(m.submittedAt)}</div>
                        <h4 className="fe-row__title">{senderName(m)}</h4>
                        <p className="fe-row__desc msg-preview">{preview(m.message)}</p>
                        <div className="fe-row__tags">
                          {m.status === 'unread'
                            ? <span className="fe-tag fe-tag--pending"><i className="fa fa-circle" aria-hidden="true"></i> Unread</span>
                            : <span className="fe-tag fe-tag--ready"><i className="fa fa-check" aria-hidden="true"></i> Read</span>}
                        </div>
                      </div>
                      <div className="fe-row__action admin-actions">
                        <Link className="wt-btn wt-btn--primary" to={`/admin/messages/${m.id}`}>
                          <span>View</span>
                          <span className="wt-btn-arrow" aria-hidden="true">→</span>
                        </Link>
                        <button type="button" className="wt-btn wt-btn--ghost wt-btn--danger" onClick={() => setToDelete(m)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={toDelete !== null}
        title="Delete message"
        body={toDelete ? `Delete this message from ${senderName(toDelete)}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
        busy={busy}
      />
    </>
  )
}
