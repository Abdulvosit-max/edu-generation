from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResourceViewSet, AIGenerateView

router = DefaultRouter()
router.register(r'resources', ResourceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('ai/generate/', AIGenerateView.as_view(), name='ai-generate'),
]
