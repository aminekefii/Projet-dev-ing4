import { useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError, courses, isApiError, progress, type CourseView } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { useAsync } from '../../hooks/useAsync'
import { usePageTitle } from '../../hooks/usePageTitle'
import { noop } from '../../lib/noop'

/** Marks a video watched and recomputes section counts and the overall % (as v1's client JS). */
function withWatched(course: CourseView, videoId: number): CourseView {
  const sections = course.sections.map(s => {
    if (!s.videos.some(v => v.id === videoId)) return s
    const videos = s.videos.map(v => (v.id === videoId ? { ...v, watched: true } : v))
    return { ...s, videos, watched: videos.filter(v => v.watched).length }
  })
  const all = sections.flatMap(s => s.videos)
  const pct = all.length === 0 ? 0 : Math.round((100 * all.filter(v => v.watched).length) / all.length)
  return { ...course, sections, progress: pct }
}

export default function Course() {
  const { certId: raw } = useParams()
  const certId = Number(raw)
  const valid = Number.isInteger(certId) && certId > 0
  const { data, error } = useAsync(
    () => (valid ? courses.getCourse(certId) : Promise.reject(new ApiError(404, 'Certification not found.'))),
    [certId],
  )
  usePageTitle(data ? `${data.certification.name} — TEK-UP Certified Students` : 'TEK-UP Certified Students')

  if (!valid || isApiError(error, 404)) return <Navigate to="/certifications" replace />
  if (isApiError(error, 403)) return <Navigate to="/catalog" replace />
  if (error) return <ErrorBox error={error} />
  if (!data || data.certification.id !== certId) return <Loading />
  return <CoursePlayer key={certId} initial={data} />
}

function CoursePlayer({ initial }: { initial: CourseView }) {
  const [course, setCourse] = useState(initial)
  const [playingId, setPlayingId] = useState(initial.initialVideoId)
  const [openSectionId, setOpenSectionId] = useState<number | null>(
    initial.sections.find(s => s.videos.some(v => v.id === initial.initialVideoId))?.id ?? null,
  )
  const markedFor = useRef<number | null>(null)
  const autoplay = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const cert = course.certification
  const all = course.sections.flatMap(s => s.videos)
  const playing = all.find(v => v.id === playingId) ?? null

  const play = (videoId: number) => {
    const video = all.find(v => v.id === videoId)
    if (!video) return
    markedFor.current = null
    autoplay.current = true
    setPlayingId(videoId)
    setOpenSectionId(video.sectionId)
  }

  // A video counts as watched once playback passes 90 % — once per load (v1 course.php).
  const onTimeUpdate = () => {
    const el = videoRef.current
    if (!el || !playing || !Number.isFinite(el.duration) || el.duration <= 0) return
    if (el.currentTime / el.duration < 0.9 || markedFor.current === playing.id) return
    const videoId = playing.id
    markedFor.current = videoId
    setCourse(c => withWatched(c, videoId))
    progress.markWatched(videoId)
      .then(r => setCourse(c => ({
        ...c,
        progress: r.progress,
        sections: c.sections.map(s => (s.id === r.section.id ? { ...s, watched: r.section.watched, total: r.section.total } : s)),
      })))
      .catch(() => { markedFor.current = null })
  }

  const onEnded = () => {
    const index = all.findIndex(v => v.id === playingId)
    if (index >= 0 && index < all.length - 1) play(all[index + 1].id)
  }

  const done = course.progress >= 100

  return (
    <div className="course-page section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <Link to="/certifications" className="back-link"><i className="fa fa-arrow-left"></i> Back to my certifications</Link>
            <div className="course-head">
              <h6>{cert.provider} &middot; {cert.code}</h6>
              <h2>{cert.name}</h2>
              <div className="course-progress">
                <div className="bar"><span id="courseBar" style={{ width: `${course.progress}%` }}></span></div>
                <span className="progress-label"><span id="courseProgressLabel">{course.progress}</span>% complete</span>
              </div>
            </div>
          </div>
        </div>

        {!course.hasContent ? (
          <div className="row">
            <div className="col-lg-12">
              <div className="course-empty">
                <h3>Content not yet uploaded</h3>
                <p>The course material for this certification will be available soon. Check back later.</p>
                <Link to="/certifications" className="main-button">Back</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="row course-layout">
            <div className="col-lg-4 course-rail">
              {course.sections.map(sec => (
                <details className="course-section" key={sec.id} open={openSectionId === sec.id}>
                  {/* Opening one section closes the others (v1 accordion). */}
                  <summary onClick={e => { e.preventDefault(); setOpenSectionId(id => (id === sec.id ? null : sec.id)) }}>
                    <span className="sec-title">{sec.position}. {sec.title}</span>
                    <span className="sec-count" data-section-id={sec.id}>{sec.watched}/{sec.total}</span>
                  </summary>
                  <ul className="course-video-list">
                    {sec.videos.map(v => (
                      <li
                        key={v.id}
                        className={`course-video-row${v.id === playingId ? ' is-playing' : ''}`}
                        data-video-id={v.id}
                        data-section-id={sec.id}
                        onClick={() => play(v.id)}
                      >
                        <span className="status-mark">{v.watched ? '✓' : v.id === playingId ? '▶' : ''}</span>
                        <span className="video-title">{v.title}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}

              {done ? (
                <Link id="whiteTestLink" className="white-test-row" to={`/white-test/${cert.id}`}>
                  <span className="sec-title">{course.sections.length + 1}. Pass white test</span>
                  <span className="sec-count"><i className="fa fa-trophy" aria-hidden="true"></i></span>
                </Link>
              ) : (
                <a id="whiteTestLink" className="white-test-row is-locked" href="#" aria-disabled="true" onClick={noop}>
                  <span className="sec-title">{course.sections.length + 1}. Pass white test</span>
                  <span className="sec-count"><i className="fa fa-lock" aria-hidden="true"></i></span>
                </a>
              )}
            </div>

            <div className="col-lg-8 course-stage">
              {playing ? (
                <>
                  <video
                    key={playing.id}
                    ref={videoRef}
                    id="coursePlayer"
                    controls
                    preload="metadata"
                    data-video-id={playing.id}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={onEnded}
                    onLoadedMetadata={() => { if (autoplay.current) videoRef.current?.play().catch(() => {}) }}
                  >
                    <source src={playing.videoUrl} type="video/mp4" />
                    {playing.subtitleUrl && <track id="courseSubtitle" kind="subtitles" src={playing.subtitleUrl} srcLang="en" label="English" default />}
                    Your browser does not support HTML5 video.
                  </video>
                  <div className="stage-meta">
                    <span className="now-playing-label">Now playing</span>
                    <h4 id="nowPlayingTitle">{playing.title}</h4>
                  </div>
                </>
              ) : (
                <p>No videos in this course yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
