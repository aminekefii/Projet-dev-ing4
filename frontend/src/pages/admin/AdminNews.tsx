import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { news, type Flash, type NewsImage } from '../../api'
import { ConfirmModal } from '../../components/ConfirmModal'
import { ErrorBox, Loading } from '../../components/Loading'
import { Notice } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDateDot } from '../../lib/format'
import { wow } from '../../lib/wow'

export default function AdminNews() {
  usePageTitle('News — Admin')
  const { data: images, error, reload } = useAsync(() => news.list(), [])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [toRemove, setToRemove] = useState<NewsImage | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { busy, run } = useBusy()

  if (error) return <ErrorBox error={error} />
  if (!images) return <Loading />

  const clearFile = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onUpload = (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    void run(async () => {
      try {
        setFlash({ type: 'success', message: await news.upload(file) })
        clearFile()
      } catch (err) {
        setFlash({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed. Please try again.' })
      } finally {
        reload()
      }
    })
  }

  const onRemove = () => {
    if (!toRemove) return
    const id = toRemove.id
    void run(async () => {
      try {
        setFlash({ type: 'success', message: await news.remove(id) })
      } catch (err) {
        setFlash({ type: 'error', message: err instanceof Error ? err.message : 'Could not delete the file.' })
      } finally {
        setToRemove(null)
        reload()
      }
    })
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }
  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  return (
    <>
      <div className="fe-page section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div {...wow('fadeInDown', '0.8s', undefined, 'fe-head')}>
                <h6>TEK-UP Admin Console</h6>
                <h2><em>News</em> &amp; Achievements</h2>
                <p>Upload photos to the homepage carousel. Images appear on the public landing page in upload order — newest first. Supported formats: JPG, PNG, WEBP, GIF (max 1 MB).</p>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-10 offset-lg-1">
              {flash && <Notice type={flash.type} message={flash.message} />}

              <div {...wow('fadeInUp', '0.8s', '0.1s', 'news-admin-upload')}>
                <form id="news-upload-form" onSubmit={onUpload}>
                  <input
                    ref={inputRef}
                    type="file"
                    name="image"
                    id="news-image"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="news-admin-upload__input"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="news-image"
                    className={`news-admin-upload__dropzone${file ? ' is-ready' : ''}${dragOver ? ' is-dragover' : ''}`}
                    id="news-dropzone"
                    onDragEnter={onDragOver}
                    onDragOver={onDragOver}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                  >
                    <span className="news-admin-upload__icon"><i className="fa fa-cloud-upload" aria-hidden="true"></i></span>
                    <span className="news-admin-upload__title">Click to choose an image</span>
                    <span className="news-admin-upload__hint">or drag &amp; drop &middot; JPG / PNG / WEBP / GIF &middot; up to 1 MB</span>
                    <span className="news-admin-upload__filename" id="news-filename">
                      {file ? `${file.name}  ·  ${Math.round(file.size / 1024).toLocaleString()} KB` : ''}
                    </span>
                  </label>
                  <div className="news-admin-upload__actions">
                    <button type="submit" className="wt-btn wt-btn--primary" id="news-upload-submit" disabled={!file || busy}>
                      <span>Publish image</span>
                      <span className="wt-btn-arrow">&rarr;</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="news-admin-gallery-head">
                <h3>Published images <span>{images.length}</span></h3>
                <p>Click <strong>Remove</strong> to delete an image from the public carousel. Deletion is permanent.</p>
              </div>

              {images.length === 0 ? (
                <div className="news-admin-empty">
                  <i className="fa fa-image" aria-hidden="true"></i>
                  <p>No news images yet. Upload the first one above.</p>
                </div>
              ) : (
                <div className="news-admin-grid">
                  {images.map(img => (
                    <article key={img.id} {...wow('fadeInUp', '0.6s', undefined, 'news-admin-card')}>
                      <div className="news-admin-card__thumb">
                        <img src={img.url} alt="" />
                      </div>
                      <div className="news-admin-card__meta">
                        <span className="news-admin-card__date">
                          <i className="fa fa-clock-o" aria-hidden="true"></i>
                          {' '}{formatDateDot(img.uploadedAt)}
                        </span>
                        <span className="news-admin-card__size">
                          {Math.round(img.sizeBytes / 1024).toLocaleString()}&nbsp;KB
                        </span>
                      </div>
                      <div className="news-admin-card__delete">
                        <button type="button" className="wt-btn wt-btn--soft" onClick={() => setToRemove(img)}>
                          <i className="fa fa-trash-o" aria-hidden="true"></i>
                          <span>Remove</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={toRemove !== null}
        title="Remove image"
        body="Remove this image from the homepage? This cannot be undone."
        confirmLabel="Remove"
        onConfirm={onRemove}
        onCancel={() => setToRemove(null)}
        busy={busy}
      />
    </>
  )
}
