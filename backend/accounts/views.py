from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import STUDENT
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


def first_error(errors):
    """Flatten DRF errors to one message, like the frontend's ApiError(message)."""
    if isinstance(errors, dict):
        errors = next(iter(errors.values()))
    if isinstance(errors, (list, tuple)):
        return first_error(errors[0])
    return str(errors)


def validation_failed(serializer):
    errors = serializer.errors
    duplicate = any(getattr(e, 'code', None) == 'duplicate' for e in errors.get('email', []))
    return Response(
        {'detail': first_error(errors), 'errors': errors},
        status=status.HTTP_409_CONFLICT if duplicate else status.HTTP_400_BAD_REQUEST,
    )


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfView(APIView):
    """GET once before posting: sets the csrftoken cookie the frontend sends back as X-CSRFToken."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


# DRF only checks CSRF for already-signed-in users; protect sign up / sign in too.
@method_decorator(csrf_protect, name='dispatch')
class RegisterView(APIView):
    """Creates a student account and signs it in."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_failed(serializer)
        with transaction.atomic():
            user = serializer.save()
            user.groups.add(Group.objects.get(name=STUDENT))
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_failed(serializer)
        user = authenticate(request, email=serializer.validated_data['email'].lower(), password=serializer.validated_data['password'])
        if user is None:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyPasswordView(APIView):
    """Re-checks the signed-in user's password before sensitive actions (enrolment, voucher approval)."""

    def post(self, request):
        if not request.user.check_password(request.data.get('password') or ''):
            return Response({'detail': 'Wrong password.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """The signed-in user, or 403 when nobody is signed in."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
