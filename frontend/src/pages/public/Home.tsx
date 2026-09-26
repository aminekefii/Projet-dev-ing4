import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { messages, news, type ContactForm } from '../../api'
import { Carousel } from '../../components/Carousel'
import { useAsync } from '../../hooks/useAsync'
import { usePageTitle } from '../../hooks/usePageTitle'
import { noop } from '../../lib/noop'
import { wow } from '../../lib/wow'

const EMPTY: ContactForm = { name: '', surname: '', email: '', message: '' }

export default function Home() {
  usePageTitle('TEK-UP Certified Students')
  const navigate = useNavigate()
  const { data: images } = useAsync(() => news.list(), [])
  const [form, setForm] = useState<ContactForm>(EMPTY)
  const [busy, setBusy] = useState(false)
  const set = (field: keyof ContactForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  // v1 posts this form to contact.php, which shows the result.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await messages.send(form)
      navigate('/contact?sent=1')
    } catch (err) {
      navigate('/contact', { state: { error: err instanceof Error ? err.message : 'Please fill in all fields.', form } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
  <div {...wow('fadeIn', '1s', '0.5s', 'main-banner')} id="top">
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <div className="row">
            <div className="col-lg-6 align-self-center">
              <div {...wow('fadeInLeft', '1s', '1s', 'left-content header-text')}>
                <h6>Welcome to TEK-UP University</h6>
                <h2>We place <em>great emphasis</em> on <span>knowledge</span> &amp; <span>expertise</span></h2>
                <ul className="pillars">
                  <li>Knowledge through academic courses aligned with Industry 4.0.</li>
                  <li>Expertise through professional training by GAFAM, Cisco, Oracle and other global tech leaders.</li>
                </ul>

                <div className="hero-social">
                  <span className="hero-social-label">Check us out</span>
                  <a href="https://www.facebook.com/profile.php?id=100070946543328" target="_blank" rel="noopener" className="hero-social-link" aria-label="TEK-UP on Facebook">
                    <i className="fa fa-facebook" aria-hidden="true"></i>
                  </a>
                  <a href="https://www.linkedin.com/school/tek-up-university/posts/?feedView=all" target="_blank" rel="noopener" className="hero-social-link" aria-label="TEK-UP on LinkedIn">
                    <i className="fa fa-linkedin" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div {...wow('fadeInRight', '1s', '0.5s', 'right-image')}>
                <img src="/assets/images/banner-right-image.png" alt="team meeting" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="about" className="about-us section">
    <div className="container">
      <div className="row">
        <div className="col-lg-4">
          <div {...wow('fadeIn', '1s', '0.2s', 'left-image')}>
            <img src="/assets/images/about-left-image.png" alt="person graphic" />
          </div>
        </div>
        <div className="col-lg-8 align-self-center">
          <div className="services">
            <div className="row">
              <div className="col-lg-6">
                <div {...wow('fadeIn', '1s', '0.5s', 'item')}>
                  <div className="icon">
                    <img src="/assets/images/service-icon-01.png" alt="academic knowledge" />
                  </div>
                  <div className="right-text">
                    <h4>Savoir</h4>
                    <p>Academic courses aligned with Industry 4.0, the driving force behind today's economies.</p>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div {...wow('fadeIn', '1s', '0.7s', 'item')}>
                  <div className="icon">
                    <img src="/assets/images/service-icon-02.png" alt="professional certifications" />
                  </div>
                  <div className="right-text">
                    <h4>Savoir-Faire</h4>
                    <p>Professional training from the world's top tech leaders: GAFAM, Cisco, Oracle, Red Hat, OffSec.</p>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div {...wow('fadeIn', '1s', '0.9s', 'item')}>
                  <div className="icon">
                    <img src="/assets/images/service-icon-03.png" alt="certifications issued" />
                  </div>
                  <div className="right-text">
                    <h4>1,400+ Certifications</h4>
                    <p>Issued to our students &mdash; weekly exam sessions, fully included in the tuition.</p>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div {...wow('fadeIn', '1s', '1.1s', 'item')}>
                  <div className="icon">
                    <img src="/assets/images/service-icon-04.png" alt="international placements" />
                  </div>
                  <div className="right-text">
                    <h4>Global Placements</h4>
                    <p>Alumni at Cisco Paris, Amazon France, plus Germany, Japan, Austria and Andorra.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {images && images.length > 0 && (
  <div id="news" className="our-news section">
    <div className="container">
      <div className="row">
        <div className="col-lg-8 offset-lg-2">
          <div {...wow('bounceIn', '1s', '0.2s', 'section-heading')}>
            <h2><em>News</em> &amp; <span>Achievements</span></h2>
            <p>Our latest students achievements</p>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-10 offset-lg-1">
          <Carousel images={images} />
        </div>
      </div>
    </div>
  </div>
  )}

  <div id="services" className="our-services section">
    <div className="container">
      <div className="row">
        <div {...wow('fadeInLeft', '1s', '0.2s', 'col-lg-6 align-self-center')}>
          <div className="left-image">
            <img src="/assets/images/services-left-image.png" alt="" />
          </div>
        </div>
        <div {...wow('fadeInRight', '1s', '0.2s', 'col-lg-6')}>
          <div className="section-heading">
            <h2>Most Earned <em>Certifications</em> from our <span>Global Partners</span></h2>
            <p>Each year our students sit weekly exam sessions across 17+ vendors &mdash; from networking and cloud to offensive security. Below are the top tracks our graduates complete before joining the workforce.</p>
          </div>
          <div className="row">
            <div className="col-lg-12">
              <div className="first-bar progress-skill-bar">
                <h4>Cisco Professional &mdash; CCNP</h4>
                <span>90%</span>
                <div className="filled-bar"></div>
                <div className="full-bar"></div>
              </div>
            </div>
            <div className="col-lg-12">
              <div className="second-bar progress-skill-bar">
                <h4>Amazon AWS Professional &mdash; CSAP</h4>
                <span>85%</span>
                <div className="filled-bar"></div>
                <div className="full-bar"></div>
              </div>
            </div>
            <div className="col-lg-12">
              <div className="third-bar progress-skill-bar">
                <h4>Offensive Security &mdash; OSCP</h4>
                <span>78%</span>
                <div className="filled-bar"></div>
                <div className="full-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="portfolio" className="our-portfolio section">
    <div className="container">
      <div className="row">
        <div className="col-lg-6 offset-lg-3">
          <div {...wow('bounceIn', '1s', '0.2s', 'section-heading')}>
            <h2>Our Certification <em>Tracks</em> &amp; <span>Specialties</span></h2>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-3 col-sm-6">
          <a href="#" onClick={noop}>
            <div {...wow('bounceInUp', '1s', '0.3s', 'item')}>
              <div className="hidden-content">
                <h4>Cloud Technologies</h4>
                <p>AWS, Google Cloud, AI/ML, containers, DevOps, SysOps and data engineering.</p>
              </div>
              <div className="showed-content">
                <img src="/assets/images/portfolio-image.png" alt="cloud track" />
              </div>
            </div>
          </a>
        </div>
        <div className="col-lg-3 col-sm-6">
          <a href="#" onClick={noop}>
            <div {...wow('bounceInUp', '1s', '0.4s', 'item')}>
              <div className="hidden-content">
                <h4>Cybersecurity</h4>
                <p>Offensive (OSCP, Red Team), defensive (Blue Team), network and IT governance.</p>
              </div>
              <div className="showed-content">
                <img src="/assets/images/portfolio-image.png" alt="cybersecurity track" />
              </div>
            </div>
          </a>
        </div>
        <div className="col-lg-3 col-sm-6">
          <a href="#" onClick={noop}>
            <div {...wow('bounceInUp', '1s', '0.5s', 'item')}>
              <div className="hidden-content">
                <h4>DevOps &amp; Automation</h4>
                <p>Jenkins, Terraform, Kubernetes, CI/CD pipelines and infrastructure as code.</p>
              </div>
              <div className="showed-content">
                <img src="/assets/images/portfolio-image.png" alt="devops track" />
              </div>
            </div>
          </a>
        </div>
        <div className="col-lg-3 col-sm-6">
          <a href="#" onClick={noop}>
            <div {...wow('bounceInUp', '1s', '0.6s', 'item')}>
              <div className="hidden-content">
                <h4>Networking &amp; Telecom</h4>
                <p>Cisco, Juniper, Huawei, Fortinet, Palo Alto &mdash; from CCNA to expert level.</p>
              </div>
              <div className="showed-content">
                <img src="/assets/images/portfolio-image.png" alt="networking track" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>

  <div id="blog" className="our-blog section">
    <div className="container">
      <div className="row">
        <div {...wow('fadeInDown', '1s', '0.25s', 'col-lg-6')}>
          <div className="section-heading">
            <h2>Endorsed by Global <em>Industry</em> <span>Leaders</span></h2>
          </div>
        </div>
        <div {...wow('fadeInDown', '1s', '0.25s', 'col-lg-6')}>
          <div className="top-dec"></div>
        </div>
      </div>
      <div className="row">
        <div {...wow('fadeInUp', '1s', '0.25s', 'col-lg-6')}>
          <div className="left-image">
            <a href="#" onClick={noop}><img src="/assets/images/partners/Satya%20NADELLA.jpg" alt="Satya Nadella, CEO Microsoft" /></a>
            <div className="info">
              <div className="inner-content">
                <ul>
                  <li><i className="fa fa-user"></i> Satya Nadella</li>
                  <li><i className="fa fa-building"></i> Microsoft</li>
                  <li><i className="fa fa-certificate"></i> ITS Track</li>
                </ul>
                <a href="#" onClick={noop}><h4>Microsoft Certifications &mdash; signed by the CEO</h4></a>
                <p>Every TEK-UP graduate completing the Microsoft ITS track receives a certificate signed at the executive level &mdash; opening doors at Microsoft partner networks worldwide.</p>
              </div>
            </div>
          </div>
        </div>
        <div {...wow('fadeInUp', '1s', '0.25s', 'col-lg-6')}>
          <div className="right-list">
            <ul>
              <li>
                <div className="left-content align-self-center">
                  <span><i className="fa fa-user"></i> Chuck Robbins &middot; CEO, Cisco</span>
                  <a href="#" onClick={noop}><h4>Cisco Networking &amp; CCNP Track</h4></a>
                  <p>Industry-recognized certificates across networking, security and collaboration.</p>
                </div>
                <div className="right-image">
                  <a href="#" onClick={noop}><img src="/assets/images/partners/Chuck%20Robbins.jpg" alt="Chuck Robbins, CEO Cisco" /></a>
                </div>
              </li>
              <li>
                <div className="left-content align-self-center">
                  <span><i className="fa fa-user"></i> Thomas Kurian &middot; CEO, Google Cloud</span>
                  <a href="#" onClick={noop}><h4>Google Cloud Developer Track</h4></a>
                  <p>Application development, data engineering and ML on Google Cloud Platform.</p>
                </div>
                <div className="right-image">
                  <a href="#" onClick={noop}><img src="/assets/images/partners/Thomas%20Kurian.jpg" alt="Thomas Kurian, CEO Google Cloud" /></a>
                </div>
              </li>
              <li>
                <div className="left-content align-self-center">
                  <span><i className="fa fa-user"></i> Maureen Lonergan &middot; Director, AWS Academy</span>
                  <a href="#" onClick={noop}><h4>AWS Professional &mdash; CSAP</h4></a>
                  <p>From AWS Cloud Practitioner to Solutions Architect Professional, fully proctored.</p>
                </div>
                <div className="right-image">
                  <a href="#" onClick={noop}><img src="/assets/images/partners/Maureen%20Lonergan.jpg" alt="Maureen Lonergan, Director AWS Academy" /></a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="contact" className="contact-us section">
    <div className="container">
      <div className="row">
        <div {...wow('fadeInLeft', '0.5s', '0.25s', 'col-lg-6 align-self-center')}>
          <div className="section-heading">
            <h2>Talk to us about your <em>Career</em> &amp; <span>Certification Path</span></h2>
            <p>Whether you are a future student, a recruiter or an industry partner, our certification office answers within one business day. Tell us which track interests you and we'll get back with the full roadmap.</p>
            <div className="phone-info">
              <h4>Certifications Office: <span><i className="fa fa-phone"></i> <a href="#" onClick={noop}>+216 70 250 000</a></span></h4>
            </div>
          </div>
        </div>
        <div {...wow('fadeInRight', '0.5s', '0.25s', 'col-lg-6')}>
          <form id="contact" onSubmit={onSubmit}>
            <div className="row">
              <div className="col-lg-6">
                <fieldset>
                  <input type="text" name="name" id="name" placeholder="Name" autoComplete="on" required value={form.name} onChange={set('name')} />
                </fieldset>
              </div>
              <div className="col-lg-6">
                <fieldset>
                  <input type="text" name="surname" id="surname" placeholder="Surname" autoComplete="on" required value={form.surname} onChange={set('surname')} />
                </fieldset>
              </div>
              <div className="col-lg-12">
                <fieldset>
                  <input type="email" name="email" id="email" placeholder="Your Email" required value={form.email} onChange={set('email')} />
                </fieldset>
              </div>
              <div className="col-lg-12">
                <fieldset>
                  <textarea name="message" id="message" className="form-control" placeholder="Message" required value={form.message} onChange={set('message')}></textarea>
                </fieldset>
              </div>
              <div className="col-lg-12">
                <fieldset>
                  <button type="submit" id="form-submit" className="main-button" disabled={busy}>Send Message</button>
                </fieldset>
              </div>
            </div>
            <div className="contact-dec">
              <img src="/assets/images/contact-decoration.png" alt="" />
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
    </>
  )
}
