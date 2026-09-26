import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { profile, type Flash, type ProfileView } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { Notice } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { noop } from '../../lib/noop'
import { wow } from '../../lib/wow'

export default function Profile() {
  usePageTitle('Profile — TEK-UP Certified Students')
  const { data, error, reload } = useAsync(() => profile.get(), [])
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />
  return <ProfilePage data={data} reload={reload} />
}

function ProfilePage({ data, reload }: { data: ProfileView; reload(): void }) {
  const [phone, setPhone] = useState(data.phone)
  const [address, setAddress] = useState(data.address)
  const [photoFlash, setPhotoFlash] = useState<Flash | null>(null)
  const [formFlash, setFormFlash] = useState<Flash | null>(null)
  const photoBusy = useBusy()
  const formBusy = useBusy()

  const u = data.user
  const fullName = `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim() || 'Student'

  // v1 submits the photo form as soon as a file is chosen.
  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    void photoBusy.run(async () => {
      try {
        setPhotoFlash({ type: 'success', message: await profile.updatePhoto(file) })
        reload()
      } catch (err) {
        setPhotoFlash({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed. Please try again.' })
      } finally {
        input.value = '' // allow choosing the same file again
      }
    })
  }

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    void formBusy.run(async () => {
      try {
        setFormFlash({ type: 'success', message: await profile.update({ phone, address }) })
        reload()
      } catch (err) {
        setFormFlash({ type: 'error', message: err instanceof Error ? err.message : 'Could not save your profile. Please try again.' })
      }
    })
  }

  return (
    <div className="profile-page section">
      <div className="container">
        <div className="row">
          <div {...wow('fadeInDown', '1s', '0.2s', 'col-lg-12')}>
            <div className="profile-hello">
              <h6>Account Settings</h6>
              <h2>Your <em>profile</em> &amp; <span>credentials</span></h2>
              <p>Your name, email and student ID come from your university record and cannot be edited here. You can update your phone and address.</p>
            </div>
          </div>
        </div>

        <div className="row">
          <div {...wow('fadeInLeft', '1s', '0.3s', 'col-lg-4')}>
            <aside className="profile-summary">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                  {data.photo ? <img src={data.photo} alt="Profile photo" /> : <i className="fa fa-user"></i>}
                </div>
                <span className="profile-avatar-badge" aria-hidden="true">
                  <i className="fa fa-camera"></i>
                </span>
              </div>

              <form className="profile-photo-form" id="profile-photo-form" onSubmit={noop}>
                {photoFlash && <Notice type={photoFlash.type} message={photoFlash.message} />}
                <input type="file" name="photo" id="photo" accept="image/jpeg,image/png,image/webp" className="profile-photo-input" onChange={onPhoto} disabled={photoBusy.busy} />
                <label htmlFor="photo" className="profile-photo-button">
                  <i className="fa fa-pencil" aria-hidden="true"></i>
                  <span>Change</span>
                </label>
              </form>

              <h3>{fullName}</h3>
              <p className="role">TEK-UP &middot; {data.studentId}</p>
              <span className="status-badge">Active student</span>

              <ul className="profile-stats">
                <li>
                  <span className="stat-label">Certifications earned</span>
                  <span className="stat-value">{data.earnedCount}</span>
                </li>
                <li>
                  <span className="stat-label">Member since</span>
                  <span className="stat-value">{data.memberSince}</span>
                </li>
              </ul>

              <a href="#" onClick={noop} className="profile-secondary-link">Change password &rarr;</a>
            </aside>
          </div>

          <div {...wow('fadeInRight', '1s', '0.3s', 'col-lg-8')}>
            <form id="profile" className="profile-form" onSubmit={onSave}>
              <div className="profile-form-heading">
                <h3>Personal information</h3>
                <p>Update the details that appear on your student record.</p>
              </div>

              {formFlash && <Notice type={formFlash.type} message={formFlash.message} />}

              <div className="row">
                <div className="col-lg-6">
                  <fieldset>
                    <label htmlFor="firstname">First name</label>
                    <input type="text" id="firstname" value={u.firstname ?? ''} disabled />
                  </fieldset>
                </div>
                <div className="col-lg-6">
                  <fieldset>
                    <label htmlFor="lastname">Last name</label>
                    <input type="text" id="lastname" value={u.lastname ?? ''} disabled />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={u.email} disabled />
                  </fieldset>
                </div>
                <div className="col-lg-6">
                  <fieldset>
                    <label htmlFor="studentid">Student ID</label>
                    <input type="text" id="studentid" value={data.studentId} disabled />
                  </fieldset>
                </div>
                <div className="col-lg-6">
                  <fieldset>
                    <label htmlFor="phone">Phone</label>
                    <input type="tel" name="phone" id="phone" placeholder="+216 70 250 000" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="address">Address</label>
                    <input type="text" name="address" id="address" placeholder="Street, city, country" autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} />
                  </fieldset>
                </div>

                <div className="col-lg-12 profile-form-actions">
                  <button type="submit" className="main-button" disabled={formBusy.busy}>Save changes</button>
                  <Link to="/dashboard" className="cancel-link">Cancel</Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
