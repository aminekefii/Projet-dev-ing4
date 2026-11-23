from django.urls import path

from . import views

urlpatterns = [
    path('certifications/catalog/', views.CatalogView.as_view(), name='catalog'),
    path('certifications/mine/', views.MyCertificationsView.as_view(), name='my-certifications'),
    path('certifications/<int:cert_id>/enroll/', views.EnrollView.as_view(), name='enroll'),
    path('certifications/<int:cert_id>/cancel/', views.CancelView.as_view(), name='cancel'),
    path('courses/<int:cert_id>/', views.CourseView.as_view(), name='course'),
    path('courses/videos/<int:video_id>/watched/', views.MarkWatchedView.as_view(), name='mark-watched'),
    path('courses/videos/<int:video_id>/stream/', views.protected_file, {'kind': 'video'}, name='video-stream'),
    path('courses/videos/<int:video_id>/subtitles/', views.protected_file, {'kind': 'subtitles'}, name='video-subtitles'),
]
