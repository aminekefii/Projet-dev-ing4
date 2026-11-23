from django.contrib import admin

from .models import Certification, CourseSection, CourseVideo, Enrolment, VideoProgress

admin.site.register([Certification, CourseSection, CourseVideo, Enrolment, VideoProgress])
