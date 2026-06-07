from django.contrib import admin
from .models import Resource, SubscriptionRequest

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'type', 'author_name', 'is_public', 'created_at')
    list_filter = ('type', 'is_public', 'created_at')
    search_fields = ('title', 'prompt', 'author_name')

@admin.register(SubscriptionRequest)
class SubscriptionRequestAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'user_email', 'plan', 'payment_method', 'amount', 'status', 'created_at')
    list_filter = ('plan', 'payment_method', 'status', 'created_at')
    search_fields = ('user_name', 'user_email', 'phone_number', 'transaction_details')
    list_editable = ('status',)
