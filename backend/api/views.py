from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Resource
from .serializers import ResourceSerializer

class ResourceViewSet(viewsets.ModelViewSet):
    """
    Resurslar bilan ishlash uchun API ko'rinishi.
    """
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny] 

    def get_queryset(self):
        """
        Filtrlash: 
        1. Agar is_public=true bo'lsa, hamjamiyatga chiqarilganlarni ko'rsatadi.
        2. Agar author_id bo'lsa, faqat o'sha muallifnikini ko'rsatadi.
        """
        queryset = Resource.objects.all()
        
        # Hamjamiyat uchun faqat ochiq resurslar
        is_public = self.request.query_params.get('is_public')
        if is_public == 'true':
            queryset = queryset.filter(is_public=True)
            
        # Muallif bo'yicha filtr
        author_id = self.request.query_params.get('author_id')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
        
        # Turi bo'yicha filtr
        res_type = self.request.query_params.get('type')
        if res_type:
            queryset = queryset.filter(type=res_type)
            
        return queryset

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """
        Faqat joriy foydalanuvchining shaxsiy resurslarini olish.
        """
        author_id = request.query_params.get('author_id')
        if not author_id:
            return Response({"error": "author_id parametri talab qilinadi"}, status=status.HTTP_400_BAD_REQUEST)
        
        resources = Resource.objects.filter(author_id=author_id)
        serializer = self.get_serializer(resources, many=True)
        return Response(serializer.data)
