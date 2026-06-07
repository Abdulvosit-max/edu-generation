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

class SubscriptionRequest(models.Model):
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('max', 'Max'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('approved', 'Tasdiqlangan'),
        ('rejected', 'Rad etilgan'),
    ]
    PAYMENT_CHOICES = [
        ('click', 'Click'),
        ('payme', 'Payme'),
        ('card', 'Karta orqali (o‘tkazma)'),
    ]

    user_uid = models.CharField(max_length=128)
    user_email = models.EmailField(max_length=255)
    user_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=32, blank=True)
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    transaction_details = models.TextField(blank=True, help_text="Tranzaksiya ID yoki chek tafsilotlari")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user_name} ({self.user_email}) - {self.plan} ({self.status})"

