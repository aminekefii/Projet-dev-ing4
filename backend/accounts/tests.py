from django.contrib.auth.models import Group
from rest_framework.test import APIClient, APITestCase

from .models import User

REGISTER = '/api/auth/register/'
LOGIN = '/api/auth/login/'
LOGOUT = '/api/auth/logout/'
ME = '/api/auth/me/'
CSRF = '/api/auth/csrf/'
VERIFY = '/api/auth/verify-password/'

VALID = {'firstname': 'Sam', 'lastname': 'Test', 'email': 'Sam@Tek-Up.de', 'password': 'blue-falcon-42'}


class AuthTests(APITestCase):
    def setUp(self):
        # Behave like the browser: CSRF is enforced, so fetch the cookie first.
        self.client = APIClient(enforce_csrf_checks=True)
        self.client.get(CSRF)

    def post(self, url, data=None):
        # Read the cookie each time, like the browser: sign-in rotates the token.
        token = self.client.cookies['csrftoken'].value
        return self.client.post(url, data or {}, format='json', HTTP_X_CSRFTOKEN=token)

    def test_register_creates_student_and_signs_in(self):
        r = self.post(REGISTER, VALID)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['email'], 'sam@tek-up.de')
        self.assertEqual(r.data['role'], 'student')
        self.assertEqual(set(r.data), {'id', 'email', 'firstname', 'lastname', 'role', 'createdAt'})
        user = User.objects.get(email='sam@tek-up.de')
        self.assertTrue(user.groups.filter(name='student').exists())
        self.assertNotEqual(user.password, VALID['password'])  # stored hashed
        self.assertEqual(self.client.get(ME).data['email'], 'sam@tek-up.de')

    def test_register_rejects_duplicate_email_case_insensitively(self):
        self.post(REGISTER, VALID)
        self.post(LOGOUT)
        r = self.post(REGISTER, {**VALID, 'email': 'SAM@tek-up.de'})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data['detail'], 'An account with this email already exists.')

    def test_register_validates_fields(self):
        cases = [
            ({**VALID, 'firstname': ''}, 'firstname'),
            ({**VALID, 'email': 'nope'}, 'email'),
            ({**VALID, 'password': 'short'}, 'password'),
            ({**VALID, 'password': 'password'}, 'password'),  # too common
        ]
        for data, field in cases:
            r = self.post(REGISTER, data)
            self.assertEqual(r.status_code, 400, data)
            self.assertIn(field, r.data['errors'])
            self.assertTrue(r.data['detail'])
        self.assertFalse(User.objects.exists())

    def test_login_logout_flow(self):
        User.objects.create_user('user1@tek-up.de', 'blue-falcon-42', first_name='User', last_name='One')
        self.assertEqual(self.client.get(ME).status_code, 403)

        r = self.post(LOGIN, {'email': 'USER1@tek-up.de', 'password': 'blue-falcon-42'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['email'], 'user1@tek-up.de')
        self.assertEqual(self.client.get(ME).status_code, 200)

        self.assertEqual(self.post(LOGOUT).status_code, 204)
        self.assertEqual(self.client.get(ME).status_code, 403)

    def test_login_rejects_wrong_password(self):
        User.objects.create_user('user1@tek-up.de', 'blue-falcon-42')
        r = self.post(LOGIN, {'email': 'user1@tek-up.de', 'password': 'wrong'})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['detail'], 'Invalid email or password.')

    def test_verify_password(self):
        self.post(REGISTER, VALID)
        self.assertEqual(self.post(VERIFY, {'password': VALID['password']}).status_code, 204)
        self.assertEqual(self.post(VERIFY, {'password': 'wrong'}).status_code, 400)
        self.post(LOGOUT)
        self.assertEqual(self.post(VERIFY, {'password': VALID['password']}).status_code, 403)

    def test_post_without_csrf_token_is_refused(self):
        r = self.client.post(REGISTER, VALID, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(User.objects.exists())

    def test_superuser_and_admin_group_have_admin_role(self):
        boss = User.objects.create_superuser('admin@tek-up.de', 'blue-falcon-42')
        self.assertEqual(boss.role, 'admin')
        staff = User.objects.create_user('staff@tek-up.de', 'blue-falcon-42')
        staff.groups.add(Group.objects.get(name='admin'))
        self.assertEqual(staff.role, 'admin')
