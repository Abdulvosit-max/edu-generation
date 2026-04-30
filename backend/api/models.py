from django.db import models

class Resource(models.Model):
    # Resurs turlari
    RESOURCE_TYPES = [
        ('image', 'Tasvir'),
        ('slide', 'Slayd'),
        ('test', 'Test'),
        ('chat', 'Suhbat'),
    ]

    type = models.CharField(max_length=10, choices=RESOURCE_TYPES) # Resurs turi
    title = models.CharField(max_length=255) # Sarlavha
    prompt = models.TextField() # AI uchun so'rov
    content = models.TextField() # Asosiy kontent (JSON yoki URL)
    author_id = models.CharField(max_length=128) # Muallifning Firebase UID si
    author_name = models.CharField(max_length=255) # Muallif ismi
    author_photo = models.URLField(max_length=1024, null=True, blank=True) # Muallif rasmi
    is_public = models.BooleanField(default=False) # Hamjamiyatga ulashilganmi?
    created_at = models.DateTimeField(auto_now_add=True) # Yaratilgan vaqti

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.type})"
