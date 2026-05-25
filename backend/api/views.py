import os
import json
import requests as req_lib
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from rest_framework.views import APIView
from .models import Resource
from .serializers import ResourceSerializer


# ---------------------------------------------------------------------------
# Resurslar CRUD API
# ---------------------------------------------------------------------------

class ResourceViewSet(viewsets.ModelViewSet):
    """
    Resurslar bilan ishlash uchun API ko'rinishi.
    """
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Resource.objects.all()

        is_public = self.request.query_params.get('is_public')
        if is_public == 'true':
            queryset = queryset.filter(is_public=True)

        author_id = self.request.query_params.get('author_id')
        if author_id:
            queryset = queryset.filter(author_id=author_id)

        res_type = self.request.query_params.get('type')
        if res_type:
            queryset = queryset.filter(type=res_type)

        return queryset

    @action(detail=False, methods=['get'])
    def mine(self, request):
        author_id = request.query_params.get('author_id')
        if not author_id:
            return Response(
                {"error": "author_id parametri talab qilinadi"},
                status=status.HTTP_400_BAD_REQUEST
            )
        resources = Resource.objects.filter(author_id=author_id)
        serializer = self.get_serializer(resources, many=True)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# AI Proxy — Gemini / Groq kalitlari FAQAT server-side saqlanadi
# ---------------------------------------------------------------------------

GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]


def _call_gemini(payload: dict, model: str, api_key: str, timeout: int = 28) -> str:
    """Berilgan Gemini modeli orqali matn generatsiya qilish."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    resp = req_lib.post(url, json=payload, timeout=timeout)
    data = resp.json()

    if resp.status_code == 429:
        raise RuntimeError("rate_limit")
    if resp.status_code == 403:
        raise RuntimeError("API kalit noto'g'ri yoki ruxsat yo'q.")
    if not resp.ok:
        raise RuntimeError(data.get("error", {}).get("message", f"HTTP {resp.status_code}"))

    return data["candidates"][0]["content"]["parts"][0]["text"]


def _call_groq(messages: list, json_mode: bool, api_key: str, timeout: int = 32) -> str:
    """Groq llama3 modeli orqali fallback."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    resp = req_lib.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=body,
        timeout=timeout,
    )
    data = resp.json()
    if not resp.ok:
        raise RuntimeError(data.get("error", {}).get("message", "Groq xatosi"))
    return data["choices"][0]["message"]["content"]


class AIGenerateView(APIView):
    """
    POST /api/ai/generate/

    Body (JSON):
        prompt      : str   — asosiy matn so'rovi
        json_mode   : bool  — True bo'lsa JSON formatda javob qaytariladi
        chat_history: list  — [{"role": "user"|"model", "parts": [{"text": "..."}]}]

    Javob:
        {"result": "<string>"}

    Gemini API kaliti va Groq API kaliti faqat shu yerda (server-side) o'qiladi.
    Frontend hech qachon ushbu kalitlarni ko'rmaydi.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        body = request.data
        prompt: str = body.get("prompt", "").strip()
        json_mode: bool = bool(body.get("json_mode", False))
        chat_history: list = body.get("chat_history", [])

        if not prompt:
            return Response(
                {"error": "prompt maydoni bo'sh bo'lmasligi kerak"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gemini_key: str = os.getenv("GEMINI_API_KEY", "")
        groq_key: str = os.getenv("GROQ_API_KEY", "")

        # Payload Gemini formatida
        is_conversation = bool(chat_history)
        contents = chat_history if is_conversation else [{"parts": [{"text": prompt}]}]
        generation_config = (
            {"responseMimeType": "application/json", "temperature": 0.7, "topP": 0.95}
            if json_mode
            else {"temperature": 0.8, "topP": 0.95}
        )
        gemini_payload = {"contents": contents, "generationConfig": generation_config}

        # 1) Gemini modellarini ketma-ket sinash
        if gemini_key:
            last_err = None
            for model in GEMINI_MODELS:
                try:
                    result = _call_gemini(gemini_payload, model, gemini_key)
                    return Response({"result": result})
                except RuntimeError as e:
                    last_err = str(e)
                    # Agar rate limit bo'lsa yoki API kalit xato bo'lsa, boshqa modellarni sinash ma'nosiz.
                    # Shuning uchun darhol Groq fallbackiga o'tamiz.
                    if "rate_limit" in str(e) or "API kalit" in str(e) or "quota" in str(e).lower():
                        break
                    continue
                except Exception as e:
                    last_err = str(e)
                    continue

        # 2) Groq fallback
        if groq_key:
            try:
                if is_conversation:
                    groq_msgs = [
                        {
                            "role": "user" if h.get("role") == "user" else "assistant",
                            "content": h["parts"][0]["text"],
                        }
                        for h in chat_history
                        if h.get("parts")
                    ]
                else:
                    groq_msgs = [{"role": "user", "content": prompt}]

                if json_mode:
                    groq_msgs.insert(0, {
                        "role": "system",
                        "content": (
                            "Siz faqat JSON qaytaradigan, ta'lim sohasidagi "
                            "mutaxassis yordamchisiz. Javoblaringiz aniq va "
                            "sifatli bo'lishi shart."
                        ),
                    })

                result = _call_groq(groq_msgs, json_mode, groq_key)
                return Response({"result": result})
            except Exception as groq_err:
                return Response(
                    {"error": f"Barcha AI tizimlari vaqtincha ishlamayapti: {groq_err}"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {"error": "Server-side AI kaliitlari sozlanmagan. Admin bilan bog'laning."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

