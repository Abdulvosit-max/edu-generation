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

        gemini_keys = [
            os.getenv("GEMINI_API_KEY", "").strip(),
            os.getenv("GEMINI_API_KEY_2", "").strip()
        ]
        gemini_keys = [k for k in gemini_keys if k]
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

        # 1) Gemini modellarini va kalitlarini ketma-ket sinash
        if gemini_keys:
            for g_key in gemini_keys:
                last_err = None
                for model in GEMINI_MODELS:
                    try:
                        result = _call_gemini(gemini_payload, model, g_key)
                        return Response({"result": result})
                    except RuntimeError as e:
                        last_err = str(e)
                        # Agar rate limit, API kalit xatosi yoki quota xatosi bo'lsa, keyingi kalitga o'tamiz
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


class ImageGenerateView(APIView):
    """
    POST /api/ai/generate-image/

    Body (JSON):
        prompt      : str   — rasm prompti
        style       : str   — rasm uslubi (3D Render, Realistik, etc.)
        format      : str   — rasm formati (16:9, 1:1, 4:3)

    Javob:
        {"image_url": "data:image/jpeg;base64,...", "source": "gemini-imagen" | "pollinations-fallback" | "picsum-fallback"}
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        body = request.data
        prompt: str = body.get("prompt", "").strip()
        style: str = body.get("style", "").strip()
        format_val: str = body.get("format", "").strip()

        if not prompt:
            return Response(
                {"error": "prompt maydoni bo'sh bo'lmasligi kerak"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gemini_keys = [
            os.getenv("GEMINI_API_KEY", "").strip(),
            os.getenv("GEMINI_API_KEY_2", "").strip()
        ]
        gemini_keys = [k for k in gemini_keys if k]

        # Format / Aspect Ratio xaritalash
        aspect_ratio_map = {
            "16:9 (Keng ekranli)": "16:9",
            "4:3 (Standart)": "4:3",
            "1:1 (Kvadrat)": "1:1",
            "16:9": "16:9",
            "4:3": "4:3",
            "1:1": "1:1",
        }
        aspect_ratio = aspect_ratio_map.get(format_val, "1:1")

        # Rasm uslubiga qarab promptni boyitish
        style_prompt = ""
        if style == "3D Render":
            style_prompt = ", isometric 3D render, minimalist cartoon style, vibrant colors"
        elif style == "Realistik":
            style_prompt = ", realistic photography, documentary educational style, highly detailed"
        elif style == "Infografik / Diagramma":
            style_prompt = ", educational infographic, labeled vector schematic, clear vector diagram"
        elif style == "Multfilm / Illyustratsiya":
            style_prompt = ", vibrant school book illustration, colorful drawing style"
        elif style == "Minimalizm":
            style_prompt = ", minimalist modern flat vector design, clean paths"

        full_prompt = f"{prompt}{style_prompt}, high quality educational material, clear focus"

        # 1) OpenAI DALL-E 3 — Eng zo'r sifat
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if openai_key:
            try:
                dalle_url = "https://api.openai.com/v1/images/generations"
                dalle_headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                # Aspect ratio → size mapping
                size_map = {
                    "16:9": "1792x1024",
                    "1:1":  "1024x1024",
                    "4:3":  "1024x1024",
                }
                img_size = size_map.get(aspect_ratio, "1024x1024")

                dalle_payload = {
                    "model": "dall-e-3",
                    "prompt": full_prompt,
                    "n": 1,
                    "size": img_size,
                    "quality": "standard",
                    "response_format": "b64_json"
                }
                dalle_resp = req_lib.post(dalle_url, json=dalle_payload, headers=dalle_headers, timeout=60)

                if dalle_resp.ok:
                    dalle_data = dalle_resp.json()
                    b64_data = dalle_data["data"][0]["b64_json"]
                    revised_prompt = dalle_data["data"][0].get("revised_prompt", "")
                    print(f"DALL-E 3 muvaffaqiyatli: {revised_prompt[:80]}...")
                    return Response({
                        "image_url": f"data:image/png;base64,{b64_data}",
                        "source": "dall-e-3",
                        "revised_prompt": revised_prompt
                    })
                else:
                    print(f"DALL-E 3 HTTP {dalle_resp.status_code}: {dalle_resp.text[:200]}")
            except Exception as e:
                print(f"DALL-E 3 xatolik: {e}")

        # DALL-E 3 ishlamasa — aniq xabar qaytarish
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return Response(
                {"error": "OpenAI API kaliti serverda sozlanmagan."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"error": "DALL-E 3 rasm generatsiya qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )



class ElevenLabsTTSView(APIView):
    """
    POST /api/ai/tts/

    Body (JSON):
        text     : str — o'qiladigan matn
        voice_id : str — ElevenLabs ovoz IDsi (default: pNInz6obpgDQGcFmaJgB - Adam)
        model_id : str — ElevenLabs modeli (default: eleven_multilingual_v2)

    Javob:
        MP3 audio fayli (binary)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        body = request.data
        text: str = body.get("text", "").strip()
        voice_id: str = body.get("voice_id", "pNInz6obpgDQGcFmaJgB").strip()
        model_id: str = body.get("model_id", "eleven_multilingual_v2").strip()

        if not text:
            return Response(
                {"error": "text maydoni bo'sh bo'lmasligi kerak"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.getenv("ELEVENLABS_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "ElevenLabs API kaliti serverda sozlanmagan."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            headers = {
                "xi-api-key": api_key,
                "Content-Type": "application/json",
            }
            payload = {
                "text": text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            
            resp = req_lib.post(url, json=payload, headers=headers, timeout=25)
            
            if resp.ok:
                from django.http import HttpResponse
                response = HttpResponse(resp.content, content_type="audio/mpeg")
                response["Content-Disposition"] = 'attachment; filename="tts.mp3"'
                return response
            else:
                return Response(
                    {"error": f"ElevenLabs API xatosi (HTTP {resp.status_code}): {resp.text}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )
        except Exception as e:
            return Response(
                {"error": f"Ovoz generatsiya qilishda kutilmagan xato: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

from .models import SubscriptionRequest
from .serializers import SubscriptionRequestSerializer

class SubscriptionRequestCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SubscriptionRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SubscriptionStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user_uid = request.query_params.get('uid')
        if not user_uid:
            return Response(
                {"error": "uid parametri talab qilinadi"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check latest approved request
        approved_req = SubscriptionRequest.objects.filter(
            user_uid=user_uid, 
            status='approved'
        ).order_by('-updated_at').first()

        approved_plan = approved_req.plan if approved_req else "free"

        # Check if there is a pending request
        pending_req = SubscriptionRequest.objects.filter(
            user_uid=user_uid, 
            status='pending'
        ).order_by('-created_at').first()

        if pending_req:
            return Response({
                "plan": approved_plan,
                "status": "pending",
                "pending_plan": pending_req.plan
            })

        return Response({
            "plan": approved_plan,
            "status": "approved" if approved_req else None
        })




