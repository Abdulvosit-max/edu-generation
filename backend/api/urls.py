from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResourceViewSet, AIGenerateView, ImageGenerateView, ElevenLabsTTSView, SubscriptionRequestCreateView, SubscriptionStatusView

router = DefaultRouter()
router.register(r'resources', ResourceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('ai/generate/', AIGenerateView.as_view(), name='ai-generate'),
    path('ai/generate-image/', ImageGenerateView.as_view(), name='ai-generate-image'),
    path('ai/tts/', ElevenLabsTTSView.as_view(), name='ai-tts'),
    path('subscription-request/', SubscriptionRequestCreateView.as_view(), name='subscription-request'),
    path('subscription-status/', SubscriptionStatusView.as_view(), name='subscription-status'),
]



