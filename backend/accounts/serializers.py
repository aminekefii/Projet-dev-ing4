from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Same shape as the frontend's PublicUser (src/api/types.ts)."""

    firstname = serializers.CharField(source='first_name')
    lastname = serializers.CharField(source='last_name')
    role = serializers.CharField(read_only=True)
    createdAt = serializers.DateTimeField(source='date_joined')

    class Meta:
        model = User
        fields = ['id', 'email', 'firstname', 'lastname', 'role', 'createdAt']
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    firstname = serializers.CharField(max_length=100)
    lastname = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.', code='duplicate')
        return value

    def validate(self, data):
        candidate = User(email=data['email'], first_name=data['firstname'], last_name=data['lastname'])
        try:
            password_validation.validate_password(data['password'], candidate)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': e.messages})
        return data

    def create(self, data):
        return User.objects.create_user(
            email=data['email'], password=data['password'],
            first_name=data['firstname'], last_name=data['lastname'],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)
