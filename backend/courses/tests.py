import shutil
import tempfile
from pathlib import Path

from django.contrib.auth.models import Group
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import ADMIN, STUDENT, User

from .models import Certification, CourseSection, CourseVideo, Enrolment, VideoProgress

PASSWORD = 'blue-falcon-42'


class CoursesTests(APITestCase):
    def setUp(self):
        # Comme le navigateur : CSRF vérifié, donc on récupère le cookie d'abord.
        self.client = APIClient(enforce_csrf_checks=True)
        self.student = self.make_user('student@tek-up.de', STUDENT)

        self.pcap = Certification.objects.create(code='PCAP', name='PCAP', provider='Python Institute',
                                                 category='technical', media_path='pcap', featured=True)
        self.closed = Certification.objects.create(code='IELTS', name='IELTS', provider='British Council',
                                                   category='linguistic')
        self.section = CourseSection.objects.create(certification=self.pcap, position=1, title='Intro', folder='01-intro')
        self.v1 = CourseVideo.objects.create(section=self.section, position=1, title='Welcome', filename='01.mp4',
                                             subtitle_filename='01.vtt', duration_seconds=100)
        self.v2 = CourseVideo.objects.create(section=self.section, position=2, title='Setup', filename='02.mp4',
                                             duration_seconds=100)
        self.sign_in(self.student)

    # --- outils ---

    def make_user(self, email, role):
        user = User.objects.create_user(email=email, password=PASSWORD, first_name='T', last_name='U')
        user.groups.add(Group.objects.get(name=role))
        return user

    def sign_in(self, user):
        self.client.logout()
        self.client.force_login(user)
        self.client.get('/api/auth/csrf/')

    def post(self, url, data=None):
        token = self.client.cookies['csrftoken'].value
        return self.client.post(url, data or {}, format='json', HTTP_X_CSRFTOKEN=token)

    def enrol(self):
        return Enrolment.objects.create(user=self.student, certification=self.pcap)

    # --- catalogue ---

    def test_catalog_groups_by_category_and_marks_enrolment(self):
        self.enrol()
        r = self.client.get('/api/certifications/catalog/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([g['category'] for g in r.data], ['technical', 'linguistic'])
        pcap = r.data[0]['items'][0]
        self.assertTrue(pcap['enrolled'])
        self.assertTrue(pcap['featured'])
        self.assertEqual(pcap['mediaPath'], 'pcap')

    def test_pages_are_for_students_only(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/certifications/catalog/').status_code, 403)
        self.sign_in(self.make_user('boss@tek-up.de', ADMIN))
        self.assertEqual(self.client.get('/api/certifications/catalog/').status_code, 403)

    # --- inscription ---

    def test_enroll_success(self):
        r = self.post(f'/api/certifications/{self.pcap.id}/enroll/', {'password': PASSWORD})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['type'], 'success')
        self.assertTrue(Enrolment.objects.filter(user=self.student, certification=self.pcap).exists())

    def test_enroll_twice_is_info(self):
        self.enrol()
        r = self.post(f'/api/certifications/{self.pcap.id}/enroll/', {'password': PASSWORD})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['type'], 'info')

    def test_enroll_refusals(self):
        url = f'/api/certifications/{self.pcap.id}/enroll/'
        self.assertEqual(self.post(url, {'password': ''}).status_code, 400)
        self.assertEqual(self.post(url, {'password': 'wrong'}).data['detail'], 'Wrong password. Enrolment cancelled.')
        r = self.post(f'/api/certifications/{self.closed.id}/enroll/', {'password': PASSWORD})
        self.assertEqual(r.data['detail'], 'That certification is not currently open for enrolment.')
        self.assertEqual(self.post('/api/certifications/999/enroll/', {'password': PASSWORD}).status_code, 400)
        self.assertFalse(Enrolment.objects.exists())

    # --- mes certifications ---

    def test_my_certifications_filter(self):
        self.enrol()
        r = self.client.get('/api/certifications/mine/?filter=earned')
        self.assertEqual(r.data['items'], [])
        self.assertEqual(r.data['total'], 1)
        self.assertEqual(r.data['inProgress'], 1)
        self.assertEqual(r.data['available'], 1)
        r = self.client.get('/api/certifications/mine/?filter=in_progress')
        self.assertEqual(r.data['items'][0]['certification']['code'], 'PCAP')

    def test_cancel(self):
        self.enrol()
        self.assertEqual(self.post(f'/api/certifications/{self.pcap.id}/cancel/').status_code, 200)
        self.assertFalse(Enrolment.objects.exists())
        self.assertEqual(self.post(f'/api/certifications/{self.pcap.id}/cancel/').status_code, 400)

    # --- cours ---

    def test_course_404_and_403(self):
        self.assertEqual(self.client.get('/api/courses/999/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/courses/{self.pcap.id}/').status_code, 403)

    def test_course_content(self):
        self.enrol()
        VideoProgress.objects.create(user=self.student, video=self.v1)
        r = self.client.get(f'/api/courses/{self.pcap.id}/')
        self.assertEqual(r.status_code, 200)
        section = r.data['sections'][0]
        self.assertEqual((section['watched'], section['total']), (1, 2))
        self.assertEqual(r.data['initialVideoId'], self.v2.id)  # première vidéo non vue
        self.assertEqual(section['videos'][0]['videoUrl'], f'/api/courses/videos/{self.v1.id}/stream/')
        self.assertIsNone(section['videos'][1]['subtitleUrl'])

    # --- progression à 90 % ---

    def test_video_counts_only_after_90_percent(self):
        enrolment = self.enrol()
        url = f'/api/courses/videos/{self.v1.id}/watched/'
        r = self.post(url, {'position': 50})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(VideoProgress.objects.exists())
        # La durée envoyée par le navigateur est ignorée quand on la connaît en base.
        self.assertEqual(self.post(url, {'position': 5, 'duration': 5}).status_code, 400)

        r = self.post(url, {'position': 91})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['progress'], 50)
        self.assertEqual(r.data['section'], {'id': self.section.id, 'total': 2, 'watched': 1})
        enrolment.refresh_from_db()
        self.assertEqual(enrolment.progress, 50)

        self.post(url, {'position': 99})  # revoir une vidéo ne la compte pas deux fois
        self.assertEqual(VideoProgress.objects.count(), 1)

    def test_mark_watched_requires_enrolment(self):
        self.assertEqual(self.post(f'/api/courses/videos/{self.v1.id}/watched/', {'position': 99}).status_code, 403)
        self.assertEqual(self.post('/api/courses/videos/999/watched/', {'position': 99}).status_code, 404)

    # --- vidéos protégées ---

    def test_protected_video(self):
        media = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, media)
        (media / 'pcap' / '01-intro').mkdir(parents=True)
        (media / 'pcap' / '01-intro' / '01.mp4').write_bytes(b'fake video')
        (media / 'pcap' / '01-intro' / '01.vtt').write_text('WEBVTT')

        with override_settings(COURSE_MEDIA_ROOT=media, COURSE_MEDIA_ACCEL=False):
            url = f'/api/courses/videos/{self.v1.id}/stream/'
            self.assertEqual(self.client.get(url).status_code, 403)  # pas inscrit
            self.enrol()
            r = self.client.get(url)
            self.assertEqual(r.status_code, 200)
            self.assertEqual(b''.join(r.streaming_content), b'fake video')
            r.close()  # libère le fichier (sinon Windows refuse de le supprimer à la fin)
            r = self.client.get(f'/api/courses/videos/{self.v1.id}/subtitles/')
            self.assertEqual(r['Content-Type'], 'text/vtt')
            r.close()
            self.assertEqual(self.client.get(f'/api/courses/videos/{self.v2.id}/stream/').status_code, 404)
            self.client.logout()
            self.assertEqual(self.client.get(url).status_code, 403)

        with override_settings(COURSE_MEDIA_ROOT=media, COURSE_MEDIA_ACCEL=True):
            self.sign_in(self.student)
            r = self.client.get(f'/api/courses/videos/{self.v1.id}/stream/')
            self.assertEqual(r['X-Accel-Redirect'], '/protected-media/pcap/01-intro/01.mp4')
